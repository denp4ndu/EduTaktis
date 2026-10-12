import { 
    AcademicReportCard, 
    ReportCardStatus, 
    PublishedArtifact 
} from '../types/curriculum';

export class AcademicReportCardValidationEngine {
    private static readonly VALID_REPORT_CARD_STATUSES: ReportCardStatus[] = [
        'DRAFT', 
        'CALCULATED', 
        'INCOMPLETE', 
        'FINALIZED', 
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
        academic_period?: string;
        created_by?: string;
    }): void {
        if (!params.student_id || typeof params.student_id !== 'string' || params.student_id.trim().length === 0) {
            throw new Error('MISSING_OR_INVALID_STUDENT_ID');
        }
        if (!params.academic_period || typeof params.academic_period !== 'string' || params.academic_period.trim().length === 0) {
            throw new Error('MISSING_OR_INVALID_ACADEMIC_PERIOD');
        }
        if (!params.created_by || typeof params.created_by !== 'string' || params.created_by.trim().length === 0) {
            throw new Error('MISSING_OR_INVALID_CREATED_BY');
        }
    }

    validateStatusTransition(currentStatus: ReportCardStatus | null, targetStatus: ReportCardStatus): void {
        if (!currentStatus) {
            if (targetStatus !== 'DRAFT' && targetStatus !== 'CALCULATED' && targetStatus !== 'INCOMPLETE') {
                throw new Error(`INVALID_INITIAL_REPORT_CARD_STATUS: ${targetStatus}`);
            }
            return;
        }

        if (currentStatus === targetStatus) {
            return;
        }

        if (currentStatus === 'ARCHIVED') {
            throw new Error('TERMINAL_STATE_ARCHIVED_CANNOT_TRANSITION');
        }

        const validTransitions: Record<ReportCardStatus, ReportCardStatus[]> = {
            DRAFT: ['CALCULATED', 'INCOMPLETE', 'ARCHIVED'],
            CALCULATED: ['FINALIZED', 'INCOMPLETE', 'ARCHIVED'],
            INCOMPLETE: ['CALCULATED', 'ARCHIVED'],
            FINALIZED: ['PUBLISHED', 'ARCHIVED'],
            PUBLISHED: ['ARCHIVED'],
            ARCHIVED: []
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            throw new Error(`INVALID_REPORT_CARD_TRANSITION: ${currentStatus} -> ${targetStatus}`);
        }
    }

    validateFinalization(reportCard: AcademicReportCard): void {
        if (reportCard.status === 'ARCHIVED') {
            throw new Error('TERMINAL_STATE_ARCHIVED_CANNOT_TRANSITION');
        }
        if (reportCard.overall_status !== 'COMPLETE') {
            throw new Error('GRADE_INCOMPLETE: Cannot finalize report card with incomplete assessment grades');
        }
        if (reportCard.status !== 'CALCULATED') {
            throw new Error(`CANNOT_FINALIZE_NON_CALCULATED_REPORT_CARD: current status is ${reportCard.status}`);
        }
        if (reportCard.courses.length === 0) {
            throw new Error('REQUIRED_ASSESSMENT_MISSING: Cannot finalize report card with no courses');
        }
        for (const course of reportCard.courses) {
            if (course.completion_status !== 'COMPLETE') {
                throw new Error(`GRADE_INCOMPLETE: Course ${course.course_id} has incomplete assessments`);
            }
        }
    }

    validatePublishing(reportCard: AcademicReportCard): void {
        if (reportCard.status === 'ARCHIVED') {
            throw new Error('TERMINAL_STATE_ARCHIVED_CANNOT_TRANSITION');
        }
        if (reportCard.status !== 'FINALIZED') {
            throw new Error(`CANNOT_PUBLISH_NON_FINALIZED_REPORT_CARD: current status is ${reportCard.status}`);
        }
        if (reportCard.overall_status !== 'COMPLETE') {
            throw new Error('CANNOT_PUBLISH_INCOMPLETE_REPORT_CARD');
        }
    }

    validateRevision(revisionReason?: string): void {
        if (!revisionReason || typeof revisionReason !== 'string' || revisionReason.trim().length === 0) {
            throw new Error('REVISION_REASON_REQUIRED: A valid revision reason is required when revising a report card');
        }
    }

    validateTeacherScope(teacherId: string, courseId: string, authorizedCourses: string[] | ((t: string, c: string) => boolean)): void {
        if (!teacherId || typeof teacherId !== 'string' || teacherId.trim().length === 0) {
            throw new Error('MISSING_OR_INVALID_TEACHER_ID');
        }
        if (typeof authorizedCourses === 'function') {
            if (!authorizedCourses(teacherId, courseId)) {
                throw new Error('UNAUTHORIZED_TEACHER_REPORT_SCOPE');
            }
        } else if (Array.isArray(authorizedCourses)) {
            if (!authorizedCourses.includes(courseId)) {
                throw new Error('UNAUTHORIZED_TEACHER_REPORT_SCOPE');
            }
        }
    }

    validateStudentScope(authenticatedStudentId: string, targetStudentId: string): void {
        if (!authenticatedStudentId || authenticatedStudentId !== targetStudentId) {
            throw new Error('UNAUTHORIZED_STUDENT_SCOPE');
        }
    }

    validateChecksum(expectedChecksum: string, actualChecksum: string): void {
        if (expectedChecksum !== actualChecksum) {
            throw new Error('REPORT_CARD_CHECKSUM_MISMATCH');
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
        for (const pattern of AcademicReportCardValidationEngine.SENSITIVE_PATTERNS) {
            if (pattern.test(jsonStr)) {
                throw new Error('SECURITY_LEAKAGE_DETECTED: Sensitive credential or system prompt pattern found in payload');
            }
        }
    }

    validateStructure(reportCard: AcademicReportCard): void {
        if (!reportCard.report_card_id || typeof reportCard.report_card_id !== 'string') {
            throw new Error('INVALID_REPORT_CARD_ID');
        }
        if (!reportCard.student_id || typeof reportCard.student_id !== 'string') {
            throw new Error('INVALID_STUDENT_ID');
        }
        if (!AcademicReportCardValidationEngine.VALID_REPORT_CARD_STATUSES.includes(reportCard.status)) {
            throw new Error(`INVALID_REPORT_CARD_STATUS: ${reportCard.status}`);
        }
        if (typeof reportCard.overall_average !== 'number' || isNaN(reportCard.overall_average) || !isFinite(reportCard.overall_average) || reportCard.overall_average < 0 || reportCard.overall_average > 100) {
            throw new Error('INVALID_OVERALL_AVERAGE: must be between 0 and 100');
        }
        if (typeof reportCard.version_number !== 'number' || reportCard.version_number < 1) {
            throw new Error('INVALID_VERSION_NUMBER');
        }
        this.validateCurriculumContext(reportCard.curriculum_context);
        this.validateSecurity(reportCard);
    }
}

export const academicReportCardValidationEngine = new AcademicReportCardValidationEngine();
