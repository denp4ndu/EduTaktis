import { 
    CoursePeriod, 
    CoursePeriodStatus, 
    CoursePeriodHistoryEntry, 
    AcademicCalendarAuditEvent 
} from '../types/curriculum';
import { 
    academicCalendarRepositoryEngine, 
    AcademicCalendarRepositoryEngine 
} from './academicCalendarRepositoryEngine';
import { 
    coursePeriodValidationEngine, 
    CoursePeriodValidationEngine 
} from './coursePeriodValidationEngine';

export interface CreateCoursePeriodParams {
    course_id: string;
    academic_year_id: string;
    semester_id: string;
    teacher_id: string;
    start_at: string;
    end_at: string;
    actor_id: string;
    actor_role: string;
    status?: CoursePeriodStatus;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
    source_references?: Record<string, unknown>;
}

export interface TransitionCoursePeriodParams {
    course_period_id: string;
    actor_id: string;
    actor_role: string;
    revision_reason?: string;
}

export class CoursePeriodEngine {
    constructor(
        private repository: AcademicCalendarRepositoryEngine = academicCalendarRepositoryEngine,
        private validator: CoursePeriodValidationEngine = coursePeriodValidationEngine
    ) {}

    private generateChecksum(data: unknown): string {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return `CP-CHK-${Math.abs(hash).toString(16)}`;
    }

    async createCoursePeriod(params: CreateCoursePeriodParams): Promise<CoursePeriod> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            course_id: params.course_id,
            academic_year_id: params.academic_year_id,
            semester_id: params.semester_id,
            teacher_id: params.teacher_id
        });

        if (params.teacher_authorized_courses) {
            this.validator.validateCoursePeriodScope(
                params.teacher_id, 
                params.course_id, 
                params.teacher_authorized_courses
            );
        }

        const parentSemester = await this.repository.getSemester(params.semester_id);
        if (!parentSemester) {
            throw new Error(`SEMESTER_NOT_FOUND: Semester ${params.semester_id} does not exist`);
        }

        if (parentSemester.academic_year_id !== params.academic_year_id) {
            throw new Error(`COURSE_PERIOD_YEAR_MISMATCH: Semester year ${parentSemester.academic_year_id} does not match ${params.academic_year_id}`);
        }

        // Check date overlap with existing active/scheduled periods for the same course in this semester
        const existingPeriods = await this.repository.listCoursePeriods({
            course_id: params.course_id,
            semester_id: params.semester_id
        });

        const newStart = new Date(params.start_at).getTime();
        const newEnd = new Date(params.end_at).getTime();

        for (const ep of existingPeriods) {
            if (ep.status === 'ARCHIVED' || ep.status === 'CLOSED') continue;
            const epStart = new Date(ep.start_at).getTime();
            const epEnd = new Date(ep.end_at).getTime();

            if ((newStart >= epStart && newStart < epEnd) || (newEnd > epStart && newEnd <= epEnd) || (newStart <= epStart && newEnd >= epEnd)) {
                throw new Error(`COURSE_PERIOD_DATE_OVERLAP: Course period [${params.start_at}, ${params.end_at}] overlaps with existing period ${ep.course_period_id} [${ep.start_at}, ${ep.end_at}]`);
            }
        }

        const now = new Date().toISOString();
        const initialStatus: CoursePeriodStatus = params.status || 'DRAFT';
        this.validator.validateCoursePeriodTransition('' as any, initialStatus);

        const periodId = `CP-${params.course_id}-${params.semester_id}-${Date.now()}`;
        const basePeriod: CoursePeriod = {
            course_period_id: periodId,
            course_id: params.course_id,
            academic_year_id: params.academic_year_id,
            semester_id: params.semester_id,
            teacher_id: params.teacher_id,
            start_at: params.start_at,
            end_at: params.end_at,
            status: initialStatus,
            version_number: 1,
            source_references: params.source_references,
            created_at: now,
            updated_at: now,
            checksum: ''
        };

        this.validator.validateCoursePeriod(basePeriod, parentSemester);

        const checksum = this.generateChecksum({
            course_period_id: basePeriod.course_period_id,
            course_id: basePeriod.course_id,
            academic_year_id: basePeriod.academic_year_id,
            semester_id: basePeriod.semester_id,
            teacher_id: basePeriod.teacher_id,
            start_at: basePeriod.start_at,
            end_at: basePeriod.end_at,
            status: basePeriod.status,
            version_number: basePeriod.version_number
        });

        const finalPeriod: CoursePeriod = {
            ...basePeriod,
            checksum
        };

        const saved = await this.repository.saveCoursePeriod(finalPeriod);

        await this.repository.recordAuditEvent({
            event_id: `AE-CP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.course_period_id,
            academic_year_id: saved.academic_year_id,
            semester_id: saved.semester_id,
            course_period_id: saved.course_period_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'COURSE_PERIOD_CREATED',
            timestamp: now,
            version_number: saved.version_number,
            checksum: saved.checksum,
            details: { course_id: saved.course_id, teacher_id: saved.teacher_id, status: saved.status }
        });

        return saved;
    }

    async scheduleCoursePeriod(params: TransitionCoursePeriodParams): Promise<CoursePeriod> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({ course_period_id: params.course_period_id });

        const period = await this.repository.getCoursePeriod(params.course_period_id);
        if (!period) {
            throw new Error(`COURSE_PERIOD_NOT_FOUND: ${params.course_period_id}`);
        }

        if (period.status === 'ARCHIVED') {
            throw new Error('TERMINAL_COURSE_PERIOD_CANNOT_TRANSITION: Archived course period cannot transition');
        }

        this.validator.validateCoursePeriodTransition(period.status, 'SCHEDULED');

        const now = new Date().toISOString();
        const nextVersion = period.version_number + 1;
        const updatedPeriod: CoursePeriod = {
            ...period,
            status: 'SCHEDULED',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            course_period_id: updatedPeriod.course_period_id,
            course_id: updatedPeriod.course_id,
            academic_year_id: updatedPeriod.academic_year_id,
            semester_id: updatedPeriod.semester_id,
            teacher_id: updatedPeriod.teacher_id,
            start_at: updatedPeriod.start_at,
            end_at: updatedPeriod.end_at,
            status: updatedPeriod.status,
            version_number: updatedPeriod.version_number
        });

        const saved = await this.repository.saveCoursePeriod({
            ...updatedPeriod,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-CP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.course_period_id,
            academic_year_id: saved.academic_year_id,
            semester_id: saved.semester_id,
            course_period_id: saved.course_period_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'COURSE_PERIOD_SCHEDULED',
            timestamp: now,
            version_number: saved.version_number,
            checksum: saved.checksum
        });

        return saved;
    }

    async activateCoursePeriod(params: TransitionCoursePeriodParams): Promise<CoursePeriod> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({ course_period_id: params.course_period_id });

        const period = await this.repository.getCoursePeriod(params.course_period_id);
        if (!period) {
            throw new Error(`COURSE_PERIOD_NOT_FOUND: ${params.course_period_id}`);
        }

        if (period.status === 'ARCHIVED') {
            throw new Error('TERMINAL_COURSE_PERIOD_CANNOT_TRANSITION: Archived course period cannot transition');
        }

        if (period.status === 'CLOSED' && !params.revision_reason) {
            throw new Error('ACADEMIC_PERIOD_REVISION_REASON_REQUIRED: Reopening a closed course period requires revision_reason');
        }

        this.validator.validateCoursePeriodTransition(period.status, 'ACTIVE');

        const now = new Date().toISOString();
        const nextVersion = period.version_number + 1;
        const updatedPeriod: CoursePeriod = {
            ...period,
            status: 'ACTIVE',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            course_period_id: updatedPeriod.course_period_id,
            course_id: updatedPeriod.course_id,
            academic_year_id: updatedPeriod.academic_year_id,
            semester_id: updatedPeriod.semester_id,
            teacher_id: updatedPeriod.teacher_id,
            start_at: updatedPeriod.start_at,
            end_at: updatedPeriod.end_at,
            status: updatedPeriod.status,
            version_number: updatedPeriod.version_number
        });

        const saved = await this.repository.saveCoursePeriod({
            ...updatedPeriod,
            checksum
        });

        if (params.revision_reason) {
            await this.repository.recordHistory({
                history_id: `HIST-CP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                course_period_id: saved.course_period_id,
                version_number: saved.version_number,
                previous_status: period.status,
                new_status: saved.status,
                revision_reason: params.revision_reason,
                actor_id: params.actor_id,
                timestamp: now,
                checksum: saved.checksum
            });
        }

        await this.repository.recordAuditEvent({
            event_id: `AE-CP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.course_period_id,
            academic_year_id: saved.academic_year_id,
            semester_id: saved.semester_id,
            course_period_id: saved.course_period_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'COURSE_PERIOD_ACTIVATED',
            timestamp: now,
            version_number: saved.version_number,
            checksum: saved.checksum
        });

        return saved;
    }

    async closeCoursePeriod(params: TransitionCoursePeriodParams): Promise<CoursePeriod> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({ course_period_id: params.course_period_id });

        const period = await this.repository.getCoursePeriod(params.course_period_id);
        if (!period) {
            throw new Error(`COURSE_PERIOD_NOT_FOUND: ${params.course_period_id}`);
        }

        if (period.status === 'ARCHIVED') {
            throw new Error('TERMINAL_COURSE_PERIOD_CANNOT_TRANSITION: Archived course period cannot transition');
        }

        this.validator.validateCoursePeriodTransition(period.status, 'CLOSED');

        const now = new Date().toISOString();
        const nextVersion = period.version_number + 1;
        const updatedPeriod: CoursePeriod = {
            ...period,
            status: 'CLOSED',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            course_period_id: updatedPeriod.course_period_id,
            course_id: updatedPeriod.course_id,
            academic_year_id: updatedPeriod.academic_year_id,
            semester_id: updatedPeriod.semester_id,
            teacher_id: updatedPeriod.teacher_id,
            start_at: updatedPeriod.start_at,
            end_at: updatedPeriod.end_at,
            status: updatedPeriod.status,
            version_number: updatedPeriod.version_number
        });

        const saved = await this.repository.saveCoursePeriod({
            ...updatedPeriod,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-CP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.course_period_id,
            academic_year_id: saved.academic_year_id,
            semester_id: saved.semester_id,
            course_period_id: saved.course_period_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'COURSE_PERIOD_CLOSED',
            timestamp: now,
            version_number: saved.version_number,
            checksum: saved.checksum
        });

        return saved;
    }

    async archiveCoursePeriod(params: TransitionCoursePeriodParams): Promise<CoursePeriod> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({ course_period_id: params.course_period_id });

        const period = await this.repository.getCoursePeriod(params.course_period_id);
        if (!period) {
            throw new Error(`COURSE_PERIOD_NOT_FOUND: ${params.course_period_id}`);
        }

        if (period.status === 'ARCHIVED') {
            throw new Error('TERMINAL_COURSE_PERIOD_CANNOT_TRANSITION: Archived course period cannot transition');
        }

        this.validator.validateCoursePeriodTransition(period.status, 'ARCHIVED');

        const now = new Date().toISOString();
        const nextVersion = period.version_number + 1;
        const updatedPeriod: CoursePeriod = {
            ...period,
            status: 'ARCHIVED',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            course_period_id: updatedPeriod.course_period_id,
            course_id: updatedPeriod.course_id,
            academic_year_id: updatedPeriod.academic_year_id,
            semester_id: updatedPeriod.semester_id,
            teacher_id: updatedPeriod.teacher_id,
            start_at: updatedPeriod.start_at,
            end_at: updatedPeriod.end_at,
            status: updatedPeriod.status,
            version_number: updatedPeriod.version_number
        });

        const saved = await this.repository.saveCoursePeriod({
            ...updatedPeriod,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-CP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.course_period_id,
            academic_year_id: saved.academic_year_id,
            semester_id: saved.semester_id,
            course_period_id: saved.course_period_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'COURSE_PERIOD_ARCHIVED',
            timestamp: now,
            version_number: saved.version_number,
            checksum: saved.checksum
        });

        return saved;
    }

    // ==========================================
    // TEMPORAL CHECKS
    // ==========================================
    async isCoursePeriodActive(course_period_id: string): Promise<boolean> {
        const period = await this.repository.getCoursePeriod(course_period_id);
        if (!period) return false;
        if (period.status !== 'ACTIVE') return false;

        const semester = await this.repository.getSemester(period.semester_id);
        if (!semester || semester.status !== 'ACTIVE') return false;

        const academicYear = await this.repository.getAcademicYear(period.academic_year_id);
        if (!academicYear || academicYear.status !== 'ACTIVE') return false;

        return true;
    }

    async validateCourseDate(date: string, course_period_id: string): Promise<boolean> {
        const period = await this.repository.getCoursePeriod(course_period_id);
        if (!period) {
            throw new Error(`COURSE_PERIOD_NOT_FOUND: ${course_period_id}`);
        }

        const dateTime = new Date(date).getTime();
        const start = new Date(period.start_at).getTime();
        const end = new Date(period.end_at).getTime();

        if (dateTime < start || dateTime > end) {
            throw new Error(`DATE_OUTSIDE_COURSE_PERIOD: Date ${date} is outside course period window [${period.start_at}, ${period.end_at}]`);
        }

        return true;
    }

    // ==========================================
    // QUERIES
    // ==========================================
    async getCoursePeriod(course_period_id: string): Promise<CoursePeriod | null> {
        return this.repository.getCoursePeriod(course_period_id);
    }

    async listCoursePeriodsForTeacher(teacher_id: string, filter?: {
        academic_year_id?: string;
        semester_id?: string;
        course_id?: string;
    }): Promise<CoursePeriod[]> {
        this.validator.validateIdentity({ teacher_id });
        return this.repository.listCoursePeriods({
            ...filter,
            teacher_id
        });
    }

    async listCoursePeriodsForStudent(enrolled_course_ids: string[], semester_id?: string): Promise<CoursePeriod[]> {
        if (!Array.isArray(enrolled_course_ids) || enrolled_course_ids.length === 0) {
            return [];
        }

        const allPeriods = await this.repository.listCoursePeriods({ semester_id });
        return allPeriods.filter(p => enrolled_course_ids.includes(p.course_id));
    }
}

export const coursePeriodEngine = new CoursePeriodEngine();
