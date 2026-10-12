import { 
    CommunicationThreadStatus, 
    CommunicationMessageStatus,
    CommunicationThread,
    CommunicationMessage
} from '../types/curriculum';

export class CommunicationValidationEngine {
    private static readonly VALID_THREAD_STATUSES: CommunicationThreadStatus[] = [
        'DRAFT', 'OPEN', 'ACTIVE', 'ARCHIVED'
    ];

    private static readonly VALID_MESSAGE_STATUSES: CommunicationMessageStatus[] = [
        'DRAFT', 'SENT', 'READ', 'ARCHIVED'
    ];

    validateThreadParams(params: {
        subject?: string;
        student_id?: string;
        participant_ids?: string[];
        context_type?: string;
    }): void {
        if (params.subject !== undefined) {
            if (!params.subject || typeof params.subject !== 'string' || params.subject.trim().length < 3) {
                throw new Error('INVALID_THREAD_SUBJECT: Subject must be at least 3 characters');
            }
        }

        if (params.student_id !== undefined) {
            if (!params.student_id || typeof params.student_id !== 'string' || params.student_id.trim() === '') {
                throw new Error('INVALID_STUDENT_ID: Student ID must be a non-empty string');
            }
        }

        if (params.participant_ids !== undefined) {
            if (!Array.isArray(params.participant_ids) || params.participant_ids.length < 2) {
                throw new Error('INVALID_PARTICIPANTS: Thread must have at least 2 participants');
            }
        }
    }

    validateMessageParams(params: {
        body?: string;
        sender_id?: string;
        sender_role?: string;
    }): void {
        if (params.body !== undefined) {
            if (!params.body || typeof params.body !== 'string' || params.body.trim().length === 0) {
                throw new Error('INVALID_MESSAGE_BODY: Message body must not be empty');
            }
        }

        if (params.sender_id !== undefined) {
            if (!params.sender_id || typeof params.sender_id !== 'string' || params.sender_id.trim() === '') {
                throw new Error('INVALID_SENDER_ID: Sender ID must be a non-empty string');
            }
        }
    }

    validateParticipantScope(actor_id: string, actor_role: string, thread: CommunicationThread): void {
        if (actor_role === 'ADMIN' || actor_role === 'HEADMASTER') {
            return;
        }

        if (!thread.participant_ids.includes(actor_id)) {
            throw new Error(`UNAUTHORIZED_COMMUNICATION_SCOPE: Actor ${actor_id} is not an authorized participant in thread ${thread.thread_id}`);
        }

        if (actor_role === 'STUDENT' && thread.privacy_level === 'GUARDIAN_ONLY') {
            throw new Error('UNAUTHORIZED_STUDENT_COMMUNICATION_SCOPE: Student cannot access private guardian-teacher thread');
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
                throw new Error('SECURITY_LEAKAGE_DETECTED: Forbidden sensitive content or credentials detected in communication payload');
            }
        }
    }

    validateThreadTransition(currentStatus: CommunicationThreadStatus, newStatus: CommunicationThreadStatus): void {
        const validTransitions: Record<CommunicationThreadStatus, CommunicationThreadStatus[]> = {
            DRAFT: ['OPEN', 'ARCHIVED'],
            OPEN: ['ACTIVE', 'ARCHIVED'],
            ACTIVE: ['ARCHIVED'],
            ARCHIVED: []
        };

        if (currentStatus === 'ARCHIVED') {
            throw new Error('TERMINAL_THREAD_CANNOT_TRANSITION: Cannot transition an ARCHIVED communication thread');
        }

        if (!validTransitions[currentStatus]?.includes(newStatus)) {
            throw new Error(`INVALID_THREAD_TRANSITION: Cannot transition thread from '${currentStatus}' to '${newStatus}'`);
        }
    }

    validateMessageTransition(currentStatus: CommunicationMessageStatus, newStatus: CommunicationMessageStatus): void {
        const validTransitions: Record<CommunicationMessageStatus, CommunicationMessageStatus[]> = {
            DRAFT: ['SENT', 'ARCHIVED'],
            SENT: ['READ', 'ARCHIVED'],
            READ: ['ARCHIVED'],
            ARCHIVED: []
        };

        if (currentStatus === 'ARCHIVED') {
            throw new Error('TERMINAL_MESSAGE_CANNOT_TRANSITION: Cannot transition an ARCHIVED message');
        }

        if (!validTransitions[currentStatus]?.includes(newStatus)) {
            throw new Error(`INVALID_MESSAGE_TRANSITION: Cannot transition message from '${currentStatus}' to '${newStatus}'`);
        }
    }

    validateChecksum(expected: string, actual: string, entityName: string = 'COMMUNICATION'): void {
        if (expected !== actual) {
            throw new Error(`${entityName.toUpperCase()}_CHECKSUM_MISMATCH: Checksum verification failed`);
        }
    }
}

export const communicationValidationEngine = new CommunicationValidationEngine();
