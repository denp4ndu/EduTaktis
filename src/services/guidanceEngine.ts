import { 
    GuidanceCase, 
    GuidanceCaseStatus, 
    GuidancePriority, 
    GuidanceSourceType, 
    GuidanceSession, 
    GuidanceSessionStatus, 
    InterventionPlan, 
    InterventionPlanStatus, 
    InterventionAction, 
    GuidanceFollowUp, 
    GuidanceFollowUpStatus, 
    GuidanceOutcome, 
    InterventionOutcome, 
    GuidanceHistoryEntry, 
    GuidanceAuditEvent, 
    StudentSafeGuidanceCaseProjection 
} from '../types/curriculum';
import { 
    guidanceRepositoryEngine, 
    GuidanceRepositoryEngine 
} from './guidanceRepositoryEngine';
import { 
    guidanceValidationEngine, 
    GuidanceValidationEngine 
} from './guidanceValidationEngine';
import { 
    behaviorRepositoryEngine, 
    BehaviorRepositoryEngine 
} from './behaviorRepositoryEngine';

export interface CreateGuidanceCaseParams {
    student_id: string;
    academic_year_id: string;
    semester_id: string;
    course_id?: string;
    source_type: GuidanceSourceType;
    source_reference_id?: string;
    priority: GuidancePriority;
    summary: string;
    confidential_notes?: string;
    assigned_counselor_id?: string;
    assigned_teacher_id?: string;
    assigned_headmaster_id?: string;
    actor_id: string;
    actor_role: string;
    status?: GuidanceCaseStatus;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
}

export interface EscalateGuidanceCaseParams {
    case_id: string;
    target_role: 'COUNSELOR' | 'HEADMASTER' | 'DISCIPLINE_OFFICER' | 'ADMIN';
    reason: string;
    target_officer_id?: string;
    actor_id: string;
    actor_role: string;
}

export interface ResolveGuidanceCaseParams {
    case_id: string;
    resolution_notes: string;
    actor_id: string;
    actor_role: string;
}

export interface CloseGuidanceCaseParams {
    case_id: string;
    closure_reason: string;
    actor_id: string;
    actor_role: string;
}

export interface ArchiveGuidanceCaseParams {
    case_id: string;
    archive_reason: string;
    actor_id: string;
    actor_role: string;
}

export interface ScheduleSessionParams {
    case_id: string;
    student_id: string;
    counselor_id: string;
    scheduled_at: string;
    session_summary: string;
    confidential_notes?: string;
    next_action?: string;
    actor_id: string;
    actor_role: string;
}

export interface CompleteSessionParams {
    session_id: string;
    session_summary: string;
    confidential_notes?: string;
    next_action?: string;
    completed_at?: string;
    actor_id: string;
    actor_role: string;
}

export interface CreateInterventionPlanParams {
    case_id: string;
    student_id: string;
    objective: string;
    priority: GuidancePriority;
    start_at: string;
    target_end_at: string;
    responsible_role: string;
    responsible_id: string;
    status?: InterventionPlanStatus;
    actor_id: string;
    actor_role: string;
}

export interface AddInterventionActionParams {
    plan_id: string;
    action_type: 
        | 'COUNSELING_SESSION' 
        | 'TEACHER_CHECK_IN' 
        | 'PARENT_MEETING' 
        | 'ACADEMIC_SUPPORT' 
        | 'ATTENDANCE_MONITORING' 
        | 'BEHAVIOR_MONITORING' 
        | 'REFERRAL' 
        | 'FOLLOW_UP' 
        | 'OTHER';
    description: string;
    assigned_to: string;
    due_at: string;
    actor_id: string;
    actor_role: string;
}

export interface ScheduleFollowUpParams {
    case_id: string;
    student_id: string;
    plan_id?: string;
    scheduled_at: string;
    notes: string;
    actor_id: string;
    actor_role: string;
}

export interface CompleteFollowUpParams {
    follow_up_id: string;
    outcome: string;
    notes?: string;
    next_follow_up_at?: string;
    actor_id: string;
    actor_role: string;
}

export interface RecordOutcomeParams {
    case_id: string;
    student_id: string;
    plan_id?: string;
    follow_up_id?: string;
    outcome: InterventionOutcome;
    evaluation_notes: string;
    actor_id: string;
    actor_role: string;
}

export class GuidanceEngine {
    constructor(
        private repository: GuidanceRepositoryEngine = guidanceRepositoryEngine,
        private validator: GuidanceValidationEngine = guidanceValidationEngine,
        private behaviorRepo: BehaviorRepositoryEngine = behaviorRepositoryEngine
    ) {}

    private generateChecksum(data: unknown, prefix = 'GUD-CHK-'): string {
        const cleanData: Record<string, unknown> = typeof data === 'object' && data !== null ? { ...(data as Record<string, unknown>) } : { value: data };
        delete cleanData.checksum;
        const str = JSON.stringify(cleanData);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return `${prefix}${Math.abs(hash).toString(16).toUpperCase()}-${str.length}`;
    }

    // ==========================================
    // GUIDANCE CASE MANAGEMENT
    // ==========================================
    async createGuidanceCase(params: CreateGuidanceCaseParams): Promise<GuidanceCase> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            student_id: params.student_id,
            academic_year_id: params.academic_year_id,
            semester_id: params.semester_id,
            summary: params.summary,
            actor_id: params.actor_id
        });

        this.validator.validatePriority(params.priority);
        this.validator.validateSourceType(params.source_type);

        if (params.course_id && params.actor_role === 'TEACHER') {
            this.validator.validateTeacherScope(
                params.actor_id, 
                params.course_id, 
                params.teacher_authorized_courses
            );
        }

        // Validate Phase 34 Source Reference if provided
        if (params.source_reference_id) {
            if (params.source_type === 'BEHAVIOR_EVENT') {
                const event = await this.behaviorRepo.getBehaviorEvent(params.source_reference_id);
                if (!event) {
                    throw new Error(`INVALID_GUIDANCE_SOURCE_REFERENCE: Behavior event ${params.source_reference_id} does not exist`);
                }
            } else if (params.source_type === 'DISCIPLINE_CASE') {
                const dCase = await this.behaviorRepo.getDisciplineCase(params.source_reference_id);
                if (!dCase) {
                    throw new Error(`INVALID_GUIDANCE_SOURCE_REFERENCE: Discipline case ${params.source_reference_id} does not exist`);
                }
            }
        }

        const initialStatus: GuidanceCaseStatus = params.status || 'OPEN';
        this.validator.validateCaseTransition(null as any, initialStatus);

        const caseId = `GUD-CASE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const baseCase: Omit<GuidanceCase, 'checksum'> = {
            case_id: caseId,
            student_id: params.student_id,
            academic_year_id: params.academic_year_id,
            semester_id: params.semester_id,
            course_id: params.course_id,
            source_type: params.source_type,
            source_reference_id: params.source_reference_id,
            priority: params.priority,
            status: initialStatus,
            opened_at: now,
            assigned_counselor_id: params.assigned_counselor_id,
            assigned_teacher_id: params.assigned_teacher_id,
            assigned_headmaster_id: params.assigned_headmaster_id,
            summary: params.summary.trim(),
            confidential_notes: params.confidential_notes?.trim(),
            current_version: 1,
            created_at: now,
            updated_at: now
        };

        const checksum = this.generateChecksum(baseCase, 'CASE-CHK-');
        const fullCase: GuidanceCase = {
            ...baseCase,
            checksum
        };

        const saved = await this.repository.saveCase(fullCase);

        const auditEvent: GuidanceAuditEvent = {
            audit_id: `AUD-GUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: caseId,
            entity_type: 'GUIDANCE_CASE',
            event_type: initialStatus === 'DRAFT' ? 'GUIDANCE_CASE_CREATED' : 'GUIDANCE_CASE_OPENED',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            new_status: initialStatus,
            version_number: 1,
            checksum: this.generateChecksum({ caseId, status: initialStatus }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async escalateGuidanceCase(params: EscalateGuidanceCaseParams): Promise<GuidanceCase> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            case_id: params.case_id,
            actor_id: params.actor_id,
            reason: params.reason
        });

        this.validator.validateEscalationAuthority(params.actor_role);

        const existing = await this.repository.getCase(params.case_id);
        if (!existing) {
            throw new Error(`GUIDANCE_CASE_NOT_FOUND: Case ${params.case_id} does not exist`);
        }

        const expectedChecksum = this.generateChecksum(existing, 'CASE-CHK-');
        this.validator.validateChecksum(expectedChecksum, existing.checksum, 'GUIDANCE');

        this.validator.validateCaseTransition(existing.status, 'ESCALATED');

        const now = new Date().toISOString();
        const nextVersion = existing.current_version + 1;

        const updatedBase: Omit<GuidanceCase, 'checksum'> = {
            ...existing,
            status: 'ESCALATED',
            priority: 'HIGH',
            assigned_headmaster_id: params.target_role === 'HEADMASTER' ? (params.target_officer_id || existing.assigned_headmaster_id) : existing.assigned_headmaster_id,
            current_version: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(updatedBase, 'CASE-CHK-');
        const updatedCase: GuidanceCase = {
            ...updatedBase,
            checksum
        };

        const saved = await this.repository.saveCase(updatedCase);

        const historyEntry: GuidanceHistoryEntry = {
            history_id: `HIST-GUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.case_id,
            entity_type: 'GUIDANCE_CASE',
            previous_version: existing.current_version,
            new_version: nextVersion,
            previous_status: existing.status,
            new_status: 'ESCALATED',
            revision_reason: params.reason,
            actor_id: params.actor_id,
            timestamp: now,
            checksum: this.generateChecksum({ id: existing.case_id, v: nextVersion }, 'HIST-CHK-')
        };
        await this.repository.recordHistory(historyEntry);

        const auditEvent: GuidanceAuditEvent = {
            audit_id: `AUD-GUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.case_id,
            entity_type: 'GUIDANCE_CASE',
            event_type: 'GUIDANCE_CASE_ESCALATED',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            previous_status: existing.status,
            new_status: 'ESCALATED',
            version_number: nextVersion,
            checksum: this.generateChecksum({ id: existing.case_id, status: 'ESCALATED' }, 'AUD-CHK-'),
            details: { reason: params.reason, target_role: params.target_role }
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async resolveGuidanceCase(params: ResolveGuidanceCaseParams): Promise<GuidanceCase> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            case_id: params.case_id,
            actor_id: params.actor_id,
            description: params.resolution_notes
        });

        this.validator.validateRoleAuthority(params.actor_role, ['COUNSELOR', 'HEADMASTER', 'DISCIPLINE_OFFICER', 'ADMIN']);

        const existing = await this.repository.getCase(params.case_id);
        if (!existing) {
            throw new Error(`GUIDANCE_CASE_NOT_FOUND: Case ${params.case_id} does not exist`);
        }

        const expectedChecksum = this.generateChecksum(existing, 'CASE-CHK-');
        this.validator.validateChecksum(expectedChecksum, existing.checksum, 'GUIDANCE');

        this.validator.validateCaseTransition(existing.status, 'RESOLVED');

        const now = new Date().toISOString();
        const nextVersion = existing.current_version + 1;

        const updatedBase: Omit<GuidanceCase, 'checksum'> = {
            ...existing,
            status: 'RESOLVED',
            current_version: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(updatedBase, 'CASE-CHK-');
        const updatedCase: GuidanceCase = {
            ...updatedBase,
            checksum
        };

        const saved = await this.repository.saveCase(updatedCase);

        const historyEntry: GuidanceHistoryEntry = {
            history_id: `HIST-GUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.case_id,
            entity_type: 'GUIDANCE_CASE',
            previous_version: existing.current_version,
            new_version: nextVersion,
            previous_status: existing.status,
            new_status: 'RESOLVED',
            revision_reason: params.resolution_notes,
            actor_id: params.actor_id,
            timestamp: now,
            checksum: this.generateChecksum({ id: existing.case_id, v: nextVersion }, 'HIST-CHK-')
        };
        await this.repository.recordHistory(historyEntry);

        const auditEvent: GuidanceAuditEvent = {
            audit_id: `AUD-GUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.case_id,
            entity_type: 'GUIDANCE_CASE',
            event_type: 'GUIDANCE_CASE_RESOLVED',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            previous_status: existing.status,
            new_status: 'RESOLVED',
            version_number: nextVersion,
            checksum: this.generateChecksum({ id: existing.case_id, status: 'RESOLVED' }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async closeGuidanceCase(params: CloseGuidanceCaseParams): Promise<GuidanceCase> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            case_id: params.case_id,
            actor_id: params.actor_id,
            reason: params.closure_reason
        });

        this.validator.validateRoleAuthority(params.actor_role, ['COUNSELOR', 'HEADMASTER', 'ADMIN']);

        const existing = await this.repository.getCase(params.case_id);
        if (!existing) {
            throw new Error(`GUIDANCE_CASE_NOT_FOUND: Case ${params.case_id} does not exist`);
        }

        const expectedChecksum = this.generateChecksum(existing, 'CASE-CHK-');
        this.validator.validateChecksum(expectedChecksum, existing.checksum, 'GUIDANCE');

        this.validator.validateCaseTransition(existing.status, 'CLOSED');

        const now = new Date().toISOString();
        const nextVersion = existing.current_version + 1;

        const updatedBase: Omit<GuidanceCase, 'checksum'> = {
            ...existing,
            status: 'CLOSED',
            current_version: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(updatedBase, 'CASE-CHK-');
        const updatedCase: GuidanceCase = {
            ...updatedBase,
            checksum
        };

        const saved = await this.repository.saveCase(updatedCase);

        const historyEntry: GuidanceHistoryEntry = {
            history_id: `HIST-GUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.case_id,
            entity_type: 'GUIDANCE_CASE',
            previous_version: existing.current_version,
            new_version: nextVersion,
            previous_status: existing.status,
            new_status: 'CLOSED',
            revision_reason: params.closure_reason,
            actor_id: params.actor_id,
            timestamp: now,
            checksum: this.generateChecksum({ id: existing.case_id, v: nextVersion }, 'HIST-CHK-')
        };
        await this.repository.recordHistory(historyEntry);

        const auditEvent: GuidanceAuditEvent = {
            audit_id: `AUD-GUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.case_id,
            entity_type: 'GUIDANCE_CASE',
            event_type: 'GUIDANCE_CASE_CLOSED',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            previous_status: existing.status,
            new_status: 'CLOSED',
            version_number: nextVersion,
            checksum: this.generateChecksum({ id: existing.case_id, status: 'CLOSED' }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async archiveGuidanceCase(params: ArchiveGuidanceCaseParams): Promise<GuidanceCase> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            case_id: params.case_id,
            actor_id: params.actor_id,
            reason: params.archive_reason
        });

        this.validator.validateRoleAuthority(params.actor_role, ['HEADMASTER', 'ADMIN', 'COUNSELOR']);

        const existing = await this.repository.getCase(params.case_id);
        if (!existing) {
            throw new Error(`GUIDANCE_CASE_NOT_FOUND: Case ${params.case_id} does not exist`);
        }

        this.validator.validateCaseTransition(existing.status, 'ARCHIVED');

        const now = new Date().toISOString();
        const nextVersion = existing.current_version + 1;

        const updatedBase: Omit<GuidanceCase, 'checksum'> = {
            ...existing,
            status: 'ARCHIVED',
            current_version: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(updatedBase, 'CASE-CHK-');
        const updatedCase: GuidanceCase = {
            ...updatedBase,
            checksum
        };

        const saved = await this.repository.saveCase(updatedCase);

        const auditEvent: GuidanceAuditEvent = {
            audit_id: `AUD-GUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.case_id,
            entity_type: 'GUIDANCE_CASE',
            event_type: 'GUIDANCE_CASE_ARCHIVED',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            previous_status: existing.status,
            new_status: 'ARCHIVED',
            version_number: nextVersion,
            checksum: this.generateChecksum({ id: existing.case_id, status: 'ARCHIVED' }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async getGuidanceCase(caseId: string, requesterRole = 'COUNSELOR'): Promise<GuidanceCase | null> {
        const item = await this.repository.getCase(caseId);
        if (!item) return null;

        // Privacy projection: strip confidential notes for non-counseling / non-admin roles
        if (requesterRole === 'STUDENT' || requesterRole === 'TEACHER') {
            return Object.freeze({
                ...item,
                confidential_notes: undefined
            });
        }

        return item;
    }

    async listGuidanceCases(filter?: {
        student_id?: string;
        semester_id?: string;
        course_id?: string;
        assigned_counselor_id?: string;
        assigned_teacher_id?: string;
        status?: string;
        priority?: string;
    }, requesterRole = 'COUNSELOR'): Promise<GuidanceCase[]> {
        const list = await this.repository.listCases(filter);
        if (requesterRole === 'STUDENT' || requesterRole === 'TEACHER') {
            return list.map(item => Object.freeze({
                ...item,
                confidential_notes: undefined
            }));
        }
        return list;
    }

    async getStudentSafeCaseProjection(caseId: string, studentId: string): Promise<StudentSafeGuidanceCaseProjection | null> {
        this.validator.validateStudentScope(studentId, studentId);
        const item = await this.repository.getCase(caseId);
        if (!item || item.student_id !== studentId) return null;

        const plans = await this.repository.listPlans({ case_id: caseId });
        const activePlans = plans.filter(p => p.status === 'ACTIVE');

        const sessions = await this.repository.listSessions({ case_id: caseId });
        const scheduled = sessions.filter(s => s.status === 'SCHEDULED').length;
        const completed = sessions.filter(s => s.status === 'COMPLETED').length;

        return Object.freeze({
            case_id: item.case_id,
            student_id: item.student_id,
            source_type: item.source_type,
            priority: item.priority,
            status: item.status,
            opened_at: item.opened_at,
            assigned_counselor_name: item.assigned_counselor_id ? `Counselor (${item.assigned_counselor_id})` : undefined,
            summary: item.summary,
            has_active_intervention: activePlans.length > 0,
            scheduled_sessions_count: scheduled,
            completed_sessions_count: completed,
            updated_at: item.updated_at
        });
    }

    // ==========================================
    // COUNSELING SESSIONS
    // ==========================================
    async scheduleSession(params: ScheduleSessionParams): Promise<GuidanceSession> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            case_id: params.case_id,
            student_id: params.student_id,
            counselor_id: params.counselor_id,
            summary: params.session_summary,
            actor_id: params.actor_id
        });

        this.validator.validateRoleAuthority(params.actor_role, ['COUNSELOR', 'HEADMASTER', 'ADMIN']);

        const existingCase = await this.repository.getCase(params.case_id);
        if (!existingCase) {
            throw new Error(`GUIDANCE_CASE_NOT_FOUND: Case ${params.case_id} does not exist`);
        }

        if (existingCase.status === 'CLOSED' || existingCase.status === 'ARCHIVED') {
            throw new Error(`CANNOT_SCHEDULE_SESSION_ON_CLOSED_CASE: Case is ${existingCase.status}`);
        }

        const sessionId = `GUD-SES-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const baseSession: Omit<GuidanceSession, 'checksum'> = {
            session_id: sessionId,
            case_id: params.case_id,
            student_id: params.student_id,
            counselor_id: params.counselor_id,
            scheduled_at: params.scheduled_at,
            status: 'SCHEDULED',
            session_summary: params.session_summary.trim(),
            confidential_notes: params.confidential_notes?.trim(),
            next_action: params.next_action?.trim(),
            version_number: 1
        };

        const checksum = this.generateChecksum(baseSession, 'SES-CHK-');
        const fullSession: GuidanceSession = {
            ...baseSession,
            checksum
        };

        const saved = await this.repository.saveSession(fullSession);

        // Transition case to IN_PROGRESS if currently OPEN
        if (existingCase.status === 'OPEN') {
            const nextCaseVersion = existingCase.current_version + 1;
            const updatedCaseBase: Omit<GuidanceCase, 'checksum'> = {
                ...existingCase,
                status: 'IN_PROGRESS',
                current_version: nextCaseVersion,
                updated_at: now
            };
            const caseChecksum = this.generateChecksum(updatedCaseBase, 'CASE-CHK-');
            await this.repository.saveCase({
                ...updatedCaseBase,
                checksum: caseChecksum
            });
        }

        const auditEvent: GuidanceAuditEvent = {
            audit_id: `AUD-GUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: sessionId,
            entity_type: 'GUIDANCE_SESSION',
            event_type: 'GUIDANCE_SESSION_SCHEDULED',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            new_status: 'SCHEDULED',
            version_number: 1,
            checksum: this.generateChecksum({ sessionId, status: 'SCHEDULED' }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async completeSession(params: CompleteSessionParams): Promise<GuidanceSession> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            session_id: params.session_id,
            summary: params.session_summary,
            actor_id: params.actor_id
        });

        this.validator.validateRoleAuthority(params.actor_role, ['COUNSELOR', 'HEADMASTER', 'ADMIN']);

        const existing = await this.repository.getSession(params.session_id);
        if (!existing) {
            throw new Error(`GUIDANCE_SESSION_NOT_FOUND: Session ${params.session_id} does not exist`);
        }

        const expectedChecksum = this.generateChecksum(existing, 'SES-CHK-');
        this.validator.validateChecksum(expectedChecksum, existing.checksum, 'SESSION');

        this.validator.validateSessionTransition(existing.status, 'COMPLETED');

        const now = new Date().toISOString();
        const nextVersion = existing.version_number + 1;

        const updatedBase: Omit<GuidanceSession, 'checksum'> = {
            ...existing,
            status: 'COMPLETED',
            session_summary: params.session_summary.trim(),
            confidential_notes: params.confidential_notes?.trim() || existing.confidential_notes,
            next_action: params.next_action?.trim() || existing.next_action,
            completed_at: params.completed_at || now,
            version_number: nextVersion
        };

        const checksum = this.generateChecksum(updatedBase, 'SES-CHK-');
        const updatedSession: GuidanceSession = {
            ...updatedBase,
            checksum
        };

        const saved = await this.repository.saveSession(updatedSession);

        const auditEvent: GuidanceAuditEvent = {
            audit_id: `AUD-GUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.session_id,
            entity_type: 'GUIDANCE_SESSION',
            event_type: 'GUIDANCE_SESSION_COMPLETED',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            previous_status: existing.status,
            new_status: 'COMPLETED',
            version_number: nextVersion,
            checksum: this.generateChecksum({ id: existing.session_id, status: 'COMPLETED' }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async cancelSession(sessionId: string, reason: string, actorId: string, actorRole: string): Promise<GuidanceSession> {
        this.validator.validateSecurity({ sessionId, reason });
        this.validator.validateIdentity({ session_id: sessionId, reason, actor_id: actorId });

        const existing = await this.repository.getSession(sessionId);
        if (!existing) {
            throw new Error(`GUIDANCE_SESSION_NOT_FOUND: Session ${sessionId} does not exist`);
        }

        this.validator.validateSessionTransition(existing.status, 'CANCELLED');

        const nextVersion = existing.version_number + 1;
        const updatedBase: Omit<GuidanceSession, 'checksum'> = {
            ...existing,
            status: 'CANCELLED',
            revision_reason: reason,
            version_number: nextVersion
        };

        const checksum = this.generateChecksum(updatedBase, 'SES-CHK-');
        const updatedSession: GuidanceSession = {
            ...updatedBase,
            checksum
        };

        return this.repository.saveSession(updatedSession);
    }

    async getSession(sessionId: string, requesterRole = 'COUNSELOR'): Promise<GuidanceSession | null> {
        const item = await this.repository.getSession(sessionId);
        if (!item) return null;

        if (requesterRole === 'STUDENT' || requesterRole === 'TEACHER') {
            return Object.freeze({
                ...item,
                confidential_notes: undefined
            });
        }
        return item;
    }

    async listSessions(filter?: {
        case_id?: string;
        student_id?: string;
        counselor_id?: string;
        status?: string;
    }, requesterRole = 'COUNSELOR'): Promise<GuidanceSession[]> {
        const list = await this.repository.listSessions(filter);
        if (requesterRole === 'STUDENT' || requesterRole === 'TEACHER') {
            return list.map(item => Object.freeze({
                ...item,
                confidential_notes: undefined
            }));
        }
        return list;
    }

    // ==========================================
    // INTERVENTION PLANS & ACTIONS
    // ==========================================
    async createInterventionPlan(params: CreateInterventionPlanParams): Promise<InterventionPlan> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            case_id: params.case_id,
            student_id: params.student_id,
            objective: params.objective,
            actor_id: params.actor_id
        });

        this.validator.validatePriority(params.priority);
        this.validator.validateRoleAuthority(params.actor_role, ['COUNSELOR', 'HEADMASTER', 'DISCIPLINE_OFFICER', 'ADMIN']);

        const initialStatus: InterventionPlanStatus = params.status || 'ACTIVE';
        this.validator.validatePlanTransition(null as any, initialStatus);

        const planId = `GUD-PLN-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const basePlan: Omit<InterventionPlan, 'checksum'> = {
            plan_id: planId,
            case_id: params.case_id,
            student_id: params.student_id,
            objective: params.objective.trim(),
            priority: params.priority,
            status: initialStatus,
            start_at: params.start_at,
            target_end_at: params.target_end_at,
            responsible_role: params.responsible_role,
            responsible_id: params.responsible_id,
            actions: [],
            version_number: 1,
            created_at: now,
            updated_at: now
        };

        const checksum = this.generateChecksum(basePlan, 'PLN-CHK-');
        const fullPlan: InterventionPlan = {
            ...basePlan,
            checksum
        };

        const saved = await this.repository.savePlan(fullPlan);

        const auditEvent: GuidanceAuditEvent = {
            audit_id: `AUD-GUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: planId,
            entity_type: 'INTERVENTION_PLAN',
            event_type: 'INTERVENTION_PLAN_CREATED',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            new_status: initialStatus,
            version_number: 1,
            checksum: this.generateChecksum({ planId, status: initialStatus }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async addInterventionAction(params: AddInterventionActionParams): Promise<InterventionPlan> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            plan_id: params.plan_id,
            description: params.description,
            actor_id: params.actor_id
        });

        const existing = await this.repository.getPlan(params.plan_id);
        if (!existing) {
            throw new Error(`INTERVENTION_PLAN_NOT_FOUND: Plan ${params.plan_id} does not exist`);
        }

        if (existing.status === 'ARCHIVED' || existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
            throw new Error(`CANNOT_MODIFY_TERMINAL_PLAN: Plan is ${existing.status}`);
        }

        const actionId = `GUD-ACT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const baseAction: Omit<InterventionAction, 'checksum'> = {
            action_id: actionId,
            plan_id: existing.plan_id,
            action_type: params.action_type,
            description: params.description.trim(),
            assigned_to: params.assigned_to,
            due_at: params.due_at,
            status: 'PENDING',
            version_number: 1
        };

        const actionChecksum = this.generateChecksum(baseAction, 'ACT-CHK-');
        const fullAction: InterventionAction = {
            ...baseAction,
            checksum: actionChecksum
        };

        const newActions = [...existing.actions, fullAction];
        const nextVersion = existing.version_number + 1;
        const now = new Date().toISOString();

        const updatedBase: Omit<InterventionPlan, 'checksum'> = {
            ...existing,
            actions: newActions,
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(updatedBase, 'PLN-CHK-');
        const updatedPlan: InterventionPlan = {
            ...updatedBase,
            checksum
        };

        return this.repository.savePlan(updatedPlan);
    }

    async completeInterventionPlan(planId: string, actorId: string, actorRole: string): Promise<InterventionPlan> {
        this.validator.validateIdentity({ plan_id: planId, actor_id: actorId });
        this.validator.validateRoleAuthority(actorRole, ['COUNSELOR', 'HEADMASTER', 'ADMIN']);

        const existing = await this.repository.getPlan(planId);
        if (!existing) {
            throw new Error(`INTERVENTION_PLAN_NOT_FOUND: Plan ${planId} does not exist`);
        }

        this.validator.validatePlanTransition(existing.status, 'COMPLETED');

        const now = new Date().toISOString();
        const nextVersion = existing.version_number + 1;

        const updatedBase: Omit<InterventionPlan, 'checksum'> = {
            ...existing,
            status: 'COMPLETED',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(updatedBase, 'PLN-CHK-');
        const updatedPlan: InterventionPlan = {
            ...updatedBase,
            checksum
        };

        const saved = await this.repository.savePlan(updatedPlan);

        const auditEvent: GuidanceAuditEvent = {
            audit_id: `AUD-GUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: planId,
            entity_type: 'INTERVENTION_PLAN',
            event_type: 'INTERVENTION_PLAN_COMPLETED',
            actor_id: actorId,
            actor_role: actorRole,
            timestamp: now,
            previous_status: existing.status,
            new_status: 'COMPLETED',
            version_number: nextVersion,
            checksum: this.generateChecksum({ planId, status: 'COMPLETED' }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async getInterventionPlan(planId: string): Promise<InterventionPlan | null> {
        return this.repository.getPlan(planId);
    }

    async listInterventionPlans(filter?: {
        case_id?: string;
        student_id?: string;
        responsible_id?: string;
        status?: string;
    }): Promise<InterventionPlan[]> {
        return this.repository.listPlans(filter);
    }

    // ==========================================
    // FOLLOW-UPS
    // ==========================================
    async scheduleFollowUp(params: ScheduleFollowUpParams): Promise<GuidanceFollowUp> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            case_id: params.case_id,
            student_id: params.student_id,
            notes: params.notes,
            actor_id: params.actor_id
        });

        const followUpId = `GUD-FOL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const baseFollowUp: Omit<GuidanceFollowUp, 'checksum'> = {
            follow_up_id: followUpId,
            case_id: params.case_id,
            student_id: params.student_id,
            plan_id: params.plan_id,
            scheduled_at: params.scheduled_at,
            status: 'SCHEDULED',
            notes: params.notes.trim(),
            version_number: 1
        };

        const checksum = this.generateChecksum(baseFollowUp, 'FOL-CHK-');
        const fullFollowUp: GuidanceFollowUp = {
            ...baseFollowUp,
            checksum
        };

        const saved = await this.repository.saveFollowUp(fullFollowUp);

        const auditEvent: GuidanceAuditEvent = {
            audit_id: `AUD-GUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: followUpId,
            entity_type: 'GUIDANCE_FOLLOWUP',
            event_type: 'GUIDANCE_FOLLOWUP_CREATED',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: new Date().toISOString(),
            new_status: 'SCHEDULED',
            version_number: 1,
            checksum: this.generateChecksum({ followUpId, status: 'SCHEDULED' }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async completeFollowUp(params: CompleteFollowUpParams): Promise<GuidanceFollowUp> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            follow_up_id: params.follow_up_id,
            actor_id: params.actor_id,
            description: params.outcome
        });

        const existing = await this.repository.getFollowUp(params.follow_up_id);
        if (!existing) {
            throw new Error(`GUIDANCE_FOLLOW_UP_NOT_FOUND: Follow-up ${params.follow_up_id} does not exist`);
        }

        this.validator.validateFollowUpTransition(existing.status, 'COMPLETED');

        const now = new Date().toISOString();
        const nextVersion = existing.version_number + 1;

        const updatedBase: Omit<GuidanceFollowUp, 'checksum'> = {
            ...existing,
            status: 'COMPLETED',
            outcome: params.outcome.trim(),
            notes: params.notes?.trim() || existing.notes,
            next_follow_up_at: params.next_follow_up_at,
            completed_at: now,
            version_number: nextVersion
        };

        const checksum = this.generateChecksum(updatedBase, 'FOL-CHK-');
        const updatedFollowUp: GuidanceFollowUp = {
            ...updatedBase,
            checksum
        };

        const saved = await this.repository.saveFollowUp(updatedFollowUp);

        const auditEvent: GuidanceAuditEvent = {
            audit_id: `AUD-GUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.follow_up_id,
            entity_type: 'GUIDANCE_FOLLOWUP',
            event_type: 'GUIDANCE_FOLLOWUP_COMPLETED',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            previous_status: existing.status,
            new_status: 'COMPLETED',
            version_number: nextVersion,
            checksum: this.generateChecksum({ id: existing.follow_up_id, status: 'COMPLETED' }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    // ==========================================
    // OUTCOMES
    // ==========================================
    async recordOutcome(params: RecordOutcomeParams): Promise<GuidanceOutcome> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            case_id: params.case_id,
            student_id: params.student_id,
            description: params.evaluation_notes,
            actor_id: params.actor_id
        });

        this.validator.validateOutcome(params.outcome);
        this.validator.validateRoleAuthority(params.actor_role, ['COUNSELOR', 'HEADMASTER', 'ADMIN', 'DISCIPLINE_OFFICER']);

        const outcomeId = `GUD-OUT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const baseOutcome: Omit<GuidanceOutcome, 'checksum'> = {
            outcome_id: outcomeId,
            case_id: params.case_id,
            student_id: params.student_id,
            plan_id: params.plan_id,
            follow_up_id: params.follow_up_id,
            outcome: params.outcome,
            evaluation_notes: params.evaluation_notes.trim(),
            recorded_by: params.actor_id,
            recorded_at: now,
            version_number: 1
        };

        const checksum = this.generateChecksum(baseOutcome, 'OUT-CHK-');
        const fullOutcome: GuidanceOutcome = {
            ...baseOutcome,
            checksum
        };

        const saved = await this.repository.saveOutcome(fullOutcome);

        const auditEvent: GuidanceAuditEvent = {
            audit_id: `AUD-GUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: outcomeId,
            entity_type: 'GUIDANCE_OUTCOME',
            event_type: 'GUIDANCE_OUTCOME_RECORDED',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            version_number: 1,
            checksum: this.generateChecksum({ outcomeId, outcome: params.outcome }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async getHistory(entityId: string): Promise<GuidanceHistoryEntry[]> {
        return this.repository.getHistory(entityId);
    }

    async getAuditTrail(entityId?: string): Promise<GuidanceAuditEvent[]> {
        return this.repository.getAudit(entityId);
    }
}

export const guidanceEngine = new GuidanceEngine();
