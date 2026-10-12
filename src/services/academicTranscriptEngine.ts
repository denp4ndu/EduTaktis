import { 
    AcademicTranscript, 
    TranscriptStatus, 
    TranscriptCourse, 
    CumulativeAcademicSummary, 
    TranscriptHistoryEntry, 
    TranscriptAuditEvent, 
    AcademicReportCard, 
    PublishedArtifact 
} from '../types/curriculum';
import { 
    academicTranscriptRepositoryEngine, 
    AcademicTranscriptRepositoryEngine 
} from './academicTranscriptRepositoryEngine';
import { 
    academicTranscriptValidationEngine, 
    AcademicTranscriptValidationEngine 
} from './academicTranscriptValidationEngine';
import { 
    academicReportCardRepositoryEngine, 
    AcademicReportCardRepositoryEngine 
} from './academicReportCardRepositoryEngine';

export interface GenerateTranscriptParams {
    student_id: string;
    academic_year: string;
    semester: string;
    source_report_cards: AcademicReportCard[];
    actor_id: string;
    actor_role: string;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
}

export interface VerifyTranscriptParams {
    transcript_id: string;
    actor_id: string;
    actor_role: string;
    report_card_repository?: AcademicReportCardRepositoryEngine;
}

export interface PublishTranscriptParams {
    transcript_id: string;
    actor_id: string;
    actor_role: string;
}

export interface RegenerateTranscriptParams {
    transcript_id: string;
    revision_reason: string;
    source_report_cards: AcademicReportCard[];
    actor_id: string;
    actor_role: string;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
}

export interface ArchiveTranscriptParams {
    transcript_id: string;
    actor_id: string;
    actor_role: string;
}

export interface GetStudentTranscriptParams {
    authenticated_student_id: string;
    student_id: string;
    academic_year?: string;
    semester?: string;
}

export interface GetTeacherTranscriptParams {
    teacher_id: string;
    student_id: string;
    academic_year?: string;
    semester?: string;
    course_id?: string;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
}

export class AcademicTranscriptEngine {
    constructor(
        private repository: AcademicTranscriptRepositoryEngine = academicTranscriptRepositoryEngine,
        private validator: AcademicTranscriptValidationEngine = academicTranscriptValidationEngine,
        private reportCardRepository: AcademicReportCardRepositoryEngine = academicReportCardRepositoryEngine
    ) {}

    static calculateGradeLetter(percentage: number): string {
        if (percentage >= 90) return 'A';
        if (percentage >= 80) return 'B';
        if (percentage >= 70) return 'C';
        if (percentage >= 60) return 'D';
        return 'E';
    }

    private generateChecksum(data: unknown): string {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return `TR-CHK-${Math.abs(hash).toString(16)}`;
    }

    async generateTranscript(params: GenerateTranscriptParams): Promise<AcademicTranscript> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            student_id: params.student_id,
            academic_year: params.academic_year,
            semester: params.semester
        });

        if (!Array.isArray(params.source_report_cards) || params.source_report_cards.length === 0) {
            throw new Error('TRANSCRIPT_SOURCE_REPORT_CARD_MISSING: At least one finalized source report card is required');
        }

        const transcriptCourses: TranscriptCourse[] = [];
        const sourceReportCardIds: string[] = [];
        const sourceVersions: Record<string, number> = {};
        const sourceChecksums: Record<string, string> = {};

        let totalPercentageSum = 0;
        let totalCoursesCount = 0;
        let completedCoursesCount = 0;
        let passedCoursesCount = 0;
        const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };

        for (const rc of params.source_report_cards) {
            this.validator.validateSecurity(rc);
            this.validator.validateSourceReportCard(rc);

            if (rc.student_id !== params.student_id) {
                throw new Error(`UNAUTHORIZED_STUDENT_SCOPE: Report card ${rc.report_card_id} does not belong to student ${params.student_id}`);
            }

            sourceReportCardIds.push(rc.report_card_id);
            sourceVersions[rc.report_card_id] = rc.version_number;
            sourceChecksums[rc.report_card_id] = rc.checksum;

            for (const course of rc.courses) {
                if (params.actor_role === 'TEACHER' && params.teacher_authorized_courses) {
                    this.validator.validateTeacherScope(params.actor_id, course.course_id, params.teacher_authorized_courses);
                }

                transcriptCourses.push({
                    course_id: course.course_id,
                    subject_id: course.course_id,
                    subject_name: course.subject,
                    teacher_id: course.teacher_id,
                    academic_year: params.academic_year,
                    semester: params.semester,
                    final_percentage: course.final_percentage,
                    final_grade_letter: course.grade_letter,
                    passing_status: course.passing_status,
                    completion_status: course.completion_status,
                    source_report_card_id: rc.report_card_id,
                    source_report_card_version: rc.version_number,
                    source_checksum: rc.checksum
                });

                totalPercentageSum += course.final_percentage;
                totalCoursesCount++;

                if (course.completion_status === 'COMPLETE') {
                    completedCoursesCount++;
                }

                if (course.passing_status) {
                    passedCoursesCount++;
                }

                const letter = course.grade_letter;
                if (gradeDistribution[letter] !== undefined) {
                    gradeDistribution[letter]++;
                } else {
                    gradeDistribution[letter] = 1;
                }
            }
        }

        const averagePercentage = totalCoursesCount > 0 ? Math.round((totalPercentageSum / totalCoursesCount) * 100) / 100 : 0;
        const overallGradeLetter = AcademicTranscriptEngine.calculateGradeLetter(averagePercentage);

        const cumulativeSummary: CumulativeAcademicSummary = {
            total_courses: totalCoursesCount,
            completed_courses: completedCoursesCount,
            incomplete_courses: totalCoursesCount - completedCoursesCount,
            average_percentage: averagePercentage,
            overall_grade_letter: overallGradeLetter,
            grade_distribution: gradeDistribution,
            passed_courses: passedCoursesCount,
            failed_courses: totalCoursesCount - passedCoursesCount
        };

        const transcriptId = `TR-${params.student_id}-${params.academic_year}-${params.semester}-${Date.now()}`;
        const now = new Date().toISOString();
        const primaryCurriculumContext = params.source_report_cards[0].curriculum_context;

        const baseTranscript: AcademicTranscript = {
            transcript_id: transcriptId,
            student_id: params.student_id,
            academic_year: params.academic_year,
            semester: params.semester,
            status: 'GENERATED',
            courses: transcriptCourses,
            cumulative_summary: cumulativeSummary,
            source_report_card_ids: sourceReportCardIds,
            source_versions: sourceVersions,
            source_checksums: sourceChecksums,
            generated_at: now,
            version_number: 1,
            checksum: '',
            curriculum_context: primaryCurriculumContext
        };

        const checksum = this.generateChecksum({
            transcript_id: baseTranscript.transcript_id,
            student_id: baseTranscript.student_id,
            academic_year: baseTranscript.academic_year,
            semester: baseTranscript.semester,
            courses: baseTranscript.courses,
            cumulative_summary: baseTranscript.cumulative_summary,
            source_report_card_ids: baseTranscript.source_report_card_ids,
            version_number: baseTranscript.version_number
        });

        const finalTranscript: AcademicTranscript = {
            ...baseTranscript,
            checksum
        };

        const savedTranscript = await this.repository.saveTranscript(finalTranscript);

        await this.repository.recordAuditEvent({
            event_id: `AE-TR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            transcript_id: savedTranscript.transcript_id,
            student_id: savedTranscript.student_id,
            version_number: savedTranscript.version_number,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'TRANSCRIPT_GENERATED',
            timestamp: now,
            source_checksum: savedTranscript.checksum,
            details: {
                total_courses: savedTranscript.cumulative_summary.total_courses,
                average_percentage: savedTranscript.cumulative_summary.average_percentage
            }
        });

        return savedTranscript;
    }

    async verifyTranscript(params: VerifyTranscriptParams): Promise<AcademicTranscript> {
        this.validator.validateSecurity(params);

        const transcript = await this.repository.getTranscript(params.transcript_id);
        if (!transcript) {
            throw new Error(`TRANSCRIPT_NOT_FOUND: ${params.transcript_id}`);
        }

        if (transcript.status === 'ARCHIVED') {
            throw new Error('TERMINAL_STATE_ARCHIVED_CANNOT_TRANSITION');
        }

        const reportCardRepo = params.report_card_repository || this.reportCardRepository;

        // Verify that each source report card exists and matches expected version and checksum
        for (const reportCardId of transcript.source_report_card_ids) {
            const reportCard = await reportCardRepo.getReportCard(reportCardId);
            if (!reportCard) {
                throw new Error(`TRANSCRIPT_SOURCE_REPORT_CARD_MISSING: Source report card ${reportCardId} was not found`);
            }

            const expectedVersion = transcript.source_versions[reportCardId];
            if (expectedVersion !== undefined) {
                this.validator.validateSourceVersion(expectedVersion, reportCard.version_number);
            }

            const expectedChecksum = transcript.source_checksums[reportCardId];
            if (expectedChecksum !== undefined) {
                this.validator.validateSourceChecksum(expectedChecksum, reportCard.checksum);
            }
        }

        this.validator.validateStructure(transcript);

        const now = new Date().toISOString();
        const updatedTranscript: AcademicTranscript = {
            ...transcript,
            status: 'VERIFIED',
            verified_at: now
        };

        const checksum = this.generateChecksum({
            transcript_id: updatedTranscript.transcript_id,
            student_id: updatedTranscript.student_id,
            academic_year: updatedTranscript.academic_year,
            semester: updatedTranscript.semester,
            courses: updatedTranscript.courses,
            cumulative_summary: updatedTranscript.cumulative_summary,
            source_report_card_ids: updatedTranscript.source_report_card_ids,
            version_number: updatedTranscript.version_number,
            status: updatedTranscript.status
        });

        const savedTranscript = await this.repository.saveTranscript({
            ...updatedTranscript,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-TR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            transcript_id: savedTranscript.transcript_id,
            student_id: savedTranscript.student_id,
            version_number: savedTranscript.version_number,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'TRANSCRIPT_VERIFIED',
            timestamp: now,
            source_checksum: savedTranscript.checksum
        });

        return savedTranscript;
    }

    async publishTranscript(params: PublishTranscriptParams): Promise<AcademicTranscript> {
        this.validator.validateSecurity(params);

        const transcript = await this.repository.getTranscript(params.transcript_id);
        if (!transcript) {
            throw new Error(`TRANSCRIPT_NOT_FOUND: ${params.transcript_id}`);
        }

        if (transcript.status === 'ARCHIVED') {
            throw new Error('TERMINAL_STATE_ARCHIVED_CANNOT_TRANSITION');
        }

        this.validator.validateStatusTransition(transcript.status, 'PUBLISHED');

        const now = new Date().toISOString();
        const updatedTranscript: AcademicTranscript = {
            ...transcript,
            status: 'PUBLISHED',
            published_at: now
        };

        const checksum = this.generateChecksum({
            transcript_id: updatedTranscript.transcript_id,
            student_id: updatedTranscript.student_id,
            academic_year: updatedTranscript.academic_year,
            semester: updatedTranscript.semester,
            courses: updatedTranscript.courses,
            cumulative_summary: updatedTranscript.cumulative_summary,
            source_report_card_ids: updatedTranscript.source_report_card_ids,
            version_number: updatedTranscript.version_number,
            status: updatedTranscript.status
        });

        const savedTranscript = await this.repository.saveTranscript({
            ...updatedTranscript,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-TR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            transcript_id: savedTranscript.transcript_id,
            student_id: savedTranscript.student_id,
            version_number: savedTranscript.version_number,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'TRANSCRIPT_PUBLISHED',
            timestamp: now,
            source_checksum: savedTranscript.checksum
        });

        return savedTranscript;
    }

    async regenerateTranscript(params: RegenerateTranscriptParams): Promise<AcademicTranscript> {
        this.validator.validateSecurity(params);
        this.validator.validateRevisionReason(params.revision_reason);

        const existingTranscript = await this.repository.getTranscript(params.transcript_id);
        if (!existingTranscript) {
            throw new Error(`TRANSCRIPT_NOT_FOUND: ${params.transcript_id}`);
        }

        if (existingTranscript.status === 'ARCHIVED') {
            throw new Error('TERMINAL_STATE_ARCHIVED_CANNOT_TRANSITION');
        }

        const regenerated = await this.generateTranscript({
            student_id: existingTranscript.student_id,
            academic_year: existingTranscript.academic_year,
            semester: existingTranscript.semester,
            source_report_cards: params.source_report_cards,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            teacher_authorized_courses: params.teacher_authorized_courses
        });

        const nextVersion = existingTranscript.version_number + 1;
        const now = new Date().toISOString();
        const revisedTranscriptId = `TR-${existingTranscript.student_id}-${existingTranscript.academic_year}-${existingTranscript.semester}-v${nextVersion}-${Date.now()}`;

        const revisedTranscript: AcademicTranscript = {
            ...regenerated,
            transcript_id: revisedTranscriptId,
            version_number: nextVersion,
            previous_version_id: existingTranscript.transcript_id,
            revision_reason: params.revision_reason,
            generated_at: existingTranscript.generated_at
        };

        const checksum = this.generateChecksum({
            transcript_id: revisedTranscript.transcript_id,
            student_id: revisedTranscript.student_id,
            academic_year: revisedTranscript.academic_year,
            semester: revisedTranscript.semester,
            courses: revisedTranscript.courses,
            cumulative_summary: revisedTranscript.cumulative_summary,
            source_report_card_ids: revisedTranscript.source_report_card_ids,
            version_number: revisedTranscript.version_number,
            previous_version_id: revisedTranscript.previous_version_id
        });

        const savedRevisedTranscript = await this.repository.saveTranscript({
            ...revisedTranscript,
            checksum
        });

        const historyEntry: TranscriptHistoryEntry = {
            history_id: `TRH-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            transcript_id: existingTranscript.transcript_id,
            version_number: nextVersion,
            previous_average_percentage: existingTranscript.cumulative_summary.average_percentage,
            new_average_percentage: savedRevisedTranscript.cumulative_summary.average_percentage,
            previous_status: existingTranscript.status,
            new_status: savedRevisedTranscript.status,
            revision_reason: params.revision_reason,
            actor_id: params.actor_id,
            timestamp: now,
            checksum: savedRevisedTranscript.checksum
        };
        await this.repository.recordHistory(historyEntry);

        await this.repository.recordAuditEvent({
            event_id: `AE-TR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            transcript_id: savedRevisedTranscript.transcript_id,
            student_id: savedRevisedTranscript.student_id,
            version_number: savedRevisedTranscript.version_number,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'TRANSCRIPT_REGENERATED',
            timestamp: now,
            source_checksum: savedRevisedTranscript.checksum,
            details: {
                previous_version_id: existingTranscript.transcript_id,
                revision_reason: params.revision_reason
            }
        });

        return savedRevisedTranscript;
    }

    async archiveTranscript(params: ArchiveTranscriptParams): Promise<AcademicTranscript> {
        this.validator.validateSecurity(params);

        const transcript = await this.repository.getTranscript(params.transcript_id);
        if (!transcript) {
            throw new Error(`TRANSCRIPT_NOT_FOUND: ${params.transcript_id}`);
        }

        this.validator.validateStatusTransition(transcript.status, 'ARCHIVED');

        const now = new Date().toISOString();
        const updatedTranscript: AcademicTranscript = {
            ...transcript,
            status: 'ARCHIVED'
        };

        const checksum = this.generateChecksum({
            transcript_id: updatedTranscript.transcript_id,
            student_id: updatedTranscript.student_id,
            academic_year: updatedTranscript.academic_year,
            semester: updatedTranscript.semester,
            courses: updatedTranscript.courses,
            cumulative_summary: updatedTranscript.cumulative_summary,
            source_report_card_ids: updatedTranscript.source_report_card_ids,
            version_number: updatedTranscript.version_number,
            status: updatedTranscript.status
        });

        const savedTranscript = await this.repository.saveTranscript({
            ...updatedTranscript,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-TR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            transcript_id: savedTranscript.transcript_id,
            student_id: savedTranscript.student_id,
            version_number: savedTranscript.version_number,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'TRANSCRIPT_ARCHIVED',
            timestamp: now,
            source_checksum: savedTranscript.checksum
        });

        return savedTranscript;
    }

    async getStudentTranscript(params: GetStudentTranscriptParams): Promise<AcademicTranscript | null> {
        this.validator.validateSecurity(params);
        this.validator.validateStudentScope(params.authenticated_student_id, params.student_id);

        const transcript = await this.repository.getLatestTranscript(
            params.student_id,
            params.academic_year,
            params.semester
        );
        if (!transcript) return null;

        await this.repository.recordAuditEvent({
            event_id: `AE-TR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            transcript_id: transcript.transcript_id,
            student_id: transcript.student_id,
            version_number: transcript.version_number,
            actor_id: params.authenticated_student_id,
            actor_role: 'STUDENT',
            action: 'TRANSCRIPT_VIEWED',
            timestamp: new Date().toISOString(),
            source_checksum: transcript.checksum
        });

        return transcript;
    }

    async getTeacherTranscript(params: GetTeacherTranscriptParams): Promise<AcademicTranscript | null> {
        this.validator.validateSecurity(params);

        const transcript = await this.repository.getLatestTranscript(
            params.student_id,
            params.academic_year,
            params.semester
        );
        if (!transcript) return null;

        if (params.teacher_authorized_courses) {
            if (params.course_id) {
                this.validator.validateTeacherScope(params.teacher_id, params.course_id, params.teacher_authorized_courses);
            } else {
                for (const course of transcript.courses) {
                    this.validator.validateTeacherScope(params.teacher_id, course.course_id, params.teacher_authorized_courses);
                }
            }
        }

        await this.repository.recordAuditEvent({
            event_id: `AE-TR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            transcript_id: transcript.transcript_id,
            student_id: transcript.student_id,
            version_number: transcript.version_number,
            actor_id: params.teacher_id,
            actor_role: 'TEACHER',
            action: 'TRANSCRIPT_VIEWED',
            timestamp: new Date().toISOString(),
            source_checksum: transcript.checksum
        });

        return transcript;
    }
}

export const academicTranscriptEngine = new AcademicTranscriptEngine();
