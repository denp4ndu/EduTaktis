import { 
    CommunicationThread, 
    CommunicationMessage, 
    CommunicationHistoryEntry, 
    CommunicationAuditEvent 
} from '../types/curriculum';
import { 
    communicationStorageProvider, 
    CommunicationStorageProvider 
} from './communicationStorageProvider';

function deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    const propNames = Object.getOwnPropertyNames(obj);
    for (const name of propNames) {
        const value = (obj as Record<string, unknown>)[name];
        if (value && typeof value === 'object') {
            deepFreeze(value);
        }
    }
    return Object.freeze(obj);
}

export class CommunicationRepositoryEngine {
    private storage: CommunicationStorageProvider;

    constructor(storage: CommunicationStorageProvider = communicationStorageProvider) {
        this.storage = storage;
    }

    async saveThread(thread: CommunicationThread): Promise<void> {
        await this.storage.saveThread(thread);
    }

    async getThread(thread_id: string): Promise<CommunicationThread | null> {
        const item = await this.storage.getThread(thread_id);
        return item ? deepFreeze(item) : null;
    }

    async listThreads(filter?: { participant_id?: string; student_id?: string; course_id?: string }): Promise<CommunicationThread[]> {
        const items = await this.storage.listThreads(filter);
        return deepFreeze(items.sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
    }

    async saveMessage(message: CommunicationMessage): Promise<void> {
        await this.storage.saveMessage(message);
    }

    async getMessage(message_id: string): Promise<CommunicationMessage | null> {
        const item = await this.storage.getMessage(message_id);
        return item ? deepFreeze(item) : null;
    }

    async listMessages(thread_id: string): Promise<CommunicationMessage[]> {
        const items = await this.storage.listMessages(thread_id);
        return deepFreeze(items.sort((a, b) => a.created_at.localeCompare(b.created_at)));
    }

    async saveHistory(entry: CommunicationHistoryEntry): Promise<void> {
        await this.storage.saveHistory(entry);
    }

    async listHistory(message_id: string): Promise<CommunicationHistoryEntry[]> {
        const items = await this.storage.listHistory(message_id);
        return deepFreeze(items.sort((a, b) => (b.version_number - a.version_number) || b.timestamp.localeCompare(a.timestamp)));
    }

    async saveAudit(event: CommunicationAuditEvent): Promise<void> {
        await this.storage.saveAudit(event);
    }

    async listAudit(filter?: { thread_id?: string; actor_id?: string }): Promise<CommunicationAuditEvent[]> {
        const items = await this.storage.listAudit(filter);
        return deepFreeze(items.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    }
}

export const communicationRepositoryEngine = new CommunicationRepositoryEngine();
