import { 
    GradeRecord, 
    GradeHistoryEntry, 
    Assessment, 
    AssessmentAuditEvent 
} from '../types/curriculum';
import { assessmentStorageProvider, AssessmentStorageProvider } from './assessmentStorageProvider';
import { assessmentValidationEngine, AssessmentValidationEngine } from './assessmentValidationEngine';
import { deepFreeze } from './aiPromptEngine';

export interface GradeSubmissionParams {
    assessment_id: string;
    submission_id: string;
    student_id: string;
    course_id: string;
    teacher_id: string;
    raw_score: number;
    rubric_scores?: Record<string, number>;
    feedback?: string;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
    actor_id: string;
    actor_role: string;
}

export interface ReviseGradeParams {
    grade_id: string;
    new_raw_score: number;
    new_rubric_scores?: Record<string, number>;
    revision_reason: string;
    new_feedback?: string;
    teacher_id: string;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
    actor_id: string;
    actor_role: string;
}

export class GradingEngine {
    constructor(
        private storage: AssessmentStorageProvider = assessmentStorageProvider,
        private validator: AssessmentValidationEngine = assessmentValidationEngine
    ) {}

    static calculatePercentage(rawScore: number, maxScore: number): number {
        if (maxScore <= 0) return 0;
        const pct = (rawScore / maxScore) * 100;
        return Math.round(pct * 100) / 100;
    }

    static calculateGrade(percentage: number): string {
        if (percentage >= 90) return 'A';
        if (percentage >= 80) return 'B';
        if (percentage >= 70) return 'C';
        if (percentage >= 60) return 'D';
        return 'E';
    }

    static calculatePassed(rawScore: number, maxScore: number, passingScore?: number): boolean {
        if (passingScore !== undefined) {
            return rawScore >= passingScore;
        }
        const percentage = GradingEngine.calculatePercentage(rawScore, maxScore);
        return percentage >= 60;
    }

    async gradeSubmission(params: GradeSubmissionParams): Promise<GradeRecord> {
        this.validator.validateSecurity(params);

        const assessment = await this.storage.getAssessment(params.assessment_id);
        if (!assessment) {
            throw new Error(`ASSESSMENT_NOT_FOUND: ${params.assessment_id}`);
        }

        if (assessment.assessment_status === 'ARCHIVED') {
            throw new Error('CANNOT_GRADE_ARCHIVED_ASSESSMENT');
        }

        if (assessment.assessment_status === 'CLOSED') {
            throw new Error('CANNOT_GRADE_CLOSED_ASSESSMENT_WITHOUT_REVISION');
        }

        if (params.teacher_authorized_courses) {
            this.validator.validateTeacherScope(params.teacher_id, params.course_id, params.teacher_authorized_courses);
        }

        let finalRawScore = params.raw_score;

        if (params.rubric_scores && assessment.rubric) {
            this.validator.validateRubricScores(params.rubric_scores, assessment.rubric);
            const sumRubric = Object.values(params.rubric_scores).reduce((acc, curr) => acc + curr, 0);
            if (params.raw_score !== undefined && params.raw_score !== sumRubric) {
                finalRawScore = sumRubric;
            }
        }

        this.validator.validateScore(finalRawScore, assessment.max_score);

        const percentage = GradingEngine.calculatePercentage(finalRawScore, assessment.max_score);
        const grade = GradingEngine.calculateGrade(percentage);
        const passed = GradingEngine.calculatePassed(finalRawScore, assessment.max_score, assessment.passing_score);

        const gradeId = `GRD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const gradeRecord: GradeRecord = deepFreeze({
            grade_id: gradeId,
            assessment_id: params.assessment_id,
            submission_id: params.submission_id,
            student_id: params.student_id,
            course_id: params.course_id,
            teacher_id: params.teacher_id,
            raw_score: finalRawScore,
            max_score: assessment.max_score,
            percentage,
            grade,
            passed,
            rubric_scores: params.rubric_scores ? deepFreeze({ ...params.rubric_scores }) : undefined,
            feedback: params.feedback,
            version_number: 1,
            created_at: now,
            updated_at: now
        });

        await this.storage.saveGradeRecord(gradeRecord);

        const auditEvent: AssessmentAuditEvent = deepFreeze({
            event_id: `EVT-GRD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            assessment_id: assessment.assessment_id,
            assignment_id: assessment.assignment_id,
            student_id: params.student_id,
            teacher_id: params.teacher_id,
            event_type: 'GRADE_CREATED',
            new_state: { raw_score: finalRawScore, percentage, grade, passed },
            version_number: 1,
            timestamp: now,
            actor_id: params.actor_id,
            actor_role: params.actor_role
        });

        await this.storage.recordAuditEvent(auditEvent);

        return gradeRecord;
    }

    async reviseGrade(params: ReviseGradeParams): Promise<GradeRecord> {
        this.validator.validateSecurity(params);

        if (!params.revision_reason || typeof params.revision_reason !== 'string' || params.revision_reason.trim().length === 0) {
            throw new Error('REVISION_REASON_REQUIRED');
        }

        const currentGrade = await this.storage.getGradeRecord(params.grade_id);
        if (!currentGrade) {
            throw new Error(`GRADE_RECORD_NOT_FOUND: ${params.grade_id}`);
        }

        const assessment = await this.storage.getAssessment(currentGrade.assessment_id);
        if (!assessment) {
            throw new Error(`ASSESSMENT_NOT_FOUND: ${currentGrade.assessment_id}`);
        }

        if (params.teacher_authorized_courses) {
            this.validator.validateTeacherScope(params.teacher_id, currentGrade.course_id, params.teacher_authorized_courses);
        }

        let newRawScore = params.new_raw_score;
        if (params.new_rubric_scores && assessment.rubric) {
            this.validator.validateRubricScores(params.new_rubric_scores, assessment.rubric);
            const sumRubric = Object.values(params.new_rubric_scores).reduce((acc, curr) => acc + curr, 0);
            if (params.new_raw_score !== undefined && params.new_raw_score !== sumRubric) {
                newRawScore = sumRubric;
            }
        }

        this.validator.validateScore(newRawScore, assessment.max_score);

        const newPercentage = GradingEngine.calculatePercentage(newRawScore, assessment.max_score);
        const newGrade = GradingEngine.calculateGrade(newPercentage);
        const newPassed = GradingEngine.calculatePassed(newRawScore, assessment.max_score, assessment.passing_score);
        const now = new Date().toISOString();

        // 1. Record history entry
        const historyEntry: GradeHistoryEntry = deepFreeze({
            history_id: `HST-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            grade_id: currentGrade.grade_id,
            previous_score: currentGrade.raw_score,
            new_score: newRawScore,
            previous_percentage: currentGrade.percentage,
            new_percentage: newPercentage,
            previous_grade: currentGrade.grade,
            new_grade: newGrade,
            revision_reason: params.revision_reason,
            actor_id: params.actor_id,
            timestamp: now,
            version_number: currentGrade.version_number
        });

        await this.storage.saveGradeHistory(historyEntry);

        // 2. Create updated GradeRecord with version increment
        const revisedGrade: GradeRecord = deepFreeze({
            ...currentGrade,
            raw_score: newRawScore,
            percentage: newPercentage,
            grade: newGrade,
            passed: newPassed,
            rubric_scores: params.new_rubric_scores ? deepFreeze({ ...params.new_rubric_scores }) : currentGrade.rubric_scores,
            feedback: params.new_feedback !== undefined ? params.new_feedback : currentGrade.feedback,
            version_number: currentGrade.version_number + 1,
            updated_at: now
        });

        await this.storage.saveGradeRecord(revisedGrade);

        // 3. Record Audit Event
        const auditEvent: AssessmentAuditEvent = deepFreeze({
            event_id: `EVT-GRD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            assessment_id: assessment.assessment_id,
            assignment_id: assessment.assignment_id,
            student_id: currentGrade.student_id,
            teacher_id: params.teacher_id,
            event_type: 'GRADE_REVISED',
            previous_state: { raw_score: currentGrade.raw_score, grade: currentGrade.grade, version: currentGrade.version_number },
            new_state: { raw_score: newRawScore, grade: newGrade, version: revisedGrade.version_number, reason: params.revision_reason },
            version_number: revisedGrade.version_number,
            timestamp: now,
            actor_id: params.actor_id,
            actor_role: params.actor_role
        });

        await this.storage.recordAuditEvent(auditEvent);

        return revisedGrade;
    }

    async addFeedback(
        gradeId: string, 
        feedback: string, 
        teacherId: string, 
        actorId: string, 
        actorRole: string
    ): Promise<GradeRecord> {
        this.validator.validateSecurity(feedback);

        const currentGrade = await this.storage.getGradeRecord(gradeId);
        if (!currentGrade) {
            throw new Error(`GRADE_RECORD_NOT_FOUND: ${gradeId}`);
        }

        const now = new Date().toISOString();
        const updated: GradeRecord = deepFreeze({
            ...currentGrade,
            feedback,
            updated_at: now
        });

        await this.storage.saveGradeRecord(updated);

        const auditEvent: AssessmentAuditEvent = deepFreeze({
            event_id: `EVT-FB-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            assessment_id: currentGrade.assessment_id,
            student_id: currentGrade.student_id,
            teacher_id: teacherId,
            event_type: 'FEEDBACK_ADDED',
            new_state: { feedback_length: feedback.length },
            version_number: currentGrade.version_number,
            timestamp: now,
            actor_id: actorId,
            actor_role: actorRole
        });

        await this.storage.recordAuditEvent(auditEvent);

        return updated;
    }

    async getGradeRecord(gradeId: string, authenticatedUserId: string, userRole: 'TEACHER' | 'STUDENT'): Promise<GradeRecord | null> {
        const grade = await this.storage.getGradeRecord(gradeId);
        if (!grade) return null;

        if (userRole === 'STUDENT') {
            this.validator.validateStudentScope(authenticatedUserId, grade.student_id);
        }

        return grade;
    }

    async getGradeHistory(gradeId: string, authenticatedUserId: string, userRole: 'TEACHER' | 'STUDENT'): Promise<GradeHistoryEntry[]> {
        const grade = await this.storage.getGradeRecord(gradeId);
        if (!grade) {
            throw new Error(`GRADE_RECORD_NOT_FOUND: ${gradeId}`);
        }

        if (userRole === 'STUDENT') {
            this.validator.validateStudentScope(authenticatedUserId, grade.student_id);
        }

        const history = await this.storage.getGradeHistory(gradeId);
        return deepFreeze(history) as GradeHistoryEntry[];
    }
}

export const gradingEngine = new GradingEngine();
