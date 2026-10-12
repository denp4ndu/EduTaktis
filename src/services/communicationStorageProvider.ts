import { 
    CommunicationThread, 
    CommunicationMessage, 
    CommunicationHistoryEntry, 
    CommunicationAuditEvent 
} from '../types/curriculum';

export interface CommunicationStorageProvider {
    saveThread(thread: CommunicationThread): Promise<void>;
    getThread(thread_id: string): Promise<CommunicationThread | null>;
    listThreads(filter?: { participant_id?: string; student_id?: string; course_id?: string }): Promise<CommunicationThread[]>;
    saveMessage(message: CommunicationMessage): Promise<void>;
    getMessage(message_id: string): Promise<CommunicationMessage | null>;
    listMessages(thread_id: string): Promise<CommunicationMessage[]>;
    saveHistory(entry: CommunicationHistoryEntry): Promise<void>;
    listHistory(message_id: string): Promise<CommunicationHistoryEntry[]>;
    saveAudit(event: CommunicationAuditEvent): Promise<void>;
    listAudit(filter?: { thread_id?: string; actor_id?: string }): Promise<CommunicationAuditEvent[]>;
    clear(): Promise<void>;
}

export class InMemoryCommunicationStorageProvider implements CommunicationStorageProvider {
    private threads: Map<string, CommunicationThread> = new Map();
    private messages: Map<string, CommunicationMessage> = new Map();
    private history: CommunicationHistoryEntry[] = [];
    private auditEvents: CommunicationAuditEvent[] = [];

    async saveThread(thread: CommunicationThread): Promise<void> {
        this.threads.set(thread.thread_id, JSON.parse(JSON.stringify(thread)));
    }

    async getThread(thread_id: string): Promise<CommunicationThread | null> {
        const item = this.threads.get(thread_id);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }

    async listThreads(filter?: { participant_id?: string; student_id?: string; course_id?: string }): Promise<CommunicationThread[]> {
        let results = Array.from(this.threads.values());
        if (filter?.participant_id) {
            results = results.filter(t => t.participant_ids.includes(filter.participant_id!));
        }
        if (filter?.student_id) {
            results = results.filter(t => t.student_id === filter.student_id);
        }
        if (filter?.course_id) {
            results = results.filter(t => t.course_id === filter.course_id);
        }
        return results.map(t => JSON.parse(JSON.stringify(t)));
    }

    async saveMessage(message: CommunicationMessage): Promise<void> {
        this.messages.set(message.message_id, JSON.parse(JSON.stringify(message)));
    }

    async getMessage(message_id: string): Promise<CommunicationMessage | null> {
        const item = this.messages.get(message_id);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }

    async listMessages(thread_id: string): Promise<CommunicationMessage[]> {
        const results = Array.from(this.messages.values()).filter(m => m.thread_id === thread_id);
        return results.map(m => JSON.parse(JSON.stringify(m)));
    }

    async saveHistory(entry: CommunicationHistoryEntry): Promise<void> {
        this.history.push(JSON.parse(JSON.stringify(entry)));
    }

    async listHistory(message_id: string): Promise<CommunicationHistoryEntry[]> {
        const results = this.history.filter(h => h.message_id === message_id);
        return results.map(h => JSON.parse(JSON.stringify(h)));
    }

    async saveAudit(event: CommunicationAuditEvent): Promise<void> {
        this.auditEvents.push(JSON.parse(JSON.stringify(event)));
    }

    async listAudit(filter?: { thread_id?: string; actor_id?: string }): Promise<CommunicationAuditEvent[]> {
        let results = [...this.auditEvents];
        if (filter?.thread_id) {
            results = results.filter(a => a.thread_id === filter.thread_id);
        }
        if (filter?.actor_id) {
            results = results.filter(a => a.actor_id === filter.actor_id);
        }
        return results.map(a => JSON.parse(JSON.stringify(a)));
    }

    async clear(): Promise<void> {
        this.threads.clear();
        this.messages.clear();
        this.history = [];
        this.auditEvents = [];
    }
}

export const communicationStorageProvider = new InMemoryCommunicationStorageProvider();
