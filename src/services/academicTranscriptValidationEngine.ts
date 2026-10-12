import { 
    AcademicTranscript, 
    TranscriptStatus, 
    AcademicReportCard, 
    PublishedArtifact 
} from '../types/curriculum';

export class AcademicTranscriptValidationEngine {
    private static readonly VALID_TRANSCRIPT_STATUSES: TranscriptStatus[] = [
        'DRAFT', 
        'GENERATED', 
        'VERIFIED', 
        'PUBLISHED', 
        'ARCHIVED'
    ];

    private static readonly SENSITIVE_PATTERNS = [
        /AIzaSy[A-Za-z0-9_-]{15,}/i,
        /sk-[A-Za-z0-9_-]{15,}/i,
        /bearer\s+[A-Za-z0-9_\-\.]{15,}/i,
        /system\s+prompt/i,
        /gemini/i,
        /generateContent/i
    ];

    validateIdentity(params: {
        student_id?: string;
        academic_year?: string;
        semester?: string;
    }): void {
        if (!params.student_id || typeof params.student_id !== 'string' || params.student_id.trim().length === 0) {
            throw new Error('MISSING_OR_INVALID_STUDENT_ID');
        }
        if (!params.academic_year || typeof params.academic_year !== 'string' || params.academic_year.trim().length === 0) {
            throw new Error('MISSING_OR_INVALID_ACADEMIC_YEAR');
        }
        if (!params.semester || typeof params.semester !== 'string' || params.semester.trim().length === 0) {
            throw new Error('MISSING_OR_INVALID_SEMESTER');
        }
    }

    validateStatusTransition(currentStatus: TranscriptStatus | null, targetStatus: TranscriptStatus): void {
        if (!currentStatus) {
            if (targetStatus !== 'DRAFT' && targetStatus !== 'GENERATED') {
                throw new Error(`INVALID_INITIAL_TRANSCRIPT_STATUS: ${targetStatus}`);
            }
            return;
        }

        if (currentStatus === targetStatus) {
            return;
        }

        if (currentStatus === 'ARCHIVED') {
            throw new Error('TERMINAL_STATE_ARCHIVED_CANNOT_TRANSITION');
        }

        const validTransitions: Record<TranscriptStatus, TranscriptStatus[]> = {
            DRAFT: ['GENERATED', 'ARCHIVED'],
            GENERATED: ['VERIFIED', 'PUBLISHED', 'ARCHIVED', 'GENERATED'],
            VERIFIED: ['PUBLISHED', 'ARCHIVED', 'GENERATED'],
            PUBLISHED: ['ARCHIVED'],
            ARCHIVED: []
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            throw new Error(`INVALID_TRANSCRIPT_TRANSITION: ${currentStatus} -> ${targetStatus}`);
        }
    }

    validateSourceReportCard(reportCard: AcademicReportCard): void {
        if (!reportCard) {
            throw new Error('TRANSCRIPT_SOURCE_REPORT_CARD_MISSING');
        }
        if (reportCard.status !== 'FINALIZED' && reportCard.status !== 'PUBLISHED') {
            throw new Error(`INVALID_SOURCE_REPORT_CARD_STATUS: Source report card must be FINALIZED or PUBLISHED (current: ${reportCard.status})`);
        }
    }

    validateSourceVersion(expectedVersion: number, actualVersion: number): void {
        if (expectedVersion !== actualVersion) {
            throw new Error(`TRANSCRIPT_SOURCE_VERSION_MISMATCH: Expected version ${expectedVersion}, found ${actualVersion}`);
        }
    }

    validateSourceChecksum(expectedChecksum: string, actualChecksum: string): void {
        if (expectedChecksum !== actualChecksum) {
            throw new Error('TRANSCRIPT_SOURCE_CHECKSUM_MISMATCH');
        }
    }

    validateTranscriptChecksum(expectedChecksum: string, actualChecksum: string): void {
        if (expectedChecksum !== actualChecksum) {
            throw new Error('TRANSCRIPT_CHECKSUM_MISMATCH');
        }
    }

    validateStudentScope(authenticatedStudentId: string, requestedStudentId: string): void {
        if (!authenticatedStudentId || authenticatedStudentId !== requestedStudentId) {
            throw new Error('UNAUTHORIZED_STUDENT_SCOPE');
        }
    }

    validateTeacherScope(teacherId: string, courseId: string, authorizedCourses: string[] | ((t: string, c: string) => boolean)): void {
        if (!teacherId || typeof teacherId !== 'string' || teacherId.trim().length === 0) {
            throw new Error('MISSING_OR_INVALID_TEACHER_ID');
        }
        if (typeof authorizedCourses === 'function') {
            if (!authorizedCourses(teacherId, courseId)) {
                throw new Error('UNAUTHORIZED_TEACHER_TRANSCRIPT_SCOPE');
            }
        } else if (Array.isArray(authorizedCourses)) {
            if (!authorizedCourses.includes(courseId)) {
                throw new Error('UNAUTHORIZED_TEACHER_TRANSCRIPT_SCOPE');
            }
        }
    }

    validateRevisionReason(reason?: string): void {
        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
            throw new Error('TRANSCRIPT_REVISION_REASON_REQUIRED: A valid revision reason is required when regenerating or revising a transcript');
        }
    }

    validateCurriculumContext(curriculumContext: PublishedArtifact['curriculum_context']): void {
        if (!curriculumContext) {
            throw new Error('MISSING_CURRICULUM_CONTEXT');
        }
        const hasSubject = Boolean((curriculumContext as any).subject_name || (curriculumContext as any).subject);
        if (!curriculumContext.authority || !curriculumContext.institution || !hasSubject) {
            throw new Error('INVALID_CURRICULUM_CONTEXT_METADATA');
        }
        // CP Safety: PENDING_SOURCE must remain PENDING_SOURCE
        if (curriculumContext.cp_verification_status === 'PENDING_SOURCE') {
            // Valid; cannot be elevated to VERIFIED
        }
    }

    validateSecurity(data: unknown): void {
        const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
        for (const pattern of AcademicTranscriptValidationEngine.SENSITIVE_PATTERNS) {
            if (pattern.test(jsonStr)) {
                throw new Error('TRANSCRIPT_SECURITY_LEAKAGE_DETECTED: Sensitive credential or system prompt pattern found in transcript payload');
            }
        }
    }

    validateStructure(transcript: AcademicTranscript): void {
        if (!transcript.transcript_id || typeof transcript.transcript_id !== 'string') {
            throw new Error('TRANSCRIPT_INVALID_STRUCTURE: Missing or invalid transcript_id');
        }
        if (!transcript.student_id || typeof transcript.student_id !== 'string') {
            throw new Error('TRANSCRIPT_INVALID_STRUCTURE: Missing or invalid student_id');
        }
        if (!AcademicTranscriptValidationEngine.VALID_TRANSCRIPT_STATUSES.includes(transcript.status)) {
            throw new Error(`TRANSCRIPT_INVALID_STRUCTURE: Invalid status ${transcript.status}`);
        }
        if (!Array.isArray(transcript.courses)) {
            throw new Error('TRANSCRIPT_INVALID_STRUCTURE: courses must be an array');
        }
        if (!transcript.cumulative_summary || typeof transcript.cumulative_summary.average_percentage !== 'number') {
            throw new Error('TRANSCRIPT_INVALID_STRUCTURE: Invalid cumulative_summary');
        }
        if (transcript.cumulative_summary.average_percentage < 0 || transcript.cumulative_summary.average_percentage > 100) {
            throw new Error('TRANSCRIPT_INVALID_STRUCTURE: average_percentage must be between 0 and 100');
        }
        if (typeof transcript.version_number !== 'number' || transcript.version_number < 1) {
            throw new Error('TRANSCRIPT_INVALID_STRUCTURE: version_number must be >= 1');
        }
        this.validateCurriculumContext(transcript.curriculum_context);
        this.validateSecurity(transcript);
    }
}

export const academicTranscriptValidationEngine = new AcademicTranscriptValidationEngine();
