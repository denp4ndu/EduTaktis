import { 
    CommunicationThread, 
    CommunicationMessage, 
    CommunicationHistoryEntry, 
    CommunicationAuditEvent, 
    ParentTeacherCommunicationSummary,
    NotificationPrivacyLevel
} from '../types/curriculum';
import { 
    communicationRepositoryEngine, 
    CommunicationRepositoryEngine 
} from './communicationRepositoryEngine';
import { 
    communicationValidationEngine, 
    CommunicationValidationEngine 
} from './communicationValidationEngine';
import { 
    guardianRepositoryEngine, 
    GuardianRepositoryEngine 
} from './guardianRepositoryEngine';
import { 
    guardianValidationEngine, 
    GuardianValidationEngine 
} from './guardianValidationEngine';

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

export interface CreateThreadParams {
    subject: string;
    student_id: string;
    guardian_id: string;
    teacher_id: string;
    course_id?: string;
    course_period_id?: string;
    context_type?: 'STUDENT_COURSE' | 'STUDENT_WELLBEING' | 'ACADEMIC_GENERAL' | 'ADMINISTRATIVE';
    initial_message?: string;
    privacy_level?: NotificationPrivacyLevel;
    actor_id: string;
    actor_role: string;
}

export interface SendMessageParams {
    thread_id: string;
    body: string;
    actor_id: string;
    actor_role: string;
}

export interface EditMessageParams {
    message_id: string;
    new_body: string;
    reason: string;
    actor_id: string;
    actor_role: string;
}

export class ParentTeacherCommunicationEngine {
    private static readonly DUPLICATE_WINDOW_MS = 30 * 1000; // 30 seconds
    private static readonly RATE_LIMIT_COUNT = 20;
    private static readonly RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

    constructor(
        private repository: CommunicationRepositoryEngine = communicationRepositoryEngine,
        private validator: CommunicationValidationEngine = communicationValidationEngine,
        private guardianRepo: GuardianRepositoryEngine = guardianRepositoryEngine,
        private guardianValidator: GuardianValidationEngine = guardianValidationEngine
    ) {}

    private generateChecksum(data: unknown, prefix = 'COM-CHK-'): string {
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
    // THREAD CREATION & MANAGEMENT
    // ==========================================

    async createThread(params: CreateThreadParams): Promise<{ thread: CommunicationThread; initialMessage?: CommunicationMessage }> {
        this.validator.validateSecurityLeakage(params);
        this.validator.validateThreadParams({
            subject: params.subject,
            student_id: params.student_id,
            participant_ids: [params.guardian_id, params.teacher_id],
            context_type: params.context_type
        });

        // 1. Validate Guardian relationship with student
        const relationships = await this.guardianRepo.listRelationships({
            guardian_id: params.guardian_id,
            student_id: params.student_id
        });
        this.guardianValidator.validateScope(params.guardian_id, params.student_id, relationships);

        // 2. Validate Actor is one of the participants or Admin
        if (params.actor_role !== 'ADMIN' && params.actor_role !== 'HEADMASTER') {
            if (params.actor_id !== params.guardian_id && params.actor_id !== params.teacher_id) {
                throw new Error('UNAUTHORIZED_THREAD_CREATION: Actor is not an authorized participant in the thread');
            }
        }

        const threadId = `THR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const baseThread: Omit<CommunicationThread, 'checksum'> = {
            thread_id: threadId,
            subject: params.subject.trim(),
            participant_ids: [params.guardian_id, params.teacher_id],
            participant_roles: {
                [params.guardian_id]: 'GUARDIAN',
                [params.teacher_id]: 'TEACHER'
            },
            context_type: params.context_type || 'STUDENT_COURSE',
            student_id: params.student_id,
            course_id: params.course_id,
            course_period_id: params.course_period_id,
            privacy_level: params.privacy_level || 'GUARDIAN_ONLY',
            status: 'OPEN',
            created_at: now,
            updated_at: now,
            version_number: 1
        };

        const checksum = this.generateChecksum(baseThread, 'THR-CHK-');
        const fullThread: CommunicationThread = { ...baseThread, checksum };

        await this.repository.saveThread(fullThread);

        await this.repository.saveAudit({
            audit_id: `AUD-COM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            thread_id: threadId,
            event_type: 'THREAD_CREATED',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            details: { student_id: params.student_id, subject: params.subject },
            checksum: this.generateChecksum({ id: threadId, ev: 'CREATED' }, 'AUD-CHK-')
        });

        let initialMsg: CommunicationMessage | undefined = undefined;
        if (params.initial_message && params.initial_message.trim().length > 0) {
            initialMsg = await this.sendMessage({
                thread_id: threadId,
                body: params.initial_message,
                actor_id: params.actor_id,
                actor_role: params.actor_role
            });
        }

        return {
            thread: deepFreeze(fullThread),
            initialMessage: initialMsg ? deepFreeze(initialMsg) : undefined
        };
    }

    async sendMessage(params: SendMessageParams): Promise<CommunicationMessage> {
        this.validator.validateSecurityLeakage(params);
        this.validator.validateMessageParams({
            body: params.body,
            sender_id: params.actor_id,
            sender_role: params.actor_role
        });

        const thread = await this.repository.getThread(params.thread_id);
        if (!thread) {
            throw new Error(`THREAD_NOT_FOUND: Thread ${params.thread_id} does not exist`);
        }

        if (thread.status === 'ARCHIVED') {
            throw new Error('THREAD_ARCHIVED: Cannot send messages in an archived thread');
        }

        this.validator.validateParticipantScope(params.actor_id, params.actor_role, thread);

        const existingMessages = await this.repository.listMessages(params.thread_id);
        const nowMs = Date.now();

        // 1. Rate Limit Safeguards
        const recentUserMessages = existingMessages.filter(m => {
            const time = new Date(m.created_at).getTime();
            return m.sender_id === params.actor_id && (nowMs - time) < ParentTeacherCommunicationEngine.RATE_LIMIT_WINDOW_MS;
        });

        if (recentUserMessages.length >= ParentTeacherCommunicationEngine.RATE_LIMIT_COUNT) {
            throw new Error('COMMUNICATION_RATE_LIMIT_EXCEEDED: Maximum messages per window exceeded');
        }

        // 2. Duplicate Message Suppression
        const isDuplicate = existingMessages.some(m => {
            const time = new Date(m.created_at).getTime();
            return m.sender_id === params.actor_id && m.body === params.body.trim() && (nowMs - time) < ParentTeacherCommunicationEngine.DUPLICATE_WINDOW_MS;
        });

        if (isDuplicate) {
            throw new Error('DUPLICATE_MESSAGE_SUPPRESSED: Identical message sent within suppression window');
        }

        const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const baseMessage: Omit<CommunicationMessage, 'checksum'> = {
            message_id: messageId,
            thread_id: params.thread_id,
            sender_id: params.actor_id,
            sender_role: params.actor_role,
            body: params.body.trim(),
            status: 'SENT',
            created_at: now,
            version_number: 1
        };

        const checksum = this.generateChecksum(baseMessage, 'MSG-CHK-');
        const fullMessage: CommunicationMessage = { ...baseMessage, checksum };

        await this.repository.saveMessage(fullMessage);

        // Update thread updated_at and status to ACTIVE
        if (thread.status === 'OPEN') {
            const updatedThreadBase: Omit<CommunicationThread, 'checksum'> = {
                ...thread,
                status: 'ACTIVE',
                updated_at: now,
                version_number: thread.version_number + 1
            };
            const thrChecksum = this.generateChecksum(updatedThreadBase, 'THR-CHK-');
            await this.repository.saveThread({ ...updatedThreadBase, checksum: thrChecksum });
        } else {
            const updatedThreadBase: Omit<CommunicationThread, 'checksum'> = {
                ...thread,
                updated_at: now
            };
            const thrChecksum = this.generateChecksum(updatedThreadBase, 'THR-CHK-');
            await this.repository.saveThread({ ...updatedThreadBase, checksum: thrChecksum });
        }

        await this.repository.saveAudit({
            audit_id: `AUD-COM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            thread_id: params.thread_id,
            message_id: messageId,
            event_type: 'MESSAGE_SENT',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            checksum: this.generateChecksum({ id: messageId, act: 'SENT' }, 'AUD-CHK-')
        });

        return deepFreeze(fullMessage);
    }

    async editMessage(params: EditMessageParams): Promise<CommunicationMessage> {
        this.validator.validateSecurityLeakage(params);
        this.validator.validateMessageParams({
            body: params.new_body,
            sender_id: params.actor_id,
            sender_role: params.actor_role
        });

        const existing = await this.repository.getMessage(params.message_id);
        if (!existing) {
            throw new Error(`MESSAGE_NOT_FOUND: Message ${params.message_id} does not exist`);
        }

        if (existing.sender_id !== params.actor_id && params.actor_role !== 'ADMIN') {
            throw new Error('UNAUTHORIZED_MESSAGE_EDIT: Only the original sender can revise this message');
        }

        if (existing.status === 'ARCHIVED') {
            throw new Error('TERMINAL_MESSAGE_CANNOT_TRANSITION: Cannot edit an archived message');
        }

        const { checksum: currentChecksum, ...cleanExisting } = existing;
        const expectedChecksum = this.generateChecksum(cleanExisting, 'MSG-CHK-');
        this.validator.validateChecksum(expectedChecksum, existing.checksum, 'MESSAGE');

        const now = new Date().toISOString();
        const nextVersion = existing.version_number + 1;

        // Record immutable history entry
        await this.repository.saveHistory({
            history_id: `HST-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            message_id: existing.message_id,
            thread_id: existing.thread_id,
            version_number: nextVersion,
            previous_body: existing.body,
            new_body: params.new_body.trim(),
            previous_status: existing.status,
            new_status: existing.status,
            reason: params.reason,
            actor_id: params.actor_id,
            timestamp: now,
            checksum: this.generateChecksum({ id: existing.message_id, v: nextVersion }, 'HST-CHK-')
        });

        const updatedBase: Omit<CommunicationMessage, 'checksum'> = {
            ...existing,
            body: params.new_body.trim(),
            edited_at: now,
            version_number: nextVersion
        };
        const checksum = this.generateChecksum(updatedBase, 'MSG-CHK-');
        const fullMessage: CommunicationMessage = { ...updatedBase, checksum };

        await this.repository.saveMessage(fullMessage);

        await this.repository.saveAudit({
            audit_id: `AUD-COM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            thread_id: existing.thread_id,
            message_id: existing.message_id,
            event_type: 'MESSAGE_REVISED',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            details: { reason: params.reason, version: nextVersion },
            checksum: this.generateChecksum({ id: existing.message_id, v: nextVersion }, 'AUD-CHK-')
        });

        return deepFreeze(fullMessage);
    }

    async markThreadRead(params: { thread_id: string; actor_id: string; actor_role: string }): Promise<void> {
        const thread = await this.repository.getThread(params.thread_id);
        if (!thread) {
            throw new Error(`THREAD_NOT_FOUND: Thread ${params.thread_id} not found`);
        }

        this.validator.validateParticipantScope(params.actor_id, params.actor_role, thread);

        const messages = await this.repository.listMessages(params.thread_id);
        const now = new Date().toISOString();

        for (const msg of messages) {
            if (msg.sender_id !== params.actor_id && (!msg.read_by || !msg.read_by[params.actor_id])) {
                const readBy = { ...(msg.read_by || {}), [params.actor_id]: now };
                const nextVersion = msg.version_number + 1;
                const updatedBase: Omit<CommunicationMessage, 'checksum'> = {
                    ...msg,
                    status: 'READ',
                    read_by: readBy,
                    version_number: nextVersion
                };
                const checksum = this.generateChecksum(updatedBase, 'MSG-CHK-');
                await this.repository.saveMessage({ ...updatedBase, checksum });

                await this.repository.saveAudit({
                    audit_id: `AUD-COM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    thread_id: params.thread_id,
                    message_id: msg.message_id,
                    event_type: 'MESSAGE_READ',
                    actor_id: params.actor_id,
                    actor_role: params.actor_role,
                    timestamp: now,
                    checksum: this.generateChecksum({ id: msg.message_id, read: params.actor_id }, 'AUD-CHK-')
                });
            }
        }
    }

    async archiveThread(params: { thread_id: string; reason: string; actor_id: string; actor_role: string }): Promise<CommunicationThread> {
        const thread = await this.repository.getThread(params.thread_id);
        if (!thread) {
            throw new Error(`THREAD_NOT_FOUND: Thread ${params.thread_id} not found`);
        }

        this.validator.validateParticipantScope(params.actor_id, params.actor_role, thread);
        this.validator.validateThreadTransition(thread.status, 'ARCHIVED');

        const now = new Date().toISOString();
        const nextVersion = thread.version_number + 1;

        const updatedBase: Omit<CommunicationThread, 'checksum'> = {
            ...thread,
            status: 'ARCHIVED',
            updated_at: now,
            version_number: nextVersion
        };
        const checksum = this.generateChecksum(updatedBase, 'THR-CHK-');
        const fullThread: CommunicationThread = { ...updatedBase, checksum };

        await this.repository.saveThread(fullThread);

        await this.repository.saveAudit({
            audit_id: `AUD-COM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            thread_id: thread.thread_id,
            event_type: 'THREAD_ARCHIVED',
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            details: { reason: params.reason },
            checksum: this.generateChecksum({ id: thread.thread_id, st: 'ARCHIVED' }, 'AUD-CHK-')
        });

        return deepFreeze(fullThread);
    }

    // ==========================================
    // QUERIES
    // ==========================================

    async getThread(thread_id: string, actor_id: string, actor_role: string): Promise<{ thread: CommunicationThread; messages: CommunicationMessage[] }> {
        const thread = await this.repository.getThread(thread_id);
        if (!thread) {
            throw new Error(`THREAD_NOT_FOUND: Thread ${thread_id} not found`);
        }

        this.validator.validateParticipantScope(actor_id, actor_role, thread);
        const messages = await this.repository.listMessages(thread_id);

        await this.repository.saveAudit({
            audit_id: `AUD-COM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            thread_id,
            event_type: 'COMMUNICATION_VIEWED',
            actor_id,
            actor_role,
            timestamp: new Date().toISOString(),
            checksum: this.generateChecksum({ id: thread_id, view: actor_id }, 'AUD-CHK-')
        });

        return {
            thread,
            messages
        };
    }

    async listThreads(actor_id: string, actor_role: string): Promise<CommunicationThread[]> {
        if (actor_role === 'ADMIN' || actor_role === 'HEADMASTER') {
            return this.repository.listThreads();
        }
        return this.repository.listThreads({ participant_id: actor_id });
    }

    async getCommunicationSummary(actor_id: string, actor_role: string): Promise<ParentTeacherCommunicationSummary> {
        const threads = await this.listThreads(actor_id, actor_role);
        const activeThreads = threads.filter(t => t.status !== 'ARCHIVED');

        let unreadCount = 0;
        let latestMsgAt: string | undefined = undefined;

        for (const thread of activeThreads) {
            const messages = await this.repository.listMessages(thread.thread_id);
            for (const msg of messages) {
                if (msg.sender_id !== actor_id && (!msg.read_by || !msg.read_by[actor_id])) {
                    unreadCount++;
                }
                if (!latestMsgAt || msg.created_at.localeCompare(latestMsgAt) > 0) {
                    latestMsgAt = msg.created_at;
                }
            }
        }

        return deepFreeze({
            actor_id,
            thread_count: threads.length,
            unread_count: unreadCount,
            active_thread_count: activeThreads.length,
            latest_message_at: latestMsgAt,
            threads: activeThreads
        });
    }

    async getAuditTrail(filter?: { thread_id?: string; actor_id?: string }): Promise<CommunicationAuditEvent[]> {
        return this.repository.listAudit(filter);
    }
}

export const parentTeacherCommunicationEngine = new ParentTeacherCommunicationEngine();
