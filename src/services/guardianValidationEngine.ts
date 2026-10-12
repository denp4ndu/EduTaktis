import { 
    GuardianStatus, 
    GuardianRole, 
    GuardianRelationshipType, 
    GuardianRelationshipStatus,
    Guardian,
    GuardianStudentRelationship
} from '../types/curriculum';

export class GuardianValidationEngine {
    private static readonly VALID_GUARDIAN_STATUSES: GuardianStatus[] = [
        'PENDING', 
        'ACTIVE', 
        'SUSPENDED', 
        'REVOKED', 
        'ARCHIVED'
    ];

    private static readonly VALID_GUARDIAN_ROLES: GuardianRole[] = [
        'PARENT', 
        'LEGAL_GUARDIAN', 
        'AUTHORIZED_CAREGIVER'
    ];

    private static readonly VALID_RELATIONSHIP_STATUSES: GuardianRelationshipStatus[] = [
        'PENDING', 
        'ACTIVE', 
        'SUSPENDED', 
        'REVOKED', 
        'ARCHIVED'
    ];

    private static readonly VALID_RELATIONSHIP_TYPES: GuardianRelationshipType[] = [
        'PARENT', 
        'LEGAL_GUARDIAN', 
        'AUTHORIZED_CAREGIVER'
    ];

    validateGuardianIdentity(params: {
        guardian_id?: string;
        display_name?: string;
        role?: string;
        status?: string;
        actor_id?: string;
        actor_role?: string;
    }): void {
        if (params.guardian_id !== undefined) {
            if (!params.guardian_id || typeof params.guardian_id !== 'string' || params.guardian_id.trim() === '') {
                throw new Error('INVALID_GUARDIAN_ID: Guardian ID must be a non-empty string');
            }
        }

        if (params.display_name !== undefined) {
            if (!params.display_name || typeof params.display_name !== 'string' || params.display_name.trim().length < 2) {
                throw new Error('INVALID_GUARDIAN_NAME: Display name must be at least 2 characters');
            }
        }

        if (params.role !== undefined) {
            if (!GuardianValidationEngine.VALID_GUARDIAN_ROLES.includes(params.role as GuardianRole)) {
                throw new Error(`INVALID_GUARDIAN_ROLE: Role '${params.role}' is not a recognized GuardianRole`);
            }
        }

        if (params.status !== undefined) {
            if (!GuardianValidationEngine.VALID_GUARDIAN_STATUSES.includes(params.status as GuardianStatus)) {
                throw new Error(`INVALID_GUARDIAN_STATUS: Status '${params.status}' is not a recognized GuardianStatus`);
            }
        }
    }

    validateRelationshipParams(params: {
        relationship_id?: string;
        guardian_id?: string;
        student_id?: string;
        relationship_type?: string;
        status?: string;
        effective_from?: string;
        effective_until?: string;
    }): void {
        if (params.relationship_id !== undefined) {
            if (!params.relationship_id || typeof params.relationship_id !== 'string' || params.relationship_id.trim() === '') {
                throw new Error('INVALID_RELATIONSHIP_ID: Relationship ID must be a non-empty string');
            }
        }

        if (params.guardian_id !== undefined) {
            if (!params.guardian_id || typeof params.guardian_id !== 'string' || params.guardian_id.trim() === '') {
                throw new Error('INVALID_GUARDIAN_ID: Guardian ID must be a non-empty string');
            }
        }

        if (params.student_id !== undefined) {
            if (!params.student_id || typeof params.student_id !== 'string' || params.student_id.trim() === '') {
                throw new Error('INVALID_STUDENT_ID: Student ID must be a non-empty string');
            }
        }

        if (params.relationship_type !== undefined) {
            if (!GuardianValidationEngine.VALID_RELATIONSHIP_TYPES.includes(params.relationship_type as GuardianRelationshipType)) {
                throw new Error(`INVALID_RELATIONSHIP_TYPE: Type '${params.relationship_type}' is not recognized`);
            }
        }

        if (params.status !== undefined) {
            if (!GuardianValidationEngine.VALID_RELATIONSHIP_STATUSES.includes(params.status as GuardianRelationshipStatus)) {
                throw new Error(`INVALID_RELATIONSHIP_STATUS: Status '${params.status}' is not recognized`);
            }
        }

        if (params.effective_from !== undefined) {
            const fromDate = new Date(params.effective_from);
            if (isNaN(fromDate.getTime())) {
                throw new Error('INVALID_DATE: effective_from is not a valid ISO date');
            }
        }

        if (params.effective_until !== undefined && params.effective_until !== null && params.effective_until !== '') {
            const untilDate = new Date(params.effective_until);
            if (isNaN(untilDate.getTime())) {
                throw new Error('INVALID_DATE: effective_until is not a valid ISO date');
            }
            if (params.effective_from) {
                const fromDate = new Date(params.effective_from);
                if (untilDate.getTime() < fromDate.getTime()) {
                    throw new Error('INVALID_DATE_RANGE: effective_until cannot be earlier than effective_from');
                }
            }
        }
    }

    validateGuardianAuthority(actorRole?: string, allowedRoles: string[] = ['ADMIN', 'HEADMASTER', 'STAFF']): void {
        if (!actorRole) {
            throw new Error('UNAUTHORIZED_ACCESS: Missing actor_role');
        }
        if (!allowedRoles.includes(actorRole)) {
            throw new Error(`UNAUTHORIZED_GUARDIAN_ADMIN_SCOPE: Role '${actorRole}' is not permitted to perform guardian administration`);
        }
    }

    validateActiveGuardian(guardian: Guardian): void {
        if (guardian.status !== 'ACTIVE') {
            throw new Error(`GUARDIAN_NOT_ACTIVE: Guardian ${guardian.guardian_id} status is '${guardian.status}'`);
        }
    }

    validateActiveRelationship(relationship: GuardianStudentRelationship): void {
        if (relationship.status !== 'ACTIVE') {
            throw new Error(`GUARDIAN_STUDENT_RELATIONSHIP_NOT_ACTIVE: Relationship status is '${relationship.status}'`);
        }

        const now = new Date().getTime();
        const from = new Date(relationship.effective_from).getTime();
        if (now < from) {
            throw new Error('GUARDIAN_STUDENT_RELATIONSHIP_NOT_YET_EFFECTIVE: Relationship effective date is in the future');
        }

        if (relationship.effective_until) {
            const until = new Date(relationship.effective_until).getTime();
            if (now > until) {
                throw new Error('GUARDIAN_STUDENT_RELATIONSHIP_EXPIRED: Relationship has expired');
            }
        }
    }

    validateScope(guardian_id: string, student_id: string, relationships: GuardianStudentRelationship[]): GuardianStudentRelationship {
        const matching = relationships.find(r => r.guardian_id === guardian_id && r.student_id === student_id);
        if (!matching) {
            throw new Error(`UNAUTHORIZED_GUARDIAN_SCOPE: Guardian ${guardian_id} has no registered relationship with Student ${student_id}`);
        }

        this.validateActiveRelationship(matching);
        return matching;
    }

    validateGuardianTransition(currentStatus: GuardianStatus, newStatus: GuardianStatus): void {
        const validTransitions: Record<GuardianStatus, GuardianStatus[]> = {
            PENDING: ['ACTIVE', 'REVOKED', 'ARCHIVED'],
            ACTIVE: ['SUSPENDED', 'REVOKED', 'ARCHIVED'],
            SUSPENDED: ['ACTIVE', 'REVOKED', 'ARCHIVED'],
            REVOKED: ['ARCHIVED'],
            ARCHIVED: []
        };

        if (currentStatus === 'ARCHIVED') {
            throw new Error('TERMINAL_GUARDIAN_CANNOT_TRANSITION: Cannot transition an ARCHIVED guardian');
        }

        if (!validTransitions[currentStatus]?.includes(newStatus)) {
            throw new Error(`INVALID_GUARDIAN_TRANSITION: Cannot transition guardian from '${currentStatus}' to '${newStatus}'`);
        }
    }

    validateRelationshipTransition(currentStatus: GuardianRelationshipStatus, newStatus: GuardianRelationshipStatus): void {
        const validTransitions: Record<GuardianRelationshipStatus, GuardianRelationshipStatus[]> = {
            PENDING: ['ACTIVE', 'REVOKED', 'ARCHIVED'],
            ACTIVE: ['SUSPENDED', 'REVOKED', 'ARCHIVED'],
            SUSPENDED: ['ACTIVE', 'REVOKED', 'ARCHIVED'],
            REVOKED: ['ARCHIVED'],
            ARCHIVED: []
        };

        if (currentStatus === 'ARCHIVED') {
            throw new Error('TERMINAL_RELATIONSHIP_CANNOT_TRANSITION: Cannot transition an ARCHIVED relationship');
        }

        if (!validTransitions[currentStatus]?.includes(newStatus)) {
            throw new Error(`INVALID_RELATIONSHIP_TRANSITION: Cannot transition relationship from '${currentStatus}' to '${newStatus}'`);
        }
    }

    validateChecksum(expected: string, actual: string, entityName: string = 'ENTITY'): void {
        if (expected !== actual) {
            throw new Error(`CHECKSUM_MISMATCH: ${entityName} checksum verification failed`);
        }
    }

    validatePrivacyLeakage(obj: unknown): void {
        const str = JSON.stringify(obj);
        const forbiddenKeys = ['password', 'secret', 'token', 'apiKey', 'api_key', 'private_counselor_notes', 'confidential_notes'];
        for (const key of forbiddenKeys) {
            if (str.toLowerCase().includes(`"${key}"`)) {
                throw new Error(`PRIVACY_LEAKAGE_DETECTED: Forbidden sensitive key '${key}' detected in public projection`);
            }
        }
    }
}

export const guardianValidationEngine = new GuardianValidationEngine();
