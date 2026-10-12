import { 
    StudentBehaviorEvent, 
    DisciplineCase, 
    GuidanceIntervention, 
    BehaviorFollowUp, 
    BehaviorHistoryEntry, 
    BehaviorAuditEvent 
} from '../types/curriculum';

export interface BehaviorStorageProvider {
    // Behavior Events
    saveBehaviorEvent(event: StudentBehaviorEvent): Promise<StudentBehaviorEvent>;
    getBehaviorEvent(id: string): Promise<StudentBehaviorEvent | null>;
    listBehaviorEvents(filter?: {
        student_id?: string;
        semester_id?: string;
        course_id?: string;
        course_period_id?: string;
        reporter_id?: string;
    }): Promise<StudentBehaviorEvent[]>;

    // Discipline Cases
    saveDisciplineCase(disciplineCase: DisciplineCase): Promise<DisciplineCase>;
    getDisciplineCase(id: string): Promise<DisciplineCase | null>;
    listDisciplineCases(filter?: {
        student_id?: string;
        semester_id?: string;
        assigned_officer_id?: string;
        status?: string;
    }): Promise<DisciplineCase[]>;

    // Guidance Interventions
    saveIntervention(intervention: GuidanceIntervention): Promise<GuidanceIntervention>;
    getIntervention(id: string): Promise<GuidanceIntervention | null>;
    listInterventions(filter?: {
        student_id?: string;
        case_id?: string;
        semester_id?: string;
        counselor_id?: string;
        status?: string;
    }): Promise<GuidanceIntervention[]>;

    // History Entries
    saveHistoryEntry(entry: BehaviorHistoryEntry): Promise<void>;
    getHistory(entityId: string): Promise<BehaviorHistoryEntry[]>;

    // Audit Events
    saveAuditEvent(event: BehaviorAuditEvent): Promise<void>;
    getAuditEvents(entityId?: string): Promise<BehaviorAuditEvent[]>;

    // Storage Management (Testing)
    clear(): Promise<void>;
}

export class MemoryBehaviorStorageProvider implements BehaviorStorageProvider {
    private events: Map<string, StudentBehaviorEvent> = new Map();
    private cases: Map<string, DisciplineCase> = new Map();
    private interventions: Map<string, GuidanceIntervention> = new Map();
    private historyEntries: BehaviorHistoryEntry[] = [];
    private auditEvents: BehaviorAuditEvent[] = [];

    async saveBehaviorEvent(event: StudentBehaviorEvent): Promise<StudentBehaviorEvent> {
        this.events.set(event.event_id, JSON.parse(JSON.stringify(event)));
        return JSON.parse(JSON.stringify(event));
    }

    async getBehaviorEvent(id: string): Promise<StudentBehaviorEvent | null> {
        const item = this.events.get(id);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }

    async listBehaviorEvents(filter?: {
        student_id?: string;
        semester_id?: string;
        course_id?: string;
        course_period_id?: string;
        reporter_id?: string;
    }): Promise<StudentBehaviorEvent[]> {
        let results = Array.from(this.events.values());
        if (filter) {
            if (filter.student_id) results = results.filter(e => e.student_id === filter.student_id);
            if (filter.semester_id) results = results.filter(e => e.semester_id === filter.semester_id);
            if (filter.course_id) results = results.filter(e => e.course_id === filter.course_id);
            if (filter.course_period_id) results = results.filter(e => e.course_period_id === filter.course_period_id);
            if (filter.reporter_id) results = results.filter(e => e.reporter_id === filter.reporter_id);
        }
        return results.map(item => JSON.parse(JSON.stringify(item)));
    }

    async saveDisciplineCase(disciplineCase: DisciplineCase): Promise<DisciplineCase> {
        this.cases.set(disciplineCase.case_id, JSON.parse(JSON.stringify(disciplineCase)));
        return JSON.parse(JSON.stringify(disciplineCase));
    }

    async getDisciplineCase(id: string): Promise<DisciplineCase | null> {
        const item = this.cases.get(id);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }

    async listDisciplineCases(filter?: {
        student_id?: string;
        semester_id?: string;
        assigned_officer_id?: string;
        status?: string;
    }): Promise<DisciplineCase[]> {
        let results = Array.from(this.cases.values());
        if (filter) {
            if (filter.student_id) results = results.filter(c => c.student_id === filter.student_id);
            if (filter.semester_id) results = results.filter(c => c.semester_id === filter.semester_id);
            if (filter.assigned_officer_id) results = results.filter(c => c.assigned_officer_id === filter.assigned_officer_id);
            if (filter.status) results = results.filter(c => c.status === filter.status);
        }
        return results.map(item => JSON.parse(JSON.stringify(item)));
    }

    async saveIntervention(intervention: GuidanceIntervention): Promise<GuidanceIntervention> {
        this.interventions.set(intervention.intervention_id, JSON.parse(JSON.stringify(intervention)));
        return JSON.parse(JSON.stringify(intervention));
    }

    async getIntervention(id: string): Promise<GuidanceIntervention | null> {
        const item = this.interventions.get(id);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }

    async listInterventions(filter?: {
        student_id?: string;
        case_id?: string;
        semester_id?: string;
        counselor_id?: string;
        status?: string;
    }): Promise<GuidanceIntervention[]> {
        let results = Array.from(this.interventions.values());
        if (filter) {
            if (filter.student_id) results = results.filter(i => i.student_id === filter.student_id);
            if (filter.case_id) results = results.filter(i => i.case_id === filter.case_id);
            if (filter.semester_id) results = results.filter(i => i.semester_id === filter.semester_id);
            if (filter.counselor_id) results = results.filter(i => i.responsible_counselor_id === filter.counselor_id);
            if (filter.status) results = results.filter(i => i.status === filter.status);
        }
        return results.map(item => JSON.parse(JSON.stringify(item)));
    }

    async saveHistoryEntry(entry: BehaviorHistoryEntry): Promise<void> {
        this.historyEntries.push(JSON.parse(JSON.stringify(entry)));
    }

    async getHistory(entityId: string): Promise<BehaviorHistoryEntry[]> {
        return this.historyEntries
            .filter(h => h.entity_id === entityId)
            .map(h => JSON.parse(JSON.stringify(h)));
    }

    async saveAuditEvent(event: BehaviorAuditEvent): Promise<void> {
        this.auditEvents.push(JSON.parse(JSON.stringify(event)));
    }

    async getAuditEvents(entityId?: string): Promise<BehaviorAuditEvent[]> {
        if (!entityId) {
            return this.auditEvents.map(e => JSON.parse(JSON.stringify(e)));
        }
        return this.auditEvents
            .filter(e => e.entity_id === entityId)
            .map(e => JSON.parse(JSON.stringify(e)));
    }

    async clear(): Promise<void> {
        this.events.clear();
        this.cases.clear();
        this.interventions.clear();
        this.historyEntries = [];
        this.auditEvents = [];
    }
}

export const behaviorStorageProvider: BehaviorStorageProvider = new MemoryBehaviorStorageProvider();
