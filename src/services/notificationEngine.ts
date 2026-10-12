import { 
    Notification, 
    NotificationCategory, 
    NotificationPriority, 
    NotificationChannel, 
    NotificationRecipientType, 
    NotificationPrivacyLevel, 
    NotificationStatus, 
    NotificationRecipientState, 
    NotificationPreference, 
    NotificationHistoryEntry, 
    NotificationAuditEvent, 
    NotificationSummary,
    NotificationQuietHours
} from '../types/curriculum';
import { 
    notificationRepositoryEngine, 
    NotificationRepositoryEngine 
} from './notificationRepositoryEngine';
import { 
    notificationValidationEngine, 
    NotificationValidationEngine 
} from './notificationValidationEngine';
import { 
    notificationPolicyEngine, 
    NotificationPolicyEngine 
} from './notificationPolicyEngine';
import { 
    notificationDeliveryProvider, 
    NotificationDeliveryProvider 
} from './notificationDeliveryProvider';

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

export interface CreateNotificationParams {
    notification_id?: string;
    category: NotificationCategory;
    priority?: NotificationPriority;
    privacy_level?: NotificationPrivacyLevel;
    title: string;
    body: string;
    recipient_type: NotificationRecipientType;
    recipient_id: string;
    source_type: string;
    source_id: string;
    preferred_channel?: NotificationChannel;
    metadata?: Record<string, unknown>;
    actor_id: string;
    actor_role: string;
}

export interface MarkReadParams {
    notification_id: string;
    recipient_id: string;
    actor_id: string;
    actor_role: string;
}

export interface CancelNotificationParams {
    notification_id: string;
    reason: string;
    actor_id: string;
    actor_role: string;
}

export interface ArchiveNotificationParams {
    notification_id: string;
    reason: string;
    actor_id: string;
    actor_role: string;
}

export interface UpdatePreferenceParams {
    actor_id: string;
    actor_role: string;
    category: NotificationCategory;
    channel?: NotificationChannel;
    enabled: boolean;
    quiet_hours?: NotificationQuietHours;
}

export class NotificationEngine {
    constructor(
        private repository: NotificationRepositoryEngine = notificationRepositoryEngine,
        private validator: NotificationValidationEngine = notificationValidationEngine,
        private policy: NotificationPolicyEngine = notificationPolicyEngine,
        private delivery: NotificationDeliveryProvider = notificationDeliveryProvider
    ) {}

    private generateChecksum(data: unknown, prefix = 'NOT-CHK-'): string {
        const cleanData: Record<string, unknown> = typeof data === 'object' && data !== null ? { ...(data as Record<string, unknown>) } : { value: data };
        delete cleanData.checksum;
        const str = JSON.stringify(cleanData);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return `${prefix}${Math.abs(hash).toString(16).padStart(8, '0')}`;
    }

    // ==========================================
    // NOTIFICATION CREATION & DELIVERY
    // ==========================================

    async createNotification(params: CreateNotificationParams): Promise<Notification> {
        this.validator.validateSecurityLeakage(params);
        this.validator.validateNotificationParams({
            title: params.title,
            body: params.body,
            category: params.category,
            priority: params.priority,
            channel: params.preferred_channel,
            recipient_type: params.recipient_type,
            recipient_id: params.recipient_id,
            source_id: params.source_id,
            source_type: params.source_type,
            privacy_level: params.privacy_level
        });

        // Evaluate Policy (Preferences, Quiet hours, Duplicate suppression)
        const policyResult = await this.policy.evaluatePolicy({
            recipient_id: params.recipient_id,
            category: params.category,
            source_type: params.source_type,
            source_id: params.source_id,
            base_priority: params.priority,
            preferred_channel: params.preferred_channel
        });

        if (!policyResult.allowed) {
            throw new Error(policyResult.reason || 'NOTIFICATION_REJECTED_BY_POLICY');
        }

        const notifId = params.notification_id || `NOT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const baseNotif: Omit<Notification, 'checksum'> = {
            notification_id: notifId,
            category: params.category,
            priority: policyResult.priority,
            privacy_level: params.privacy_level || 'PRIVATE_PARTICIPANTS',
            title: params.title.trim(),
            body: params.body.trim(),
            recipient_type: params.recipient_type,
            recipient_id: params.recipient_id,
            source_type: params.source_type,
            source_id: params.source_id,
            channel: policyResult.channel,
            status: 'QUEUED',
            metadata: params.metadata,
            created_at: now,
            version_number: 1
        };

        const checksum = this.generateChecksum(baseNotif, 'NOT-CHK-');
        const fullNotif: Notification = { ...baseNotif, checksum };

        await this.repository.saveNotification(fullNotif);

        // Record Created Audit
        await this.repository.saveAudit({
            audit_id: `AUD-NOT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            event_type: 'NOTIFICATION_CREATED',
            notification_id: notifId,
            recipient_id: params.recipient_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            version_number: 1,
            checksum: this.generateChecksum({ id: notifId, v: 1 }, 'AUD-CHK-')
        });

        // Dispatch through Delivery Provider
        const deliveryResult = await this.delivery.deliver(fullNotif);
        let deliveredNotif: Notification = fullNotif;

        if (deliveryResult.success) {
            const deliveredBase: Omit<Notification, 'checksum'> = {
                ...fullNotif,
                status: 'DELIVERED',
                delivered_at: deliveryResult.delivered_at,
                version_number: 2
            };
            const deliveredChecksum = this.generateChecksum(deliveredBase, 'NOT-CHK-');
            deliveredNotif = { ...deliveredBase, checksum: deliveredChecksum };

            await this.repository.saveNotification(deliveredNotif);

            // Save Recipient State
            const stateBase: Omit<NotificationRecipientState, 'checksum'> = {
                state_id: `ST-${notifId}-${params.recipient_id}`,
                notification_id: notifId,
                recipient_id: params.recipient_id,
                status: 'DELIVERED',
                version_number: 1,
                updated_at: deliveryResult.delivered_at
            };
            const stateChecksum = this.generateChecksum(stateBase, 'NRS-CHK-');
            await this.repository.saveRecipientState({ ...stateBase, checksum: stateChecksum });

            // Record Delivered Audit & History
            await this.repository.saveAudit({
                audit_id: `AUD-NOT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                event_type: 'NOTIFICATION_DELIVERED',
                notification_id: notifId,
                recipient_id: params.recipient_id,
                actor_id: 'SYSTEM',
                actor_role: 'SYSTEM',
                timestamp: deliveryResult.delivered_at,
                version_number: 2,
                checksum: this.generateChecksum({ id: notifId, v: 2 }, 'AUD-CHK-')
            });

            await this.repository.saveHistory({
                history_id: `HIST-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                notification_id: notifId,
                version_number: 2,
                previous_status: 'QUEUED',
                new_status: 'DELIVERED',
                reason: 'Dispatched by delivery provider',
                actor_id: 'SYSTEM',
                timestamp: deliveryResult.delivered_at,
                checksum: this.generateChecksum({ id: notifId, st: 'DELIVERED' }, 'HST-CHK-')
            });
        }

        return deepFreeze(deliveredNotif);
    }

    // ==========================================
    // NOTIFICATION READ STATE
    // ==========================================

    async markRead(params: MarkReadParams): Promise<NotificationRecipientState> {
        this.validator.validateSecurityLeakage(params);
        const existing = await this.repository.getNotification(params.notification_id);
        if (!existing) {
            throw new Error(`NOTIFICATION_NOT_FOUND: Notification ${params.notification_id} does not exist`);
        }

        this.validator.validateRecipientScope(params.actor_id, params.actor_role, existing);

        const now = new Date().toISOString();
        let state = await this.repository.getRecipientState(params.notification_id, params.recipient_id);

        const nextVersion = state ? state.version_number + 1 : 1;
        const stateBase: Omit<NotificationRecipientState, 'checksum'> = {
            state_id: state ? state.state_id : `ST-${params.notification_id}-${params.recipient_id}`,
            notification_id: params.notification_id,
            recipient_id: params.recipient_id,
            status: 'READ',
            read_at: now,
            version_number: nextVersion,
            updated_at: now
        };

        const stateChecksum = this.generateChecksum(stateBase, 'NRS-CHK-');
        const fullState: NotificationRecipientState = { ...stateBase, checksum: stateChecksum };
        await this.repository.saveRecipientState(fullState);

        // Update notification entity status if applicable
        if (existing.recipient_id === params.recipient_id && existing.status === 'DELIVERED') {
            const { checksum: currentChecksum, ...cleanExisting } = existing;
            const expectedChecksum = this.generateChecksum(cleanExisting, 'NOT-CHK-');
            this.validator.validateChecksum(expectedChecksum, existing.checksum, 'NOTIFICATION');

            const nextNotifVersion = existing.version_number + 1;
            const updatedNotifBase: Omit<Notification, 'checksum'> = {
                ...existing,
                status: 'READ',
                read_at: now,
                version_number: nextNotifVersion
            };
            const notifChecksum = this.generateChecksum(updatedNotifBase, 'NOT-CHK-');
            await this.repository.saveNotification({ ...updatedNotifBase, checksum: notifChecksum });

            await this.repository.saveHistory({
                history_id: `HIST-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                notification_id: existing.notification_id,
                version_number: nextNotifVersion,
                previous_status: existing.status,
                new_status: 'READ',
                reason: 'Marked read by recipient',
                actor_id: params.actor_id,
                timestamp: now,
                checksum: this.generateChecksum({ id: existing.notification_id, v: nextNotifVersion }, 'HST-CHK-')
            });
        }

        await this.repository.saveAudit({
            audit_id: `AUD-NOT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            event_type: 'NOTIFICATION_READ',
            notification_id: params.notification_id,
            recipient_id: params.recipient_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            version_number: nextVersion,
            checksum: this.generateChecksum({ id: params.notification_id, st: 'READ' }, 'AUD-CHK-')
        });

        return deepFreeze(fullState);
    }

    // ==========================================
    // NOTIFICATION LIFECYCLE
    // ==========================================

    async cancelNotification(params: CancelNotificationParams): Promise<Notification> {
        this.validator.validateSecurityLeakage(params);
        const existing = await this.repository.getNotification(params.notification_id);
        if (!existing) {
            throw new Error(`NOTIFICATION_NOT_FOUND: Notification ${params.notification_id} not found`);
        }

        this.validator.validateStatusTransition(existing.status, 'CANCELLED');

        const { checksum: currentChecksum, ...cleanExisting } = existing;
        const expectedChecksum = this.generateChecksum(cleanExisting, 'NOT-CHK-');
        this.validator.validateChecksum(expectedChecksum, existing.checksum, 'NOTIFICATION');

        const now = new Date().toISOString();
        const nextVersion = existing.version_number + 1;

        const updatedBase: Omit<Notification, 'checksum'> = {
            ...existing,
            status: 'CANCELLED',
            version_number: nextVersion
        };
        const checksum = this.generateChecksum(updatedBase, 'NOT-CHK-');
        const fullNotif: Notification = { ...updatedBase, checksum };

        await this.repository.saveNotification(fullNotif);

        await this.repository.saveHistory({
            history_id: `HIST-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            notification_id: existing.notification_id,
            version_number: nextVersion,
            previous_status: existing.status,
            new_status: 'CANCELLED',
            reason: params.reason,
            actor_id: params.actor_id,
            timestamp: now,
            checksum: this.generateChecksum({ id: existing.notification_id, v: nextVersion }, 'HST-CHK-')
        });

        await this.repository.saveAudit({
            audit_id: `AUD-NOT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            event_type: 'NOTIFICATION_CANCELLED',
            notification_id: existing.notification_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            version_number: nextVersion,
            details: { reason: params.reason },
            checksum: this.generateChecksum({ id: existing.notification_id, st: 'CANCELLED' }, 'AUD-CHK-')
        });

        return deepFreeze(fullNotif);
    }

    async archiveNotification(params: ArchiveNotificationParams): Promise<Notification> {
        this.validator.validateSecurityLeakage(params);
        const existing = await this.repository.getNotification(params.notification_id);
        if (!existing) {
            throw new Error(`NOTIFICATION_NOT_FOUND: Notification ${params.notification_id} not found`);
        }

        this.validator.validateStatusTransition(existing.status, 'ARCHIVED');

        const { checksum: currentChecksum, ...cleanExisting } = existing;
        const expectedChecksum = this.generateChecksum(cleanExisting, 'NOT-CHK-');
        this.validator.validateChecksum(expectedChecksum, existing.checksum, 'NOTIFICATION');

        const now = new Date().toISOString();
        const nextVersion = existing.version_number + 1;

        const updatedBase: Omit<Notification, 'checksum'> = {
            ...existing,
            status: 'ARCHIVED',
            version_number: nextVersion
        };
        const checksum = this.generateChecksum(updatedBase, 'NOT-CHK-');
        const fullNotif: Notification = { ...updatedBase, checksum };

        await this.repository.saveNotification(fullNotif);

        await this.repository.saveHistory({
            history_id: `HIST-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            notification_id: existing.notification_id,
            version_number: nextVersion,
            previous_status: existing.status,
            new_status: 'ARCHIVED',
            reason: params.reason,
            actor_id: params.actor_id,
            timestamp: now,
            checksum: this.generateChecksum({ id: existing.notification_id, v: nextVersion }, 'HST-CHK-')
        });

        await this.repository.saveAudit({
            audit_id: `AUD-NOT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            event_type: 'NOTIFICATION_ARCHIVED',
            notification_id: existing.notification_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            version_number: nextVersion,
            details: { reason: params.reason },
            checksum: this.generateChecksum({ id: existing.notification_id, st: 'ARCHIVED' }, 'AUD-CHK-')
        });

        return deepFreeze(fullNotif);
    }

    // ==========================================
    // NOTIFICATION QUERIES
    // ==========================================

    async getNotification(notification_id: string, actor_id: string, actor_role: string): Promise<Notification | null> {
        const notif = await this.repository.getNotification(notification_id);
        if (!notif) return null;

        this.validator.validateRecipientScope(actor_id, actor_role, notif);

        await this.repository.saveAudit({
            audit_id: `AUD-NOT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            event_type: 'NOTIFICATION_VIEWED',
            notification_id: notif.notification_id,
            recipient_id: notif.recipient_id,
            actor_id,
            actor_role,
            timestamp: new Date().toISOString(),
            version_number: notif.version_number,
            checksum: this.generateChecksum({ id: notif.notification_id, view: actor_id }, 'AUD-CHK-')
        });

        return notif;
    }

    async listNotifications(params: {
        recipient_id: string;
        actor_id: string;
        actor_role: string;
        category?: NotificationCategory;
        status?: string;
    }): Promise<Notification[]> {
        if (params.actor_role !== 'ADMIN' && params.actor_role !== 'HEADMASTER' && params.recipient_id !== params.actor_id) {
            throw new Error('UNAUTHORIZED_NOTIFICATION_SCOPE: Cannot list notifications of another user');
        }

        const notifications = await this.repository.listNotifications({
            recipient_id: params.recipient_id,
            category: params.category,
            status: params.status
        });

        return notifications;
    }

    async getNotificationSummary(recipient_id: string, actor_id: string, actor_role: string): Promise<NotificationSummary> {
        if (actor_role !== 'ADMIN' && actor_role !== 'HEADMASTER' && recipient_id !== actor_id) {
            throw new Error('UNAUTHORIZED_NOTIFICATION_SCOPE: Cannot get summary for another recipient');
        }

        const allNotifications = await this.repository.listNotifications({ recipient_id });
        const activeNotifications = allNotifications.filter(n => n.status !== 'ARCHIVED' && n.status !== 'CANCELLED');

        const unreadCount = activeNotifications.filter(n => n.status === 'DELIVERED').length;
        const highPriorityCount = activeNotifications.filter(n => n.priority === 'HIGH').length;
        const urgentCount = activeNotifications.filter(n => n.priority === 'URGENT').length;

        const categoryBreakdown: Record<NotificationCategory, number> = {
            ACADEMIC: 0, ASSIGNMENT: 0, ASSESSMENT: 0, ATTENDANCE: 0,
            REPORT_CARD: 0, TRANSCRIPT: 0, BEHAVIOR: 0, GUIDANCE: 0,
            COURSE: 0, CALENDAR: 0, SYSTEM: 0, COMMUNICATION: 0, ADMINISTRATIVE: 0
        };

        for (const notif of activeNotifications) {
            if (categoryBreakdown[notif.category] !== undefined) {
                categoryBreakdown[notif.category]++;
            }
        }

        return deepFreeze({
            recipient_id,
            unread_count: unreadCount,
            high_priority_count: highPriorityCount,
            urgent_count: urgentCount,
            category_breakdown: categoryBreakdown,
            latest_notifications: activeNotifications.slice(0, 10)
        });
    }

    // ==========================================
    // PREFERENCES MANAGEMENT
    // ==========================================

    async updatePreferences(params: UpdatePreferenceParams): Promise<NotificationPreference> {
        this.validator.validateSecurityLeakage(params);
        if (!params.actor_id || typeof params.actor_id !== 'string') {
            throw new Error('INVALID_ACTOR_ID: Actor ID must be a non-empty string');
        }

        const existing = await this.repository.getPreference(params.actor_id, params.category);
        const nextVersion = existing ? existing.version_number + 1 : 1;
        const now = new Date().toISOString();

        const basePref: Omit<NotificationPreference, 'checksum'> = {
            preference_id: existing ? existing.preference_id : `PRF-${params.actor_id}-${params.category}`,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            category: params.category,
            channel: params.channel || existing?.channel || 'IN_APP',
            enabled: params.enabled,
            quiet_hours: params.quiet_hours,
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum(basePref, 'PRF-CHK-');
        const fullPref: NotificationPreference = { ...basePref, checksum };

        await this.repository.savePreference(fullPref);

        await this.repository.saveAudit({
            audit_id: `AUD-NOT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            event_type: 'NOTIFICATION_PREFERENCE_UPDATED',
            notification_id: fullPref.preference_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            version_number: nextVersion,
            details: { category: params.category, enabled: params.enabled },
            checksum: this.generateChecksum({ id: fullPref.preference_id, v: nextVersion }, 'AUD-CHK-')
        });

        return deepFreeze(fullPref);
    }

    async getPreferences(actor_id: string): Promise<NotificationPreference[]> {
        if (!actor_id) {
            throw new Error('INVALID_ACTOR_ID: Actor ID must be a non-empty string');
        }
        return this.repository.listPreferences(actor_id);
    }

    async getAuditTrail(filter?: { notification_id?: string; actor_id?: string; actor_role?: string }): Promise<NotificationAuditEvent[]> {
        return this.repository.listAudit(filter);
    }
}

export const notificationEngine = new NotificationEngine();
