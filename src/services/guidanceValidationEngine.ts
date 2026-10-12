import { 
    GuidanceCaseStatus, 
    GuidancePriority, 
    GuidanceSourceType, 
    GuidanceSessionStatus, 
    InterventionPlanStatus, 
    InterventionOutcome, 
    GuidanceFollowUpStatus, 
    GuidanceCase, 
    GuidanceSession, 
    InterventionPlan, 
    GuidanceFollowUp, 
    GuidanceOutcome as IGuidanceOutcome 
} from '../types/curriculum';

export class GuidanceValidationEngine {
    private static readonly VALID_CASE_STATUSES: GuidanceCaseStatus[] = [
        'DRAFT', 
        'OPEN', 
        'IN_PROGRESS', 
        'ESCALATED', 
        'RESOLVED', 
        'CLOSED', 
        'ARCHIVED'
    ];

    private static readonly VALID_PRIORITIES: GuidancePriority[] = [
        'LOW', 
        'MEDIUM', 
        'HIGH', 
        'CRITICAL'
    ];

    private static readonly VALID_SOURCE_TYPES: GuidanceSourceType[] = [
        'BEHAVIOR_EVENT', 
        'DISCIPLINE_CASE', 
        'TEACHER_REFERRAL', 
        'SELF_REFERRAL', 
        'PARENT_REFERRAL', 
        'ACADEMIC_CONCERN', 
        'ATTENDANCE_CONCERN', 
        'WELLBEING_CONCERN', 
        'OTHER'
    ];

    private static readonly VALID_SESSION_STATUSES: GuidanceSessionStatus[] = [
        'SCHEDULED', 
        'COMPLETED', 
        'CANCELLED', 
        'NO_SHOW', 
        'RESCHEDULED'
    ];

    private static readonly VALID_PLAN_STATUSES: InterventionPlanStatus[] = [
        'DRAFT', 
        'ACTIVE', 
        'PAUSED', 
        'COMPLETED', 
        'CANCELLED', 
        'ARCHIVED'
    ];

    private static readonly VALID_OUTCOMES: InterventionOutcome[] = [
        'IMPROVED', 
        'STABLE', 
        'NO_CHANGE', 
        'DECLINED', 
        'UNDETERMINED'
    ];

    private static readonly VALID_FOLLOW_UP_STATUSES: GuidanceFollowUpStatus[] = [
        'SCHEDULED', 
        'COMPLETED', 
        'MISSED', 
        'RESCHEDULED', 
        'CANCELLED'
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
            /ignore\s+(previous\s+)?instructions/i,
            /gemini/i,
            /generateContent/i,
            /GoogleGenAI/i,
            /admin_override/i,
            /chmod\s+/i,
            /curl\s+/i
        ];

        for (const pattern of forbiddenPatterns) {
            if (pattern.test(serialized)) {
                throw new Error('SECURITY_LEAKAGE_DETECTED: Forbidden pattern or credential detected in guidance payload');
            }
        }
    }

    validateIdentity(params: {
        case_id?: string;
        student_id?: string;
        counselor_id?: string;
        teacher_id?: string;
        headmaster_id?: string;
        actor_id?: string;
        course_id?: string;
        course_period_id?: string;
        semester_id?: string;
        academic_year_id?: string;
        session_id?: string;
        plan_id?: string;
        action_id?: string;
        follow_up_id?: string;
        outcome_id?: string;
        summary?: string;
        objective?: string;
        description?: string;
        notes?: string;
        reason?: string;
    }): void {
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined) {
                if (typeof value !== 'string' || value.trim().length === 0) {
                    throw new Error(`INVALID_IDENTITY_${key.toUpperCase()}: ${key} must be a non-empty string`);
                }
            }
        }
    }

    validatePriority(priority: GuidancePriority): void {
        if (!GuidanceValidationEngine.VALID_PRIORITIES.includes(priority)) {
            throw new Error(`INVALID_GUIDANCE_PRIORITY: Unknown priority '${priority}'`);
        }
    }

    validateSourceType(sourceType: GuidanceSourceType): void {
        if (!GuidanceValidationEngine.VALID_SOURCE_TYPES.includes(sourceType)) {
            throw new Error(`INVALID_GUIDANCE_SOURCE_TYPE: Unknown source type '${sourceType}'`);
        }
    }

    validateOutcome(outcome: InterventionOutcome): void {
        if (!GuidanceValidationEngine.VALID_OUTCOMES.includes(outcome)) {
            throw new Error(`INVALID_GUIDANCE_OUTCOME: Unknown outcome '${outcome}'`);
        }
    }

    validateCaseTransition(currentStatus: GuidanceCaseStatus, targetStatus: GuidanceCaseStatus): void {
        if (!currentStatus) {
            if (targetStatus !== 'DRAFT' && targetStatus !== 'OPEN') {
                throw new Error(`INVALID_INITIAL_GUIDANCE_CASE_STATUS: ${targetStatus}`);
            }
            return;
        }

        if (currentStatus === targetStatus) return;

        if (currentStatus === 'ARCHIVED' || currentStatus === 'CLOSED') {
            throw new Error('TERMINAL_GUIDANCE_CASE_CANNOT_TRANSITION: Closed or archived guidance case cannot transition');
        }

        const validTransitions: Record<GuidanceCaseStatus, GuidanceCaseStatus[]> = {
            DRAFT: ['OPEN', 'ARCHIVED'],
            OPEN: ['IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'ARCHIVED'],
            IN_PROGRESS: ['ESCALATED', 'RESOLVED', 'CLOSED', 'ARCHIVED'],
            ESCALATED: ['IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ARCHIVED'],
            RESOLVED: ['CLOSED', 'ARCHIVED'],
            CLOSED: ['ARCHIVED'],
            ARCHIVED: []
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            throw new Error(`INVALID_GUIDANCE_CASE_TRANSITION: Cannot transition guidance case from ${currentStatus} to ${targetStatus}`);
        }
    }

    validateSessionTransition(currentStatus: GuidanceSessionStatus, targetStatus: GuidanceSessionStatus): void {
        if (currentStatus === targetStatus) return;

        if (currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED') {
            throw new Error('TERMINAL_GUIDANCE_SESSION_CANNOT_TRANSITION: Completed or cancelled session cannot transition');
        }

        const validTransitions: Record<GuidanceSessionStatus, GuidanceSessionStatus[]> = {
            SCHEDULED: ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'],
            RESCHEDULED: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
            NO_SHOW: ['RESCHEDULED', 'CANCELLED'],
            COMPLETED: [],
            CANCELLED: []
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            throw new Error(`INVALID_GUIDANCE_SESSION_TRANSITION: Cannot transition session from ${currentStatus} to ${targetStatus}`);
        }
    }

    validatePlanTransition(currentStatus: InterventionPlanStatus, targetStatus: InterventionPlanStatus): void {
        if (!currentStatus) {
            if (targetStatus !== 'DRAFT' && targetStatus !== 'ACTIVE') {
                throw new Error(`INVALID_INITIAL_PLAN_STATUS: ${targetStatus}`);
            }
            return;
        }

        if (currentStatus === targetStatus) return;

        if (currentStatus === 'ARCHIVED') {
            throw new Error('TERMINAL_PLAN_CANNOT_TRANSITION: Archived intervention plan cannot transition');
        }

        const validTransitions: Record<InterventionPlanStatus, InterventionPlanStatus[]> = {
            DRAFT: ['ACTIVE', 'ARCHIVED'],
            ACTIVE: ['PAUSED', 'COMPLETED', 'CANCELLED', 'ARCHIVED'],
            PAUSED: ['ACTIVE', 'CANCELLED', 'ARCHIVED'],
            COMPLETED: ['ARCHIVED'],
            CANCELLED: ['ARCHIVED'],
            ARCHIVED: []
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            throw new Error(`INVALID_PLAN_TRANSITION: Cannot transition plan from ${currentStatus} to ${targetStatus}`);
        }
    }

    validateFollowUpTransition(currentStatus: GuidanceFollowUpStatus, targetStatus: GuidanceFollowUpStatus): void {
        if (currentStatus === targetStatus) return;

        if (currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED') {
            throw new Error('TERMINAL_FOLLOW_UP_CANNOT_TRANSITION: Completed or cancelled follow-up cannot transition');
        }

        const validTransitions: Record<GuidanceFollowUpStatus, GuidanceFollowUpStatus[]> = {
            SCHEDULED: ['COMPLETED', 'MISSED', 'RESCHEDULED', 'CANCELLED'],
            RESCHEDULED: ['COMPLETED', 'MISSED', 'CANCELLED'],
            MISSED: ['RESCHEDULED', 'COMPLETED', 'CANCELLED'],
            COMPLETED: [],
            CANCELLED: []
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            throw new Error(`INVALID_FOLLOW_UP_TRANSITION: Cannot transition follow-up from ${currentStatus} to ${targetStatus}`);
        }
    }

    validateStudentScope(authenticated_student_id: string, target_student_id: string): void {
        this.validateIdentity({ student_id: authenticated_student_id });
        if (authenticated_student_id !== target_student_id) {
            throw new Error(`UNAUTHORIZED_STUDENT_SCOPE: Student ${authenticated_student_id} cannot access guidance records of ${target_student_id}`);
        }
    }

    validateTeacherScope(
        teacher_id: string, 
        course_id?: string, 
        authorizedCourses?: string[] | ((t: string, c: string) => boolean)
    ): void {
        this.validateIdentity({ teacher_id });
        if (!course_id || !authorizedCourses) return;

        if (typeof authorizedCourses === 'function') {
            if (!authorizedCourses(teacher_id, course_id)) {
                throw new Error(`UNAUTHORIZED_TEACHER_GUIDANCE_SCOPE: Teacher ${teacher_id} is not authorized for course ${course_id}`);
            }
            return;
        }

        if (Array.isArray(authorizedCourses)) {
            if (!authorizedCourses.includes(course_id)) {
                throw new Error(`UNAUTHORIZED_TEACHER_GUIDANCE_SCOPE: Course ${course_id} is outside teacher ${teacher_id} scope`);
            }
        }
    }

    validateCounselorScope(counselor_id: string, assigned_counselor_id?: string): void {
        this.validateIdentity({ counselor_id });
        if (assigned_counselor_id && assigned_counselor_id !== counselor_id) {
            throw new Error(`UNAUTHORIZED_COUNSELOR_GUIDANCE_SCOPE: Counselor ${counselor_id} is not assigned to this guidance case`);
        }
    }

    validateEscalationAuthority(actor_role: string): void {
        const allowed = ['COUNSELOR', 'HEADMASTER', 'DISCIPLINE_OFFICER', 'ADMIN'];
        if (!actor_role || !allowed.includes(actor_role)) {
            throw new Error(`UNAUTHORIZED_GUIDANCE_ESCALATION: Role '${actor_role}' does not have authority to escalate guidance cases`);
        }
    }

    validateRoleAuthority(actor_role: string, allowedRoles: string[]): void {
        if (!actor_role || !allowedRoles.includes(actor_role)) {
            throw new Error(`UNAUTHORIZED_GUIDANCE_ACTION: Role '${actor_role}' is not authorized for this operation`);
        }
    }

    validateRevisionReason(reason?: string): void {
        if (!reason || reason.trim().length === 0) {
            throw new Error('GUIDANCE_REVISION_REASON_REQUIRED: A valid revision reason is required for modification');
        }
    }

    validateChecksum(expectedChecksum: string, actualChecksum: string, entityType: 'GUIDANCE' | 'SESSION' | 'INTERVENTION' = 'GUIDANCE'): void {
        if (!expectedChecksum || !actualChecksum) {
            throw new Error('MISSING_CHECKSUM: Both expected and actual checksums are required');
        }
        if (expectedChecksum !== actualChecksum) {
            const errorMap: Record<string, string> = {
                GUIDANCE: 'GUIDANCE_CHECKSUM_MISMATCH',
                SESSION: 'GUIDANCE_SESSION_CHECKSUM_MISMATCH',
                INTERVENTION: 'INTERVENTION_CHECKSUM_MISMATCH'
            };
            const err = errorMap[entityType] || 'GUIDANCE_CHECKSUM_MISMATCH';
            throw new Error(`${err}: Expected ${expectedChecksum}, found ${actualChecksum}`);
        }
    }
}

export const guidanceValidationEngine = new GuidanceValidationEngine();
