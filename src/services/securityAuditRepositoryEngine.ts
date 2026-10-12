import { SecurityEvent } from '../types/curriculum';
import { 
    securityAuditStorageProvider, 
    SecurityAuditStorageProvider 
} from './securityAuditStorageProvider';

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

export class SecurityAuditRepositoryEngine {
    private storage: SecurityAuditStorageProvider;

    constructor(storage: SecurityAuditStorageProvider = securityAuditStorageProvider) {
        this.storage = storage;
    }

    async saveEvent(event: SecurityEvent): Promise<void> {
        await this.storage.saveEvent(event);
    }

    async listEvents(filter?: {
        actor_id?: string;
        event_type?: string;
        target_user_id?: string;
    }): Promise<SecurityEvent[]> {
        const items = await this.storage.listEvents(filter);
        return deepFreeze(items.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    }

    async clear(): Promise<void> {
        await this.storage.clear();
    }
}

export const securityAuditRepositoryEngine = new SecurityAuditRepositoryEngine();
