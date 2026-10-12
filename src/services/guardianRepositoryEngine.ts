import { 
    Guardian, 
    GuardianStudentRelationship, 
    GuardianAuditEvent 
} from '../types/curriculum';
import { 
    guardianStorageProvider, 
    GuardianStorageProvider 
} from './guardianStorageProvider';

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

export class GuardianRepositoryEngine {
    private storage: GuardianStorageProvider;

    constructor(storage: GuardianStorageProvider = guardianStorageProvider) {
        this.storage = storage;
    }

    async saveGuardian(guardian: Guardian): Promise<void> {
        await this.storage.saveGuardian(guardian);
    }

    async getGuardian(guardian_id: string): Promise<Guardian | null> {
        const item = await this.storage.getGuardian(guardian_id);
        return item ? deepFreeze(item) : null;
    }

    async listGuardians(): Promise<Guardian[]> {
        const items = await this.storage.listGuardians();
        return deepFreeze(items.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    }

    async saveRelationship(relationship: GuardianStudentRelationship): Promise<void> {
        await this.storage.saveRelationship(relationship);
    }

    async getRelationship(relationship_id: string): Promise<GuardianStudentRelationship | null> {
        const item = await this.storage.getRelationship(relationship_id);
        return item ? deepFreeze(item) : null;
    }

    async listRelationships(filter?: { guardian_id?: string; student_id?: string }): Promise<GuardianStudentRelationship[]> {
        const items = await this.storage.listRelationships(filter);
        return deepFreeze(items.sort((a, b) => (b.created_at || b.effective_from || '').localeCompare(a.created_at || a.effective_from || '')));
    }

    async saveAuditEvent(event: GuardianAuditEvent): Promise<void> {
        await this.storage.saveAuditEvent(event);
    }

    async listAuditEvents(filter?: { entity_id?: string; actor_id?: string }): Promise<GuardianAuditEvent[]> {
        const items = await this.storage.listAuditEvents(filter);
        return deepFreeze(items.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    }
}

export const guardianRepositoryEngine = new GuardianRepositoryEngine();
