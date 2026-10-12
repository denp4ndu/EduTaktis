import { 
    Notification, 
    NotificationRecipientState, 
    NotificationPreference, 
    NotificationHistoryEntry, 
    NotificationAuditEvent,
    NotificationCategory
} from '../types/curriculum';
import { 
    notificationStorageProvider, 
    NotificationStorageProvider 
} from './notificationStorageProvider';

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

export class NotificationRepositoryEngine {
    private storage: NotificationStorageProvider;

    constructor(storage: NotificationStorageProvider = notificationStorageProvider) {
        this.storage = storage;
    }

    async saveNotification(notification: Notification): Promise<void> {
        await this.storage.saveNotification(notification);
    }

    async getNotification(notification_id: string): Promise<Notification | null> {
        const item = await this.storage.getNotification(notification_id);
        return item ? deepFreeze(item) : null;
    }

    async listNotifications(filter?: {
        recipient_id?: string;
        category?: NotificationCategory;
        status?: string;
        source_id?: string;
        source_type?: string;
    }): Promise<Notification[]> {
        const items = await this.storage.listNotifications(filter);
        return deepFreeze(items.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    }

    async saveRecipientState(state: NotificationRecipientState): Promise<void> {
        await this.storage.saveRecipientState(state);
    }

    async getRecipientState(notification_id: string, recipient_id: string): Promise<NotificationRecipientState | null> {
        const item = await this.storage.getRecipientState(notification_id, recipient_id);
        return item ? deepFreeze(item) : null;
    }

    async listRecipientStates(recipient_id: string): Promise<NotificationRecipientState[]> {
        const items = await this.storage.listRecipientStates(recipient_id);
        return deepFreeze(items.sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
    }

    async savePreference(preference: NotificationPreference): Promise<void> {
        await this.storage.savePreference(preference);
    }

    async getPreference(actor_id: string, category: NotificationCategory): Promise<NotificationPreference | null> {
        const item = await this.storage.getPreference(actor_id, category);
        return item ? deepFreeze(item) : null;
    }

    async listPreferences(actor_id: string): Promise<NotificationPreference[]> {
        const items = await this.storage.listPreferences(actor_id);
        return deepFreeze(items.sort((a, b) => a.category.localeCompare(b.category)));
    }

    async saveHistory(entry: NotificationHistoryEntry): Promise<void> {
        await this.storage.saveHistory(entry);
    }

    async listHistory(notification_id: string): Promise<NotificationHistoryEntry[]> {
        const items = await this.storage.listHistory(notification_id);
        return deepFreeze(items.sort((a, b) => (b.version_number - a.version_number) || b.timestamp.localeCompare(a.timestamp)));
    }

    async saveAudit(event: NotificationAuditEvent): Promise<void> {
        await this.storage.saveAudit(event);
    }

    async listAudit(filter?: { notification_id?: string; actor_id?: string }): Promise<NotificationAuditEvent[]> {
        const items = await this.storage.listAudit(filter);
        return deepFreeze(items.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    }
}

export const notificationRepositoryEngine = new NotificationRepositoryEngine();
