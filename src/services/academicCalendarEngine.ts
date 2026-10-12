import { 
    AcademicYear, 
    AcademicYearStatus, 
    Semester, 
    SemesterStatus, 
    AcademicCalendar, 
    AcademicCalendarEvent, 
    AcademicCalendarEventType, 
    CalendarStatus, 
    CoursePeriod, 
    AcademicPeriodScope, 
    AcademicCalendarAuditEvent, 
    AcademicPeriodHistoryEntry 
} from '../types/curriculum';
import { 
    academicCalendarRepositoryEngine, 
    AcademicCalendarRepositoryEngine 
} from './academicCalendarRepositoryEngine';
import { 
    academicCalendarValidationEngine, 
    AcademicCalendarValidationEngine 
} from './academicCalendarValidationEngine';

export interface CreateAcademicYearParams {
    code: string;
    label: string;
    start_at: string;
    end_at: string;
    actor_id: string;
    actor_role: string;
    status?: AcademicYearStatus;
}

export interface TransitionAcademicYearParams {
    academic_year_id: string;
    actor_id: string;
    actor_role: string;
    revision_reason?: string;
}

export interface CreateSemesterParams {
    academic_year_id: string;
    code: string;
    label: string;
    sequence: number;
    start_at: string;
    end_at: string;
    actor_id: string;
    actor_role: string;
    status?: SemesterStatus;
}

export interface TransitionSemesterParams {
    semester_id: string;
    actor_id: string;
    actor_role: string;
    revision_reason?: string;
}

export interface CreateCalendarParams {
    academic_year_id: string;
    semester_id: string;
    events?: AcademicCalendarEvent[];
    actor_id: string;
    actor_role: string;
    status?: CalendarStatus;
}

export interface AddCalendarEventParams {
    calendar_id: string;
    type: AcademicCalendarEventType;
    title: string;
    description?: string;
    start_at: string;
    end_at: string;
    all_day?: boolean;
    course_id?: string;
    actor_id: string;
    actor_role: string;
}

export interface TransitionCalendarParams {
    calendar_id: string;
    actor_id: string;
    actor_role: string;
}

export interface GetStudentCalendarParams {
    authenticated_student_id: string;
    student_id: string;
    semester_id?: string;
    academic_year_id?: string;
}

export interface GetTeacherCalendarParams {
    teacher_id: string;
    course_id?: string;
    semester_id?: string;
    academic_year_id?: string;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
}

export class AcademicCalendarEngine {
    constructor(
        private repository: AcademicCalendarRepositoryEngine = academicCalendarRepositoryEngine,
        private validator: AcademicCalendarValidationEngine = academicCalendarValidationEngine
    ) {}

    private generateChecksum(data: unknown): string {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return `CAL-CHK-${Math.abs(hash).toString(16)}`;
    }

    // ==========================================
    // 1. ACADEMIC YEAR LIFECYCLE
    // ==========================================
    async createAcademicYear(params: CreateAcademicYearParams): Promise<AcademicYear> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            code: params.code,
            label: params.label
        });
        this.validator.validateDateRange(params.start_at, params.end_at, 'INVALID_ACADEMIC_YEAR_DATE_RANGE');

        const existing = await this.repository.getAcademicYearByCode(params.code);
        if (existing) {
            throw new Error(`DUPLICATE_ACADEMIC_YEAR: Academic year with code '${params.code}' already exists`);
        }

        const now = new Date().toISOString();
        const initialStatus: AcademicYearStatus = params.status || 'DRAFT';
        this.validator.validateAcademicYearTransition('' as any, initialStatus);

        const yearId = `AY-${params.code.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;
        const baseYear: AcademicYear = {
            academic_year_id: yearId,
            code: params.code,
            label: params.label,
            start_at: params.start_at,
            end_at: params.end_at,
            status: initialStatus,
            version_number: 1,
            created_at: now,
            updated_at: now,
            checksum: ''
        };

        const checksum = this.generateChecksum({
            academic_year_id: baseYear.academic_year_id,
            code: baseYear.code,
            start_at: baseYear.start_at,
            end_at: baseYear.end_at,
            status: baseYear.status,
            version_number: baseYear.version_number
        });

        const finalYear: AcademicYear = {
            ...baseYear,
            checksum
        };

        this.validator.validateAcademicYear(finalYear);
        const saved = await this.repository.saveAcademicYear(finalYear);

        await this.repository.recordAuditEvent({
            event_id: `AE-CAL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.academic_year_id,
            academic_year_id: saved.academic_year_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'ACADEMIC_YEAR_CREATED',
            timestamp: now,
            version_number: saved.version_number,
            checksum: saved.checksum,
            details: { code: saved.code, status: saved.status }
        });

        return saved;
    }

    async activateAcademicYear(params: TransitionAcademicYearParams): Promise<AcademicYear> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({ academic_year_id: params.academic_year_id });

        const year = await this.repository.getAcademicYear(params.academic_year_id);
        if (!year) {
            throw new Error(`ACADEMIC_YEAR_NOT_FOUND: ${params.academic_year_id}`);
        }

        if (year.status === 'ARCHIVED') {
            throw new Error('TERMINAL_ACADEMIC_YEAR_CANNOT_TRANSITION: Archived academic years cannot transition');
        }

        if (year.status === 'CLOSED' && !params.revision_reason) {
            throw new Error('ACADEMIC_PERIOD_REVISION_REASON_REQUIRED: Reopening a closed academic year requires revision_reason');
        }

        this.validator.validateAcademicYearTransition(year.status, 'ACTIVE');

        const now = new Date().toISOString();
        const nextVersion = year.version_number + 1;
        const updatedYear: AcademicYear = {
            ...year,
            status: 'ACTIVE',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            academic_year_id: updatedYear.academic_year_id,
            code: updatedYear.code,
            start_at: updatedYear.start_at,
            end_at: updatedYear.end_at,
            status: updatedYear.status,
            version_number: updatedYear.version_number
        });

        const saved = await this.repository.saveAcademicYear({
            ...updatedYear,
            checksum
        });

        if (params.revision_reason) {
            await this.repository.recordHistory({
                history_id: `HIST-AY-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                entity_id: saved.academic_year_id,
                entity_type: 'ACADEMIC_YEAR',
                version_number: saved.version_number,
                previous_status: year.status,
                new_status: saved.status,
                revision_reason: params.revision_reason,
                actor_id: params.actor_id,
                timestamp: now,
                checksum: saved.checksum
            });
        }

        await this.repository.recordAuditEvent({
            event_id: `AE-CAL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.academic_year_id,
            academic_year_id: saved.academic_year_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'ACADEMIC_YEAR_ACTIVATED',
            timestamp: now,
            version_number: saved.version_number,
            checksum: saved.checksum
        });

        return saved;
    }

    async closeAcademicYear(params: TransitionAcademicYearParams): Promise<AcademicYear> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({ academic_year_id: params.academic_year_id });

        const year = await this.repository.getAcademicYear(params.academic_year_id);
        if (!year) {
            throw new Error(`ACADEMIC_YEAR_NOT_FOUND: ${params.academic_year_id}`);
        }

        if (year.status === 'ARCHIVED') {
            throw new Error('TERMINAL_ACADEMIC_YEAR_CANNOT_TRANSITION: Archived academic years cannot transition');
        }

        this.validator.validateAcademicYearTransition(year.status, 'CLOSED');

        const now = new Date().toISOString();
        const nextVersion = year.version_number + 1;
        const updatedYear: AcademicYear = {
            ...year,
            status: 'CLOSED',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            academic_year_id: updatedYear.academic_year_id,
            code: updatedYear.code,
            start_at: updatedYear.start_at,
            end_at: updatedYear.end_at,
            status: updatedYear.status,
            version_number: updatedYear.version_number
        });

        const saved = await this.repository.saveAcademicYear({
            ...updatedYear,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-CAL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.academic_year_id,
            academic_year_id: saved.academic_year_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'ACADEMIC_YEAR_CLOSED',
            timestamp: now,
            version_number: saved.version_number,
            checksum: saved.checksum
        });

        return saved;
    }

    async archiveAcademicYear(params: TransitionAcademicYearParams): Promise<AcademicYear> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({ academic_year_id: params.academic_year_id });

        const year = await this.repository.getAcademicYear(params.academic_year_id);
        if (!year) {
            throw new Error(`ACADEMIC_YEAR_NOT_FOUND: ${params.academic_year_id}`);
        }

        if (year.status === 'ARCHIVED') {
            throw new Error('TERMINAL_ACADEMIC_YEAR_CANNOT_TRANSITION: Archived academic years cannot transition');
        }

        this.validator.validateAcademicYearTransition(year.status, 'ARCHIVED');

        const now = new Date().toISOString();
        const nextVersion = year.version_number + 1;
        const updatedYear: AcademicYear = {
            ...year,
            status: 'ARCHIVED',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            academic_year_id: updatedYear.academic_year_id,
            code: updatedYear.code,
            start_at: updatedYear.start_at,
            end_at: updatedYear.end_at,
            status: updatedYear.status,
            version_number: updatedYear.version_number
        });

        const saved = await this.repository.saveAcademicYear({
            ...updatedYear,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-CAL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.academic_year_id,
            academic_year_id: saved.academic_year_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'ACADEMIC_YEAR_ARCHIVED',
            timestamp: now,
            version_number: saved.version_number,
            checksum: saved.checksum
        });

        return saved;
    }

    // ==========================================
    // 2. SEMESTER LIFECYCLE
    // ==========================================
    async createSemester(params: CreateSemesterParams): Promise<Semester> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            academic_year_id: params.academic_year_id,
            code: params.code,
            label: params.label
        });
        this.validator.validateDateRange(params.start_at, params.end_at, 'INVALID_SEMESTER_DATE_RANGE');

        const parentYear = await this.repository.getAcademicYear(params.academic_year_id);
        if (!parentYear) {
            throw new Error(`ACADEMIC_YEAR_NOT_FOUND: Academic year ${params.academic_year_id} does not exist`);
        }

        // Check date overlap with existing non-archived semesters in same academic year
        const existingSemesters = await this.repository.listSemesters(params.academic_year_id);
        const newStart = new Date(params.start_at).getTime();
        const newEnd = new Date(params.end_at).getTime();

        for (const existing of existingSemesters) {
            if (existing.status === 'ARCHIVED') continue;
            const exStart = new Date(existing.start_at).getTime();
            const exEnd = new Date(existing.end_at).getTime();

            if ((newStart >= exStart && newStart < exEnd) || (newEnd > exStart && newEnd <= exEnd) || (newStart <= exStart && newEnd >= exEnd)) {
                throw new Error(`SEMESTER_DATE_OVERLAP: Semester dates [${params.start_at}, ${params.end_at}] overlap with existing semester ${existing.code} [${existing.start_at}, ${existing.end_at}]`);
            }
        }

        const now = new Date().toISOString();
        const initialStatus: SemesterStatus = params.status || 'DRAFT';
        this.validator.validateSemesterTransition('' as any, initialStatus);

        const semesterId = `SEM-${params.academic_year_id}-${params.code}-${Date.now()}`;
        const baseSemester: Semester = {
            semester_id: semesterId,
            academic_year_id: params.academic_year_id,
            code: params.code,
            label: params.label,
            sequence: params.sequence,
            start_at: params.start_at,
            end_at: params.end_at,
            status: initialStatus,
            version_number: 1,
            created_at: now,
            updated_at: now,
            checksum: ''
        };

        this.validator.validateSemester(baseSemester, parentYear);

        const checksum = this.generateChecksum({
            semester_id: baseSemester.semester_id,
            academic_year_id: baseSemester.academic_year_id,
            code: baseSemester.code,
            sequence: baseSemester.sequence,
            start_at: baseSemester.start_at,
            end_at: baseSemester.end_at,
            status: baseSemester.status,
            version_number: baseSemester.version_number
        });

        const finalSemester: Semester = {
            ...baseSemester,
            checksum
        };

        const saved = await this.repository.saveSemester(finalSemester);

        await this.repository.recordAuditEvent({
            event_id: `AE-CAL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.semester_id,
            academic_year_id: saved.academic_year_id,
            semester_id: saved.semester_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'SEMESTER_CREATED',
            timestamp: now,
            version_number: saved.version_number,
            checksum: saved.checksum,
            details: { code: saved.code, sequence: saved.sequence, status: saved.status }
        });

        return saved;
    }

    async activateSemester(params: TransitionSemesterParams): Promise<Semester> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({ semester_id: params.semester_id });

        const semester = await this.repository.getSemester(params.semester_id);
        if (!semester) {
            throw new Error(`SEMESTER_NOT_FOUND: ${params.semester_id}`);
        }

        if (semester.status === 'ARCHIVED') {
            throw new Error('TERMINAL_SEMESTER_CANNOT_TRANSITION: Archived semester cannot transition');
        }

        if (semester.status === 'CLOSED' && !params.revision_reason) {
            throw new Error('ACADEMIC_PERIOD_REVISION_REASON_REQUIRED: Reopening a closed semester requires revision_reason');
        }

        this.validator.validateSemesterTransition(semester.status, 'ACTIVE');

        const now = new Date().toISOString();
        const nextVersion = semester.version_number + 1;
        const updatedSemester: Semester = {
            ...semester,
            status: 'ACTIVE',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            semester_id: updatedSemester.semester_id,
            academic_year_id: updatedSemester.academic_year_id,
            code: updatedSemester.code,
            sequence: updatedSemester.sequence,
            start_at: updatedSemester.start_at,
            end_at: updatedSemester.end_at,
            status: updatedSemester.status,
            version_number: updatedSemester.version_number
        });

        const saved = await this.repository.saveSemester({
            ...updatedSemester,
            checksum
        });

        if (params.revision_reason) {
            await this.repository.recordHistory({
                history_id: `HIST-SEM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                entity_id: saved.semester_id,
                entity_type: 'SEMESTER',
                version_number: saved.version_number,
                previous_status: semester.status,
                new_status: saved.status,
                revision_reason: params.revision_reason,
                actor_id: params.actor_id,
                timestamp: now,
                checksum: saved.checksum
            });
        }

        await this.repository.recordAuditEvent({
            event_id: `AE-CAL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.semester_id,
            academic_year_id: saved.academic_year_id,
            semester_id: saved.semester_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'SEMESTER_ACTIVATED',
            timestamp: now,
            version_number: saved.version_number,
            checksum: saved.checksum
        });

        return saved;
    }

    async closeSemester(params: TransitionSemesterParams): Promise<Semester> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({ semester_id: params.semester_id });

        const semester = await this.repository.getSemester(params.semester_id);
        if (!semester) {
            throw new Error(`SEMESTER_NOT_FOUND: ${params.semester_id}`);
        }

        if (semester.status === 'ARCHIVED') {
            throw new Error('TERMINAL_SEMESTER_CANNOT_TRANSITION: Archived semester cannot transition');
        }

        this.validator.validateSemesterTransition(semester.status, 'CLOSED');

        const now = new Date().toISOString();
        const nextVersion = semester.version_number + 1;
        const updatedSemester: Semester = {
            ...semester,
            status: 'CLOSED',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            semester_id: updatedSemester.semester_id,
            academic_year_id: updatedSemester.academic_year_id,
            code: updatedSemester.code,
            sequence: updatedSemester.sequence,
            start_at: updatedSemester.start_at,
            end_at: updatedSemester.end_at,
            status: updatedSemester.status,
            version_number: updatedSemester.version_number
        });

        const saved = await this.repository.saveSemester({
            ...updatedSemester,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-CAL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.semester_id,
            academic_year_id: saved.academic_year_id,
            semester_id: saved.semester_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'SEMESTER_CLOSED',
            timestamp: now,
            version_number: saved.version_number,
            checksum: saved.checksum
        });

        return saved;
    }

    async archiveSemester(params: TransitionSemesterParams): Promise<Semester> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({ semester_id: params.semester_id });

        const semester = await this.repository.getSemester(params.semester_id);
        if (!semester) {
            throw new Error(`SEMESTER_NOT_FOUND: ${params.semester_id}`);
        }

        if (semester.status === 'ARCHIVED') {
            throw new Error('TERMINAL_SEMESTER_CANNOT_TRANSITION: Archived semester cannot transition');
        }

        this.validator.validateSemesterTransition(semester.status, 'ARCHIVED');

        const now = new Date().toISOString();
        const nextVersion = semester.version_number + 1;
        const updatedSemester: Semester = {
            ...semester,
            status: 'ARCHIVED',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            semester_id: updatedSemester.semester_id,
            academic_year_id: updatedSemester.academic_year_id,
            code: updatedSemester.code,
            sequence: updatedSemester.sequence,
            start_at: updatedSemester.start_at,
            end_at: updatedSemester.end_at,
            status: updatedSemester.status,
            version_number: updatedSemester.version_number
        });

        const saved = await this.repository.saveSemester({
            ...updatedSemester,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-CAL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.semester_id,
            academic_year_id: saved.academic_year_id,
            semester_id: saved.semester_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'SEMESTER_ARCHIVED',
            timestamp: now,
            version_number: saved.version_number,
            checksum: saved.checksum
        });

        return saved;
    }

    // ==========================================
    // 3. ACADEMIC CALENDAR & EVENTS
    // ==========================================
    async createCalendar(params: CreateCalendarParams): Promise<AcademicCalendar> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            academic_year_id: params.academic_year_id,
            semester_id: params.semester_id
        });

        const parentSemester = await this.repository.getSemester(params.semester_id);
        if (!parentSemester) {
            throw new Error(`SEMESTER_NOT_FOUND: Semester ${params.semester_id} does not exist`);
        }

        if (parentSemester.academic_year_id !== params.academic_year_id) {
            throw new Error(`CALENDAR_ACADEMIC_YEAR_MISMATCH: Semester year ${parentSemester.academic_year_id} does not match ${params.academic_year_id}`);
        }

        const now = new Date().toISOString();
        const initialStatus: CalendarStatus = params.status || 'DRAFT';
        this.validator.validateCalendarTransition('' as any, initialStatus);

        const calendarId = `CAL-${params.semester_id}-${Date.now()}`;
        const baseCalendar: AcademicCalendar = {
            calendar_id: calendarId,
            academic_year_id: params.academic_year_id,
            semester_id: params.semester_id,
            events: params.events || [],
            version_number: 1,
            status: initialStatus,
            created_at: now,
            updated_at: now,
            checksum: ''
        };

        this.validator.validateCalendar(baseCalendar, parentSemester);

        const checksum = this.generateChecksum({
            calendar_id: baseCalendar.calendar_id,
            academic_year_id: baseCalendar.academic_year_id,
            semester_id: baseCalendar.semester_id,
            events: baseCalendar.events,
            status: baseCalendar.status,
            version_number: baseCalendar.version_number
        });

        const finalCalendar: AcademicCalendar = {
            ...baseCalendar,
            checksum
        };

        const saved = await this.repository.saveCalendar(finalCalendar);

        await this.repository.recordAuditEvent({
            event_id: `AE-CAL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.calendar_id,
            academic_year_id: saved.academic_year_id,
            semester_id: saved.semester_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'CALENDAR_CREATED',
            timestamp: now,
            version_number: saved.version_number,
            checksum: saved.checksum
        });

        return saved;
    }

    async addCalendarEvent(params: AddCalendarEventParams): Promise<AcademicCalendar> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({ calendar_id: params.calendar_id });

        const calendar = await this.repository.getCalendar(params.calendar_id);
        if (!calendar) {
            throw new Error(`CALENDAR_NOT_FOUND: ${params.calendar_id}`);
        }

        if (calendar.status === 'ARCHIVED') {
            throw new Error('TERMINAL_CALENDAR_CANNOT_TRANSITION: Archived calendar cannot accept modifications');
        }

        const parentSemester = await this.repository.getSemester(calendar.semester_id);
        if (!parentSemester) {
            throw new Error(`SEMESTER_NOT_FOUND: ${calendar.semester_id}`);
        }

        const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const newEvent: AcademicCalendarEvent = {
            event_id: eventId,
            calendar_id: calendar.calendar_id,
            type: params.type,
            title: params.title,
            description: params.description,
            start_at: params.start_at,
            end_at: params.end_at,
            all_day: params.all_day ?? false,
            status: 'SCHEDULED',
            version_number: 1,
            course_id: params.course_id
        };

        this.validator.validateCalendarEvent(newEvent, parentSemester);

        const now = new Date().toISOString();
        const nextVersion = calendar.version_number + 1;
        const updatedEvents = [...calendar.events, newEvent];

        const updatedCalendar: AcademicCalendar = {
            ...calendar,
            events: updatedEvents,
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            calendar_id: updatedCalendar.calendar_id,
            academic_year_id: updatedCalendar.academic_year_id,
            semester_id: updatedCalendar.semester_id,
            events: updatedCalendar.events,
            status: updatedCalendar.status,
            version_number: updatedCalendar.version_number
        });

        const saved = await this.repository.saveCalendar({
            ...updatedCalendar,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-CAL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.calendar_id,
            academic_year_id: saved.academic_year_id,
            semester_id: saved.semester_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'CALENDAR_UPDATED',
            timestamp: now,
            version_number: saved.version_number,
            checksum: saved.checksum,
            details: { added_event_id: eventId, event_title: params.title }
        });

        return saved;
    }

    async publishCalendar(params: TransitionCalendarParams): Promise<AcademicCalendar> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({ calendar_id: params.calendar_id });

        const calendar = await this.repository.getCalendar(params.calendar_id);
        if (!calendar) {
            throw new Error(`CALENDAR_NOT_FOUND: ${params.calendar_id}`);
        }

        if (calendar.status === 'ARCHIVED') {
            throw new Error('TERMINAL_CALENDAR_CANNOT_TRANSITION: Archived calendar cannot transition');
        }

        this.validator.validateCalendarTransition(calendar.status, 'PUBLISHED');

        const now = new Date().toISOString();
        const nextVersion = calendar.version_number + 1;
        const updatedCalendar: AcademicCalendar = {
            ...calendar,
            status: 'PUBLISHED',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            calendar_id: updatedCalendar.calendar_id,
            academic_year_id: updatedCalendar.academic_year_id,
            semester_id: updatedCalendar.semester_id,
            events: updatedCalendar.events,
            status: updatedCalendar.status,
            version_number: updatedCalendar.version_number
        });

        const saved = await this.repository.saveCalendar({
            ...updatedCalendar,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-CAL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.calendar_id,
            academic_year_id: saved.academic_year_id,
            semester_id: saved.semester_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'CALENDAR_PUBLISHED',
            timestamp: now,
            version_number: saved.version_number,
            checksum: saved.checksum
        });

        return saved;
    }

    async archiveCalendar(params: TransitionCalendarParams): Promise<AcademicCalendar> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({ calendar_id: params.calendar_id });

        const calendar = await this.repository.getCalendar(params.calendar_id);
        if (!calendar) {
            throw new Error(`CALENDAR_NOT_FOUND: ${params.calendar_id}`);
        }

        if (calendar.status === 'ARCHIVED') {
            throw new Error('TERMINAL_CALENDAR_CANNOT_TRANSITION: Archived calendar cannot transition');
        }

        this.validator.validateCalendarTransition(calendar.status, 'ARCHIVED');

        const now = new Date().toISOString();
        const nextVersion = calendar.version_number + 1;
        const updatedCalendar: AcademicCalendar = {
            ...calendar,
            status: 'ARCHIVED',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            calendar_id: updatedCalendar.calendar_id,
            academic_year_id: updatedCalendar.academic_year_id,
            semester_id: updatedCalendar.semester_id,
            events: updatedCalendar.events,
            status: updatedCalendar.status,
            version_number: updatedCalendar.version_number
        });

        const saved = await this.repository.saveCalendar({
            ...updatedCalendar,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-CAL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.calendar_id,
            academic_year_id: saved.academic_year_id,
            semester_id: saved.semester_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'CALENDAR_ARCHIVED',
            timestamp: now,
            version_number: saved.version_number,
            checksum: saved.checksum
        });

        return saved;
    }

    // ==========================================
    // 4. TEMPORAL VALIDATION MECHANISMS
    // ==========================================
    async isSemesterActive(semester_id: string): Promise<boolean> {
        const semester = await this.repository.getSemester(semester_id);
        if (!semester) return false;
        if (semester.status !== 'ACTIVE') return false;

        const parentYear = await this.repository.getAcademicYear(semester.academic_year_id);
        if (!parentYear || parentYear.status !== 'ACTIVE') return false;

        return true;
    }

    async validateAcademicDate(date: string, semester_id: string): Promise<boolean> {
        const semester = await this.repository.getSemester(semester_id);
        if (!semester) {
            throw new Error(`SEMESTER_NOT_FOUND: ${semester_id}`);
        }

        const dateTime = new Date(date).getTime();
        const start = new Date(semester.start_at).getTime();
        const end = new Date(semester.end_at).getTime();

        if (dateTime < start || dateTime > end) {
            throw new Error(`DATE_OUTSIDE_SEMESTER: Date ${date} is outside semester window [${semester.start_at}, ${semester.end_at}]`);
        }

        return true;
    }

    async isWithinAcademicPeriod(date: string, scope: AcademicPeriodScope): Promise<boolean> {
        this.validator.validateSecurity({ date, scope });

        if (scope.semester_id) {
            const semester = await this.repository.getSemester(scope.semester_id);
            if (!semester) return false;
            const t = new Date(date).getTime();
            const s = new Date(semester.start_at).getTime();
            const e = new Date(semester.end_at).getTime();
            if (t < s || t > e) return false;
        }

        if (scope.academic_year_id) {
            const year = await this.repository.getAcademicYear(scope.academic_year_id);
            if (!year) return false;
            const t = new Date(date).getTime();
            const s = new Date(year.start_at).getTime();
            const e = new Date(year.end_at).getTime();
            if (t < s || t > e) return false;
        }

        if (scope.course_period_id) {
            const period = await this.repository.getCoursePeriod(scope.course_period_id);
            if (!period) return false;
            const t = new Date(date).getTime();
            const s = new Date(period.start_at).getTime();
            const e = new Date(period.end_at).getTime();
            if (t < s || t > e) return false;
        }

        return true;
    }

    async validateAssessmentWindow(date: string, semester_id: string, course_period_id?: string): Promise<boolean> {
        const semester = await this.repository.getSemester(semester_id);
        if (!semester) {
            throw new Error(`SEMESTER_NOT_FOUND: ${semester_id}`);
        }
        if (semester.status !== 'ACTIVE') {
            throw new Error(`SEMESTER_NOT_ACTIVE: Assessment window rejected because semester is ${semester.status}`);
        }

        const parentYear = await this.repository.getAcademicYear(semester.academic_year_id);
        if (!parentYear || parentYear.status !== 'ACTIVE') {
            throw new Error(`ACADEMIC_YEAR_NOT_ACTIVE: Assessment window rejected because academic year is ${parentYear?.status || 'NOT_FOUND'}`);
        }

        const dateTime = new Date(date).getTime();
        const semStart = new Date(semester.start_at).getTime();
        const semEnd = new Date(semester.end_at).getTime();

        if (dateTime < semStart || dateTime > semEnd) {
            throw new Error(`ASSESSMENT_OUTSIDE_SEMESTER: Assessment date ${date} is outside semester [${semester.start_at}, ${semester.end_at}]`);
        }

        if (course_period_id) {
            const period = await this.repository.getCoursePeriod(course_period_id);
            if (!period) {
                throw new Error(`COURSE_PERIOD_NOT_FOUND: ${course_period_id}`);
            }
            if (period.status !== 'ACTIVE') {
                throw new Error(`COURSE_PERIOD_NOT_ACTIVE: Assessment window rejected because course period is ${period.status}`);
            }
            const pStart = new Date(period.start_at).getTime();
            const pEnd = new Date(period.end_at).getTime();
            if (dateTime < pStart || dateTime > pEnd) {
                throw new Error(`ASSESSMENT_OUTSIDE_COURSE_PERIOD: Assessment date ${date} is outside course period [${period.start_at}, ${period.end_at}]`);
            }
        }

        return true;
    }

    async validateAssignmentWindow(startDate: string, dueDate: string, semester_id: string, course_period_id?: string): Promise<boolean> {
        const semester = await this.repository.getSemester(semester_id);
        if (!semester) {
            throw new Error(`SEMESTER_NOT_FOUND: ${semester_id}`);
        }
        if (semester.status === 'CLOSED') {
            throw new Error('ASSIGNMENT_SEMESTER_CLOSED: Cannot schedule assignment in closed semester');
        }

        const sTime = new Date(startDate).getTime();
        const dTime = new Date(dueDate).getTime();
        const semStart = new Date(semester.start_at).getTime();
        const semEnd = new Date(semester.end_at).getTime();

        if (sTime < semStart || dTime > semEnd) {
            throw new Error(`ASSIGNMENT_OUTSIDE_SEMESTER: Assignment window [${startDate}, ${dueDate}] is outside semester [${semester.start_at}, ${semester.end_at}]`);
        }

        if (course_period_id) {
            const period = await this.repository.getCoursePeriod(course_period_id);
            if (!period) {
                throw new Error(`COURSE_PERIOD_NOT_FOUND: ${course_period_id}`);
            }
            if (period.status === 'CLOSED') {
                throw new Error('ASSIGNMENT_COURSE_PERIOD_CLOSED: Cannot schedule assignment in closed course period');
            }
            const pStart = new Date(period.start_at).getTime();
            const pEnd = new Date(period.end_at).getTime();
            if (sTime < pStart || dTime > pEnd) {
                throw new Error(`ASSIGNMENT_OUTSIDE_COURSE_PERIOD: Assignment window [${startDate}, ${dueDate}] is outside course period [${period.start_at}, ${period.end_at}]`);
            }
        }

        return true;
    }

    async validateSubmissionWindow(submissionDate: string, semester_id: string, course_period_id?: string): Promise<boolean> {
        const semester = await this.repository.getSemester(semester_id);
        if (!semester) {
            throw new Error(`SEMESTER_NOT_FOUND: ${semester_id}`);
        }
        if (semester.status === 'CLOSED') {
            throw new Error('SUBMISSION_SEMESTER_CLOSED: Submission rejected in closed semester');
        }

        const subTime = new Date(submissionDate).getTime();
        const semStart = new Date(semester.start_at).getTime();
        const semEnd = new Date(semester.end_at).getTime();

        if (subTime < semStart || subTime > semEnd) {
            throw new Error(`SUBMISSION_OUTSIDE_SEMESTER: Submission date ${submissionDate} is outside semester [${semester.start_at}, ${semester.end_at}]`);
        }

        if (course_period_id) {
            const period = await this.repository.getCoursePeriod(course_period_id);
            if (!period) {
                throw new Error(`COURSE_PERIOD_NOT_FOUND: ${course_period_id}`);
            }
            if (period.status === 'CLOSED') {
                throw new Error('SUBMISSION_COURSE_PERIOD_CLOSED: Submission rejected in closed course period');
            }
            const pStart = new Date(period.start_at).getTime();
            const pEnd = new Date(period.end_at).getTime();
            if (subTime < pStart || subTime > pEnd) {
                throw new Error(`SUBMISSION_OUTSIDE_COURSE_PERIOD: Submission date ${submissionDate} is outside course period [${period.start_at}, ${period.end_at}]`);
            }
        }

        return true;
    }

    // ==========================================
    // 5. STUDENT & TEACHER VIEW PROJECTIONS
    // ==========================================
    async getStudentAcademicCalendar(params: GetStudentCalendarParams): Promise<{
        academic_year: AcademicYear | null;
        semester: Semester | null;
        calendar: AcademicCalendar | null;
        course_periods: CoursePeriod[];
    }> {
        this.validator.validateSecurity(params);
        this.validator.validateStudentScope(params.authenticated_student_id, params.student_id);

        let semester: Semester | null = null;
        if (params.semester_id) {
            semester = await this.repository.getSemester(params.semester_id);
        } else {
            const allSemesters = await this.repository.listSemesters();
            semester = allSemesters.find(s => s.status === 'ACTIVE') || allSemesters[0] || null;
        }

        let academicYear: AcademicYear | null = null;
        if (semester) {
            academicYear = await this.repository.getAcademicYear(semester.academic_year_id);
        } else if (params.academic_year_id) {
            academicYear = await this.repository.getAcademicYear(params.academic_year_id);
        }

        let calendar: AcademicCalendar | null = null;
        if (semester) {
            calendar = await this.repository.getCalendarBySemester(semester.semester_id);
        }

        const coursePeriods = semester 
            ? await this.repository.listCoursePeriods({ semester_id: semester.semester_id })
            : [];

        await this.repository.recordAuditEvent({
            event_id: `AE-CAL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: params.student_id,
            academic_year_id: academicYear?.academic_year_id || 'UNKNOWN',
            semester_id: semester?.semester_id,
            actor_id: params.authenticated_student_id,
            actor_role: 'STUDENT',
            action: 'ACADEMIC_PERIOD_VIEWED',
            timestamp: new Date().toISOString(),
            version_number: 1,
            checksum: ''
        });

        return {
            academic_year: academicYear,
            semester,
            calendar,
            course_periods: coursePeriods
        };
    }

    async getTeacherAcademicCalendar(params: GetTeacherCalendarParams): Promise<{
        academic_years: AcademicYear[];
        semesters: Semester[];
        calendars: AcademicCalendar[];
        course_periods: CoursePeriod[];
    }> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({ teacher_id: params.teacher_id });

        if (params.course_id && params.teacher_authorized_courses) {
            this.validator.validateTeacherScope(params.teacher_id, params.course_id, params.teacher_authorized_courses);
        }

        const academicYears = await this.repository.listAcademicYears();
        const semesters = await this.repository.listSemesters(params.academic_year_id);
        const calendars = await this.repository.listCalendars();
        
        let coursePeriods = await this.repository.listCoursePeriods({
            teacher_id: params.teacher_id,
            academic_year_id: params.academic_year_id,
            semester_id: params.semester_id,
            course_id: params.course_id
        });

        if (params.teacher_authorized_courses) {
            coursePeriods = coursePeriods.filter(cp => {
                try {
                    this.validator.validateTeacherScope(params.teacher_id, cp.course_id, params.teacher_authorized_courses);
                    return true;
                } catch {
                    return false;
                }
            });
        }

        await this.repository.recordAuditEvent({
            event_id: `AE-CAL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: params.teacher_id,
            academic_year_id: params.academic_year_id || 'ALL',
            semester_id: params.semester_id,
            actor_id: params.teacher_id,
            actor_role: 'TEACHER',
            action: 'ACADEMIC_PERIOD_VIEWED',
            timestamp: new Date().toISOString(),
            version_number: 1,
            checksum: ''
        });

        return {
            academic_years: academicYears,
            semesters,
            calendars,
            course_periods: coursePeriods
        };
    }
}

export const academicCalendarEngine = new AcademicCalendarEngine();
