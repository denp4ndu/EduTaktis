import { 
    StudentBehaviorEvent, 
    BehaviorEventStatus, 
    BehaviorCategory, 
    BehaviorSeverity, 
    DisciplineCase, 
    DisciplineCaseStatus, 
    DisciplineAction, 
    DisciplineActionType, 
    GuidanceIntervention, 
    InterventionStatus, 
    BehaviorFollowUp, 
    FollowUpStatus, 
    BehaviorHistoryEntry, 
    BehaviorAuditEvent, 
    StudentBehaviorSummary, 
    TeacherBehaviorMonitoring 
} from '../types/curriculum';
import { 
    behaviorRepositoryEngine, 
    BehaviorRepositoryEngine 
} from './behaviorRepositoryEngine';
import { 
    behaviorValidationEngine, 
    BehaviorValidationEngine 
} from './behaviorValidationEngine';

export interface RecordBehaviorEventParams {
    student_id: string;
    academic_year_id: string;
    semester_id: string;
    course_id?: string;
    course_period_id?: string;
    learning_session_id?: string;
    attendance_session_id?: string;
    attendance_record_id?: string;
    category: BehaviorCategory;
    severity: BehaviorSeverity;
    title: string;
    description: string;
    event_date: string;
    reporter_id: string;
    reporter_role: string;
    status?: BehaviorEventStatus;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
}

export interface ReviewBehaviorEventParams {
    event_id: string;
    reviewer_id: string;
    reviewer_role: string;
    reviewer_notes?: string;
    new_status?: BehaviorEventStatus;
    case_id?: string;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
}

export interface ResolveBehaviorEventParams {
    event_id: string;
    actor_id: string;
    actor_role: string;
    resolution_notes: string;
}

export interface ArchiveBehaviorEventParams {
    event_id: string;
    actor_id: string;
    actor_role: string;
    archive_reason: string;
}

export interface CreateDisciplineCaseParams {
    student_id: string;
    academic_year_id: string;
    semester_id: string;
    event_ids: string[];
    title: string;
    description: string;
    severity: BehaviorSeverity;
    assigned_officer_id: string;
    assigned_officer_role: string;
}

export interface UpdateDisciplineCaseStatusParams {
    case_id: string;
    new_status: DisciplineCaseStatus;
    actor_id: string;
    actor_role: string;
    reason: string;
}

export interface AddDisciplineActionParams {
    case_id: string;
    action_type: DisciplineActionType;
    description: string;
    assigned_to?: string;
    due_date?: string;
    actor_id: string;
    actor_role: string;
}

export interface UpdateDisciplineActionParams {
    case_id: string;
    action_id: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    actor_id: string;
    actor_role: string;
}

export interface ResolveDisciplineCaseParams {
    case_id: string;
    resolution_notes: string;
    actor_id: string;
    actor_role: string;
}

export interface CloseDisciplineCaseParams {
    case_id: string;
    actor_id: string;
    actor_role: string;
}

export interface ArchiveDisciplineCaseParams {
    case_id: string;
    actor_id: string;
    actor_role: string;
    archive_reason: string;
}

export interface CreateGuidanceInterventionParams {
    student_id: string;
    academic_year_id: string;
    semester_id: string;
    case_id?: string;
    event_id?: string;
    intervention_type: string;
    goal: string;
    action_plan: string;
    start_at: string;
    expected_end_at: string;
    responsible_counselor_id: string;
    responsible_counselor_role: string;
    status?: InterventionStatus;
}

export interface UpdateInterventionStatusParams {
    intervention_id: string;
    new_status: InterventionStatus;
    actor_id: string;
    actor_role: string;
    reason: string;
    outcome?: string;
}

export interface ScheduleFollowUpParams {
    intervention_id: string;
    scheduled_at: string;
    actor_id: string;
    notes?: string;
}

export interface RecordFollowUpOutcomeParams {
    intervention_id: string;
    follow_up_id: string;
    status: FollowUpStatus;
    outcome: string;
    actor_id: string;
    notes?: string;
}

export interface CompleteInterventionParams {
    intervention_id: string;
    outcome: string;
    actor_id: string;
    actor_role: string;
}

export interface ArchiveInterventionParams {
    intervention_id: string;
    actor_id: string;
    actor_role: string;
    archive_reason: string;
}

export class BehaviorEngine {
    constructor(
        private repository: BehaviorRepositoryEngine = behaviorRepositoryEngine,
        private validator: BehaviorValidationEngine = behaviorValidationEngine
    ) {}

    private generateChecksum(data: unknown, prefix = 'BEH-CHK-'): string {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return `${prefix}${Math.abs(hash).toString(16).toUpperCase()}-${str.length}`;
    }

    // ==========================================
    // BEHAVIOR EVENTS
    // ==========================================
    async recordBehaviorEvent(params: RecordBehaviorEventParams): Promise<StudentBehaviorEvent> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            student_id: params.student_id,
            academic_year_id: params.academic_year_id,
            semester_id: params.semester_id,
            title: params.title,
            description: params.description,
            reporter_id: params.reporter_id,
            reporter_role: params.reporter_role
        });

        if (params.course_id) {
            this.validator.validateIdentity({ course_id: params.course_id });
            if (params.reporter_role === 'TEACHER') {
                this.validator.validateTeacherScope(
                    params.reporter_id, 
                    params.course_id, 
                    params.teacher_authorized_courses
                );
            }
        }

        this.validator.validateCategory(params.category);
        this.validator.validateSeverity(params.severity);

        const initialStatus: BehaviorEventStatus = params.status || 'RECORDED';
        this.validator.validateBehaviorEventTransition(null as any, initialStatus);

        const eventId = `BEH-EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const baseEvent: Omit<StudentBehaviorEvent, 'checksum'> = {
            event_id: eventId,
            student_id: params.student_id,
            academic_year_id: params.academic_year_id,
            semester_id: params.semester_id,
            course_id: params.course_id,
            course_period_id: params.course_period_id,
            learning_session_id: params.learning_session_id,
            attendance_session_id: params.attendance_session_id,
            attendance_record_id: params.attendance_record_id,
            category: params.category,
            severity: params.severity,
            title: params.title.trim(),
            description: params.description.trim(),
            event_date: params.event_date,
            reporter_id: params.reporter_id,
            reporter_role: params.reporter_role,
            status: initialStatus,
            version_number: 1,
            created_at: now,
            updated_at: now
        };

        const checksum = this.generateChecksum(baseEvent, 'EVT-CHK-');
        const fullEvent: StudentBehaviorEvent = {
            ...baseEvent,
            checksum
        };

        this.validator.validateBehaviorEvent(fullEvent);
        const saved = await this.repository.saveBehaviorEvent(fullEvent);

        const auditEvent: BehaviorAuditEvent = {
            audit_id: `AUD-BEH-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: eventId,
            entity_type: 'BEHAVIOR_EVENT',
            event_type: initialStatus === 'DRAFT' ? 'BEHAVIOR_EVENT_CREATED' : 'BEHAVIOR_EVENT_RECORDED',
            actor_id: params.reporter_id,
            actor_role: params.reporter_role,
            timestamp: now,
            new_status: initialStatus,
            version_number: 1,
            checksum: this.generateChecksum({ eventId, status: initialStatus }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async reviewBehaviorEvent(params: ReviewBehaviorEventParams): Promise<StudentBehaviorEvent> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            event_id: params.event_id,
            actor_id: params.reviewer_id
        });

        const existing = await this.repository.getBehaviorEvent(params.event_id);
        if (!existing) {
            throw new Error(`BEHAVIOR_EVENT_NOT_FOUND: Event ${params.event_id} does not exist`);
        }

        const targetStatus: BehaviorEventStatus = params.new_status || 'REVIEWED';
        this.validator.validateBehaviorEventTransition(existing.status, targetStatus);

        const { checksum: currentChecksum, ...cleanEvent } = existing;
        const expectedChecksum = this.generateChecksum(cleanEvent, 'EVT-CHK-');
        this.validator.validateChecksum(expectedChecksum, currentChecksum, 'BEHAVIOR');

        if (existing.course_id && params.reviewer_role === 'TEACHER') {
            this.validator.validateTeacherScope(
                params.reviewer_id, 
                existing.course_id, 
                params.teacher_authorized_courses
            );
        }

        const now = new Date().toISOString();
        const nextVersion = existing.version_number + 1;

        const updatedBase: Omit<StudentBehaviorEvent, 'checksum'> = {
            ...existing,
            reviewer_id: params.reviewer_id,
            reviewer_notes: params.reviewer_notes?.trim() || existing.reviewer_notes,
            status: targetStatus,
            case_id: params.case_id || existing.case_id,
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(updatedBase, 'EVT-CHK-');
        const updatedEvent: StudentBehaviorEvent = {
            ...updatedBase,
            checksum
        };

        this.validator.validateBehaviorEvent(updatedEvent);
        const saved = await this.repository.saveBehaviorEvent(updatedEvent);

        const historyEntry: BehaviorHistoryEntry = {
            history_id: `HIST-BEH-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.event_id,
            entity_type: 'BEHAVIOR_EVENT',
            version_number: nextVersion,
            previous_status: existing.status,
            new_status: targetStatus,
            revision_reason: params.reviewer_notes || 'Reviewed behavior event',
            actor_id: params.reviewer_id,
            timestamp: now,
            checksum: this.generateChecksum({ id: existing.event_id, v: nextVersion }, 'HIST-CHK-')
        };
        await this.repository.recordHistory(historyEntry);

        const auditEvent: BehaviorAuditEvent = {
            audit_id: `AUD-BEH-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.event_id,
            entity_type: 'BEHAVIOR_EVENT',
            event_type: 'BEHAVIOR_EVENT_REVIEWED',
            actor_id: params.reviewer_id,
            actor_role: params.reviewer_role,
            timestamp: now,
            previous_status: existing.status,
            new_status: targetStatus,
            version_number: nextVersion,
            checksum: this.generateChecksum({ id: existing.event_id, status: targetStatus }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async resolveBehaviorEvent(params: ResolveBehaviorEventParams): Promise<StudentBehaviorEvent> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            event_id: params.event_id,
            actor_id: params.actor_id,
            description: params.resolution_notes
        });

        const existing = await this.repository.getBehaviorEvent(params.event_id);
        if (!existing) {
            throw new Error(`BEHAVIOR_EVENT_NOT_FOUND: Event ${params.event_id} does not exist`);
        }

        this.validator.validateBehaviorEventTransition(existing.status, 'RESOLVED');

        const now = new Date().toISOString();
        const nextVersion = existing.version_number + 1;

        const updatedBase: Omit<StudentBehaviorEvent, 'checksum'> = {
            ...existing,
            reviewer_notes: params.resolution_notes.trim(),
            status: 'RESOLVED',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(updatedBase, 'EVT-CHK-');
        const updatedEvent: StudentBehaviorEvent = {
            ...updatedBase,
            checksum
        };

        this.validator.validateBehaviorEvent(updatedEvent);
        const saved = await this.repository.saveBehaviorEvent(updatedEvent);

        const historyEntry: BehaviorHistoryEntry = {
            history_id: `HIST-BEH-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.event_id,
            entity_type: 'BEHAVIOR_EVENT',
            version_number: nextVersion,
            previous_status: existing.status,
            new_status: 'RESOLVED',
            revision_reason: params.resolution_notes,
            actor_id: params.actor_id,
            timestamp: now,
            checksum: this.generateChecksum({ id: existing.event_id, v: nextVersion }, 'HIST-CHK-')
        };
        await this.repository.recordHistory(historyEntry);

        const auditEvent: BehaviorAuditEvent = {
            audit_id: `AUD-BEH-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.event_id,
            entity_type: 'BEHAVIOR_EVENT',
            event_type: 'BEHAVIOR_EVENT_RESOLVED',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            previous_status: existing.status,
            new_status: 'RESOLVED',
            version_number: nextVersion,
            checksum: this.generateChecksum({ id: existing.event_id, status: 'RESOLVED' }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async archiveBehaviorEvent(params: ArchiveBehaviorEventParams): Promise<StudentBehaviorEvent> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            event_id: params.event_id,
            actor_id: params.actor_id,
            description: params.archive_reason
        });

        const existing = await this.repository.getBehaviorEvent(params.event_id);
        if (!existing) {
            throw new Error(`BEHAVIOR_EVENT_NOT_FOUND: Event ${params.event_id} does not exist`);
        }

        this.validator.validateBehaviorEventTransition(existing.status, 'ARCHIVED');

        const now = new Date().toISOString();
        const nextVersion = existing.version_number + 1;

        const updatedBase: Omit<StudentBehaviorEvent, 'checksum'> = {
            ...existing,
            status: 'ARCHIVED',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(updatedBase, 'EVT-CHK-');
        const updatedEvent: StudentBehaviorEvent = {
            ...updatedBase,
            checksum
        };

        this.validator.validateBehaviorEvent(updatedEvent);
        const saved = await this.repository.saveBehaviorEvent(updatedEvent);

        const historyEntry: BehaviorHistoryEntry = {
            history_id: `HIST-BEH-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.event_id,
            entity_type: 'BEHAVIOR_EVENT',
            version_number: nextVersion,
            previous_status: existing.status,
            new_status: 'ARCHIVED',
            revision_reason: params.archive_reason,
            actor_id: params.actor_id,
            timestamp: now,
            checksum: this.generateChecksum({ id: existing.event_id, v: nextVersion }, 'HIST-CHK-')
        };
        await this.repository.recordHistory(historyEntry);

        const auditEvent: BehaviorAuditEvent = {
            audit_id: `AUD-BEH-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.event_id,
            entity_type: 'BEHAVIOR_EVENT',
            event_type: 'BEHAVIOR_EVENT_ARCHIVED',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            previous_status: existing.status,
            new_status: 'ARCHIVED',
            version_number: nextVersion,
            checksum: this.generateChecksum({ id: existing.event_id, status: 'ARCHIVED' }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async getBehaviorEvent(eventId: string): Promise<StudentBehaviorEvent | null> {
        return this.repository.getBehaviorEvent(eventId);
    }

    async listBehaviorEvents(filter?: {
        student_id?: string;
        semester_id?: string;
        course_id?: string;
        course_period_id?: string;
        reporter_id?: string;
    }): Promise<StudentBehaviorEvent[]> {
        return this.repository.listBehaviorEvents(filter);
    }

    // ==========================================
    // DISCIPLINE CASES
    // ==========================================
    async createDisciplineCase(params: CreateDisciplineCaseParams): Promise<DisciplineCase> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            student_id: params.student_id,
            academic_year_id: params.academic_year_id,
            semester_id: params.semester_id,
            title: params.title,
            description: params.description,
            actor_id: params.assigned_officer_id
        });

        this.validator.validateSeverity(params.severity);
        this.validator.validateDisciplineAuthority(params.assigned_officer_role);

        if (!Array.isArray(params.event_ids) || params.event_ids.length === 0) {
            throw new Error('INVALID_DISCIPLINE_CASE_EVENTS: At least one behavior event must be linked to the case');
        }

        const caseId = `DISC-CASE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const baseCase: Omit<DisciplineCase, 'checksum'> = {
            case_id: caseId,
            student_id: params.student_id,
            academic_year_id: params.academic_year_id,
            semester_id: params.semester_id,
            event_ids: params.event_ids,
            title: params.title.trim(),
            description: params.description.trim(),
            severity: params.severity,
            status: 'OPEN',
            assigned_officer_id: params.assigned_officer_id,
            assigned_officer_role: params.assigned_officer_role,
            actions: [],
            intervention_ids: [],
            version_number: 1,
            created_at: now,
            updated_at: now
        };

        const checksum = this.generateChecksum(baseCase, 'CASE-CHK-');
        const fullCase: DisciplineCase = {
            ...baseCase,
            checksum
        };

        const saved = await this.repository.saveDisciplineCase(fullCase);

        // Update linked events with case_id
        for (const eventId of params.event_ids) {
            const event = await this.repository.getBehaviorEvent(eventId);
            if (event) {
                const nextEvtVersion = event.version_number + 1;
                const updatedEvtBase: Omit<StudentBehaviorEvent, 'checksum'> = {
                    ...event,
                    case_id: caseId,
                    version_number: nextEvtVersion,
                    updated_at: now
                };
                const evtChecksum = this.generateChecksum(updatedEvtBase, 'EVT-CHK-');
                await this.repository.saveBehaviorEvent({
                    ...updatedEvtBase,
                    checksum: evtChecksum
                });
            }
        }

        const auditEvent: BehaviorAuditEvent = {
            audit_id: `AUD-DISC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: caseId,
            entity_type: 'DISCIPLINE_CASE',
            event_type: 'DISCIPLINE_CASE_CREATED',
            actor_id: params.assigned_officer_id,
            actor_role: params.assigned_officer_role,
            timestamp: now,
            new_status: 'OPEN',
            version_number: 1,
            checksum: this.generateChecksum({ caseId, status: 'OPEN' }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async updateDisciplineCaseStatus(params: UpdateDisciplineCaseStatusParams): Promise<DisciplineCase> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            case_id: params.case_id,
            actor_id: params.actor_id,
            description: params.reason
        });

        this.validator.validateDisciplineAuthority(params.actor_role);

        const existing = await this.repository.getDisciplineCase(params.case_id);
        if (!existing) {
            throw new Error(`DISCIPLINE_CASE_NOT_FOUND: Case ${params.case_id} does not exist`);
        }

        this.validator.validateDisciplineCaseTransition(existing.status, params.new_status);

        const { checksum: currentChecksum, ...cleanCase } = existing;
        const expectedChecksum = this.generateChecksum(cleanCase, 'CASE-CHK-');
        this.validator.validateChecksum(expectedChecksum, currentChecksum, 'DISCIPLINE_CASE');

        const now = new Date().toISOString();
        const nextVersion = existing.version_number + 1;

        const updatedBase: Omit<DisciplineCase, 'checksum'> = {
            ...existing,
            status: params.new_status,
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(updatedBase, 'CASE-CHK-');
        const updatedCase: DisciplineCase = {
            ...updatedBase,
            checksum
        };

        const saved = await this.repository.saveDisciplineCase(updatedCase);

        const historyEntry: BehaviorHistoryEntry = {
            history_id: `HIST-DISC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.case_id,
            entity_type: 'DISCIPLINE_CASE',
            version_number: nextVersion,
            previous_status: existing.status,
            new_status: params.new_status,
            revision_reason: params.reason,
            actor_id: params.actor_id,
            timestamp: now,
            checksum: this.generateChecksum({ id: existing.case_id, v: nextVersion }, 'HIST-CHK-')
        };
        await this.repository.recordHistory(historyEntry);

        const auditEvent: BehaviorAuditEvent = {
            audit_id: `AUD-DISC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.case_id,
            entity_type: 'DISCIPLINE_CASE',
            event_type: 'DISCIPLINE_CASE_REVIEWED',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            previous_status: existing.status,
            new_status: params.new_status,
            version_number: nextVersion,
            checksum: this.generateChecksum({ id: existing.case_id, status: params.new_status }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async addDisciplineAction(params: AddDisciplineActionParams): Promise<DisciplineCase> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            case_id: params.case_id,
            description: params.description,
            actor_id: params.actor_id
        });

        this.validator.validateActionType(params.action_type);
        this.validator.validateDisciplineAuthority(params.actor_role);

        const existing = await this.repository.getDisciplineCase(params.case_id);
        if (!existing) {
            throw new Error(`DISCIPLINE_CASE_NOT_FOUND: Case ${params.case_id} does not exist`);
        }

        if (existing.status === 'ARCHIVED' || existing.status === 'CLOSED') {
            throw new Error(`CANNOT_MODIFY_CLOSED_CASE: Case is in terminal status ${existing.status}`);
        }

        const now = new Date().toISOString();
        const actionId = `ACT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        const baseAction: Omit<DisciplineAction, 'checksum'> = {
            action_id: actionId,
            case_id: existing.case_id,
            action_type: params.action_type,
            description: params.description.trim(),
            assigned_to: params.assigned_to,
            due_date: params.due_date,
            status: 'PENDING',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            created_at: now,
            version_number: 1
        };

        const actionChecksum = this.generateChecksum(baseAction, 'ACT-CHK-');
        const fullAction: DisciplineAction = {
            ...baseAction,
            checksum: actionChecksum
        };

        const nextVersion = existing.version_number + 1;
        const newActions = [...existing.actions, fullAction];

        // Transition status if needed to ACTION_REQUIRED or INTERVENTION_ACTIVE
        let targetStatus = existing.status;
        if (existing.status === 'OPEN' || existing.status === 'UNDER_REVIEW') {
            targetStatus = 'ACTION_REQUIRED';
        }

        const updatedBase: Omit<DisciplineCase, 'checksum'> = {
            ...existing,
            actions: newActions,
            status: targetStatus,
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(updatedBase, 'CASE-CHK-');
        const updatedCase: DisciplineCase = {
            ...updatedBase,
            checksum
        };

        const saved = await this.repository.saveDisciplineCase(updatedCase);

        const auditEvent: BehaviorAuditEvent = {
            audit_id: `AUD-DISC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.case_id,
            entity_type: 'DISCIPLINE_CASE',
            event_type: 'DISCIPLINE_ACTION_CREATED',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            version_number: nextVersion,
            checksum: this.generateChecksum({ actionId, caseId: existing.case_id }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async updateDisciplineAction(params: UpdateDisciplineActionParams): Promise<DisciplineCase> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            case_id: params.case_id,
            action_id: params.action_id,
            actor_id: params.actor_id
        });

        this.validator.validateDisciplineAuthority(params.actor_role);

        const existing = await this.repository.getDisciplineCase(params.case_id);
        if (!existing) {
            throw new Error(`DISCIPLINE_CASE_NOT_FOUND: Case ${params.case_id} does not exist`);
        }

        const actionIdx = existing.actions.findIndex(a => a.action_id === params.action_id);
        if (actionIdx === -1) {
            throw new Error(`DISCIPLINE_ACTION_NOT_FOUND: Action ${params.action_id} does not exist in case`);
        }

        const currentAction = existing.actions[actionIdx];
        const nextActionVersion = currentAction.version_number + 1;
        const now = new Date().toISOString();

        const updatedActionBase: Omit<DisciplineAction, 'checksum'> = {
            ...currentAction,
            status: params.status,
            version_number: nextActionVersion
        };
        const actionChecksum = this.generateChecksum(updatedActionBase, 'ACT-CHK-');
        const updatedAction: DisciplineAction = {
            ...updatedActionBase,
            checksum: actionChecksum
        };

        const newActions = [...existing.actions];
        newActions[actionIdx] = updatedAction;

        const nextCaseVersion = existing.version_number + 1;
        const updatedCaseBase: Omit<DisciplineCase, 'checksum'> = {
            ...existing,
            actions: newActions,
            version_number: nextCaseVersion,
            updated_at: now
        };

        const caseChecksum = this.generateChecksum(updatedCaseBase, 'CASE-CHK-');
        const updatedCase: DisciplineCase = {
            ...updatedCaseBase,
            checksum: caseChecksum
        };

        return this.repository.saveDisciplineCase(updatedCase);
    }

    async resolveDisciplineCase(params: ResolveDisciplineCaseParams): Promise<DisciplineCase> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            case_id: params.case_id,
            description: params.resolution_notes,
            actor_id: params.actor_id
        });

        this.validator.validateDisciplineAuthority(params.actor_role);

        const existing = await this.repository.getDisciplineCase(params.case_id);
        if (!existing) {
            throw new Error(`DISCIPLINE_CASE_NOT_FOUND: Case ${params.case_id} does not exist`);
        }

        this.validator.validateDisciplineCaseTransition(existing.status, 'RESOLVED');

        const now = new Date().toISOString();
        const nextVersion = existing.version_number + 1;

        const updatedBase: Omit<DisciplineCase, 'checksum'> = {
            ...existing,
            status: 'RESOLVED',
            resolution_notes: params.resolution_notes.trim(),
            resolved_at: now,
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(updatedBase, 'CASE-CHK-');
        const updatedCase: DisciplineCase = {
            ...updatedBase,
            checksum
        };

        const saved = await this.repository.saveDisciplineCase(updatedCase);

        const historyEntry: BehaviorHistoryEntry = {
            history_id: `HIST-DISC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.case_id,
            entity_type: 'DISCIPLINE_CASE',
            version_number: nextVersion,
            previous_status: existing.status,
            new_status: 'RESOLVED',
            revision_reason: params.resolution_notes,
            actor_id: params.actor_id,
            timestamp: now,
            checksum: this.generateChecksum({ id: existing.case_id, v: nextVersion }, 'HIST-CHK-')
        };
        await this.repository.recordHistory(historyEntry);

        const auditEvent: BehaviorAuditEvent = {
            audit_id: `AUD-DISC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.case_id,
            entity_type: 'DISCIPLINE_CASE',
            event_type: 'DISCIPLINE_CASE_RESOLVED',
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

    async closeDisciplineCase(params: CloseDisciplineCaseParams): Promise<DisciplineCase> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            case_id: params.case_id,
            actor_id: params.actor_id
        });

        this.validator.validateDisciplineAuthority(params.actor_role);

        const existing = await this.repository.getDisciplineCase(params.case_id);
        if (!existing) {
            throw new Error(`DISCIPLINE_CASE_NOT_FOUND: Case ${params.case_id} does not exist`);
        }

        this.validator.validateDisciplineCaseTransition(existing.status, 'CLOSED');

        const now = new Date().toISOString();
        const nextVersion = existing.version_number + 1;

        const updatedBase: Omit<DisciplineCase, 'checksum'> = {
            ...existing,
            status: 'CLOSED',
            closed_at: now,
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(updatedBase, 'CASE-CHK-');
        const updatedCase: DisciplineCase = {
            ...updatedBase,
            checksum
        };

        const saved = await this.repository.saveDisciplineCase(updatedCase);

        const historyEntry: BehaviorHistoryEntry = {
            history_id: `HIST-DISC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.case_id,
            entity_type: 'DISCIPLINE_CASE',
            version_number: nextVersion,
            previous_status: existing.status,
            new_status: 'CLOSED',
            revision_reason: 'Closed discipline case',
            actor_id: params.actor_id,
            timestamp: now,
            checksum: this.generateChecksum({ id: existing.case_id, v: nextVersion }, 'HIST-CHK-')
        };
        await this.repository.recordHistory(historyEntry);

        const auditEvent: BehaviorAuditEvent = {
            audit_id: `AUD-DISC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.case_id,
            entity_type: 'DISCIPLINE_CASE',
            event_type: 'DISCIPLINE_CASE_CLOSED',
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

    async archiveDisciplineCase(params: ArchiveDisciplineCaseParams): Promise<DisciplineCase> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            case_id: params.case_id,
            actor_id: params.actor_id,
            description: params.archive_reason
        });

        this.validator.validateDisciplineAuthority(params.actor_role);

        const existing = await this.repository.getDisciplineCase(params.case_id);
        if (!existing) {
            throw new Error(`DISCIPLINE_CASE_NOT_FOUND: Case ${params.case_id} does not exist`);
        }

        this.validator.validateDisciplineCaseTransition(existing.status, 'ARCHIVED');

        const now = new Date().toISOString();
        const nextVersion = existing.version_number + 1;

        const updatedBase: Omit<DisciplineCase, 'checksum'> = {
            ...existing,
            status: 'ARCHIVED',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(updatedBase, 'CASE-CHK-');
        const updatedCase: DisciplineCase = {
            ...updatedBase,
            checksum
        };

        const saved = await this.repository.saveDisciplineCase(updatedCase);

        const historyEntry: BehaviorHistoryEntry = {
            history_id: `HIST-DISC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.case_id,
            entity_type: 'DISCIPLINE_CASE',
            version_number: nextVersion,
            previous_status: existing.status,
            new_status: 'ARCHIVED',
            revision_reason: params.archive_reason,
            actor_id: params.actor_id,
            timestamp: now,
            checksum: this.generateChecksum({ id: existing.case_id, v: nextVersion }, 'HIST-CHK-')
        };
        await this.repository.recordHistory(historyEntry);

        const auditEvent: BehaviorAuditEvent = {
            audit_id: `AUD-DISC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.case_id,
            entity_type: 'DISCIPLINE_CASE',
            event_type: 'DISCIPLINE_CASE_ARCHIVED',
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

    async getDisciplineCase(caseId: string): Promise<DisciplineCase | null> {
        return this.repository.getDisciplineCase(caseId);
    }

    async listDisciplineCases(filter?: {
        student_id?: string;
        semester_id?: string;
        assigned_officer_id?: string;
        status?: string;
    }): Promise<DisciplineCase[]> {
        return this.repository.listDisciplineCases(filter);
    }

    // ==========================================
    // GUIDANCE INTERVENTIONS
    // ==========================================
    async createGuidanceIntervention(params: CreateGuidanceInterventionParams): Promise<GuidanceIntervention> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            student_id: params.student_id,
            academic_year_id: params.academic_year_id,
            semester_id: params.semester_id,
            title: params.intervention_type,
            description: params.goal,
            actor_id: params.responsible_counselor_id
        });

        this.validator.validateDisciplineAuthority(params.responsible_counselor_role, ['COUNSELOR', 'HEADMASTER', 'ADMIN', 'DISCIPLINE_OFFICER']);

        const initialStatus: InterventionStatus = params.status || 'PLANNED';
        this.validator.validateInterventionTransition(null as any, initialStatus);

        const interventionId = `INTERV-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const baseIntervention: Omit<GuidanceIntervention, 'checksum'> = {
            intervention_id: interventionId,
            student_id: params.student_id,
            case_id: params.case_id,
            event_id: params.event_id,
            academic_year_id: params.academic_year_id,
            semester_id: params.semester_id,
            intervention_type: params.intervention_type.trim(),
            goal: params.goal.trim(),
            action_plan: params.action_plan.trim(),
            start_at: params.start_at,
            expected_end_at: params.expected_end_at,
            responsible_counselor_id: params.responsible_counselor_id,
            responsible_counselor_role: params.responsible_counselor_role,
            follow_ups: [],
            status: initialStatus,
            version_number: 1,
            created_at: now,
            updated_at: now
        };

        const checksum = this.generateChecksum(baseIntervention, 'INT-CHK-');
        const fullIntervention: GuidanceIntervention = {
            ...baseIntervention,
            checksum
        };

        const saved = await this.repository.saveIntervention(fullIntervention);

        // If linked to case, update case's intervention_ids and status to INTERVENTION_ACTIVE
        if (params.case_id) {
            const disciplineCase = await this.repository.getDisciplineCase(params.case_id);
            if (disciplineCase) {
                const nextCaseVersion = disciplineCase.version_number + 1;
                const interventionIds = disciplineCase.intervention_ids.includes(interventionId)
                    ? disciplineCase.intervention_ids
                    : [...disciplineCase.intervention_ids, interventionId];

                let targetCaseStatus = disciplineCase.status;
                if (disciplineCase.status === 'OPEN' || disciplineCase.status === 'UNDER_REVIEW' || disciplineCase.status === 'ACTION_REQUIRED') {
                    targetCaseStatus = 'INTERVENTION_ACTIVE';
                }

                const updatedCaseBase: Omit<DisciplineCase, 'checksum'> = {
                    ...disciplineCase,
                    intervention_ids: interventionIds,
                    status: targetCaseStatus,
                    version_number: nextCaseVersion,
                    updated_at: now
                };
                const caseChecksum = this.generateChecksum(updatedCaseBase, 'CASE-CHK-');
                await this.repository.saveDisciplineCase({
                    ...updatedCaseBase,
                    checksum: caseChecksum
                });
            }
        }

        const auditEvent: BehaviorAuditEvent = {
            audit_id: `AUD-INT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: interventionId,
            entity_type: 'GUIDANCE_INTERVENTION',
            event_type: 'INTERVENTION_CREATED',
            actor_id: params.responsible_counselor_id,
            actor_role: params.responsible_counselor_role,
            timestamp: now,
            new_status: initialStatus,
            version_number: 1,
            checksum: this.generateChecksum({ interventionId, status: initialStatus }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async updateInterventionStatus(params: UpdateInterventionStatusParams): Promise<GuidanceIntervention> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            intervention_id: params.intervention_id,
            actor_id: params.actor_id,
            description: params.reason
        });

        const existing = await this.repository.getIntervention(params.intervention_id);
        if (!existing) {
            throw new Error(`INTERVENTION_NOT_FOUND: Intervention ${params.intervention_id} does not exist`);
        }

        this.validator.validateDisciplineAuthority(params.actor_role, ['COUNSELOR', 'HEADMASTER', 'ADMIN', 'DISCIPLINE_OFFICER']);
        this.validator.validateInterventionTransition(existing.status, params.new_status);

        const { checksum: currentChecksum, ...cleanInt } = existing;
        const expectedChecksum = this.generateChecksum(cleanInt, 'INT-CHK-');
        this.validator.validateChecksum(expectedChecksum, currentChecksum, 'INTERVENTION');

        const now = new Date().toISOString();
        const nextVersion = existing.version_number + 1;

        const updatedBase: Omit<GuidanceIntervention, 'checksum'> = {
            ...existing,
            status: params.new_status,
            outcome: params.outcome || existing.outcome,
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(updatedBase, 'INT-CHK-');
        const updatedIntervention: GuidanceIntervention = {
            ...updatedBase,
            checksum
        };

        const saved = await this.repository.saveIntervention(updatedIntervention);

        const historyEntry: BehaviorHistoryEntry = {
            history_id: `HIST-INT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.intervention_id,
            entity_type: 'GUIDANCE_INTERVENTION',
            version_number: nextVersion,
            previous_status: existing.status,
            new_status: params.new_status,
            revision_reason: params.reason,
            actor_id: params.actor_id,
            timestamp: now,
            checksum: this.generateChecksum({ id: existing.intervention_id, v: nextVersion }, 'HIST-CHK-')
        };
        await this.repository.recordHistory(historyEntry);

        return saved;
    }

    async scheduleFollowUp(params: ScheduleFollowUpParams): Promise<GuidanceIntervention> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            intervention_id: params.intervention_id,
            actor_id: params.actor_id
        });

        const existing = await this.repository.getIntervention(params.intervention_id);
        if (!existing) {
            throw new Error(`INTERVENTION_NOT_FOUND: Intervention ${params.intervention_id} does not exist`);
        }

        if (existing.status === 'ARCHIVED' || existing.status === 'COMPLETED') {
            throw new Error(`CANNOT_SCHEDULE_FOLLOW_UP: Intervention is in terminal state ${existing.status}`);
        }

        const now = new Date().toISOString();
        const followUpId = `FOL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        const baseFollowUp: Omit<BehaviorFollowUp, 'checksum'> = {
            follow_up_id: followUpId,
            intervention_id: existing.intervention_id,
            scheduled_at: params.scheduled_at,
            actor_id: params.actor_id,
            notes: params.notes?.trim(),
            status: 'SCHEDULED',
            version_number: 1
        };

        const followUpChecksum = this.generateChecksum(baseFollowUp, 'FOL-CHK-');
        const fullFollowUp: BehaviorFollowUp = {
            ...baseFollowUp,
            checksum: followUpChecksum
        };

        const newFollowUps = [...existing.follow_ups, fullFollowUp];
        const nextVersion = existing.version_number + 1;

        // Transition intervention status to FOLLOW_UP if currently ACTIVE
        let targetStatus = existing.status;
        if (existing.status === 'ACTIVE' || existing.status === 'PLANNED') {
            targetStatus = 'FOLLOW_UP';
        }

        const updatedBase: Omit<GuidanceIntervention, 'checksum'> = {
            ...existing,
            follow_ups: newFollowUps,
            status: targetStatus,
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(updatedBase, 'INT-CHK-');
        const updatedIntervention: GuidanceIntervention = {
            ...updatedBase,
            checksum
        };

        const saved = await this.repository.saveIntervention(updatedIntervention);

        const auditEvent: BehaviorAuditEvent = {
            audit_id: `AUD-INT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.intervention_id,
            entity_type: 'GUIDANCE_INTERVENTION',
            event_type: 'INTERVENTION_FOLLOW_UP_SCHEDULED',
            actor_id: params.actor_id,
            actor_role: 'COUNSELOR',
            timestamp: now,
            version_number: nextVersion,
            checksum: this.generateChecksum({ followUpId, interventionId: existing.intervention_id }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async recordFollowUpOutcome(params: RecordFollowUpOutcomeParams): Promise<GuidanceIntervention> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            intervention_id: params.intervention_id,
            follow_up_id: params.follow_up_id,
            actor_id: params.actor_id,
            description: params.outcome
        });

        const existing = await this.repository.getIntervention(params.intervention_id);
        if (!existing) {
            throw new Error(`INTERVENTION_NOT_FOUND: Intervention ${params.intervention_id} does not exist`);
        }

        const idx = existing.follow_ups.findIndex(f => f.follow_up_id === params.follow_up_id);
        if (idx === -1) {
            throw new Error(`FOLLOW_UP_NOT_FOUND: Follow-up ${params.follow_up_id} does not exist`);
        }

        const currentFollowUp = existing.follow_ups[idx];
        this.validator.validateFollowUpTransition(currentFollowUp.status, params.status);

        const now = new Date().toISOString();
        const nextFollowUpVersion = currentFollowUp.version_number + 1;

        const updatedFollowUpBase: Omit<BehaviorFollowUp, 'checksum'> = {
            ...currentFollowUp,
            status: params.status,
            outcome: params.outcome.trim(),
            completed_at: params.status === 'COMPLETED' ? now : currentFollowUp.completed_at,
            notes: params.notes?.trim() || currentFollowUp.notes,
            version_number: nextFollowUpVersion
        };

        const followUpChecksum = this.generateChecksum(updatedFollowUpBase, 'FOL-CHK-');
        const updatedFollowUp: BehaviorFollowUp = {
            ...updatedFollowUpBase,
            checksum: followUpChecksum
        };

        const newFollowUps = [...existing.follow_ups];
        newFollowUps[idx] = updatedFollowUp;

        const nextInterventionVersion = existing.version_number + 1;
        const updatedBase: Omit<GuidanceIntervention, 'checksum'> = {
            ...existing,
            follow_ups: newFollowUps,
            version_number: nextInterventionVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(updatedBase, 'INT-CHK-');
        const updatedIntervention: GuidanceIntervention = {
            ...updatedBase,
            checksum
        };

        const saved = await this.repository.saveIntervention(updatedIntervention);

        const auditEvent: BehaviorAuditEvent = {
            audit_id: `AUD-INT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.intervention_id,
            entity_type: 'GUIDANCE_INTERVENTION',
            event_type: 'INTERVENTION_FOLLOW_UP_COMPLETED',
            actor_id: params.actor_id,
            actor_role: 'COUNSELOR',
            timestamp: now,
            version_number: nextInterventionVersion,
            checksum: this.generateChecksum({ followUpId: params.follow_up_id, status: params.status }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async completeIntervention(params: CompleteInterventionParams): Promise<GuidanceIntervention> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            intervention_id: params.intervention_id,
            actor_id: params.actor_id,
            description: params.outcome
        });

        this.validator.validateDisciplineAuthority(params.actor_role, ['COUNSELOR', 'HEADMASTER', 'ADMIN', 'DISCIPLINE_OFFICER']);

        const existing = await this.repository.getIntervention(params.intervention_id);
        if (!existing) {
            throw new Error(`INTERVENTION_NOT_FOUND: Intervention ${params.intervention_id} does not exist`);
        }

        this.validator.validateInterventionTransition(existing.status, 'COMPLETED');

        const now = new Date().toISOString();
        const nextVersion = existing.version_number + 1;

        const updatedBase: Omit<GuidanceIntervention, 'checksum'> = {
            ...existing,
            status: 'COMPLETED',
            outcome: params.outcome.trim(),
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(updatedBase, 'INT-CHK-');
        const updatedIntervention: GuidanceIntervention = {
            ...updatedBase,
            checksum
        };

        const saved = await this.repository.saveIntervention(updatedIntervention);

        const historyEntry: BehaviorHistoryEntry = {
            history_id: `HIST-INT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.intervention_id,
            entity_type: 'GUIDANCE_INTERVENTION',
            version_number: nextVersion,
            previous_status: existing.status,
            new_status: 'COMPLETED',
            revision_reason: params.outcome,
            actor_id: params.actor_id,
            timestamp: now,
            checksum: this.generateChecksum({ id: existing.intervention_id, v: nextVersion }, 'HIST-CHK-')
        };
        await this.repository.recordHistory(historyEntry);

        const auditEvent: BehaviorAuditEvent = {
            audit_id: `AUD-INT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: existing.intervention_id,
            entity_type: 'GUIDANCE_INTERVENTION',
            event_type: 'INTERVENTION_COMPLETED',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            previous_status: existing.status,
            new_status: 'COMPLETED',
            version_number: nextVersion,
            checksum: this.generateChecksum({ id: existing.intervention_id, status: 'COMPLETED' }, 'AUD-CHK-')
        };
        await this.repository.recordAudit(auditEvent);

        return saved;
    }

    async archiveIntervention(params: ArchiveInterventionParams): Promise<GuidanceIntervention> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            intervention_id: params.intervention_id,
            actor_id: params.actor_id,
            description: params.archive_reason
        });

        this.validator.validateDisciplineAuthority(params.actor_role, ['COUNSELOR', 'HEADMASTER', 'ADMIN', 'DISCIPLINE_OFFICER']);

        const existing = await this.repository.getIntervention(params.intervention_id);
        if (!existing) {
            throw new Error(`INTERVENTION_NOT_FOUND: Intervention ${params.intervention_id} does not exist`);
        }

        this.validator.validateInterventionTransition(existing.status, 'ARCHIVED');

        const now = new Date().toISOString();
        const nextVersion = existing.version_number + 1;

        const updatedBase: Omit<GuidanceIntervention, 'checksum'> = {
            ...existing,
            status: 'ARCHIVED',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(updatedBase, 'INT-CHK-');
        const updatedIntervention: GuidanceIntervention = {
            ...updatedBase,
            checksum
        };

        return this.repository.saveIntervention(updatedIntervention);
    }

    async getIntervention(interventionId: string): Promise<GuidanceIntervention | null> {
        return this.repository.getIntervention(interventionId);
    }

    async listInterventions(filter?: {
        student_id?: string;
        case_id?: string;
        semester_id?: string;
        counselor_id?: string;
        status?: string;
    }): Promise<GuidanceIntervention[]> {
        return this.repository.listInterventions(filter);
    }

    // ==========================================
    // ANALYTICS, SUMMARIES & PROJECTIONS
    // ==========================================
    async getStudentBehaviorSummary(studentId: string, semesterId: string): Promise<StudentBehaviorSummary> {
        this.validator.validateIdentity({ student_id: studentId, semester_id: semesterId });

        const events = await this.repository.listBehaviorEvents({
            student_id: studentId,
            semester_id: semesterId
        });

        const activeEvents = events.filter(e => e.status !== 'ARCHIVED');

        let positiveEvents = 0;
        let warningEvents = 0;
        let violationEvents = 0;

        for (const evt of activeEvents) {
            if (evt.category === 'POSITIVE_BEHAVIOR' || evt.category === 'ACHIEVEMENT' || evt.category === 'PARTICIPATION') {
                positiveEvents++;
            } else if (evt.category === 'WARNING') {
                warningEvents++;
            } else {
                violationEvents++;
            }
        }

        const cases = await this.repository.listDisciplineCases({
            student_id: studentId,
            semester_id: semesterId
        });
        const openCases = cases.filter(c => c.status === 'OPEN' || c.status === 'UNDER_REVIEW' || c.status === 'ACTION_REQUIRED' || c.status === 'INTERVENTION_ACTIVE').length;
        const resolvedCases = cases.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length;

        const interventions = await this.repository.listInterventions({
            student_id: studentId,
            semester_id: semesterId
        });
        const activeInterventions = interventions.filter(i => i.status === 'PLANNED' || i.status === 'ACTIVE' || i.status === 'FOLLOW_UP').length;
        const completedInterventions = interventions.filter(i => i.status === 'COMPLETED').length;

        let followUpPending = 0;
        for (const int of interventions) {
            if (int.status !== 'ARCHIVED') {
                followUpPending += int.follow_ups.filter(f => f.status === 'SCHEDULED' || f.status === 'RESCHEDULED').length;
            }
        }

        return Object.freeze({
            student_id: studentId,
            semester_id: semesterId,
            total_events: activeEvents.length,
            positive_events: positiveEvents,
            warning_events: warningEvents,
            violation_events: violationEvents,
            open_cases: openCases,
            resolved_cases: resolvedCases,
            active_interventions: activeInterventions,
            completed_interventions: completedInterventions,
            follow_up_pending: followUpPending
        });
    }

    async getTeacherBehaviorMonitoring(
        teacherId: string, 
        courseId: string, 
        coursePeriodId: string, 
        semesterId: string, 
        enrolledStudentIds: string[] = []
    ): Promise<TeacherBehaviorMonitoring> {
        this.validator.validateIdentity({
            teacher_id: teacherId,
            course_id: courseId,
            course_period_id: coursePeriodId,
            semester_id: semesterId
        });

        const courseEvents = await this.repository.listBehaviorEvents({
            course_id: courseId,
            course_period_id: coursePeriodId,
            semester_id: semesterId
        });

        const activeCourseEvents = courseEvents.filter(e => e.status !== 'ARCHIVED');

        const studentSummaries: StudentBehaviorSummary[] = [];
        const studentsRequiringAttention: string[] = [];

        for (const studentId of enrolledStudentIds) {
            const summary = await this.getStudentBehaviorSummary(studentId, semesterId);
            studentSummaries.push(summary);

            if (summary.violation_events > 0 || summary.open_cases > 0 || summary.active_interventions > 0 || summary.warning_events >= 2) {
                studentsRequiringAttention.push(studentId);
            }
        }

        const cases = await this.repository.listDisciplineCases({ semester_id: semesterId });
        const enrolledCases = cases.filter(c => enrolledStudentIds.includes(c.student_id));
        const openCaseCount = enrolledCases.filter(c => c.status === 'OPEN' || c.status === 'UNDER_REVIEW' || c.status === 'ACTION_REQUIRED' || c.status === 'INTERVENTION_ACTIVE').length;

        const interventions = await this.repository.listInterventions({ semester_id: semesterId });
        const enrolledInterventions = interventions.filter(i => enrolledStudentIds.includes(i.student_id));
        const activeInterventionCount = enrolledInterventions.filter(i => i.status === 'PLANNED' || i.status === 'ACTIVE' || i.status === 'FOLLOW_UP').length;

        return Object.freeze({
            teacher_id: teacherId,
            course_id: courseId,
            course_period_id: coursePeriodId,
            semester_id: semesterId,
            student_count: enrolledStudentIds.length,
            event_count: activeCourseEvents.length,
            open_case_count: openCaseCount,
            intervention_count: activeInterventionCount,
            students_requiring_attention: studentsRequiringAttention,
            student_summaries: studentSummaries
        });
    }

    async getBehaviorHistory(entityId: string): Promise<BehaviorHistoryEntry[]> {
        return this.repository.getHistory(entityId);
    }

    async getAuditTrail(entityId?: string): Promise<BehaviorAuditEvent[]> {
        return this.repository.getAuditEvents(entityId);
    }
}

export const behaviorEngine = new BehaviorEngine();
