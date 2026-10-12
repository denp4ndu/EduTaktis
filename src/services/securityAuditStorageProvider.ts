import { SecurityEvent } from '../types/curriculum';

export interface SecurityAuditStorageProvider {
    saveEvent(event: SecurityEvent): Promise<void>;
    listEvents(filter?: {
        actor_id?: string;
        event_type?: string;
        target_user_id?: string;
    }): Promise<SecurityEvent[]>;
    clear(): Promise<void>;
}

export class InMemorySecurityAuditStorageProvider implements SecurityAuditStorageProvider {
    private events: SecurityEvent[] = [];

    private deepCopy<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
    }

    async saveEvent(event: SecurityEvent): Promise<void> {
        this.events.push(this.deepCopy(event));
    }

    async listEvents(filter?: {
        actor_id?: string;
        event_type?: string;
        target_user_id?: string;
    }): Promise<SecurityEvent[]> {
        let results = [...this.events];

        if (filter?.actor_id) {
            results = results.filter(e => e.actor_id === filter.actor_id);
        }
        if (filter?.event_type) {
            results = results.filter(e => e.event_type === filter.event_type);
        }
        if (filter?.target_user_id) {
            results = results.filter(e => e.target_user_id === filter.target_user_id);
        }

        return results.map(e => this.deepCopy(e));
    }

    async clear(): Promise<void> {
        this.events = [];
    }
}

export const securityAuditStorageProvider = new InMemorySecurityAuditStorageProvider();
