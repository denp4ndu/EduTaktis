import { 
    Institution, 
    InstitutionStatus, 
    SchoolInstitutionType,
    InstitutionAddress,
    InstitutionContact,
    OrganizationUnit, 
    OrganizationUnitType,
    Department, 
    Program, 
    SchoolClass, 
    ClassStatus, 
    StudentPlacement, 
    AdministrativeRoleAssignment, 
    GovernanceSettings, 
    AdministrativeAuditEvent,
    UserRole 
} from '../types/curriculum';
import { 
    SchoolAdministrationStorageProvider, 
    schoolAdministrationStorage 
} from './schoolAdministrationStorageProvider';
import { 
    SchoolAdministrationValidationEngine, 
    schoolAdministrationValidationEngine 
} from './schoolAdministrationValidationEngine';
import { 
    SchoolAdministrationRepositoryEngine, 
    schoolAdministrationRepositoryEngine 
} from './schoolAdministrationRepositoryEngine';
import { 
    AdministrativeScopeEngine, 
    administrativeScopeEngine 
} from './administrativeScopeEngine';
import { 
    ClassEnrollmentEngine 
} from './classEnrollmentEngine';

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

export class SchoolAdministrationEngine {
    constructor(
        private storage: SchoolAdministrationStorageProvider = schoolAdministrationStorage,
        private validator: SchoolAdministrationValidationEngine = schoolAdministrationValidationEngine,
        private repo: SchoolAdministrationRepositoryEngine = schoolAdministrationRepositoryEngine,
        private scopeEngine: AdministrativeScopeEngine = administrativeScopeEngine,
        private enrollmentEngine?: ClassEnrollmentEngine
    ) {}

    private async recordAudit(
        institutionId: string,
        actorId: string,
        actorRole: string,
        entityType: string,
        entityId: string,
        action: string,
        newVersion: number,
        previousVersion?: number,
        reason?: string
    ): Promise<void> {
        const now = new Date().toISOString();
        const eventId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const partial = {
            audit_event_id: eventId,
            institution_id: institutionId,
            actor_id: actorId,
            actor_role: actorRole,
            entity_type: entityType,
            entity_id: entityId,
            action,
            previous_version: previousVersion,
            new_version: newVersion,
            timestamp: now,
            revision_reason: reason
        };
        const checksum = this.validator.computeAuditChecksum(partial);
        await this.storage.saveAuditEvent(deepFreeze({ ...partial, checksum }));
    }

    // ==========================================
    // 1. INSTITUTION MANAGEMENT
    // ==========================================
    async createInstitution(params: {
        institution_code: string;
        institution_name: string;
        institution_type: SchoolInstitutionType;
        legal_name: string;
        address: InstitutionAddress;
        contact_information: InstitutionContact;
        timezone?: string;
        locale?: string;
        actor_id: string;
        actor_role: UserRole;
    }): Promise<Institution> {
        this.validator.detectSecurityLeakage(params);
        if (params.actor_role !== 'ADMIN') {
            throw new Error('UNAUTHORIZED_ADMIN_SCOPE: Only system ADMIN can create an institution');
        }

        const id = `INST-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const partial: Omit<Institution, 'checksum'> = {
            institution_id: id,
            institution_code: params.institution_code,
            institution_name: params.institution_name,
            institution_type: params.institution_type,
            legal_name: params.legal_name,
            address: params.address,
            contact_information: params.contact_information,
            timezone: params.timezone || 'Asia/Jakarta',
            locale: params.locale || 'id-ID',
            status: 'DRAFT',
            version_number: 1,
            created_at: now,
            updated_at: now
        };

        const checksum = this.validator.computeInstitutionChecksum(partial);
        const institution: Institution = deepFreeze({ ...partial, checksum });

        await this.storage.saveInstitution(institution);
        await this.storage.saveInstitutionHistory({
            entry_id: `HIST-${Date.now()}`,
            institution_id: id,
            version_number: 1,
            snapshot: institution,
            changed_by: params.actor_id,
            changed_at: now,
            reason: 'INITIAL_CREATION'
        });

        await this.recordAudit(id, params.actor_id, params.actor_role, 'INSTITUTION', id, 'INSTITUTION_CREATED', 1);

        return institution;
    }

    async updateInstitution(params: {
        institution_id: string;
        institution_name?: string;
        legal_name?: string;
        address?: InstitutionAddress;
        contact_information?: InstitutionContact;
        timezone?: string;
        locale?: string;
        actor_id: string;
        actor_role: UserRole;
        reason?: string;
    }): Promise<Institution> {
        this.validator.detectSecurityLeakage(params);
        await this.scopeEngine.validateAdministrativeScope(params.actor_id, params.actor_role, params.institution_id);

        const current = await this.repo.getInstitution(params.institution_id);
        if (!current) {
            throw new Error(`INSTITUTION_NOT_FOUND: Institution ${params.institution_id} not found`);
        }

        if (current.status === 'ARCHIVED' || current.status === 'CLOSED') {
            throw new Error(`IMMUTABLE_INSTITUTION: Cannot modify institution in status ${current.status}`);
        }

        const now = new Date().toISOString();
        const nextVersion = current.version_number + 1;

        const partial: Omit<Institution, 'checksum'> = {
            ...current,
            institution_name: params.institution_name || current.institution_name,
            legal_name: params.legal_name || current.legal_name,
            address: params.address || current.address,
            contact_information: params.contact_information || current.contact_information,
            timezone: params.timezone || current.timezone,
            locale: params.locale || current.locale,
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.validator.computeInstitutionChecksum(partial);
        const updated: Institution = deepFreeze({ ...partial, checksum });

        await this.storage.saveInstitution(updated);
        await this.storage.saveInstitutionHistory({
            entry_id: `HIST-${Date.now()}`,
            institution_id: current.institution_id,
            version_number: nextVersion,
            snapshot: updated,
            changed_by: params.actor_id,
            changed_at: now,
            reason: params.reason || 'INSTITUTION_UPDATE'
        });

        await this.recordAudit(
            current.institution_id, 
            params.actor_id, 
            params.actor_role, 
            'INSTITUTION', 
            current.institution_id, 
            'INSTITUTION_UPDATED', 
            nextVersion, 
            current.version_number, 
            params.reason
        );

        return updated;
    }

    async transitionInstitutionStatus(params: {
        institution_id: string;
        target_status: InstitutionStatus;
        actor_id: string;
        actor_role: UserRole;
        reason?: string;
    }): Promise<Institution> {
        this.validator.detectSecurityLeakage(params);
        await this.scopeEngine.validateAdministrativeScope(params.actor_id, params.actor_role, params.institution_id);

        const current = await this.repo.getInstitution(params.institution_id);
        if (!current) {
            throw new Error(`INSTITUTION_NOT_FOUND: Institution ${params.institution_id} not found`);
        }

        this.validator.validateInstitutionStatusTransition(current.status, params.target_status);

        const now = new Date().toISOString();
        const nextVersion = current.version_number + 1;

        const partial: Omit<Institution, 'checksum'> = {
            ...current,
            status: params.target_status,
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.validator.computeInstitutionChecksum(partial);
        const updated: Institution = deepFreeze({ ...partial, checksum });

        await this.storage.saveInstitution(updated);
        await this.storage.saveInstitutionHistory({
            entry_id: `HIST-${Date.now()}`,
            institution_id: current.institution_id,
            version_number: nextVersion,
            snapshot: updated,
            changed_by: params.actor_id,
            changed_at: now,
            reason: params.reason || `TRANSITION_TO_${params.target_status}`
        });

        await this.recordAudit(
            current.institution_id,
            params.actor_id,
            params.actor_role,
            'INSTITUTION',
            current.institution_id,
            `INSTITUTION_${params.target_status}`,
            nextVersion,
            current.version_number,
            params.reason
        );

        return updated;
    }

    // ==========================================
    // 2. ORGANIZATIONAL UNITS
    // ==========================================
    async createOrganizationUnit(params: {
        institution_id: string;
        parent_unit_id?: string | null;
        unit_code: string;
        unit_name: string;
        unit_type: OrganizationUnitType;
        manager_actor_id?: string;
        actor_id: string;
        actor_role: UserRole;
    }): Promise<OrganizationUnit> {
        this.validator.detectSecurityLeakage(params);
        await this.scopeEngine.validateAdministrativeScope(params.actor_id, params.actor_role, params.institution_id);

        const inst = await this.repo.getInstitution(params.institution_id);
        if (!inst || inst.status === 'ARCHIVED' || inst.status === 'CLOSED') {
            throw new Error(`INVALID_INSTITUTION_STATE: Institution is in status ${inst?.status}`);
        }

        const existingUnits = await this.repo.listOrganizationUnits(params.institution_id);
        const unitId = `ORG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        if (params.parent_unit_id) {
            const parent = existingUnits.find(u => u.organization_unit_id === params.parent_unit_id);
            if (!parent) {
                throw new Error(`PARENT_UNIT_NOT_FOUND: Parent unit ${params.parent_unit_id} does not exist`);
            }
            if (parent.status === 'ARCHIVED') {
                throw new Error('ARCHIVED_PARENT_UNIT: Cannot add child to archived parent unit');
            }
            this.validator.validateHierarchyNoCycle(unitId, params.parent_unit_id, existingUnits);
        }

        const now = new Date().toISOString();
        const partial: Omit<OrganizationUnit, 'checksum'> = {
            organization_unit_id: unitId,
            institution_id: params.institution_id,
            parent_unit_id: params.parent_unit_id || null,
            unit_code: params.unit_code,
            unit_name: params.unit_name,
            unit_type: params.unit_type,
            status: 'ACTIVE',
            manager_actor_id: params.manager_actor_id,
            version_number: 1,
            created_at: now,
            updated_at: now
        };

        const checksum = this.validator.computeOrganizationUnitChecksum(partial);
        const unit: OrganizationUnit = deepFreeze({ ...partial, checksum });

        await this.storage.saveOrganizationUnit(unit);
        await this.storage.saveOrganizationUnitHistory({
            entry_id: `HIST-${Date.now()}`,
            organization_unit_id: unitId,
            version_number: 1,
            snapshot: unit,
            changed_by: params.actor_id,
            changed_at: now,
            reason: 'INITIAL_CREATION'
        });

        await this.recordAudit(
            params.institution_id,
            params.actor_id,
            params.actor_role,
            'ORGANIZATION_UNIT',
            unitId,
            'ORGANIZATION_UNIT_CREATED',
            1
        );

        return unit;
    }

    // ==========================================
    // 3. DEPARTMENT & PROGRAM MANAGEMENT
    // ==========================================
    async createDepartment(params: {
        institution_id: string;
        organization_unit_id: string;
        department_code: string;
        department_name: string;
        head_teacher_id?: string;
        actor_id: string;
        actor_role: UserRole;
    }): Promise<Department> {
        this.validator.detectSecurityLeakage(params);
        await this.scopeEngine.validateAdministrativeScope(params.actor_id, params.actor_role, params.institution_id);

        const orgUnit = await this.repo.getOrganizationUnit(params.organization_unit_id);
        if (!orgUnit) {
            throw new Error(`ORGANIZATION_UNIT_NOT_FOUND: Unit ${params.organization_unit_id} does not exist`);
        }
        this.scopeEngine.validateInstitutionIsolation(params.institution_id, orgUnit.institution_id);

        const deptId = `DEPT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const partial: Omit<Department, 'checksum'> = {
            department_id: deptId,
            institution_id: params.institution_id,
            organization_unit_id: params.organization_unit_id,
            department_code: params.department_code,
            department_name: params.department_name,
            status: 'ACTIVE',
            head_teacher_id: params.head_teacher_id,
            version_number: 1,
            created_at: now,
            updated_at: now
        };

        const checksum = this.validator.computeDepartmentChecksum(partial);
        const dept: Department = deepFreeze({ ...partial, checksum });

        await this.storage.saveDepartment(dept);
        await this.recordAudit(
            params.institution_id,
            params.actor_id,
            params.actor_role,
            'DEPARTMENT',
            deptId,
            'DEPARTMENT_CREATED',
            1
        );

        return dept;
    }

    async createProgram(params: {
        institution_id: string;
        department_id: string;
        program_code: string;
        program_name: string;
        coordinator_actor_id?: string;
        actor_id: string;
        actor_role: UserRole;
    }): Promise<Program> {
        this.validator.detectSecurityLeakage(params);
        await this.scopeEngine.validateAdministrativeScope(params.actor_id, params.actor_role, params.institution_id);

        const dept = await this.repo.getDepartment(params.department_id);
        if (!dept) {
            throw new Error(`DEPARTMENT_NOT_FOUND: Department ${params.department_id} does not exist`);
        }
        this.scopeEngine.validateInstitutionIsolation(params.institution_id, dept.institution_id);

        const progId = `PROG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const partial: Omit<Program, 'checksum'> = {
            program_id: progId,
            institution_id: params.institution_id,
            department_id: params.department_id,
            program_code: params.program_code,
            program_name: params.program_name,
            status: 'ACTIVE',
            coordinator_actor_id: params.coordinator_actor_id,
            version_number: 1,
            created_at: now,
            updated_at: now
        };

        const checksum = this.validator.computeProgramChecksum(partial);
        const program: Program = deepFreeze({ ...partial, checksum });

        await this.storage.saveProgram(program);
        await this.recordAudit(
            params.institution_id,
            params.actor_id,
            params.actor_role,
            'PROGRAM',
            progId,
            'PROGRAM_CREATED',
            1
        );

        return program;
    }

    // ==========================================
    // 4. CLASS / HOMEROOM MANAGEMENT
    // ==========================================
    async createClass(params: {
        institution_id: string;
        academic_year_id: string;
        semester_id: string;
        class_code: string;
        class_name: string;
        grade_level: number;
        capacity: number;
        homeroom_teacher_id: string;
        program_id?: string;
        actor_id: string;
        actor_role: UserRole;
    }): Promise<SchoolClass> {
        this.validator.detectSecurityLeakage(params);
        await this.scopeEngine.validateAdministrativeScope(params.actor_id, params.actor_role, params.institution_id);
        this.validator.validateClassCapacity(params.capacity);

        if (!params.homeroom_teacher_id) {
            throw new Error('HOMEROOM_TEACHER_REQUIRED: Class must have an authorized homeroom teacher assigned');
        }

        const classId = `CLS-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const partial: Omit<SchoolClass, 'checksum'> = {
            class_id: classId,
            institution_id: params.institution_id,
            academic_year_id: params.academic_year_id,
            semester_id: params.semester_id,
            class_code: params.class_code,
            class_name: params.class_name,
            grade_level: params.grade_level,
            capacity: params.capacity,
            homeroom_teacher_id: params.homeroom_teacher_id,
            program_id: params.program_id,
            status: 'DRAFT',
            version_number: 1,
            created_at: now,
            updated_at: now
        };

        const checksum = this.validator.computeClassChecksum(partial);
        const schoolClass: SchoolClass = deepFreeze({ ...partial, checksum });

        await this.storage.saveClass(schoolClass);
        await this.storage.saveClassHistory({
            entry_id: `HIST-${Date.now()}`,
            class_id: classId,
            version_number: 1,
            snapshot: schoolClass,
            changed_by: params.actor_id,
            changed_at: now,
            reason: 'INITIAL_CREATION'
        });

        await this.recordAudit(
            params.institution_id,
            params.actor_id,
            params.actor_role,
            'CLASS',
            classId,
            'CLASS_CREATED',
            1
        );

        return schoolClass;
    }

    async transitionClassStatus(params: {
        class_id: string;
        target_status: ClassStatus;
        actor_id: string;
        actor_role: UserRole;
        reason?: string;
    }): Promise<SchoolClass> {
        this.validator.detectSecurityLeakage(params);
        const cls = await this.repo.getClass(params.class_id);
        if (!cls) {
            throw new Error(`CLASS_NOT_FOUND: Class ${params.class_id} not found`);
        }

        await this.scopeEngine.validateAdministrativeScope(params.actor_id, params.actor_role, cls.institution_id);
        this.validator.validateClassStatusTransition(cls.status, params.target_status);

        const now = new Date().toISOString();
        const nextVersion = cls.version_number + 1;

        const partial: Omit<SchoolClass, 'checksum'> = {
            ...cls,
            status: params.target_status,
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.validator.computeClassChecksum(partial);
        const updated: SchoolClass = deepFreeze({ ...partial, checksum });

        await this.storage.saveClass(updated);
        await this.storage.saveClassHistory({
            entry_id: `HIST-${Date.now()}`,
            class_id: cls.class_id,
            version_number: nextVersion,
            snapshot: updated,
            changed_by: params.actor_id,
            changed_at: now,
            reason: params.reason || `CLASS_TRANSITION_TO_${params.target_status}`
        });

        await this.recordAudit(
            cls.institution_id,
            params.actor_id,
            params.actor_role,
            'CLASS',
            cls.class_id,
            `CLASS_${params.target_status}`,
            nextVersion,
            cls.version_number,
            params.reason
        );

        return updated;
    }

    // ==========================================
    // 5. STUDENT PLACEMENT (Integrates with Phase 28 ClassEnrollmentEngine)
    // ==========================================
    async placeStudent(params: {
        institution_id: string;
        student_id: string;
        class_id: string;
        academic_year_id: string;
        actor_id: string;
        actor_role: UserRole;
        reason?: string;
    }): Promise<StudentPlacement> {
        this.validator.detectSecurityLeakage(params);
        await this.scopeEngine.validateAdministrativeScope(params.actor_id, params.actor_role, params.institution_id);

        const cls = await this.repo.getClass(params.class_id);
        if (!cls) {
            throw new Error(`CLASS_NOT_FOUND: Class ${params.class_id} not found`);
        }

        this.scopeEngine.validateInstitutionIsolation(params.institution_id, cls.institution_id);

        if (cls.status !== 'ACTIVE') {
            throw new Error(`CLASS_NOT_ACTIVE: Cannot place student into class in status ${cls.status}`);
        }

        const existingPlacement = await this.storage.getPlacementByStudentAndYear(
            params.student_id, 
            params.academic_year_id
        );
        if (existingPlacement && existingPlacement.class_id === params.class_id && existingPlacement.status === 'PLACED') {
            throw new Error('DUPLICATE_ACTIVE_PLACEMENT: Student is already placed in this class');
        }

        const currentPlaced = await this.storage.listPlacementsByClass(params.class_id);
        this.validator.validateClassCapacity(cls.capacity, currentPlaced.length);

        const placementId = `PLC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        // Integrate with Phase 28 ClassEnrollmentEngine if provided
        let enrollmentId: string | undefined;
        if (this.enrollmentEngine) {
            const enr = await this.enrollmentEngine.createEnrollment({
                student_id: params.student_id,
                course_id: `CRS-HOMEROOM-${cls.class_code}`,
                class_id: cls.class_id,
                initial_status: 'ACTIVE',
                actor_id: params.actor_id,
                actor_role: params.actor_role as any
            });
            enrollmentId = enr.enrollment_id;
        }

        const partial: Omit<StudentPlacement, 'checksum'> = {
            placement_id: placementId,
            institution_id: params.institution_id,
            student_id: params.student_id,
            class_id: params.class_id,
            academic_year_id: params.academic_year_id,
            enrollment_id: enrollmentId,
            status: 'PLACED',
            revision_reason: params.reason,
            version_number: 1,
            created_at: now,
            updated_at: now
        };

        const checksum = this.validator.computePlacementChecksum(partial);
        const placement: StudentPlacement = deepFreeze({ ...partial, checksum });

        await this.storage.saveStudentPlacement(placement);
        await this.recordAudit(
            params.institution_id,
            params.actor_id,
            params.actor_role,
            'STUDENT_PLACEMENT',
            placementId,
            'STUDENT_PLACEMENT_CREATED',
            1,
            undefined,
            params.reason
        );

        return placement;
    }

    // ==========================================
    // 6. ADMINISTRATIVE ROLE ASSIGNMENT
    // ==========================================
    async assignAdministrativeRole(params: {
        institution_id: string;
        user_id: string;
        role: UserRole;
        actor_id: string;
        actor_role: UserRole;
        expires_at?: string;
    }): Promise<AdministrativeRoleAssignment> {
        this.validator.detectSecurityLeakage(params);
        if (params.actor_role !== 'ADMIN' && params.actor_role !== 'HEADMASTER') {
            throw new Error(`UNAUTHORIZED_ADMIN_ASSIGNMENT: Role ${params.actor_role} cannot assign administrative roles`);
        }

        const assignId = `ADM-ASSIGN-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const partial: Omit<AdministrativeRoleAssignment, 'checksum'> = {
            assignment_id: assignId,
            institution_id: params.institution_id,
            user_id: params.user_id,
            role: params.role,
            status: 'ACTIVE',
            assigned_by: params.actor_id,
            assigned_at: now,
            expires_at: params.expires_at,
            version_number: 1
        };

        const checksum = this.validator.computeAdminRoleChecksum(partial);
        const assignment: AdministrativeRoleAssignment = deepFreeze({ ...partial, checksum });

        await this.storage.saveAdminRoleAssignment(assignment);
        await this.storage.saveAdminRoleHistory({
            entry_id: `HIST-${Date.now()}`,
            assignment_id: assignId,
            version_number: 1,
            snapshot: assignment,
            changed_by: params.actor_id,
            changed_at: now,
            reason: 'ROLE_ASSIGNED'
        });

        await this.recordAudit(
            params.institution_id,
            params.actor_id,
            params.actor_role,
            'ADMIN_ROLE_ASSIGNMENT',
            assignId,
            'ADMIN_ROLE_ASSIGNED',
            1
        );

        return assignment;
    }

    // ==========================================
    // 7. GOVERNANCE SETTINGS
    // ==========================================
    async updateGovernanceSettings(params: {
        institution_id: string;
        attendance_policy_ref?: string;
        grading_policy_ref?: string;
        report_card_publication_mode?: 'AUTOMATIC' | 'MANUAL_APPROVAL';
        transcript_generation_mode?: 'OFFICIAL_SEALED' | 'DRAFT_ALLOWED';
        guardian_communication_enabled?: boolean;
        notification_channels?: string[];
        actor_id: string;
        actor_role: UserRole;
    }): Promise<GovernanceSettings> {
        this.validator.detectSecurityLeakage(params);
        await this.scopeEngine.validateAdministrativeScope(params.actor_id, params.actor_role, params.institution_id);

        const current = await this.repo.getGovernanceSettings(params.institution_id);
        const now = new Date().toISOString();
        const nextVersion = (current?.version_number || 0) + 1;

        const partial: Omit<GovernanceSettings, 'checksum'> = {
            settings_id: current?.settings_id || `GOV-${params.institution_id}`,
            institution_id: params.institution_id,
            attendance_policy_ref: params.attendance_policy_ref || current?.attendance_policy_ref || 'DEFAULT_ATTENDANCE',
            grading_policy_ref: params.grading_policy_ref || current?.grading_policy_ref || 'DEFAULT_GRADING',
            report_card_publication_mode: params.report_card_publication_mode || current?.report_card_publication_mode || 'MANUAL_APPROVAL',
            transcript_generation_mode: params.transcript_generation_mode || current?.transcript_generation_mode || 'OFFICIAL_SEALED',
            guardian_communication_enabled: params.guardian_communication_enabled !== undefined 
                ? params.guardian_communication_enabled 
                : (current?.guardian_communication_enabled ?? true),
            notification_channels: params.notification_channels || current?.notification_channels || ['IN_APP'],
            version_number: nextVersion,
            updated_at: now,
            updated_by: params.actor_id
        };

        const checksum = this.validator.computeGovernanceChecksum(partial);
        const updated: GovernanceSettings = deepFreeze({ ...partial, checksum });

        await this.storage.saveGovernanceSettings(updated);
        await this.storage.saveGovernanceHistory({
            entry_id: `HIST-${Date.now()}`,
            settings_id: updated.settings_id,
            version_number: nextVersion,
            snapshot: updated,
            changed_by: params.actor_id,
            changed_at: now,
            reason: 'GOVERNANCE_SETTING_UPDATED'
        });

        await this.recordAudit(
            params.institution_id,
            params.actor_id,
            params.actor_role,
            'GOVERNANCE_SETTINGS',
            updated.settings_id,
            'GOVERNANCE_SETTING_UPDATED',
            nextVersion,
            current?.version_number
        );

        return updated;
    }
}

export const schoolAdministrationEngine = new SchoolAdministrationEngine();
