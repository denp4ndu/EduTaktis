import { 
    AcademicReportCard, 
    ReportCardStatus, 
    ReportCardCompletionStatus, 
    ReportCardCourse, 
    ReportCardAssessmentSummary, 
    ReportCardHistoryEntry, 
    ReportCardAuditEvent, 
    AssessmentType, 
    PublishedArtifact 
} from '../types/curriculum';
import { 
    academicReportCardRepositoryEngine, 
    AcademicReportCardRepositoryEngine 
} from './academicReportCardRepositoryEngine';
import { 
    academicReportCardValidationEngine, 
    AcademicReportCardValidationEngine 
} from './academicReportCardValidationEngine';
import { 
    assessmentStorageProvider, 
    AssessmentStorageProvider 
} from './assessmentStorageProvider';
import { deepFreeze } from './aiPromptEngine';

export interface CourseAssessmentConfig {
    assessment_id: string;
    assessment_title: string;
    assessment_type: AssessmentType;
    max_score: number;
    weight: number;
    passing_score?: number;
}

export interface CourseCalculationInput {
    course_id: string;
    subject: string;
    teacher_id: string;
    assessments: CourseAssessmentConfig[];
    curriculum_context: PublishedArtifact['curriculum_context'];
    published_artifact?: PublishedArtifact;
    expected_checksum?: string;
}

export interface CalculateReportCardParams {
    student_id: string;
    academic_period: string;
    courses: CourseCalculationInput[];
    actor_id: string;
    actor_role: string;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
}

export interface FinalizeReportCardParams {
    report_card_id: string;
    actor_id: string;
    actor_role: string;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
}

export interface PublishReportCardParams {
    report_card_id: string;
    actor_id: string;
    actor_role: string;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
}

export interface ReviseReportCardParams {
    report_card_id: string;
    revision_reason: string;
    courses: CourseCalculationInput[];
    actor_id: string;
    actor_role: string;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
}

export interface ArchiveReportCardParams {
    report_card_id: string;
    actor_id: string;
    actor_role: string;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
}

export interface GetStudentReportCardParams {
    authenticated_student_id: string;
    student_id: string;
    academic_period: string;
}

export interface GetTeacherReportCardParams {
    teacher_id: string;
    student_id: string;
    academic_period: string;
    course_id?: string;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
}

export class AcademicReportCardEngine {
    constructor(
        private repository: AcademicReportCardRepositoryEngine = academicReportCardRepositoryEngine,
        private validator: AcademicReportCardValidationEngine = academicReportCardValidationEngine,
        private assessmentStorage: AssessmentStorageProvider = assessmentStorageProvider
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
        return `RC-CHK-${Math.abs(hash).toString(16)}`;
    }

    async calculateReportCard(params: CalculateReportCardParams): Promise<AcademicReportCard> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            student_id: params.student_id,
            academic_period: params.academic_period,
            created_by: params.actor_id
        });

        if (params.courses.length === 0) {
            throw new Error('MISSING_COURSES_DATA: At least one course is required');
        }

        const calculatedCourses: ReportCardCourse[] = [];
        let totalWeightedPercentageSum = 0;
        let totalCourseWeight = 0;
        let allCoursesComplete = true;

        for (const cInput of params.courses) {
            this.validator.validateSecurity(cInput);

            // Teacher scope check if specified
            if (params.actor_role === 'TEACHER' && params.teacher_authorized_courses) {
                this.validator.validateTeacherScope(params.actor_id, cInput.course_id, params.teacher_authorized_courses);
            }

            // Checksum verification if published artifact is provided
            if (cInput.published_artifact && cInput.expected_checksum) {
                this.validator.validateChecksum(cInput.expected_checksum, cInput.published_artifact.source_checksum);
            }

            this.validator.validateCurriculumContext(cInput.curriculum_context);

            const assessmentSummaries: ReportCardAssessmentSummary[] = [];
            let courseWeightSum = 0;
            let courseWeightedScoreSum = 0;
            let courseHasUngraded = false;

            // Fetch student grades for this course
            const studentGrades = await this.assessmentStorage.getGradeRecordsByStudentAndCourse(params.student_id, cInput.course_id);

            for (const aConfig of cInput.assessments) {
                if (aConfig.weight <= 0) {
                    throw new Error(`INVALID_ASSESSMENT_WEIGHT: Weight for ${aConfig.assessment_id} must be positive`);
                }

                const grade = studentGrades.find(g => g.assessment_id === aConfig.assessment_id);
                if (grade) {
                    assessmentSummaries.push({
                        assessment_id: aConfig.assessment_id,
                        assessment_title: aConfig.assessment_title,
                        assessment_type: aConfig.assessment_type,
                        max_score: aConfig.max_score,
                        weight: aConfig.weight,
                        raw_score: grade.raw_score,
                        percentage: grade.percentage,
                        grade_letter: grade.grade,
                        passed: grade.passed,
                        graded: true
                    });
                    courseWeightedScoreSum += grade.percentage * aConfig.weight;
                    courseWeightSum += aConfig.weight;
                } else {
                    courseHasUngraded = true;
                    assessmentSummaries.push({
                        assessment_id: aConfig.assessment_id,
                        assessment_title: aConfig.assessment_title,
                        assessment_type: aConfig.assessment_type,
                        max_score: aConfig.max_score,
                        weight: aConfig.weight,
                        graded: false
                    });
                }
            }

            let courseFinalPercentage = 0;
            let courseCompletionStatus: ReportCardCompletionStatus = 'COMPLETE';

            if (courseHasUngraded || assessmentSummaries.length === 0) {
                courseCompletionStatus = assessmentSummaries.some(a => a.graded) ? 'INCOMPLETE' : 'NOT_GRADED';
                allCoursesComplete = false;
                courseFinalPercentage = courseWeightSum > 0 ? Math.round((courseWeightedScoreSum / courseWeightSum) * 100) / 100 : 0;
            } else {
                courseFinalPercentage = Math.round((courseWeightedScoreSum / courseWeightSum) * 100) / 100;
            }

            const courseGradeLetter = AcademicReportCardEngine.calculateGradeLetter(courseFinalPercentage);
            const coursePassing = courseFinalPercentage >= 60;

            calculatedCourses.push({
                course_id: cInput.course_id,
                subject: cInput.subject,
                teacher_id: cInput.teacher_id,
                assessment_summary: assessmentSummaries,
                final_percentage: courseFinalPercentage,
                grade_letter: courseGradeLetter,
                passing_status: coursePassing,
                completion_status: courseCompletionStatus
            });

            totalWeightedPercentageSum += courseFinalPercentage;
            totalCourseWeight += 1;
        }

        const overallAverage = totalCourseWeight > 0 ? Math.round((totalWeightedPercentageSum / totalCourseWeight) * 100) / 100 : 0;
        const overallGradeLetter = AcademicReportCardEngine.calculateGradeLetter(overallAverage);
        const overallStatus: ReportCardCompletionStatus = allCoursesComplete ? 'COMPLETE' : 'INCOMPLETE';
        const initialStatus: ReportCardStatus = allCoursesComplete ? 'CALCULATED' : 'INCOMPLETE';

        const completedCoursesCount = calculatedCourses.filter(c => c.completion_status === 'COMPLETE').length;

        const reportCardId = `RC-${params.student_id}-${params.academic_period}-${Date.now()}`;
        const now = new Date().toISOString();

        // Primary curriculum context from first course
        const primaryCurriculumContext = params.courses[0].curriculum_context;

        const baseCard: AcademicReportCard = {
            report_card_id: reportCardId,
            student_id: params.student_id,
            academic_period: params.academic_period,
            status: initialStatus,
            courses: calculatedCourses,
            overall_average: overallAverage,
            overall_grade_letter: overallGradeLetter,
            overall_status: overallStatus,
            total_courses: calculatedCourses.length,
            completed_courses: completedCoursesCount,
            version_number: 1,
            checksum: '',
            created_at: now,
            updated_at: now,
            created_by: params.actor_id,
            curriculum_context: primaryCurriculumContext
        };

        const checksum = this.generateChecksum({
            report_card_id: baseCard.report_card_id,
            student_id: baseCard.student_id,
            academic_period: baseCard.academic_period,
            courses: baseCard.courses,
            overall_average: baseCard.overall_average,
            version_number: baseCard.version_number
        });

        const finalCard: AcademicReportCard = {
            ...baseCard,
            checksum
        };

        const savedCard = await this.repository.saveReportCard(finalCard);

        const eventType = initialStatus === 'CALCULATED' ? 'REPORT_CARD_CALCULATED' : 'REPORT_CARD_CREATED';
        await this.repository.recordAuditEvent({
            event_id: `AE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            report_card_id: savedCard.report_card_id,
            student_id: savedCard.student_id,
            version_number: savedCard.version_number,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            checksum: savedCard.checksum,
            event_type: eventType,
            new_state: {
                status: savedCard.status,
                overall_average: savedCard.overall_average,
                overall_status: savedCard.overall_status
            }
        });

        return savedCard;
    }

    async finalizeReportCard(params: FinalizeReportCardParams): Promise<AcademicReportCard> {
        this.validator.validateSecurity(params);

        const card = await this.repository.getReportCard(params.report_card_id);
        if (!card) {
            throw new Error(`REPORT_CARD_NOT_FOUND: ${params.report_card_id}`);
        }

        if (params.actor_role === 'TEACHER' && params.teacher_authorized_courses) {
            for (const course of card.courses) {
                this.validator.validateTeacherScope(params.actor_id, course.course_id, params.teacher_authorized_courses);
            }
        }

        this.validator.validateFinalization(card);
        this.validator.validateStatusTransition(card.status, 'FINALIZED');

        const now = new Date().toISOString();
        const updatedCard: AcademicReportCard = {
            ...card,
            status: 'FINALIZED',
            finalized_at: now,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            report_card_id: updatedCard.report_card_id,
            student_id: updatedCard.student_id,
            academic_period: updatedCard.academic_period,
            courses: updatedCard.courses,
            overall_average: updatedCard.overall_average,
            version_number: updatedCard.version_number,
            status: updatedCard.status
        });

        const savedCard = await this.repository.saveReportCard({
            ...updatedCard,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            report_card_id: savedCard.report_card_id,
            student_id: savedCard.student_id,
            version_number: savedCard.version_number,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            checksum: savedCard.checksum,
            event_type: 'REPORT_CARD_FINALIZED',
            previous_state: { status: card.status },
            new_state: { status: savedCard.status }
        });

        return savedCard;
    }

    async publishReportCard(params: PublishReportCardParams): Promise<AcademicReportCard> {
        this.validator.validateSecurity(params);

        const card = await this.repository.getReportCard(params.report_card_id);
        if (!card) {
            throw new Error(`REPORT_CARD_NOT_FOUND: ${params.report_card_id}`);
        }

        if (params.actor_role === 'TEACHER' && params.teacher_authorized_courses) {
            for (const course of card.courses) {
                this.validator.validateTeacherScope(params.actor_id, course.course_id, params.teacher_authorized_courses);
            }
        }

        this.validator.validatePublishing(card);
        this.validator.validateStatusTransition(card.status, 'PUBLISHED');

        const now = new Date().toISOString();
        const updatedCard: AcademicReportCard = {
            ...card,
            status: 'PUBLISHED',
            published_at: now,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            report_card_id: updatedCard.report_card_id,
            student_id: updatedCard.student_id,
            academic_period: updatedCard.academic_period,
            courses: updatedCard.courses,
            overall_average: updatedCard.overall_average,
            version_number: updatedCard.version_number,
            status: updatedCard.status
        });

        const savedCard = await this.repository.saveReportCard({
            ...updatedCard,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            report_card_id: savedCard.report_card_id,
            student_id: savedCard.student_id,
            version_number: savedCard.version_number,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            checksum: savedCard.checksum,
            event_type: 'REPORT_CARD_PUBLISHED',
            previous_state: { status: card.status },
            new_state: { status: savedCard.status }
        });

        return savedCard;
    }

    async reviseReportCard(params: ReviseReportCardParams): Promise<AcademicReportCard> {
        this.validator.validateSecurity(params);
        this.validator.validateRevision(params.revision_reason);

        const existingCard = await this.repository.getReportCard(params.report_card_id);
        if (!existingCard) {
            throw new Error(`REPORT_CARD_NOT_FOUND: ${params.report_card_id}`);
        }

        if (existingCard.status === 'ARCHIVED') {
            throw new Error('TERMINAL_STATE_ARCHIVED_CANNOT_TRANSITION');
        }

        // Calculate revised data
        const recalculated = await this.calculateReportCard({
            student_id: existingCard.student_id,
            academic_period: existingCard.academic_period,
            courses: params.courses,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            teacher_authorized_courses: params.teacher_authorized_courses
        });

        const now = new Date().toISOString();
        const nextVersion = existingCard.version_number + 1;
        const revisedCardId = `RC-${existingCard.student_id}-${existingCard.academic_period}-v${nextVersion}-${Date.now()}`;

        const revisedCard: AcademicReportCard = {
            ...recalculated,
            report_card_id: revisedCardId,
            version_number: nextVersion,
            previous_version_id: existingCard.report_card_id,
            revision_reason: params.revision_reason,
            created_at: existingCard.created_at,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            report_card_id: revisedCard.report_card_id,
            student_id: revisedCard.student_id,
            academic_period: revisedCard.academic_period,
            courses: revisedCard.courses,
            overall_average: revisedCard.overall_average,
            version_number: revisedCard.version_number,
            previous_version_id: revisedCard.previous_version_id
        });

        const savedRevisedCard = await this.repository.saveReportCard({
            ...revisedCard,
            checksum
        });

        // Record history
        const historyEntry: ReportCardHistoryEntry = {
            history_id: `RCH-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            report_card_id: existingCard.report_card_id,
            version_number: nextVersion,
            previous_overall_average: existingCard.overall_average,
            new_overall_average: savedRevisedCard.overall_average,
            previous_status: existingCard.status,
            new_status: savedRevisedCard.status,
            revision_reason: params.revision_reason,
            actor_id: params.actor_id,
            timestamp: now,
            checksum: savedRevisedCard.checksum
        };
        await this.repository.recordHistory(historyEntry);

        await this.repository.recordAuditEvent({
            event_id: `AE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            report_card_id: savedRevisedCard.report_card_id,
            student_id: savedRevisedCard.student_id,
            version_number: savedRevisedCard.version_number,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            checksum: savedRevisedCard.checksum,
            event_type: 'REPORT_CARD_REVISED',
            previous_state: {
                report_card_id: existingCard.report_card_id,
                version_number: existingCard.version_number,
                overall_average: existingCard.overall_average
            },
            new_state: {
                report_card_id: savedRevisedCard.report_card_id,
                version_number: savedRevisedCard.version_number,
                overall_average: savedRevisedCard.overall_average,
                revision_reason: params.revision_reason
            }
        });

        return savedRevisedCard;
    }

    async archiveReportCard(params: ArchiveReportCardParams): Promise<AcademicReportCard> {
        this.validator.validateSecurity(params);

        const card = await this.repository.getReportCard(params.report_card_id);
        if (!card) {
            throw new Error(`REPORT_CARD_NOT_FOUND: ${params.report_card_id}`);
        }

        if (params.actor_role === 'TEACHER' && params.teacher_authorized_courses) {
            for (const course of card.courses) {
                this.validator.validateTeacherScope(params.actor_id, course.course_id, params.teacher_authorized_courses);
            }
        }

        this.validator.validateStatusTransition(card.status, 'ARCHIVED');

        const now = new Date().toISOString();
        const updatedCard: AcademicReportCard = {
            ...card,
            status: 'ARCHIVED',
            updated_at: now
        };

        const checksum = this.generateChecksum({
            report_card_id: updatedCard.report_card_id,
            student_id: updatedCard.student_id,
            academic_period: updatedCard.academic_period,
            courses: updatedCard.courses,
            overall_average: updatedCard.overall_average,
            version_number: updatedCard.version_number,
            status: updatedCard.status
        });

        const savedCard = await this.repository.saveReportCard({
            ...updatedCard,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            report_card_id: savedCard.report_card_id,
            student_id: savedCard.student_id,
            version_number: savedCard.version_number,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            checksum: savedCard.checksum,
            event_type: 'REPORT_CARD_ARCHIVED',
            previous_state: { status: card.status },
            new_state: { status: savedCard.status }
        });

        return savedCard;
    }

    async getStudentReportCard(params: GetStudentReportCardParams): Promise<AcademicReportCard | null> {
        this.validator.validateSecurity(params);
        this.validator.validateStudentScope(params.authenticated_student_id, params.student_id);

        const card = await this.repository.getLatestByStudent(params.student_id, params.academic_period);
        if (!card) return null;

        await this.repository.recordAuditEvent({
            event_id: `AE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            report_card_id: card.report_card_id,
            student_id: card.student_id,
            version_number: card.version_number,
            actor_id: params.authenticated_student_id,
            actor_role: 'STUDENT',
            timestamp: new Date().toISOString(),
            checksum: card.checksum,
            event_type: 'REPORT_CARD_VIEWED'
        });

        return card;
    }

    async getTeacherReportCard(params: GetTeacherReportCardParams): Promise<AcademicReportCard | null> {
        this.validator.validateSecurity(params);

        const card = await this.repository.getLatestByStudent(params.student_id, params.academic_period);
        if (!card) return null;

        if (params.teacher_authorized_courses) {
            if (params.course_id) {
                this.validator.validateTeacherScope(params.teacher_id, params.course_id, params.teacher_authorized_courses);
            } else {
                for (const course of card.courses) {
                    this.validator.validateTeacherScope(params.teacher_id, course.course_id, params.teacher_authorized_courses);
                }
            }
        }

        await this.repository.recordAuditEvent({
            event_id: `AE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            report_card_id: card.report_card_id,
            student_id: card.student_id,
            version_number: card.version_number,
            actor_id: params.teacher_id,
            actor_role: 'TEACHER',
            timestamp: new Date().toISOString(),
            checksum: card.checksum,
            event_type: 'REPORT_CARD_VIEWED'
        });

        return card;
    }
}

export const academicReportCardEngine = new AcademicReportCardEngine();
