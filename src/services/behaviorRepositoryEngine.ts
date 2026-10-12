import { 
    StudentBehaviorEvent, 
    DisciplineCase, 
    GuidanceIntervention, 
    BehaviorHistoryEntry, 
    BehaviorAuditEvent 
} from '../types/curriculum';
import { 
    behaviorStorageProvider, 
    BehaviorStorageProvider 
} from './behaviorStorageProvider';

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

export class BehaviorRepositoryEngine {
    constructor(
        private storage: BehaviorStorageProvider = behaviorStorageProvider
    ) {}

    // ==========================================
    // BEHAVIOR EVENTS
    // ==========================================
    async saveBehaviorEvent(event: StudentBehaviorEvent): Promise<StudentBehaviorEvent> {
        const saved = await this.storage.saveBehaviorEvent(event);
        return deepFreeze(saved);
    }

    async getBehaviorEvent(id: string): Promise<StudentBehaviorEvent | null> {
        const event = await this.storage.getBehaviorEvent(id);
        return event ? deepFreeze(event) : null;
    }

    async listBehaviorEvents(filter?: {
        student_id?: string;
        semester_id?: string;
        course_id?: string;
        course_period_id?: string;
        reporter_id?: string;
    }): Promise<StudentBehaviorEvent[]> {
        const events = await this.storage.listBehaviorEvents(filter);
        // Deterministic sorting by event_date descending, then event_id ascending
        events.sort((a, b) => {
            const dateDiff = new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
            if (dateDiff !== 0) return dateDiff;
            return a.event_id.localeCompare(b.event_id);
        });
        return deepFreeze(events);
    }

    // ==========================================
    // DISCIPLINE CASES
    // ==========================================
    async saveDisciplineCase(disciplineCase: DisciplineCase): Promise<DisciplineCase> {
        const saved = await this.storage.saveDisciplineCase(disciplineCase);
        return deepFreeze(saved);
    }

    async getDisciplineCase(id: string): Promise<DisciplineCase | null> {
        const item = await this.storage.getDisciplineCase(id);
        return item ? deepFreeze(item) : null;
    }

    async listDisciplineCases(filter?: {
        student_id?: string;
        semester_id?: string;
        assigned_officer_id?: string;
        status?: string;
    }): Promise<DisciplineCase[]> {
        const cases = await this.storage.listDisciplineCases(filter);
        cases.sort((a, b) => {
            const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (timeDiff !== 0) return timeDiff;
            return a.case_id.localeCompare(b.case_id);
        });
        return deepFreeze(cases);
    }

    // ==========================================
    // GUIDANCE INTERVENTIONS
    // ==========================================
    async saveIntervention(intervention: GuidanceIntervention): Promise<GuidanceIntervention> {
        const saved = await this.storage.saveIntervention(intervention);
        return deepFreeze(saved);
    }

    async getIntervention(id: string): Promise<GuidanceIntervention | null> {
        const item = await this.storage.getIntervention(id);
        return item ? deepFreeze(item) : null;
    }

    async listInterventions(filter?: {
        student_id?: string;
        case_id?: string;
        semester_id?: string;
        counselor_id?: string;
        status?: string;
    }): Promise<GuidanceIntervention[]> {
        const interventions = await this.storage.listInterventions(filter);
        interventions.sort((a, b) => {
            const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (timeDiff !== 0) return timeDiff;
            return a.intervention_id.localeCompare(b.intervention_id);
        });
        return deepFreeze(interventions);
    }

    // ==========================================
    // HISTORY & AUDIT
    // ==========================================
    async recordHistory(entry: BehaviorHistoryEntry): Promise<void> {
        await this.storage.saveHistoryEntry(entry);
    }

    async getHistory(entityId: string): Promise<BehaviorHistoryEntry[]> {
        const history = await this.storage.getHistory(entityId);
        history.sort((a, b) => a.version_number - b.version_number);
        return deepFreeze(history);
    }

    async recordAudit(event: BehaviorAuditEvent): Promise<void> {
        await this.storage.saveAuditEvent(event);
    }

    async getAuditEvents(entityId?: string): Promise<BehaviorAuditEvent[]> {
        const audit = await this.storage.getAuditEvents(entityId);
        audit.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return deepFreeze(audit);
    }

    async clear(): Promise<void> {
        await this.storage.clear();
    }
}

export const behaviorRepositoryEngine = new BehaviorRepositoryEngine();
