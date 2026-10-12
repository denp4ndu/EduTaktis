import { 
    GuidanceCase, 
    GuidanceSession, 
    InterventionPlan, 
    GuidanceFollowUp, 
    GuidanceOutcome, 
    GuidanceHistoryEntry, 
    GuidanceAuditEvent 
} from '../types/curriculum';
import { 
    guidanceStorageProvider, 
    GuidanceStorageProvider 
} from './guidanceStorageProvider';

function deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    const propNames = Object.getOwnPropertyNames(obj);
    for (const name of propNames) {
        const value = (obj as any)[name];
        if (value && typeof value === 'object') {
            deepFreeze(value);
        }
    }
    return Object.freeze(obj);
}

export class GuidanceRepositoryEngine {
    constructor(
        private storage: GuidanceStorageProvider = guidanceStorageProvider
    ) {}

    // ==========================================
    // CASES
    // ==========================================
    async saveCase(guidanceCase: GuidanceCase): Promise<GuidanceCase> {
        const saved = await this.storage.saveCase(guidanceCase);
        return deepFreeze(saved);
    }

    async getCase(caseId: string): Promise<GuidanceCase | null> {
        const item = await this.storage.getCase(caseId);
        return item ? deepFreeze(item) : null;
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
        const cases = await this.storage.listCases(filter);
        cases.sort((a, b) => {
            const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (timeDiff !== 0) return timeDiff;
            return a.case_id.localeCompare(b.case_id);
        });
        return deepFreeze(cases);
    }

    // ==========================================
    // SESSIONS
    // ==========================================
    async saveSession(session: GuidanceSession): Promise<GuidanceSession> {
        const saved = await this.storage.saveSession(session);
        return deepFreeze(saved);
    }

    async getSession(sessionId: string): Promise<GuidanceSession | null> {
        const item = await this.storage.getSession(sessionId);
        return item ? deepFreeze(item) : null;
    }

    async listSessions(filter?: {
        case_id?: string;
        student_id?: string;
        counselor_id?: string;
        status?: string;
    }): Promise<GuidanceSession[]> {
        const sessions = await this.storage.listSessions(filter);
        sessions.sort((a, b) => {
            const timeDiff = new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
            if (timeDiff !== 0) return timeDiff;
            return a.session_id.localeCompare(b.session_id);
        });
        return deepFreeze(sessions);
    }

    // ==========================================
    // INTERVENTION PLANS
    // ==========================================
    async savePlan(plan: InterventionPlan): Promise<InterventionPlan> {
        const saved = await this.storage.savePlan(plan);
        return deepFreeze(saved);
    }

    async getPlan(planId: string): Promise<InterventionPlan | null> {
        const item = await this.storage.getPlan(planId);
        return item ? deepFreeze(item) : null;
    }

    async listPlans(filter?: {
        case_id?: string;
        student_id?: string;
        responsible_id?: string;
        status?: string;
    }): Promise<InterventionPlan[]> {
        const plans = await this.storage.listPlans(filter);
        plans.sort((a, b) => {
            const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (timeDiff !== 0) return timeDiff;
            return a.plan_id.localeCompare(b.plan_id);
        });
        return deepFreeze(plans);
    }

    // ==========================================
    // FOLLOW-UPS
    // ==========================================
    async saveFollowUp(followUp: GuidanceFollowUp): Promise<GuidanceFollowUp> {
        const saved = await this.storage.saveFollowUp(followUp);
        return deepFreeze(saved);
    }

    async getFollowUp(followUpId: string): Promise<GuidanceFollowUp | null> {
        const item = await this.storage.getFollowUp(followUpId);
        return item ? deepFreeze(item) : null;
    }

    async listFollowUps(filter?: {
        case_id?: string;
        student_id?: string;
        plan_id?: string;
        status?: string;
    }): Promise<GuidanceFollowUp[]> {
        const followUps = await this.storage.listFollowUps(filter);
        followUps.sort((a, b) => {
            const timeDiff = new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
            if (timeDiff !== 0) return timeDiff;
            return a.follow_up_id.localeCompare(b.follow_up_id);
        });
        return deepFreeze(followUps);
    }

    // ==========================================
    // OUTCOMES
    // ==========================================
    async saveOutcome(outcome: GuidanceOutcome): Promise<GuidanceOutcome> {
        const saved = await this.storage.saveOutcome(outcome);
        return deepFreeze(saved);
    }

    async getOutcome(outcomeId: string): Promise<GuidanceOutcome | null> {
        const item = await this.storage.getOutcome(outcomeId);
        return item ? deepFreeze(item) : null;
    }

    async listOutcomes(filter?: {
        case_id?: string;
        student_id?: string;
        plan_id?: string;
    }): Promise<GuidanceOutcome[]> {
        const outcomes = await this.storage.listOutcomes(filter);
        outcomes.sort((a, b) => {
            const timeDiff = new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime();
            if (timeDiff !== 0) return timeDiff;
            return a.outcome_id.localeCompare(b.outcome_id);
        });
        return deepFreeze(outcomes);
    }

    // ==========================================
    // HISTORY & AUDIT
    // ==========================================
    async recordHistory(entry: GuidanceHistoryEntry): Promise<void> {
        await this.storage.saveHistory(entry);
    }

    async getHistory(entityId: string): Promise<GuidanceHistoryEntry[]> {
        const history = await this.storage.getHistory(entityId);
        history.sort((a, b) => a.new_version - b.new_version);
        return deepFreeze(history);
    }

    async recordAudit(event: GuidanceAuditEvent): Promise<void> {
        await this.storage.saveAudit(event);
    }

    async getAudit(entityId?: string): Promise<GuidanceAuditEvent[]> {
        const audit = await this.storage.getAudit(entityId);
        audit.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return deepFreeze(audit);
    }

    async clear(): Promise<void> {
        await this.storage.clear();
    }
}

export const guidanceRepositoryEngine = new GuidanceRepositoryEngine();
