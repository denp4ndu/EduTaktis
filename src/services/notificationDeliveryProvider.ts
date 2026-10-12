import { Notification, NotificationChannel } from '../types/curriculum';

export interface DeliveryResult {
    success: boolean;
    channel: NotificationChannel;
    delivered_at: string;
    error?: string;
    details?: Record<string, unknown>;
}

export interface NotificationDeliveryProvider {
    deliver(notification: Notification): Promise<DeliveryResult>;
}

export class InMemoryNotificationDeliveryProvider implements NotificationDeliveryProvider {
    private deliveryLog: Array<{ notification_id: string; delivered_at: string; channel: NotificationChannel }> = [];

    async deliver(notification: Notification): Promise<DeliveryResult> {
        const now = new Date().toISOString();
        this.deliveryLog.push({
            notification_id: notification.notification_id,
            delivered_at: now,
            channel: notification.channel
        });

        return {
            success: true,
            channel: notification.channel,
            delivered_at: now,
            details: { mode: 'IN_MEMORY_DISPATCH', recipient: notification.recipient_id }
        };
    }

    getDeliveryLog(): Array<{ notification_id: string; delivered_at: string; channel: NotificationChannel }> {
        return [...this.deliveryLog];
    }

    clear(): void {
        this.deliveryLog = [];
    }
}

export const notificationDeliveryProvider = new InMemoryNotificationDeliveryProvider();
