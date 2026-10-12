import { 
    NotificationCategory, 
    NotificationPriority, 
    NotificationPrivacyLevel,
    Notification
} from '../types/curriculum';
import { 
    notificationRecipientResolutionEngine, 
    NotificationRecipientResolutionEngine 
} from './notificationRecipientResolutionEngine';
import { 
    notificationEngine, 
    NotificationEngine,
    CreateNotificationParams
} from './notificationEngine';

export interface DomainEventTriggerParams {
    event_type: 
        | 'ASSIGNMENT_CREATED'
        | 'ASSIGNMENT_DUE_SOON'
        | 'ASSIGNMENT_CLOSED'
        | 'SUBMISSION_RECEIVED'
        | 'SUBMISSION_REVIEWED'
        | 'ASSESSMENT_PUBLISHED'
        | 'GRADE_CREATED'
        | 'GRADE_REVISED'
        | 'REPORT_CARD_PUBLISHED'
        | 'TRANSCRIPT_PUBLISHED'
        | 'ATTENDANCE_MARKED'
        | 'ATTENDANCE_ALERT'
        | 'BEHAVIOR_EVENT_REVIEWED'
        | 'GUIDANCE_CASE_UPDATED'
        | 'COURSE_PERIOD_OPENED'
        | 'COURSE_PERIOD_CLOSED'
        | 'CALENDAR_EVENT_CREATED';
    source_type: string;
    source_id: string;
    title: string;
    body: string;
    student_id?: string;
    teacher_id?: string;
    counselor_id?: string;
    headmaster_id?: string;
    course_id?: string;
    priority?: NotificationPriority;
    is_confidential?: boolean;
    notify_guardians?: boolean;
    metadata?: Record<string, unknown>;
    actor_id: string;
    actor_role: string;
}

export class NotificationTriggerEngine {
    constructor(
        private recipientResolver: NotificationRecipientResolutionEngine = notificationRecipientResolutionEngine,
        private notifEngine: NotificationEngine = notificationEngine
    ) {}

    async handleDomainEvent(params: DomainEventTriggerParams): Promise<Notification[]> {
        const category = this.mapEventToCategory(params.event_type);
        const resolvedRecipients = await this.recipientResolver.resolveRecipients({
            event_type: params.event_type,
            category,
            student_id: params.student_id,
            teacher_id: params.teacher_id,
            counselor_id: params.counselor_id,
            headmaster_id: params.headmaster_id,
            course_id: params.course_id,
            is_confidential: params.is_confidential,
            notify_guardians: params.notify_guardians
        });

        const createdNotifications: Notification[] = [];

        for (const recipient of resolvedRecipients) {
            try {
                const notif = await this.notifEngine.createNotification({
                    category,
                    priority: params.priority || this.resolvePriority(params.event_type),
                    privacy_level: recipient.privacy_level,
                    title: params.title,
                    body: params.body,
                    recipient_type: recipient.recipient_type,
                    recipient_id: recipient.recipient_id,
                    source_type: params.source_type,
                    source_id: params.source_id,
                    metadata: params.metadata,
                    actor_id: params.actor_id,
                    actor_role: params.actor_role
                });
                createdNotifications.push(notif);
            } catch (err: unknown) {
                // If duplicate suppressed or disabled by preference, handle gracefully
                const msg = (err as Error).message || '';
                if (!msg.includes('DUPLICATE_NOTIFICATION_SUPPRESSED') && !msg.includes('NOTIFICATION_DISABLED_BY_PREFERENCE')) {
                    throw err;
                }
            }
        }

        return createdNotifications;
    }

    private mapEventToCategory(eventType: DomainEventTriggerParams['event_type']): NotificationCategory {
        switch (eventType) {
            case 'ASSIGNMENT_CREATED':
            case 'ASSIGNMENT_DUE_SOON':
            case 'ASSIGNMENT_CLOSED':
            case 'SUBMISSION_RECEIVED':
            case 'SUBMISSION_REVIEWED':
                return 'ASSIGNMENT';
            case 'ASSESSMENT_PUBLISHED':
            case 'GRADE_CREATED':
            case 'GRADE_REVISED':
                return 'ASSESSMENT';
            case 'REPORT_CARD_PUBLISHED':
                return 'REPORT_CARD';
            case 'TRANSCRIPT_PUBLISHED':
                return 'TRANSCRIPT';
            case 'ATTENDANCE_MARKED':
            case 'ATTENDANCE_ALERT':
                return 'ATTENDANCE';
            case 'BEHAVIOR_EVENT_REVIEWED':
                return 'BEHAVIOR';
            case 'GUIDANCE_CASE_UPDATED':
                return 'GUIDANCE';
            case 'COURSE_PERIOD_OPENED':
            case 'COURSE_PERIOD_CLOSED':
                return 'COURSE';
            case 'CALENDAR_EVENT_CREATED':
                return 'CALENDAR';
            default:
                return 'SYSTEM';
        }
    }

    private resolvePriority(eventType: DomainEventTriggerParams['event_type']): NotificationPriority {
        switch (eventType) {
            case 'ATTENDANCE_ALERT':
                return 'URGENT';
            case 'REPORT_CARD_PUBLISHED':
            case 'TRANSCRIPT_PUBLISHED':
            case 'GUIDANCE_CASE_UPDATED':
                return 'HIGH';
            case 'ASSIGNMENT_DUE_SOON':
            case 'ASSESSMENT_PUBLISHED':
            case 'BEHAVIOR_EVENT_REVIEWED':
                return 'NORMAL';
            default:
                return 'LOW';
        }
    }
}

export const notificationTriggerEngine = new NotificationTriggerEngine();
