import { 
    Notification, 
    NotificationCategory, 
    NotificationPriority, 
    NotificationPreference,
    NotificationChannel
} from '../types/curriculum';
import { 
    notificationRepositoryEngine, 
    NotificationRepositoryEngine 
} from './notificationRepositoryEngine';

export interface PolicyCheckResult {
    allowed: boolean;
    channel: NotificationChannel;
    priority: NotificationPriority;
    is_quiet_hours: boolean;
    suppressed: boolean;
    reason?: string;
}

export class NotificationPolicyEngine {
    private static readonly DEFAULT_SUPPRESSION_WINDOW_MS = 60 * 1000; // 1 minute window

    constructor(
        private repository: NotificationRepositoryEngine = notificationRepositoryEngine
    ) {}

    async evaluatePolicy(params: {
        recipient_id: string;
        category: NotificationCategory;
        source_type: string;
        source_id: string;
        base_priority?: NotificationPriority;
        preferred_channel?: NotificationChannel;
        suppression_window_ms?: number;
    }): Promise<PolicyCheckResult> {
        // 1. Check Preferences
        const preference = await this.repository.getPreference(params.recipient_id, params.category);
        if (preference && !preference.enabled) {
            return {
                allowed: false,
                channel: 'IN_APP',
                priority: params.base_priority || 'NORMAL',
                is_quiet_hours: false,
                suppressed: true,
                reason: `NOTIFICATION_DISABLED_BY_PREFERENCE: Category '${params.category}' is disabled for recipient ${params.recipient_id}`
            };
        }

        // 2. Check Quiet Hours
        let isQuietHours = false;
        if (preference?.quiet_hours?.enabled) {
            isQuietHours = this.isCurrentTimeInQuietHours(
                preference.quiet_hours.start_time, 
                preference.quiet_hours.end_time
            );
        }

        // 3. Duplicate Suppression Check
        const windowMs = params.suppression_window_ms ?? NotificationPolicyEngine.DEFAULT_SUPPRESSION_WINDOW_MS;
        const recentNotifications = await this.repository.listNotifications({
            recipient_id: params.recipient_id,
            category: params.category,
            source_id: params.source_id,
            source_type: params.source_type
        });

        const now = Date.now();
        const duplicate = recentNotifications.find(n => {
            const created = new Date(n.created_at).getTime();
            return (now - created) < windowMs && n.status !== 'CANCELLED' && n.status !== 'ARCHIVED';
        });

        if (duplicate) {
            return {
                allowed: false,
                channel: preference?.channel || params.preferred_channel || 'IN_APP',
                priority: params.base_priority || 'NORMAL',
                is_quiet_hours: isQuietHours,
                suppressed: true,
                reason: `DUPLICATE_NOTIFICATION_SUPPRESSED: Matching notification '${duplicate.notification_id}' exists within suppression window`
            };
        }

        // 4. Resolve Channel & Priority
        const channel: NotificationChannel = preference?.channel || params.preferred_channel || 'IN_APP';
        let priority: NotificationPriority = params.base_priority || this.resolveDefaultPriority(params.category);

        // In quiet hours, downgrade high/normal to normal/low unless urgent
        if (isQuietHours && priority !== 'URGENT') {
            priority = 'LOW';
        }

        return {
            allowed: true,
            channel,
            priority,
            is_quiet_hours: isQuietHours,
            suppressed: false
        };
    }

    private resolveDefaultPriority(category: NotificationCategory): NotificationPriority {
        switch (category) {
            case 'REPORT_CARD':
            case 'TRANSCRIPT':
            case 'GUIDANCE':
                return 'HIGH';
            case 'ATTENDANCE':
            case 'BEHAVIOR':
            case 'ASSESSMENT':
            case 'ASSIGNMENT':
                return 'NORMAL';
            case 'CALENDAR':
            case 'COURSE':
            case 'SYSTEM':
            case 'ADMINISTRATIVE':
            default:
                return 'LOW';
        }
    }

    private isCurrentTimeInQuietHours(startTime: string, endTime: string): boolean {
        try {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            const [startH, startM] = startTime.split(':').map(Number);
            const [endH, endM] = endTime.split(':').map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;

            if (startMinutes <= endMinutes) {
                return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
            } else {
                // Crosses midnight, e.g. 21:00 to 06:00
                return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
            }
        } catch {
            return false;
        }
    }
}

export const notificationPolicyEngine = new NotificationPolicyEngine();
