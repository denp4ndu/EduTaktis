import { 
    Institution, 
    InstitutionStatus, 
    OrganizationUnit, 
    Department, 
    Program, 
    SchoolClass, 
    ClassStatus, 
    StudentPlacement, 
    AdministrativeRoleAssignment, 
    GovernanceSettings, 
    AdministrativeAuditEvent 
} from '../types/curriculum';

export class SchoolAdministrationValidationEngine {
    private prohibitedLeakagePatterns = [
        /AIzaSy[A-Za-z0-9_-]{20,}/i,
        /sk-[A-Za-z0-9]{20,}/i,
        /Bearer\s+[A-Za-z0-9._~+/-]+=*/i,
        /password\s*[:=]/i,
        /password_hash\s*[:=]/i,
        /private_key\s*[:=]/i,
        /generateContent/i,
        /system\s+prompt/i
    ];

    /**
     * Inspects arbitrary payload for credential or token leakage
     */
    detectSecurityLeakage(payload: unknown): void {
        const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
        for (const pattern of this.prohibitedLeakagePatterns) {
            if (pattern.test(str)) {
                throw new Error('SECURITY_LEAKAGE_DETECTED: Prohibited credential or token pattern detected in payload');
            }
        }
    }

    /**
     * Validates institution lifecycle transitions
     */
    validateInstitutionStatusTransition(current: InstitutionStatus, next: InstitutionStatus): void {
        if (current === next) return;

        if (current === 'ARCHIVED') {
            throw new Error('INVALID_INSTITUTION_TRANSITION: ARCHIVED is terminal and cannot transition to any other status');
        }

        if (current === 'CLOSED' && next === 'ACTIVE') {
            throw new Error('INVALID_INSTITUTION_TRANSITION: CLOSED cannot transition directly to ACTIVE without revision workflow');
        }

        const validTransitions: Record<InstitutionStatus, InstitutionStatus[]> = {
            DRAFT: ['ACTIVE', 'ARCHIVED'],
            ACTIVE: ['SUSPENDED', 'CLOSED', 'ARCHIVED'],
            SUSPENDED: ['ACTIVE', 'CLOSED', 'ARCHIVED'],
            CLOSED: ['ARCHIVED'],
            ARCHIVED: []
        };

        if (!validTransitions[current]?.includes(next)) {
            throw new Error(`INVALID_INSTITUTION_TRANSITION: Cannot transition institution status from ${current} to ${next}`);
        }
    }

    /**
     * Validates class status transitions
     */
    validateClassStatusTransition(current: ClassStatus, next: ClassStatus): void {
        if (current === next) return;

        if (current === 'ARCHIVED') {
            throw new Error('INVALID_CLASS_TRANSITION: ARCHIVED class is immutable and cannot transition');
        }

        const validTransitions: Record<ClassStatus, ClassStatus[]> = {
            DRAFT: ['ACTIVE', 'ARCHIVED'],
            ACTIVE: ['CLOSED', 'ARCHIVED'],
            CLOSED: ['ARCHIVED'],
            ARCHIVED: []
        };

        if (!validTransitions[current]?.includes(next)) {
            throw new Error(`INVALID_CLASS_TRANSITION: Cannot transition class status from ${current} to ${next}`);
        }
    }

    /**
     * Validates organizational hierarchy to detect cycles or self-referencing
     */
    validateHierarchyNoCycle(
        unitId: string, 
        parentUnitId: string | null | undefined, 
        allUnits: OrganizationUnit[]
    ): void {
        if (!parentUnitId) return;

        if (unitId === parentUnitId) {
            throw new Error('CYCLIC_ORGANIZATION_UNIT: Organization unit cannot reference itself as parent');
        }

        let currentParentId: string | null | undefined = parentUnitId;
        const visited = new Set<string>([unitId]);

        while (currentParentId) {
            if (visited.has(currentParentId)) {
                throw new Error('CYCLIC_ORGANIZATION_UNIT: Cyclic parent-child relationship detected in organization units');
            }
            visited.add(currentParentId);
            const parentUnit = allUnits.find(u => u.organization_unit_id === currentParentId);
            if (!parentUnit) {
                break;
            }
            currentParentId = parentUnit.parent_unit_id;
        }
    }

    /**
     * Validates class capacity
     */
    validateClassCapacity(capacity: number, currentEnrollmentCount: number = 0): void {
        if (!Number.isInteger(capacity) || capacity <= 0) {
            throw new Error('INVALID_CLASS_CAPACITY: Capacity must be a positive finite integer');
        }
        if (currentEnrollmentCount >= capacity) {
            throw new Error('CLASS_CAPACITY_EXCEEDED: Class capacity has been reached');
        }
    }

    // Checksum computation helpers
    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }

    computeInstitutionChecksum(inst: Omit<Institution, 'checksum'>): string {
        const raw = `INST|${inst.institution_id}|${inst.institution_code}|${inst.institution_name}|${inst.status}|${inst.version_number}`;
        return `INST-CHK-${this.simpleHash(raw)}`;
    }

    computeOrganizationUnitChecksum(unit: Omit<OrganizationUnit, 'checksum'>): string {
        const raw = `ORG|${unit.organization_unit_id}|${unit.institution_id}|${unit.parent_unit_id || 'ROOT'}|${unit.unit_code}|${unit.unit_name}|${unit.status}|${unit.version_number}`;
        return `ORG-CHK-${this.simpleHash(raw)}`;
    }

    computeDepartmentChecksum(dept: Omit<Department, 'checksum'>): string {
        const raw = `DEPT|${dept.department_id}|${dept.institution_id}|${dept.organization_unit_id}|${dept.department_code}|${dept.department_name}|${dept.status}|${dept.version_number}`;
        return `DEPT-CHK-${this.simpleHash(raw)}`;
    }

    computeProgramChecksum(prog: Omit<Program, 'checksum'>): string {
        const raw = `PROG|${prog.program_id}|${prog.institution_id}|${prog.department_id}|${prog.program_code}|${prog.program_name}|${prog.status}|${prog.version_number}`;
        return `PROG-CHK-${this.simpleHash(raw)}`;
    }

    computeClassChecksum(schoolClass: Omit<SchoolClass, 'checksum'>): string {
        const raw = `CLASS|${schoolClass.class_id}|${schoolClass.institution_id}|${schoolClass.academic_year_id}|${schoolClass.class_code}|${schoolClass.class_name}|${schoolClass.status}|${schoolClass.capacity}|${schoolClass.version_number}`;
        return `CLASS-CHK-${this.simpleHash(raw)}`;
    }

    computePlacementChecksum(placement: Omit<StudentPlacement, 'checksum'>): string {
        const raw = `PLACE|${placement.placement_id}|${placement.institution_id}|${placement.student_id}|${placement.class_id}|${placement.status}|${placement.version_number}`;
        return `PLACE-CHK-${this.simpleHash(raw)}`;
    }

    computeAdminRoleChecksum(role: Omit<AdministrativeRoleAssignment, 'checksum'>): string {
        const raw = `ADMIN|${role.assignment_id}|${role.institution_id}|${role.user_id}|${role.role}|${role.status}|${role.version_number}`;
        return `ADMIN-CHK-${this.simpleHash(raw)}`;
    }

    computeGovernanceChecksum(settings: Omit<GovernanceSettings, 'checksum'>): string {
        const raw = `GOV|${settings.settings_id}|${settings.institution_id}|${settings.report_card_publication_mode}|${settings.transcript_generation_mode}|${settings.guardian_communication_enabled}|${settings.version_number}`;
        return `GOV-CHK-${this.simpleHash(raw)}`;
    }

    computeAuditChecksum(event: Omit<AdministrativeAuditEvent, 'checksum'>): string {
        const raw = `AUDIT|${event.audit_event_id}|${event.institution_id}|${event.entity_id}|${event.action}|${event.timestamp}`;
        return `AUD-CHK-${this.simpleHash(raw)}`;
    }
}

export const schoolAdministrationValidationEngine = new SchoolAdministrationValidationEngine();
