import { UserRole } from '../types/curriculum';
import { SchoolAdministrationStorageProvider, schoolAdministrationStorage } from './schoolAdministrationStorageProvider';

export class AdministrativeScopeEngine {
    constructor(
        private storage: SchoolAdministrationStorageProvider = schoolAdministrationStorage
    ) {}

    /**
     * Validates that an actor has administrative scope within the specified institution
     */
    async validateAdministrativeScope(
        actorId: string,
        actorRole: UserRole,
        institutionId: string
    ): Promise<void> {
        if (!actorId || !institutionId) {
            throw new Error('INVALID_ADMINISTRATIVE_SCOPE: actorId and institutionId are required');
        }

        // Global ADMIN can administer any institution
        if (actorRole === 'ADMIN') {
            return;
        }

        // HEADMASTER is restricted to their assigned institution
        if (actorRole === 'HEADMASTER') {
            const assignments = await this.storage.listAdminRoleAssignments(institutionId);
            const isAssigned = assignments.some(
                a => a.user_id === actorId && a.role === 'HEADMASTER' && a.status === 'ACTIVE'
            );
            if (!isAssigned) {
                throw new Error(`UNAUTHORIZED_INSTITUTION_SCOPE: User ${actorId} with role HEADMASTER is not assigned to institution ${institutionId}`);
            }
            return;
        }

        throw new Error(`UNAUTHORIZED_ADMIN_SCOPE: Role ${actorRole} does not possess administrative authority for institution ${institutionId}`);
    }

    /**
     * Validates cross-institution isolation
     */
    validateInstitutionIsolation(
        sourceInstitutionId: string,
        targetInstitutionId: string
    ): void {
        if (sourceInstitutionId !== targetInstitutionId) {
            throw new Error(`CROSS_INSTITUTION_ACCESS_DENIED: Cannot access or mutate entities across institutions (${sourceInstitutionId} !== ${targetInstitutionId})`);
        }
    }
}

export const administrativeScopeEngine = new AdministrativeScopeEngine();
