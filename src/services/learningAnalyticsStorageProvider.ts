import { AuditEvent } from '../types/curriculum';

export interface LearningAnalyticsStorageProvider {
    logViewEvent(event: AuditEvent): Promise<void>;
}

export class InMemoryAnalyticsStorage implements LearningAnalyticsStorageProvider {
    private logs: AuditEvent[] = [];
    async logViewEvent(event: AuditEvent): Promise<void> { this.logs.push(event); }
}

export const analyticsStorage = new InMemoryAnalyticsStorage();
