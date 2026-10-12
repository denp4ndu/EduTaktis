import { 
    StudentBehaviorEvent, 
    BehaviorEventStatus, 
    BehaviorCategory, 
    BehaviorSeverity, 
    DisciplineCase, 
    DisciplineCaseStatus, 
    DisciplineActionType, 
    GuidanceIntervention, 
    InterventionStatus, 
    BehaviorFollowUp, 
    FollowUpStatus, 
    PublishedArtifact 
} from '../types/curriculum';

export class BehaviorValidationEngine {
    private static readonly VALID_EVENT_STATUSES: BehaviorEventStatus[] = [
        'DRAFT', 
        'RECORDED', 
        'REVIEWED', 
        'RESOLVED', 
        'ARCHIVED'
    ];

    private static readonly VALID_CATEGORIES: BehaviorCategory[] = [
        'POSITIVE_BEHAVIOR', 
        'ACHIEVEMENT', 
        'PARTICIPATION', 
        'WARNING', 
        'MINOR_VIOLATION', 
        'MAJOR_VIOLATION', 
        'ATTENDANCE_RELATED', 
        'ACADEMIC_CONDUCT', 
        'SOCIAL_CONDUCT', 
        'SAFETY_RELATED', 
        'OTHER'
    ];

    private static readonly VALID_SEVERITIES: BehaviorSeverity[] = [
        'INFO', 
        'LOW', 
        'MEDIUM', 
        'HIGH', 
        'CRITICAL'
    ];

    private static readonly VALID_CASE_STATUSES: DisciplineCaseStatus[] = [
        'OPEN', 
        'UNDER_REVIEW', 
        'ACTION_REQUIRED', 
        'INTERVENTION_ACTIVE', 
        'RESOLVED', 
        'CLOSED', 
        'ARCHIVED'
    ];

    private static readonly VALID_ACTION_TYPES: DisciplineActionType[] = [
        'WARNING', 
        'COUNSELING', 
        'PARENT_CONTACT', 
        'RESTORATIVE_ACTION', 
        'BEHAVIOR_CONTRACT', 
        'SUPERVISED_ACTIVITY', 
        'TEMPORARY_RESTRICTION', 
        'OTHER'
    ];

    private static readonly VALID_INTERVENTION_STATUSES: InterventionStatus[] = [
        'PLANNED', 
        'ACTIVE', 
        'FOLLOW_UP', 
        'COMPLETED', 
        'ARCHIVED'
    ];

    private static readonly VALID_FOLLOW_UP_STATUSES: FollowUpStatus[] = [
        'SCHEDULED', 
        'MISSED', 
        'RESCHEDULED', 
        'COMPLETED'
    ];

    validateSecurity(payload: unknown): void {
        if (!payload) return;
        const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);

        const forbiddenPatterns = [
            /AIzaSy[0-9A-Za-z_-]{15,}/i,
            /Bearer\s+[A-Za-z0-9\-_.]+/i,
            /sk-[0-9a-zA-Z]{15,}/i,
            /system\s+prompt/i,
            /developer\s+prompt/i,
            /gemini/i,
            /generateContent/i,
            /admin_override/i,
            /ignore_safety_instructions/i,
            /curl\s+/i,
            /chmod\s+/i
        ];

        for (const pattern of forbiddenPatterns) {
            if (pattern.test(serialized)) {
                throw new Error('SECURITY_LEAKAGE_DETECTED: Forbidden pattern or credential detected in behavior payload');
            }
        }
    }

    validateIdentity(params: {
        event_id?: string;
        student_id?: string;
        teacher_id?: string;
        reporter_id?: string;
        reporter_role?: string;
        actor_id?: string;
        course_id?: string;
        course_period_id?: string;
        semester_id?: string;
        academic_year_id?: string;
        case_id?: string;
        action_id?: string;
        intervention_id?: string;
        follow_up_id?: string;
        title?: string;
        description?: string;
    }): void {
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined) {
                if (typeof value !== 'string' || value.trim().length === 0) {
                    throw new Error(`INVALID_IDENTITY_${key.toUpperCase()}: ${key} must be a non-empty string`);
                }
            }
        }
    }

    validateCategory(category: BehaviorCategory): void {
        if (!BehaviorValidationEngine.VALID_CATEGORIES.includes(category)) {
            throw new Error(`INVALID_BEHAVIOR_CATEGORY: Unknown behavior category '${category}'`);
        }
    }

    validateSeverity(severity: BehaviorSeverity): void {
        if (!BehaviorValidationEngine.VALID_SEVERITIES.includes(severity)) {
            throw new Error(`INVALID_BEHAVIOR_SEVERITY: Unknown behavior severity '${severity}'`);
        }
    }

    validateActionType(actionType: DisciplineActionType): void {
        if (!BehaviorValidationEngine.VALID_ACTION_TYPES.includes(actionType)) {
            throw new Error(`INVALID_DISCIPLINE_ACTION_TYPE: Unknown discipline action type '${actionType}'`);
        }
    }

    validateBehaviorEvent(event: StudentBehaviorEvent): void {
        if (!event) {
            throw new Error('BEHAVIOR_EVENT_NOT_FOUND: Student behavior event is missing');
        }
        this.validateIdentity({
            event_id: event.event_id,
            student_id: event.student_id,
            academic_year_id: event.academic_year_id,
            semester_id: event.semester_id,
            title: event.title,
            description: event.description,
            reporter_id: event.reporter_id,
            reporter_role: event.reporter_role
        });

        this.validateCategory(event.category);
        this.validateSeverity(event.severity);

        if (!BehaviorValidationEngine.VALID_EVENT_STATUSES.includes(event.status)) {
            throw new Error(`INVALID_BEHAVIOR_EVENT_STATUS: ${event.status}`);
        }

        if (typeof event.version_number !== 'number' || event.version_number < 1) {
            throw new Error(`INVALID_BEHAVIOR_EVENT_VERSION: Version number must be >= 1 (got ${event.version_number})`);
        }

        const date = new Date(event.event_date);
        if (isNaN(date.getTime())) {
            throw new Error('INVALID_EVENT_DATE: event_date must be a valid ISO timestamp');
        }
    }

    validateBehaviorEventTransition(currentStatus: BehaviorEventStatus, targetStatus: BehaviorEventStatus): void {
        if (!currentStatus) {
            if (targetStatus !== 'DRAFT' && targetStatus !== 'RECORDED') {
                throw new Error(`INVALID_INITIAL_BEHAVIOR_EVENT_STATUS: ${targetStatus}`);
            }
            return;
        }

        if (currentStatus === targetStatus) {
            return;
        }

        if (currentStatus === 'ARCHIVED') {
            throw new Error('TERMINAL_BEHAVIOR_EVENT_CANNOT_TRANSITION: Archived behavior events cannot transition');
        }

        const validTransitions: Record<BehaviorEventStatus, BehaviorEventStatus[]> = {
            DRAFT: ['RECORDED', 'ARCHIVED'],
            RECORDED: ['REVIEWED', 'RESOLVED', 'ARCHIVED'],
            REVIEWED: ['RESOLVED', 'ARCHIVED'],
            RESOLVED: ['ARCHIVED'],
            ARCHIVED: []
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            throw new Error(`INVALID_BEHAVIOR_EVENT_TRANSITION: Cannot transition from ${currentStatus} to ${targetStatus}`);
        }
    }

    validateDisciplineCaseTransition(currentStatus: DisciplineCaseStatus, targetStatus: DisciplineCaseStatus): void {
        if (!currentStatus) {
            if (targetStatus !== 'OPEN') {
                throw new Error(`INVALID_INITIAL_DISCIPLINE_CASE_STATUS: ${targetStatus}`);
            }
            return;
        }

        if (currentStatus === targetStatus) {
            return;
        }

        if (currentStatus === 'ARCHIVED') {
            throw new Error('TERMINAL_DISCIPLINE_CASE_CANNOT_TRANSITION: Archived discipline case cannot transition');
        }

        const validTransitions: Record<DisciplineCaseStatus, DisciplineCaseStatus[]> = {
            OPEN: ['UNDER_REVIEW', 'ACTION_REQUIRED', 'INTERVENTION_ACTIVE', 'RESOLVED', 'CLOSED', 'ARCHIVED'],
            UNDER_REVIEW: ['ACTION_REQUIRED', 'INTERVENTION_ACTIVE', 'RESOLVED', 'CLOSED', 'ARCHIVED'],
            ACTION_REQUIRED: ['INTERVENTION_ACTIVE', 'RESOLVED', 'CLOSED', 'ARCHIVED'],
            INTERVENTION_ACTIVE: ['RESOLVED', 'ACTION_REQUIRED', 'CLOSED', 'ARCHIVED'],
            RESOLVED: ['CLOSED', 'ARCHIVED'],
            CLOSED: ['ARCHIVED'],
            ARCHIVED: []
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            throw new Error(`INVALID_DISCIPLINE_CASE_TRANSITION: Cannot transition from ${currentStatus} to ${targetStatus}`);
        }
    }

    validateInterventionTransition(currentStatus: InterventionStatus, targetStatus: InterventionStatus): void {
        if (!currentStatus) {
            if (targetStatus !== 'PLANNED' && targetStatus !== 'ACTIVE') {
                throw new Error(`INVALID_INITIAL_INTERVENTION_STATUS: ${targetStatus}`);
            }
            return;
        }

        if (currentStatus === targetStatus) {
            return;
        }

        if (currentStatus === 'ARCHIVED') {
            throw new Error('TERMINAL_INTERVENTION_CANNOT_TRANSITION: Archived intervention cannot transition');
        }

        const validTransitions: Record<InterventionStatus, InterventionStatus[]> = {
            PLANNED: ['ACTIVE', 'ARCHIVED'],
            ACTIVE: ['FOLLOW_UP', 'COMPLETED', 'ARCHIVED'],
            FOLLOW_UP: ['COMPLETED', 'ACTIVE', 'ARCHIVED'],
            COMPLETED: ['ARCHIVED'],
            ARCHIVED: []
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            throw new Error(`INVALID_INTERVENTION_TRANSITION: Cannot transition from ${currentStatus} to ${targetStatus}`);
        }
    }

    validateFollowUpTransition(currentStatus: FollowUpStatus, targetStatus: FollowUpStatus): void {
        if (currentStatus === targetStatus) return;

        if (currentStatus === 'COMPLETED') {
            throw new Error('TERMINAL_FOLLOW_UP_CANNOT_TRANSITION: Completed follow-up cannot transition');
        }

        const validTransitions: Record<FollowUpStatus, FollowUpStatus[]> = {
            SCHEDULED: ['COMPLETED', 'MISSED', 'RESCHEDULED'],
            MISSED: ['RESCHEDULED', 'COMPLETED'],
            RESCHEDULED: ['COMPLETED', 'MISSED'],
            COMPLETED: []
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            throw new Error(`INVALID_FOLLOW_UP_TRANSITION: Cannot transition from ${currentStatus} to ${targetStatus}`);
        }
    }

    validateStudentScope(authenticated_student_id: string, target_student_id: string): void {
        this.validateIdentity({
            student_id: authenticated_student_id
        });
        if (authenticated_student_id !== target_student_id) {
            throw new Error(`UNAUTHORIZED_STUDENT_SCOPE: Student ${authenticated_student_id} cannot access behavior records for ${target_student_id}`);
        }
    }

    validateTeacherScope(
        teacher_id: string, 
        course_id?: string, 
        authorizedCourses?: string[] | ((t: string, c: string) => boolean)
    ): void {
        this.validateIdentity({ teacher_id });

        if (!course_id || !authorizedCourses) {
            return;
        }

        if (typeof authorizedCourses === 'function') {
            if (!authorizedCourses(teacher_id, course_id)) {
                throw new Error(`UNAUTHORIZED_TEACHER_BEHAVIOR_SCOPE: Teacher ${teacher_id} is not authorized for course ${course_id}`);
            }
            return;
        }

        if (Array.isArray(authorizedCourses)) {
            if (!authorizedCourses.includes(course_id)) {
                throw new Error(`UNAUTHORIZED_TEACHER_BEHAVIOR_SCOPE: Course ${course_id} is outside teacher ${teacher_id} scope`);
            }
        }
    }

    validateDisciplineAuthority(actor_role: string, allowedRoles: string[] = ['DISCIPLINE_OFFICER', 'COUNSELOR', 'HEADMASTER', 'ADMIN']): void {
        if (!actor_role || !allowedRoles.includes(actor_role)) {
            throw new Error(`UNAUTHORIZED_DISCIPLINE_ACTION: Role '${actor_role}' does not have authority for this disciplinary action`);
        }
    }

    validateChecksum(expectedChecksum: string, actualChecksum: string, entityType: 'BEHAVIOR' | 'DISCIPLINE_CASE' | 'INTERVENTION' | 'FOLLOW_UP' = 'BEHAVIOR'): void {
        if (!expectedChecksum || !actualChecksum) {
            throw new Error('MISSING_CHECKSUM: Both expected and actual checksums are required');
        }
        if (expectedChecksum !== actualChecksum) {
            const errorMap: Record<string, string> = {
                BEHAVIOR: 'BEHAVIOR_CHECKSUM_MISMATCH',
                DISCIPLINE_CASE: 'DISCIPLINE_CASE_CHECKSUM_MISMATCH',
                INTERVENTION: 'INTERVENTION_CHECKSUM_MISMATCH',
                FOLLOW_UP: 'FOLLOW_UP_CHECKSUM_MISMATCH'
            };
            const errName = errorMap[entityType] || 'BEHAVIOR_CHECKSUM_MISMATCH';
            throw new Error(`${errName}: Expected ${expectedChecksum}, found ${actualChecksum}`);
        }
    }

    validateCurriculumContext(context: unknown): void {
        if (context && typeof context === 'object') {
            const ctx = context as Partial<PublishedArtifact['curriculum_context']>;
            if (ctx.authority === undefined || ctx.curriculum === undefined || ctx.subject_name === undefined) {
                throw new Error('INVALID_CURRICULUM_CONTEXT_METADATA: Curriculum metadata cannot be arbitrarily injected');
            }
        }
    }
}

export const behaviorValidationEngine = new BehaviorValidationEngine();
