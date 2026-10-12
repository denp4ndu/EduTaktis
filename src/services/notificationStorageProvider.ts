import { 
    Notification, 
    NotificationRecipientState, 
    NotificationPreference, 
    NotificationHistoryEntry, 
    NotificationAuditEvent,
    NotificationCategory
} from '../types/curriculum';

export interface NotificationStorageProvider {
    saveNotification(notification: Notification): Promise<void>;
    getNotification(notification_id: string): Promise<Notification | null>;
    listNotifications(filter?: {
        recipient_id?: string;
        category?: NotificationCategory;
        status?: string;
        source_id?: string;
        source_type?: string;
    }): Promise<Notification[]>;
    saveRecipientState(state: NotificationRecipientState): Promise<void>;
    getRecipientState(notification_id: string, recipient_id: string): Promise<NotificationRecipientState | null>;
    listRecipientStates(recipient_id: string): Promise<NotificationRecipientState[]>;
    savePreference(preference: NotificationPreference): Promise<void>;
    getPreference(actor_id: string, category: NotificationCategory): Promise<NotificationPreference | null>;
    listPreferences(actor_id: string): Promise<NotificationPreference[]>;
    saveHistory(entry: NotificationHistoryEntry): Promise<void>;
    listHistory(notification_id: string): Promise<NotificationHistoryEntry[]>;
    saveAudit(event: NotificationAuditEvent): Promise<void>;
    listAudit(filter?: { notification_id?: string; actor_id?: string }): Promise<NotificationAuditEvent[]>;
    clear(): Promise<void>;
}

export class InMemoryNotificationStorageProvider implements NotificationStorageProvider {
    private notifications: Map<string, Notification> = new Map();
    private recipientStates: Map<string, NotificationRecipientState> = new Map();
    private preferences: Map<string, NotificationPreference> = new Map();
    private history: NotificationHistoryEntry[] = [];
    private auditEvents: NotificationAuditEvent[] = [];

    async saveNotification(notification: Notification): Promise<void> {
        this.notifications.set(notification.notification_id, JSON.parse(JSON.stringify(notification)));
    }

    async getNotification(notification_id: string): Promise<Notification | null> {
        const item = this.notifications.get(notification_id);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }

    async listNotifications(filter?: {
        recipient_id?: string;
        category?: NotificationCategory;
        status?: string;
        source_id?: string;
        source_type?: string;
    }): Promise<Notification[]> {
        let results = Array.from(this.notifications.values());
        if (filter?.recipient_id) {
            results = results.filter(n => n.recipient_id === filter.recipient_id);
        }
        if (filter?.category) {
            results = results.filter(n => n.category === filter.category);
        }
        if (filter?.status) {
            results = results.filter(n => n.status === filter.status);
        }
        if (filter?.source_id) {
            results = results.filter(n => n.source_id === filter.source_id);
        }
        if (filter?.source_type) {
            results = results.filter(n => n.source_type === filter.source_type);
        }
        return results.map(n => JSON.parse(JSON.stringify(n)));
    }

    async saveRecipientState(state: NotificationRecipientState): Promise<void> {
        const key = `${state.notification_id}::${state.recipient_id}`;
        this.recipientStates.set(key, JSON.parse(JSON.stringify(state)));
    }

    async getRecipientState(notification_id: string, recipient_id: string): Promise<NotificationRecipientState | null> {
        const key = `${notification_id}::${recipient_id}`;
        const item = this.recipientStates.get(key);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }

    async listRecipientStates(recipient_id: string): Promise<NotificationRecipientState[]> {
        const results = Array.from(this.recipientStates.values()).filter(s => s.recipient_id === recipient_id);
        return results.map(s => JSON.parse(JSON.stringify(s)));
    }

    async savePreference(preference: NotificationPreference): Promise<void> {
        const key = `${preference.actor_id}::${preference.category}`;
        this.preferences.set(key, JSON.parse(JSON.stringify(preference)));
    }

    async getPreference(actor_id: string, category: NotificationCategory): Promise<NotificationPreference | null> {
        const key = `${actor_id}::${category}`;
        const item = this.preferences.get(key);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }

    async listPreferences(actor_id: string): Promise<NotificationPreference[]> {
        const results = Array.from(this.preferences.values()).filter(p => p.actor_id === actor_id);
        return results.map(p => JSON.parse(JSON.stringify(p)));
    }

    async saveHistory(entry: NotificationHistoryEntry): Promise<void> {
        this.history.push(JSON.parse(JSON.stringify(entry)));
    }

    async listHistory(notification_id: string): Promise<NotificationHistoryEntry[]> {
        const results = this.history.filter(h => h.notification_id === notification_id);
        return results.map(h => JSON.parse(JSON.stringify(h)));
    }

    async saveAudit(event: NotificationAuditEvent): Promise<void> {
        this.auditEvents.push(JSON.parse(JSON.stringify(event)));
    }

    async listAudit(filter?: { notification_id?: string; actor_id?: string }): Promise<NotificationAuditEvent[]> {
        let results = [...this.auditEvents];
        if (filter?.notification_id) {
            results = results.filter(a => a.notification_id === filter.notification_id);
        }
        if (filter?.actor_id) {
            results = results.filter(a => a.actor_id === filter.actor_id);
        }
        return results.map(a => JSON.parse(JSON.stringify(a)));
    }

    async clear(): Promise<void> {
        this.notifications.clear();
        this.recipientStates.clear();
        this.preferences.clear();
        this.history = [];
        this.auditEvents = [];
    }
}

export const notificationStorageProvider = new InMemoryNotificationStorageProvider();
