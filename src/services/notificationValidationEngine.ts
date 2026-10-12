import { 
    NotificationCategory, 
    NotificationPriority, 
    NotificationChannel, 
    NotificationRecipientType, 
    NotificationPrivacyLevel, 
    NotificationStatus,
    Notification
} from '../types/curriculum';

export class NotificationValidationEngine {
    private static readonly VALID_CATEGORIES: NotificationCategory[] = [
        'ACADEMIC', 'ASSIGNMENT', 'ASSESSMENT', 'ATTENDANCE', 
        'REPORT_CARD', 'TRANSCRIPT', 'BEHAVIOR', 'GUIDANCE', 
        'COURSE', 'CALENDAR', 'SYSTEM', 'COMMUNICATION', 'ADMINISTRATIVE'
    ];

    private static readonly VALID_PRIORITIES: NotificationPriority[] = [
        'LOW', 'NORMAL', 'HIGH', 'URGENT'
    ];

    private static readonly VALID_CHANNELS: NotificationChannel[] = [
        'IN_APP', 'EMAIL', 'SMS', 'PUSH', 'SYSTEM'
    ];

    private static readonly VALID_RECIPIENT_TYPES: NotificationRecipientType[] = [
        'STUDENT', 'GUARDIAN', 'TEACHER', 'COUNSELOR', 'ADMIN', 'HEADMASTER'
    ];

    private static readonly VALID_PRIVACY_LEVELS: NotificationPrivacyLevel[] = [
        'PUBLIC_WITHIN_CLASS', 'PRIVATE_PARTICIPANTS', 'GUARDIAN_ONLY', 
        'TEACHER_ONLY', 'COUNSELOR_RESTRICTED', 'ADMIN_RESTRICTED'
    ];

    private static readonly VALID_STATUSES: NotificationStatus[] = [
        'QUEUED', 'PROCESSING', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED', 'ARCHIVED'
    ];

    validateNotificationParams(params: {
        title?: string;
        body?: string;
        category?: string;
        priority?: string;
        channel?: string;
        recipient_type?: string;
        recipient_id?: string;
        source_id?: string;
        source_type?: string;
        privacy_level?: string;
    }): void {
        if (params.title !== undefined) {
            if (!params.title || typeof params.title !== 'string' || params.title.trim() === '') {
                throw new Error('INVALID_NOTIFICATION_TITLE: Title must be a non-empty string');
            }
        }

        if (params.body !== undefined) {
            if (!params.body || typeof params.body !== 'string' || params.body.trim() === '') {
                throw new Error('INVALID_NOTIFICATION_BODY: Body must be a non-empty string');
            }
        }

        if (params.recipient_id !== undefined) {
            if (!params.recipient_id || typeof params.recipient_id !== 'string' || params.recipient_id.trim() === '') {
                throw new Error('INVALID_RECIPIENT_ID: Recipient ID must be a non-empty string');
            }
        }

        if (params.source_id !== undefined) {
            if (!params.source_id || typeof params.source_id !== 'string' || params.source_id.trim() === '') {
                throw new Error('INVALID_SOURCE_ID: Source ID must be a non-empty string');
            }
        }

        if (params.category !== undefined) {
            if (!NotificationValidationEngine.VALID_CATEGORIES.includes(params.category as NotificationCategory)) {
                throw new Error(`INVALID_NOTIFICATION_CATEGORY: Category '${params.category}' is invalid`);
            }
        }

        if (params.priority !== undefined) {
            if (!NotificationValidationEngine.VALID_PRIORITIES.includes(params.priority as NotificationPriority)) {
                throw new Error(`INVALID_NOTIFICATION_PRIORITY: Priority '${params.priority}' is invalid`);
            }
        }

        if (params.channel !== undefined) {
            if (!NotificationValidationEngine.VALID_CHANNELS.includes(params.channel as NotificationChannel)) {
                throw new Error(`INVALID_NOTIFICATION_CHANNEL: Channel '${params.channel}' is invalid`);
            }
        }

        if (params.recipient_type !== undefined) {
            if (!NotificationValidationEngine.VALID_RECIPIENT_TYPES.includes(params.recipient_type as NotificationRecipientType)) {
                throw new Error(`INVALID_RECIPIENT_TYPE: Recipient type '${params.recipient_type}' is invalid`);
            }
        }

        if (params.privacy_level !== undefined) {
            if (!NotificationValidationEngine.VALID_PRIVACY_LEVELS.includes(params.privacy_level as NotificationPrivacyLevel)) {
                throw new Error(`INVALID_PRIVACY_LEVEL: Privacy level '${params.privacy_level}' is invalid`);
            }
        }
    }

    validateSecurityLeakage(data: unknown): void {
        const str = JSON.stringify(data);
        const forbiddenPatterns = [
            /sk-[a-zA-Z0-9]{20,}/i,
            /Bearer\s+[a-zA-Z0-9_\-\.]+/i,
            /api[_\-]?key/i,
            /AI_STUDIO_API_KEY/i,
            /system_prompt/i,
            /prompt_injection/i,
            /postgres:\/\//i,
            /mysql:\/\//i,
            /confidential_notes/i,
            /private_counselor_notes/i
        ];

        for (const pattern of forbiddenPatterns) {
            if (pattern.test(str)) {
                throw new Error('SECURITY_LEAKAGE_DETECTED: Forbidden sensitive content or credentials detected in notification payload');
            }
        }
    }

    validateRecipientScope(actor_id: string, actor_role: string, notification: Notification): void {
        if (actor_role === 'ADMIN' || actor_role === 'HEADMASTER') {
            return; // Admin/Headmaster have full authorized operational scope
        }

        if (actor_role === 'STUDENT') {
            if (notification.recipient_id !== actor_id) {
                throw new Error('UNAUTHORIZED_STUDENT_SCOPE: Student cannot access another user notification');
            }
            return;
        }

        if (actor_role === 'GUARDIAN') {
            if (notification.recipient_id !== actor_id) {
                throw new Error('UNAUTHORIZED_GUARDIAN_SCOPE: Guardian cannot access unassigned notification');
            }
            return;
        }

        if (actor_role === 'TEACHER') {
            if (notification.recipient_id !== actor_id && notification.privacy_level !== 'PUBLIC_WITHIN_CLASS') {
                throw new Error('UNAUTHORIZED_TEACHER_SCOPE: Teacher cannot access private notification of others');
            }
            return;
        }

        if (actor_role === 'COUNSELOR') {
            if (notification.recipient_id !== actor_id && notification.category !== 'GUIDANCE' && notification.category !== 'BEHAVIOR') {
                throw new Error('UNAUTHORIZED_COUNSELOR_SCOPE: Counselor cannot access non-guidance notification of others');
            }
            return;
        }

        if (notification.recipient_id !== actor_id) {
            throw new Error('UNAUTHORIZED_NOTIFICATION_ACCESS: Actor is not the designated recipient');
        }
    }

    validateStatusTransition(currentStatus: NotificationStatus, newStatus: NotificationStatus): void {
        const validTransitions: Record<NotificationStatus, NotificationStatus[]> = {
            QUEUED: ['PROCESSING', 'DELIVERED', 'FAILED', 'CANCELLED', 'ARCHIVED'],
            PROCESSING: ['DELIVERED', 'FAILED', 'CANCELLED', 'ARCHIVED'],
            DELIVERED: ['READ', 'ARCHIVED', 'CANCELLED'],
            READ: ['ARCHIVED'],
            FAILED: ['QUEUED', 'ARCHIVED'],
            CANCELLED: ['ARCHIVED'],
            ARCHIVED: []
        };

        if (currentStatus === 'ARCHIVED') {
            throw new Error('TERMINAL_NOTIFICATION_CANNOT_TRANSITION: Cannot transition an ARCHIVED notification');
        }

        if (!validTransitions[currentStatus]?.includes(newStatus)) {
            throw new Error(`INVALID_NOTIFICATION_TRANSITION: Cannot transition notification from '${currentStatus}' to '${newStatus}'`);
        }
    }

    validateChecksum(expected: string, actual: string, entityName: string = 'NOTIFICATION'): void {
        if (expected !== actual) {
            throw new Error(`${entityName.toUpperCase()}_CHECKSUM_MISMATCH: Checksum verification failed`);
        }
    }
}

export const notificationValidationEngine = new NotificationValidationEngine();
