import { 
    NotificationRecipientType,
    NotificationPrivacyLevel,
    NotificationCategory
} from '../types/curriculum';
import { 
    guardianRepositoryEngine, 
    GuardianRepositoryEngine 
} from './guardianRepositoryEngine';
import { 
    guardianValidationEngine, 
    GuardianValidationEngine 
} from './guardianValidationEngine';

export interface ResolvedRecipient {
    recipient_id: string;
    recipient_type: NotificationRecipientType;
    privacy_level: NotificationPrivacyLevel;
}

export interface ResolutionContext {
    event_type: string;
    category: NotificationCategory;
    student_id?: string;
    teacher_id?: string;
    counselor_id?: string;
    headmaster_id?: string;
    course_id?: string;
    is_confidential?: boolean;
    notify_guardians?: boolean;
}

export class NotificationRecipientResolutionEngine {
    constructor(
        private guardianRepo: GuardianRepositoryEngine = guardianRepositoryEngine,
        private guardianValidator: GuardianValidationEngine = guardianValidationEngine
    ) {}

    async resolveRecipients(context: ResolutionContext): Promise<ResolvedRecipient[]> {
        const recipients: ResolvedRecipient[] = [];

        // 1. If student is specified, add student recipient
        if (context.student_id) {
            recipients.push({
                recipient_id: context.student_id,
                recipient_type: 'STUDENT',
                privacy_level: context.is_confidential ? 'PRIVATE_PARTICIPANTS' : 'PUBLIC_WITHIN_CLASS'
            });

            // If not strictly confidential (counselor restricted), resolve active guardians
            if (!context.is_confidential || context.notify_guardians) {
                const relationships = await this.guardianRepo.listRelationships({ student_id: context.student_id });
                for (const rel of relationships) {
                    try {
                        this.guardianValidator.validateActiveRelationship(rel);
                        const guardian = await this.guardianRepo.getGuardian(rel.guardian_id);
                        if (guardian && guardian.status === 'ACTIVE') {
                            recipients.push({
                                recipient_id: guardian.guardian_id,
                                recipient_type: 'GUARDIAN',
                                privacy_level: 'GUARDIAN_ONLY'
                            });
                        }
                    } catch {
                        // Inactive/expired relationship ignored deterministically
                    }
                }
            }
        }

        // 2. If teacher specified and relevant
        if (context.teacher_id) {
            recipients.push({
                recipient_id: context.teacher_id,
                recipient_type: 'TEACHER',
                privacy_level: 'TEACHER_ONLY'
            });
        }

        // 3. If counselor specified (for guidance/wellbeing)
        if (context.counselor_id) {
            recipients.push({
                recipient_id: context.counselor_id,
                recipient_type: 'COUNSELOR',
                privacy_level: 'COUNSELOR_RESTRICTED'
            });
        }

        // 4. If headmaster / admin specified
        if (context.headmaster_id) {
            recipients.push({
                recipient_id: context.headmaster_id,
                recipient_type: 'HEADMASTER',
                privacy_level: 'ADMIN_RESTRICTED'
            });
        }

        // Deduplicate recipients by recipient_id
        const uniqueMap = new Map<string, ResolvedRecipient>();
        for (const r of recipients) {
            if (!uniqueMap.has(r.recipient_id)) {
                uniqueMap.set(r.recipient_id, r);
            }
        }

        return Array.from(uniqueMap.values());
    }
}

export const notificationRecipientResolutionEngine = new NotificationRecipientResolutionEngine();
