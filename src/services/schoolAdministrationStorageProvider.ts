import { 
    Institution, 
    InstitutionHistoryEntry,
    OrganizationUnit,
    OrganizationUnitHistoryEntry,
    Department,
    DepartmentHistoryEntry,
    Program,
    ProgramHistoryEntry,
    SchoolClass,
    ClassHistoryEntry,
    StudentPlacement,
    AdministrativeRoleAssignment,
    AdministrativeRoleHistoryEntry,
    GovernanceSettings,
    GovernanceSettingHistoryEntry,
    AdministrativeAuditEvent
} from '../types/curriculum';

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

function cloneDeep<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

export interface SchoolAdministrationStorageProvider {
    saveInstitution(institution: Institution): Promise<void>;
    getInstitution(id: string): Promise<Institution | null>;
    listInstitutions(): Promise<Institution[]>;
    saveInstitutionHistory(entry: InstitutionHistoryEntry): Promise<void>;
    getInstitutionHistory(institutionId: string): Promise<InstitutionHistoryEntry[]>;

    saveOrganizationUnit(unit: OrganizationUnit): Promise<void>;
    getOrganizationUnit(id: string): Promise<OrganizationUnit | null>;
    listOrganizationUnits(institutionId: string): Promise<OrganizationUnit[]>;
    saveOrganizationUnitHistory(entry: OrganizationUnitHistoryEntry): Promise<void>;
    getOrganizationUnitHistory(unitId: string): Promise<OrganizationUnitHistoryEntry[]>;

    saveDepartment(dept: Department): Promise<void>;
    getDepartment(id: string): Promise<Department | null>;
    listDepartments(institutionId: string): Promise<Department[]>;
    saveDepartmentHistory(entry: DepartmentHistoryEntry): Promise<void>;
    getDepartmentHistory(deptId: string): Promise<DepartmentHistoryEntry[]>;

    saveProgram(prog: Program): Promise<void>;
    getProgram(id: string): Promise<Program | null>;
    listPrograms(institutionId: string): Promise<Program[]>;
    saveProgramHistory(entry: ProgramHistoryEntry): Promise<void>;
    getProgramHistory(progId: string): Promise<ProgramHistoryEntry[]>;

    saveClass(schoolClass: SchoolClass): Promise<void>;
    getClass(id: string): Promise<SchoolClass | null>;
    listClasses(institutionId: string, academicYearId?: string): Promise<SchoolClass[]>;
    saveClassHistory(entry: ClassHistoryEntry): Promise<void>;
    getClassHistory(classId: string): Promise<ClassHistoryEntry[]>;

    saveStudentPlacement(placement: StudentPlacement): Promise<void>;
    getStudentPlacement(id: string): Promise<StudentPlacement | null>;
    getPlacementByStudentAndYear(studentId: string, academicYearId: string): Promise<StudentPlacement | null>;
    listPlacementsByClass(classId: string): Promise<StudentPlacement[]>;
    listPlacementsByStudent(studentId: string): Promise<StudentPlacement[]>;

    saveAdminRoleAssignment(assignment: AdministrativeRoleAssignment): Promise<void>;
    getAdminRoleAssignment(id: string): Promise<AdministrativeRoleAssignment | null>;
    listAdminRoleAssignments(institutionId: string): Promise<AdministrativeRoleAssignment[]>;
    saveAdminRoleHistory(entry: AdministrativeRoleHistoryEntry): Promise<void>;
    getAdminRoleHistory(assignmentId: string): Promise<AdministrativeRoleHistoryEntry[]>;

    saveGovernanceSettings(settings: GovernanceSettings): Promise<void>;
    getGovernanceSettings(institutionId: string): Promise<GovernanceSettings | null>;
    saveGovernanceHistory(entry: GovernanceSettingHistoryEntry): Promise<void>;
    getGovernanceHistory(settingsId: string): Promise<GovernanceSettingHistoryEntry[]>;

    saveAuditEvent(event: AdministrativeAuditEvent): Promise<void>;
    listAuditEvents(institutionId: string): Promise<AdministrativeAuditEvent[]>;
}

export class InMemorySchoolAdministrationStorageProvider implements SchoolAdministrationStorageProvider {
    private institutions: Map<string, Institution> = new Map();
    private institutionHistory: InstitutionHistoryEntry[] = [];

    private organizationUnits: Map<string, OrganizationUnit> = new Map();
    private organizationUnitHistory: OrganizationUnitHistoryEntry[] = [];

    private departments: Map<string, Department> = new Map();
    private departmentHistory: DepartmentHistoryEntry[] = [];

    private programs: Map<string, Program> = new Map();
    private programHistory: ProgramHistoryEntry[] = [];

    private classes: Map<string, SchoolClass> = new Map();
    private classHistory: ClassHistoryEntry[] = [];

    private placements: Map<string, StudentPlacement> = new Map();

    private roleAssignments: Map<string, AdministrativeRoleAssignment> = new Map();
    private roleHistory: AdministrativeRoleHistoryEntry[] = [];

    private governanceSettings: Map<string, GovernanceSettings> = new Map();
    private governanceHistory: GovernanceSettingHistoryEntry[] = [];

    private auditEvents: AdministrativeAuditEvent[] = [];

    async saveInstitution(institution: Institution): Promise<void> {
        this.institutions.set(institution.institution_id, cloneDeep(institution));
    }

    async getInstitution(id: string): Promise<Institution | null> {
        const item = this.institutions.get(id);
        return item ? deepFreeze(cloneDeep(item)) : null;
    }

    async listInstitutions(): Promise<Institution[]> {
        return deepFreeze(Array.from(this.institutions.values()).map(cloneDeep));
    }

    async saveInstitutionHistory(entry: InstitutionHistoryEntry): Promise<void> {
        this.institutionHistory.push(cloneDeep(entry));
    }

    async getInstitutionHistory(institutionId: string): Promise<InstitutionHistoryEntry[]> {
        return deepFreeze(
            this.institutionHistory
                .filter(h => h.institution_id === institutionId)
                .map(cloneDeep)
        );
    }

    async saveOrganizationUnit(unit: OrganizationUnit): Promise<void> {
        this.organizationUnits.set(unit.organization_unit_id, cloneDeep(unit));
    }

    async getOrganizationUnit(id: string): Promise<OrganizationUnit | null> {
        const item = this.organizationUnits.get(id);
        return item ? deepFreeze(cloneDeep(item)) : null;
    }

    async listOrganizationUnits(institutionId: string): Promise<OrganizationUnit[]> {
        return deepFreeze(
            Array.from(this.organizationUnits.values())
                .filter(u => u.institution_id === institutionId)
                .map(cloneDeep)
        );
    }

    async saveOrganizationUnitHistory(entry: OrganizationUnitHistoryEntry): Promise<void> {
        this.organizationUnitHistory.push(cloneDeep(entry));
    }

    async getOrganizationUnitHistory(unitId: string): Promise<OrganizationUnitHistoryEntry[]> {
        return deepFreeze(
            this.organizationUnitHistory
                .filter(h => h.organization_unit_id === unitId)
                .map(cloneDeep)
        );
    }

    async saveDepartment(dept: Department): Promise<void> {
        this.departments.set(dept.department_id, cloneDeep(dept));
    }

    async getDepartment(id: string): Promise<Department | null> {
        const item = this.departments.get(id);
        return item ? deepFreeze(cloneDeep(item)) : null;
    }

    async listDepartments(institutionId: string): Promise<Department[]> {
        return deepFreeze(
            Array.from(this.departments.values())
                .filter(d => d.institution_id === institutionId)
                .map(cloneDeep)
        );
    }

    async saveDepartmentHistory(entry: DepartmentHistoryEntry): Promise<void> {
        this.departmentHistory.push(cloneDeep(entry));
    }

    async getDepartmentHistory(deptId: string): Promise<DepartmentHistoryEntry[]> {
        return deepFreeze(
            this.departmentHistory
                .filter(h => h.department_id === deptId)
                .map(cloneDeep)
        );
    }

    async saveProgram(prog: Program): Promise<void> {
        this.programs.set(prog.program_id, cloneDeep(prog));
    }

    async getProgram(id: string): Promise<Program | null> {
        const item = this.programs.get(id);
        return item ? deepFreeze(cloneDeep(item)) : null;
    }

    async listPrograms(institutionId: string): Promise<Program[]> {
        return deepFreeze(
            Array.from(this.programs.values())
                .filter(p => p.institution_id === institutionId)
                .map(cloneDeep)
        );
    }

    async saveProgramHistory(entry: ProgramHistoryEntry): Promise<void> {
        this.programHistory.push(cloneDeep(entry));
    }

    async getProgramHistory(progId: string): Promise<ProgramHistoryEntry[]> {
        return deepFreeze(
            this.programHistory
                .filter(h => h.program_id === progId)
                .map(cloneDeep)
        );
    }

    async saveClass(schoolClass: SchoolClass): Promise<void> {
        this.classes.set(schoolClass.class_id, cloneDeep(schoolClass));
    }

    async getClass(id: string): Promise<SchoolClass | null> {
        const item = this.classes.get(id);
        return item ? deepFreeze(cloneDeep(item)) : null;
    }

    async listClasses(institutionId: string, academicYearId?: string): Promise<SchoolClass[]> {
        return deepFreeze(
            Array.from(this.classes.values())
                .filter(c => c.institution_id === institutionId && (!academicYearId || c.academic_year_id === academicYearId))
                .map(cloneDeep)
        );
    }

    async saveClassHistory(entry: ClassHistoryEntry): Promise<void> {
        this.classHistory.push(cloneDeep(entry));
    }

    async getClassHistory(classId: string): Promise<ClassHistoryEntry[]> {
        return deepFreeze(
            this.classHistory
                .filter(h => h.class_id === classId)
                .map(cloneDeep)
        );
    }

    async saveStudentPlacement(placement: StudentPlacement): Promise<void> {
        this.placements.set(placement.placement_id, cloneDeep(placement));
    }

    async getStudentPlacement(id: string): Promise<StudentPlacement | null> {
        const item = this.placements.get(id);
        return item ? deepFreeze(cloneDeep(item)) : null;
    }

    async getPlacementByStudentAndYear(studentId: string, academicYearId: string): Promise<StudentPlacement | null> {
        const found = Array.from(this.placements.values())
            .find(p => p.student_id === studentId && p.academic_year_id === academicYearId && p.status === 'PLACED');
        return found ? deepFreeze(cloneDeep(found)) : null;
    }

    async listPlacementsByClass(classId: string): Promise<StudentPlacement[]> {
        return deepFreeze(
            Array.from(this.placements.values())
                .filter(p => p.class_id === classId && p.status === 'PLACED')
                .map(cloneDeep)
        );
    }

    async listPlacementsByStudent(studentId: string): Promise<StudentPlacement[]> {
        return deepFreeze(
            Array.from(this.placements.values())
                .filter(p => p.student_id === studentId)
                .map(cloneDeep)
        );
    }

    async saveAdminRoleAssignment(assignment: AdministrativeRoleAssignment): Promise<void> {
        this.roleAssignments.set(assignment.assignment_id, cloneDeep(assignment));
    }

    async getAdminRoleAssignment(id: string): Promise<AdministrativeRoleAssignment | null> {
        const item = this.roleAssignments.get(id);
        return item ? deepFreeze(cloneDeep(item)) : null;
    }

    async listAdminRoleAssignments(institutionId: string): Promise<AdministrativeRoleAssignment[]> {
        return deepFreeze(
            Array.from(this.roleAssignments.values())
                .filter(a => a.institution_id === institutionId)
                .map(cloneDeep)
        );
    }

    async saveAdminRoleHistory(entry: AdministrativeRoleHistoryEntry): Promise<void> {
        this.roleHistory.push(cloneDeep(entry));
    }

    async getAdminRoleHistory(assignmentId: string): Promise<AdministrativeRoleHistoryEntry[]> {
        return deepFreeze(
            this.roleHistory
                .filter(h => h.assignment_id === assignmentId)
                .map(cloneDeep)
        );
    }

    async saveGovernanceSettings(settings: GovernanceSettings): Promise<void> {
        this.governanceSettings.set(settings.institution_id, cloneDeep(settings));
    }

    async getGovernanceSettings(institutionId: string): Promise<GovernanceSettings | null> {
        const item = this.governanceSettings.get(institutionId);
        return item ? deepFreeze(cloneDeep(item)) : null;
    }

    async saveGovernanceHistory(entry: GovernanceSettingHistoryEntry): Promise<void> {
        this.governanceHistory.push(cloneDeep(entry));
    }

    async getGovernanceHistory(settingsId: string): Promise<GovernanceSettingHistoryEntry[]> {
        return deepFreeze(
            this.governanceHistory
                .filter(h => h.settings_id === settingsId)
                .map(cloneDeep)
        );
    }

    async saveAuditEvent(event: AdministrativeAuditEvent): Promise<void> {
        this.auditEvents.push(cloneDeep(event));
    }

    async listAuditEvents(institutionId: string): Promise<AdministrativeAuditEvent[]> {
        return deepFreeze(
            this.auditEvents
                .filter(e => e.institution_id === institutionId)
                .map(cloneDeep)
        );
    }
}

export const schoolAdministrationStorage = new InMemorySchoolAdministrationStorageProvider();
