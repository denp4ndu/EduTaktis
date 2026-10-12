import { 
    Assessment, 
    AssessmentStatus, 
    AssessmentType, 
    AssessmentRubric, 
    AssessmentAuditEvent 
} from '../types/curriculum';
import { assessmentStorageProvider, AssessmentStorageProvider } from './assessmentStorageProvider';
import { assessmentValidationEngine, AssessmentValidationEngine } from './assessmentValidationEngine';
import { deepFreeze } from './aiPromptEngine';

export interface CreateAssessmentParams {
    assignment_id: string;
    activity_id: string;
    course_id: string;
    teacher_id: string;
    title: string;
    description?: string;
    assessment_type: AssessmentType;
    max_score: number;
    passing_score?: number;
    rubric?: AssessmentRubric;
    initial_status?: AssessmentStatus;
    actor_id: string;
    actor_role: string;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
}

export class AssessmentEngine {
    constructor(
        private storage: AssessmentStorageProvider = assessmentStorageProvider,
        private validator: AssessmentValidationEngine = assessmentValidationEngine
    ) {}

    async createAssessment(params: CreateAssessmentParams): Promise<Assessment> {
        this.validator.validateIdentity({
            assignment_id: params.assignment_id,
            activity_id: params.activity_id,
            course_id: params.course_id,
            teacher_id: params.teacher_id
        });
        this.validator.validateSecurity(params);
        this.validator.validateAssessmentType(params.assessment_type);
        this.validator.validateMaxScoreAndPassingScore(params.max_score, params.passing_score);

        if (params.teacher_authorized_courses) {
            this.validator.validateTeacherScope(params.teacher_id, params.course_id, params.teacher_authorized_courses);
        }

        if (params.rubric) {
            this.validator.validateRubric(params.rubric, params.max_score);
        }

        const initialStatus: AssessmentStatus = params.initial_status || 'DRAFT';
        this.validator.validateStatusTransition(null, initialStatus);

        const assessmentId = `ASM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const assessment: Assessment = deepFreeze({
            assessment_id: assessmentId,
            assignment_id: params.assignment_id,
            activity_id: params.activity_id,
            course_id: params.course_id,
            teacher_id: params.teacher_id,
            assessment_status: initialStatus,
            assessment_type: params.assessment_type,
            title: params.title,
            description: params.description,
            max_score: params.max_score,
            passing_score: params.passing_score,
            rubric: params.rubric ? deepFreeze({ ...params.rubric }) : undefined,
            created_at: now,
            updated_at: now,
            version_number: 1
        });

        await this.storage.saveAssessment(assessment);

        const auditEvent: AssessmentAuditEvent = deepFreeze({
            event_id: `EVT-ASM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            assessment_id: assessment.assessment_id,
            assignment_id: assessment.assignment_id,
            teacher_id: assessment.teacher_id,
            event_type: 'ASSESSMENT_CREATED',
            new_state: initialStatus,
            version_number: 1,
            timestamp: now,
            actor_id: params.actor_id,
            actor_role: params.actor_role
        });

        await this.storage.recordAuditEvent(auditEvent);

        return assessment;
    }

    async updateStatus(
        assessmentId: string, 
        targetStatus: AssessmentStatus, 
        actorId: string, 
        actorRole: string
    ): Promise<Assessment> {
        const assessment = await this.storage.getAssessment(assessmentId);
        if (!assessment) {
            throw new Error(`ASSESSMENT_NOT_FOUND: ${assessmentId}`);
        }

        this.validator.validateStatusTransition(assessment.assessment_status, targetStatus);

        const now = new Date().toISOString();
        const updated: Assessment = deepFreeze({
            ...assessment,
            assessment_status: targetStatus,
            updated_at: now,
            version_number: assessment.version_number + 1
        });

        await this.storage.saveAssessment(updated);

        let eventType: AssessmentAuditEvent['event_type'] = 'ASSESSMENT_CREATED';
        if (targetStatus === 'PUBLISHED') eventType = 'ASSESSMENT_PUBLISHED';
        else if (targetStatus === 'OPEN') eventType = 'ASSESSMENT_OPENED';
        else if (targetStatus === 'CLOSED') eventType = 'ASSESSMENT_CLOSED';
        else if (targetStatus === 'ARCHIVED') eventType = 'ASSESSMENT_ARCHIVED';

        const auditEvent: AssessmentAuditEvent = deepFreeze({
            event_id: `EVT-ASM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            assessment_id: assessment.assessment_id,
            assignment_id: assessment.assignment_id,
            teacher_id: assessment.teacher_id,
            event_type: eventType,
            previous_state: assessment.assessment_status,
            new_state: targetStatus,
            version_number: updated.version_number,
            timestamp: now,
            actor_id: actorId,
            actor_role: actorRole
        });

        await this.storage.recordAuditEvent(auditEvent);

        return updated;
    }

    async publishAssessment(assessmentId: string, actorId: string, actorRole: string): Promise<Assessment> {
        return this.updateStatus(assessmentId, 'PUBLISHED', actorId, actorRole);
    }

    async openAssessment(assessmentId: string, actorId: string, actorRole: string): Promise<Assessment> {
        return this.updateStatus(assessmentId, 'OPEN', actorId, actorRole);
    }

    async closeAssessment(assessmentId: string, actorId: string, actorRole: string): Promise<Assessment> {
        return this.updateStatus(assessmentId, 'CLOSED', actorId, actorRole);
    }

    async archiveAssessment(assessmentId: string, actorId: string, actorRole: string): Promise<Assessment> {
        return this.updateStatus(assessmentId, 'ARCHIVED', actorId, actorRole);
    }

    async getAssessment(assessmentId: string): Promise<Assessment | null> {
        return this.storage.getAssessment(assessmentId);
    }

    async getAssessmentsByCourse(courseId: string): Promise<Assessment[]> {
        const list = await this.storage.getAssessmentsByCourse(courseId);
        return deepFreeze(list) as Assessment[];
    }
}

export const assessmentEngine = new AssessmentEngine();
