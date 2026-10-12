import { 
    Institution, 
    OrganizationUnit, 
    Department, 
    Program, 
    SchoolClass, 
    StudentPlacement, 
    AdministrativeRoleAssignment, 
    GovernanceSettings, 
    AdministrativeAuditEvent,
    AdministrativeDashboard,
    InstitutionHistoryEntry,
    OrganizationUnitHistoryEntry,
    DepartmentHistoryEntry,
    ProgramHistoryEntry,
    ClassHistoryEntry,
    AdministrativeRoleHistoryEntry,
    GovernanceSettingHistoryEntry
} from '../types/curriculum';
import { 
    SchoolAdministrationStorageProvider, 
    schoolAdministrationStorage 
} from './schoolAdministrationStorageProvider';
import { 
    SchoolAdministrationValidationEngine, 
    schoolAdministrationValidationEngine 
} from './schoolAdministrationValidationEngine';

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

export class SchoolAdministrationRepositoryEngine {
    constructor(
        private storage: SchoolAdministrationStorageProvider = schoolAdministrationStorage,
        private validator: SchoolAdministrationValidationEngine = schoolAdministrationValidationEngine
    ) {}

    async getInstitution(id: string): Promise<Institution | null> {
        const inst = await this.storage.getInstitution(id);
        if (!inst) return null;

        const expectedChecksum = this.validator.computeInstitutionChecksum(inst);
        if (inst.checksum !== expectedChecksum) {
            throw new Error(`INSTITUTION_CHECKSUM_MISMATCH: Integrity check failed for institution ${id}`);
        }
        return deepFreeze(inst);
    }

    async listInstitutions(): Promise<Institution[]> {
        const list = await this.storage.listInstitutions();
        for (const inst of list) {
            const expectedChecksum = this.validator.computeInstitutionChecksum(inst);
            if (inst.checksum !== expectedChecksum) {
                throw new Error(`INSTITUTION_CHECKSUM_MISMATCH: Integrity check failed for institution ${inst.institution_id}`);
            }
        }
        return deepFreeze(list);
    }

    async getInstitutionHistory(institutionId: string): Promise<InstitutionHistoryEntry[]> {
        return this.storage.getInstitutionHistory(institutionId);
    }

    async getOrganizationUnit(id: string): Promise<OrganizationUnit | null> {
        const unit = await this.storage.getOrganizationUnit(id);
        if (!unit) return null;

        const expectedChecksum = this.validator.computeOrganizationUnitChecksum(unit);
        if (unit.checksum !== expectedChecksum) {
            throw new Error(`ORGANIZATION_UNIT_CHECKSUM_MISMATCH: Integrity check failed for unit ${id}`);
        }
        return deepFreeze(unit);
    }

    async listOrganizationUnits(institutionId: string): Promise<OrganizationUnit[]> {
        const list = await this.storage.listOrganizationUnits(institutionId);
        for (const unit of list) {
            const expectedChecksum = this.validator.computeOrganizationUnitChecksum(unit);
            if (unit.checksum !== expectedChecksum) {
                throw new Error(`ORGANIZATION_UNIT_CHECKSUM_MISMATCH: Integrity check failed for unit ${unit.organization_unit_id}`);
            }
        }
        return deepFreeze(list);
    }

    async getOrganizationUnitHistory(unitId: string): Promise<OrganizationUnitHistoryEntry[]> {
        return this.storage.getOrganizationUnitHistory(unitId);
    }

    async getDepartment(id: string): Promise<Department | null> {
        const dept = await this.storage.getDepartment(id);
        if (!dept) return null;

        const expectedChecksum = this.validator.computeDepartmentChecksum(dept);
        if (dept.checksum !== expectedChecksum) {
            throw new Error(`DEPARTMENT_CHECKSUM_MISMATCH: Integrity check failed for department ${id}`);
        }
        return deepFreeze(dept);
    }

    async listDepartments(institutionId: string): Promise<Department[]> {
        const list = await this.storage.listDepartments(institutionId);
        for (const dept of list) {
            const expectedChecksum = this.validator.computeDepartmentChecksum(dept);
            if (dept.checksum !== expectedChecksum) {
                throw new Error(`DEPARTMENT_CHECKSUM_MISMATCH: Integrity check failed for department ${dept.department_id}`);
            }
        }
        return deepFreeze(list);
    }

    async getDepartmentHistory(deptId: string): Promise<DepartmentHistoryEntry[]> {
        return this.storage.getDepartmentHistory(deptId);
    }

    async getProgram(id: string): Promise<Program | null> {
        const prog = await this.storage.getProgram(id);
        if (!prog) return null;

        const expectedChecksum = this.validator.computeProgramChecksum(prog);
        if (prog.checksum !== expectedChecksum) {
            throw new Error(`PROGRAM_CHECKSUM_MISMATCH: Integrity check failed for program ${id}`);
        }
        return deepFreeze(prog);
    }

    async listPrograms(institutionId: string): Promise<Program[]> {
        const list = await this.storage.listPrograms(institutionId);
        for (const prog of list) {
            const expectedChecksum = this.validator.computeProgramChecksum(prog);
            if (prog.checksum !== expectedChecksum) {
                throw new Error(`PROGRAM_CHECKSUM_MISMATCH: Integrity check failed for program ${prog.program_id}`);
            }
        }
        return deepFreeze(list);
    }

    async getProgramHistory(progId: string): Promise<ProgramHistoryEntry[]> {
        return this.storage.getProgramHistory(progId);
    }

    async getClass(id: string): Promise<SchoolClass | null> {
        const cls = await this.storage.getClass(id);
        if (!cls) return null;

        const expectedChecksum = this.validator.computeClassChecksum(cls);
        if (cls.checksum !== expectedChecksum) {
            throw new Error(`CLASS_CHECKSUM_MISMATCH: Integrity check failed for class ${id}`);
        }
        return deepFreeze(cls);
    }

    async listClasses(institutionId: string, academicYearId?: string): Promise<SchoolClass[]> {
        const list = await this.storage.listClasses(institutionId, academicYearId);
        for (const cls of list) {
            const expectedChecksum = this.validator.computeClassChecksum(cls);
            if (cls.checksum !== expectedChecksum) {
                throw new Error(`CLASS_CHECKSUM_MISMATCH: Integrity check failed for class ${cls.class_id}`);
            }
        }
        return deepFreeze(list);
    }

    async getClassHistory(classId: string): Promise<ClassHistoryEntry[]> {
        return this.storage.getClassHistory(classId);
    }

    async getStudentPlacement(id: string): Promise<StudentPlacement | null> {
        const placement = await this.storage.getStudentPlacement(id);
        if (!placement) return null;

        const expectedChecksum = this.validator.computePlacementChecksum(placement);
        if (placement.checksum !== expectedChecksum) {
            throw new Error(`PLACEMENT_CHECKSUM_MISMATCH: Integrity check failed for placement ${id}`);
        }
        return deepFreeze(placement);
    }

    async getPlacementByStudentAndYear(studentId: string, academicYearId: string): Promise<StudentPlacement | null> {
        return this.storage.getPlacementByStudentAndYear(studentId, academicYearId);
    }

    async listPlacementsByClass(classId: string): Promise<StudentPlacement[]> {
        return this.storage.listPlacementsByClass(classId);
    }

    async listPlacementsByStudent(studentId: string): Promise<StudentPlacement[]> {
        return this.storage.listPlacementsByStudent(studentId);
    }

    async getAdminRoleAssignment(id: string): Promise<AdministrativeRoleAssignment | null> {
        const role = await this.storage.getAdminRoleAssignment(id);
        if (!role) return null;

        const expectedChecksum = this.validator.computeAdminRoleChecksum(role);
        if (role.checksum !== expectedChecksum) {
            throw new Error(`ADMIN_ROLE_CHECKSUM_MISMATCH: Integrity check failed for role assignment ${id}`);
        }
        return deepFreeze(role);
    }

    async listAdminRoleAssignments(institutionId: string): Promise<AdministrativeRoleAssignment[]> {
        return this.storage.listAdminRoleAssignments(institutionId);
    }

    async getAdminRoleHistory(assignmentId: string): Promise<AdministrativeRoleHistoryEntry[]> {
        return this.storage.getAdminRoleHistory(assignmentId);
    }

    async getGovernanceSettings(institutionId: string): Promise<GovernanceSettings | null> {
        const settings = await this.storage.getGovernanceSettings(institutionId);
        if (!settings) return null;

        const expectedChecksum = this.validator.computeGovernanceChecksum(settings);
        if (settings.checksum !== expectedChecksum) {
            throw new Error(`GOVERNANCE_CHECKSUM_MISMATCH: Integrity check failed for governance settings ${institutionId}`);
        }
        return deepFreeze(settings);
    }

    async getGovernanceHistory(settingsId: string): Promise<GovernanceSettingHistoryEntry[]> {
        return this.storage.getGovernanceHistory(settingsId);
    }

    async listAuditEvents(institutionId: string): Promise<AdministrativeAuditEvent[]> {
        return this.storage.listAuditEvents(institutionId);
    }

    async getAdministrativeDashboard(institutionId: string): Promise<AdministrativeDashboard> {
        const institution = await this.getInstitution(institutionId);
        if (!institution) {
            throw new Error(`INSTITUTION_NOT_FOUND: Institution ${institutionId} does not exist`);
        }

        const orgUnits = await this.listOrganizationUnits(institutionId);
        const departments = await this.listDepartments(institutionId);
        const programs = await this.listPrograms(institutionId);
        const classes = await this.listClasses(institutionId);
        
        let totalPlaced = 0;
        for (const cls of classes) {
            const placedInClass = await this.storage.listPlacementsByClass(cls.class_id);
            totalPlaced += placedInClass.length;
        }

        let governance = await this.getGovernanceSettings(institutionId);
        if (!governance) {
            governance = {
                settings_id: `GOV-${institutionId}`,
                institution_id: institutionId,
                attendance_policy_ref: 'DEFAULT_ATTENDANCE_POLICY',
                grading_policy_ref: 'DEFAULT_GRADING_POLICY',
                report_card_publication_mode: 'MANUAL_APPROVAL',
                transcript_generation_mode: 'OFFICIAL_SEALED',
                guardian_communication_enabled: true,
                notification_channels: ['IN_APP', 'EMAIL'],
                version_number: 1,
                checksum: `GOV-CHK-${Date.now()}`,
                updated_at: new Date().toISOString(),
                updated_by: 'SYSTEM'
            };
        }

        return deepFreeze({
            institution,
            total_organization_units: orgUnits.length,
            total_departments: departments.length,
            total_programs: programs.length,
            total_classes: classes.length,
            total_active_students_placed: totalPlaced,
            governance
        });
    }
}

export const schoolAdministrationRepositoryEngine = new SchoolAdministrationRepositoryEngine();
