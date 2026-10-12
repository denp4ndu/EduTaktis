import { 
    GuidanceCase, 
    GuidanceSession, 
    InterventionPlan, 
    GuidanceFollowUp, 
    GuidanceOutcome, 
    GuidanceHistoryEntry, 
    GuidanceAuditEvent 
} from '../types/curriculum';

export interface GuidanceStorageProvider {
    // Cases
    saveCase(guidanceCase: GuidanceCase): Promise<GuidanceCase>;
    getCase(caseId: string): Promise<GuidanceCase | null>;
    listCases(filter?: {
        student_id?: string;
        semester_id?: string;
        course_id?: string;
        assigned_counselor_id?: string;
        assigned_teacher_id?: string;
        status?: string;
        priority?: string;
    }): Promise<GuidanceCase[]>;

    // Sessions
    saveSession(session: GuidanceSession): Promise<GuidanceSession>;
    getSession(sessionId: string): Promise<GuidanceSession | null>;
    listSessions(filter?: {
        case_id?: string;
        student_id?: string;
        counselor_id?: string;
        status?: string;
    }): Promise<GuidanceSession[]>;

    // Intervention Plans
    savePlan(plan: InterventionPlan): Promise<InterventionPlan>;
    getPlan(planId: string): Promise<InterventionPlan | null>;
    listPlans(filter?: {
        case_id?: string;
        student_id?: string;
        responsible_id?: string;
        status?: string;
    }): Promise<InterventionPlan[]>;

    // Follow-ups
    saveFollowUp(followUp: GuidanceFollowUp): Promise<GuidanceFollowUp>;
    getFollowUp(followUpId: string): Promise<GuidanceFollowUp | null>;
    listFollowUps(filter?: {
        case_id?: string;
        student_id?: string;
        plan_id?: string;
        status?: string;
    }): Promise<GuidanceFollowUp[]>;

    // Outcomes
    saveOutcome(outcome: GuidanceOutcome): Promise<GuidanceOutcome>;
    getOutcome(outcomeId: string): Promise<GuidanceOutcome | null>;
    listOutcomes(filter?: {
        case_id?: string;
        student_id?: string;
        plan_id?: string;
    }): Promise<GuidanceOutcome[]>;

    // History & Audit
    saveHistory(entry: GuidanceHistoryEntry): Promise<void>;
    getHistory(entityId: string): Promise<GuidanceHistoryEntry[]>;

    saveAudit(event: GuidanceAuditEvent): Promise<void>;
    getAudit(entityId?: string): Promise<GuidanceAuditEvent[]>;

    clear(): Promise<void>;
}

export class MemoryGuidanceStorageProvider implements GuidanceStorageProvider {
    private cases: Map<string, GuidanceCase> = new Map();
    private sessions: Map<string, GuidanceSession> = new Map();
    private plans: Map<string, InterventionPlan> = new Map();
    private followUps: Map<string, GuidanceFollowUp> = new Map();
    private outcomes: Map<string, GuidanceOutcome> = new Map();
    private historyEntries: GuidanceHistoryEntry[] = [];
    private auditEvents: GuidanceAuditEvent[] = [];

    async saveCase(guidanceCase: GuidanceCase): Promise<GuidanceCase> {
        this.cases.set(guidanceCase.case_id, JSON.parse(JSON.stringify(guidanceCase)));
        return JSON.parse(JSON.stringify(guidanceCase));
    }

    async getCase(caseId: string): Promise<GuidanceCase | null> {
        const item = this.cases.get(caseId);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }

    async listCases(filter?: {
        student_id?: string;
        semester_id?: string;
        course_id?: string;
        assigned_counselor_id?: string;
        assigned_teacher_id?: string;
        status?: string;
        priority?: string;
    }): Promise<GuidanceCase[]> {
        let results = Array.from(this.cases.values());
        if (filter) {
            if (filter.student_id) results = results.filter(c => c.student_id === filter.student_id);
            if (filter.semester_id) results = results.filter(c => c.semester_id === filter.semester_id);
            if (filter.course_id) results = results.filter(c => c.course_id === filter.course_id);
            if (filter.assigned_counselor_id) results = results.filter(c => c.assigned_counselor_id === filter.assigned_counselor_id);
            if (filter.assigned_teacher_id) results = results.filter(c => c.assigned_teacher_id === filter.assigned_teacher_id);
            if (filter.status) results = results.filter(c => c.status === filter.status);
            if (filter.priority) results = results.filter(c => c.priority === filter.priority);
        }
        return results.map(item => JSON.parse(JSON.stringify(item)));
    }

    async saveSession(session: GuidanceSession): Promise<GuidanceSession> {
        this.sessions.set(session.session_id, JSON.parse(JSON.stringify(session)));
        return JSON.parse(JSON.stringify(session));
    }

    async getSession(sessionId: string): Promise<GuidanceSession | null> {
        const item = this.sessions.get(sessionId);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }

    async listSessions(filter?: {
        case_id?: string;
        student_id?: string;
        counselor_id?: string;
        status?: string;
    }): Promise<GuidanceSession[]> {
        let results = Array.from(this.sessions.values());
        if (filter) {
            if (filter.case_id) results = results.filter(s => s.case_id === filter.case_id);
            if (filter.student_id) results = results.filter(s => s.student_id === filter.student_id);
            if (filter.counselor_id) results = results.filter(s => s.counselor_id === filter.counselor_id);
            if (filter.status) results = results.filter(s => s.status === filter.status);
        }
        return results.map(item => JSON.parse(JSON.stringify(item)));
    }

    async savePlan(plan: InterventionPlan): Promise<InterventionPlan> {
        this.plans.set(plan.plan_id, JSON.parse(JSON.stringify(plan)));
        return JSON.parse(JSON.stringify(plan));
    }

    async getPlan(planId: string): Promise<InterventionPlan | null> {
        const item = this.plans.get(planId);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }

    async listPlans(filter?: {
        case_id?: string;
        student_id?: string;
        responsible_id?: string;
        status?: string;
    }): Promise<InterventionPlan[]> {
        let results = Array.from(this.plans.values());
        if (filter) {
            if (filter.case_id) results = results.filter(p => p.case_id === filter.case_id);
            if (filter.student_id) results = results.filter(p => p.student_id === filter.student_id);
            if (filter.responsible_id) results = results.filter(p => p.responsible_id === filter.responsible_id);
            if (filter.status) results = results.filter(p => p.status === filter.status);
        }
        return results.map(item => JSON.parse(JSON.stringify(item)));
    }

    async saveFollowUp(followUp: GuidanceFollowUp): Promise<GuidanceFollowUp> {
        this.followUps.set(followUp.follow_up_id, JSON.parse(JSON.stringify(followUp)));
        return JSON.parse(JSON.stringify(followUp));
    }

    async getFollowUp(followUpId: string): Promise<GuidanceFollowUp | null> {
        const item = this.followUps.get(followUpId);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }

    async listFollowUps(filter?: {
        case_id?: string;
        student_id?: string;
        plan_id?: string;
        status?: string;
    }): Promise<GuidanceFollowUp[]> {
        let results = Array.from(this.followUps.values());
        if (filter) {
            if (filter.case_id) results = results.filter(f => f.case_id === filter.case_id);
            if (filter.student_id) results = results.filter(f => f.student_id === filter.student_id);
            if (filter.plan_id) results = results.filter(f => f.plan_id === filter.plan_id);
            if (filter.status) results = results.filter(f => f.status === filter.status);
        }
        return results.map(item => JSON.parse(JSON.stringify(item)));
    }

    async saveOutcome(outcome: GuidanceOutcome): Promise<GuidanceOutcome> {
        this.outcomes.set(outcome.outcome_id, JSON.parse(JSON.stringify(outcome)));
        return JSON.parse(JSON.stringify(outcome));
    }

    async getOutcome(outcomeId: string): Promise<GuidanceOutcome | null> {
        const item = this.outcomes.get(outcomeId);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }

    async listOutcomes(filter?: {
        case_id?: string;
        student_id?: string;
        plan_id?: string;
    }): Promise<GuidanceOutcome[]> {
        let results = Array.from(this.outcomes.values());
        if (filter) {
            if (filter.case_id) results = results.filter(o => o.case_id === filter.case_id);
            if (filter.student_id) results = results.filter(o => o.student_id === filter.student_id);
            if (filter.plan_id) results = results.filter(o => o.plan_id === filter.plan_id);
        }
        return results.map(item => JSON.parse(JSON.stringify(item)));
    }

    async saveHistory(entry: GuidanceHistoryEntry): Promise<void> {
        this.historyEntries.push(JSON.parse(JSON.stringify(entry)));
    }

    async getHistory(entityId: string): Promise<GuidanceHistoryEntry[]> {
        return this.historyEntries
            .filter(h => h.entity_id === entityId)
            .map(h => JSON.parse(JSON.stringify(h)));
    }

    async saveAudit(event: GuidanceAuditEvent): Promise<void> {
        this.auditEvents.push(JSON.parse(JSON.stringify(event)));
    }

    async getAudit(entityId?: string): Promise<GuidanceAuditEvent[]> {
        if (!entityId) {
            return this.auditEvents.map(e => JSON.parse(JSON.stringify(e)));
        }
        return this.auditEvents
            .filter(e => e.entity_id === entityId)
            .map(e => JSON.parse(JSON.stringify(e)));
    }

    async clear(): Promise<void> {
        this.cases.clear();
        this.sessions.clear();
        this.plans.clear();
        this.followUps.clear();
        this.outcomes.clear();
        this.historyEntries = [];
        this.auditEvents = [];
    }
}

export const guidanceStorageProvider: GuidanceStorageProvider = new MemoryGuidanceStorageProvider();
