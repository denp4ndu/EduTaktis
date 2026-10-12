import { 
    AcademicYear, 
    AcademicYearStatus, 
    Semester, 
    SemesterStatus, 
    AcademicCalendar, 
    AcademicCalendarEvent, 
    AcademicCalendarEventType, 
    CalendarStatus, 
    PublishedArtifact 
} from '../types/curriculum';

export class AcademicCalendarValidationEngine {
    private static readonly VALID_YEAR_STATUSES: AcademicYearStatus[] = [
        'DRAFT', 
        'ACTIVE', 
        'CLOSED', 
        'ARCHIVED'
    ];

    private static readonly VALID_SEMESTER_STATUSES: SemesterStatus[] = [
        'DRAFT', 
        'ACTIVE', 
        'CLOSED', 
        'ARCHIVED'
    ];

    private static readonly VALID_CALENDAR_STATUSES: CalendarStatus[] = [
        'DRAFT', 
        'ACTIVE', 
        'PUBLISHED', 
        'ARCHIVED'
    ];

    private static readonly VALID_EVENT_TYPES: AcademicCalendarEventType[] = [
        'TEACHING', 
        'HOLIDAY', 
        'EXAMINATION', 
        'ASSESSMENT', 
        'SUBMISSION_WINDOW', 
        'REPORTING', 
        'REPORT_CARD', 
        'ACADEMIC_EVENT', 
        'OTHER'
    ];

    validateSecurity(payload: unknown): void {
        if (!payload) return;
        const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);

        const forbiddenPatterns = [
            /AIzaSy[0-9A-Za-z_-]{15,}/i,
            /Bearer\s+[A-Za-z0-9\-_.]+/i,
            /sk-[0-9a-zA-Z]{15,}/i,
            /system\s+prompt/i,
            /gemini/i,
            /generateContent/i,
            /admin_override/i,
            /ignore_safety_instructions/i,
            /curl\s+/i,
            /chmod\s+/i
        ];

        for (const pattern of forbiddenPatterns) {
            if (pattern.test(serialized)) {
                throw new Error('SECURITY_LEAKAGE_DETECTED: Forbidden pattern or credential identified in academic calendar payload');
            }
        }
    }

    validateIdentity(params: {
        academic_year_id?: string;
        semester_id?: string;
        calendar_id?: string;
        event_id?: string;
        code?: string;
        label?: string;
        student_id?: string;
        teacher_id?: string;
        course_id?: string;
    }): void {
        if (params.academic_year_id !== undefined && (!params.academic_year_id || typeof params.academic_year_id !== 'string' || params.academic_year_id.trim() === '')) {
            throw new Error('INVALID_ACADEMIC_YEAR_ID: academic_year_id must be a non-empty string');
        }
        if (params.semester_id !== undefined && (!params.semester_id || typeof params.semester_id !== 'string' || params.semester_id.trim() === '')) {
            throw new Error('INVALID_SEMESTER_ID: semester_id must be a non-empty string');
        }
        if (params.calendar_id !== undefined && (!params.calendar_id || typeof params.calendar_id !== 'string' || params.calendar_id.trim() === '')) {
            throw new Error('INVALID_CALENDAR_ID: calendar_id must be a non-empty string');
        }
        if (params.event_id !== undefined && (!params.event_id || typeof params.event_id !== 'string' || params.event_id.trim() === '')) {
            throw new Error('INVALID_EVENT_ID: event_id must be a non-empty string');
        }
        if (params.code !== undefined && (!params.code || typeof params.code !== 'string' || params.code.trim() === '')) {
            throw new Error('INVALID_CODE: code must be a non-empty string');
        }
        if (params.label !== undefined && (!params.label || typeof params.label !== 'string' || params.label.trim() === '')) {
            throw new Error('INVALID_LABEL: label must be a non-empty string');
        }
        if (params.student_id !== undefined && (!params.student_id || typeof params.student_id !== 'string' || params.student_id.trim() === '')) {
            throw new Error('INVALID_STUDENT_ID: student_id must be a non-empty string');
        }
        if (params.teacher_id !== undefined && (!params.teacher_id || typeof params.teacher_id !== 'string' || params.teacher_id.trim() === '')) {
            throw new Error('INVALID_TEACHER_ID: teacher_id must be a non-empty string');
        }
        if (params.course_id !== undefined && (!params.course_id || typeof params.course_id !== 'string' || params.course_id.trim() === '')) {
            throw new Error('INVALID_COURSE_ID: course_id must be a non-empty string');
        }
    }

    validateDateRange(start_at: string, end_at: string, errorPrefix = 'INVALID_ACADEMIC_YEAR_DATE_RANGE'): void {
        if (!start_at || !end_at) {
            throw new Error(`${errorPrefix}: start_at and end_at are required`);
        }
        const startDate = new Date(start_at);
        const endDate = new Date(end_at);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error(`${errorPrefix}: Invalid date format`);
        }

        if (startDate.getTime() >= endDate.getTime()) {
            throw new Error(`${errorPrefix}: start_at (${start_at}) must be strictly before end_at (${end_at})`);
        }
    }

    validateAcademicYear(year: AcademicYear): void {
        if (!year) {
            throw new Error('ACADEMIC_YEAR_NOT_FOUND: Academic year is missing');
        }
        this.validateIdentity({
            academic_year_id: year.academic_year_id,
            code: year.code,
            label: year.label
        });
        this.validateDateRange(year.start_at, year.end_at, 'INVALID_ACADEMIC_YEAR_DATE_RANGE');

        if (!AcademicCalendarValidationEngine.VALID_YEAR_STATUSES.includes(year.status)) {
            throw new Error(`INVALID_ACADEMIC_YEAR_STATUS: ${year.status}`);
        }
        if (typeof year.version_number !== 'number' || year.version_number < 1) {
            throw new Error(`INVALID_ACADEMIC_YEAR_VERSION: Version number must be >= 1 (got ${year.version_number})`);
        }
    }

    validateAcademicYearTransition(currentStatus: AcademicYearStatus, targetStatus: AcademicYearStatus): void {
        if (!currentStatus) {
            if (targetStatus !== 'DRAFT' && targetStatus !== 'ACTIVE') {
                throw new Error(`INVALID_INITIAL_ACADEMIC_YEAR_STATUS: ${targetStatus}`);
            }
            return;
        }

        if (currentStatus === targetStatus) {
            return;
        }

        if (currentStatus === 'ARCHIVED') {
            throw new Error('TERMINAL_ACADEMIC_YEAR_CANNOT_TRANSITION: Archived academic years cannot transition');
        }

        const validTransitions: Record<AcademicYearStatus, AcademicYearStatus[]> = {
            DRAFT: ['ACTIVE', 'ARCHIVED'],
            ACTIVE: ['CLOSED', 'ARCHIVED'],
            CLOSED: ['ACTIVE', 'ARCHIVED'],
            ARCHIVED: []
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            throw new Error(`INVALID_ACADEMIC_YEAR_TRANSITION: Cannot transition from ${currentStatus} to ${targetStatus}`);
        }
    }

    validateSemester(semester: Semester, parentYear?: AcademicYear): void {
        if (!semester) {
            throw new Error('SEMESTER_NOT_FOUND: Semester is missing');
        }
        this.validateIdentity({
            semester_id: semester.semester_id,
            academic_year_id: semester.academic_year_id,
            code: semester.code,
            label: semester.label
        });
        this.validateDateRange(semester.start_at, semester.end_at, 'INVALID_SEMESTER_DATE_RANGE');

        if (typeof semester.sequence !== 'number' || semester.sequence < 1) {
            throw new Error(`INVALID_SEMESTER_SEQUENCE: Sequence must be >= 1 (got ${semester.sequence})`);
        }

        if (!AcademicCalendarValidationEngine.VALID_SEMESTER_STATUSES.includes(semester.status)) {
            throw new Error(`INVALID_SEMESTER_STATUS: ${semester.status}`);
        }

        if (typeof semester.version_number !== 'number' || semester.version_number < 1) {
            throw new Error(`INVALID_SEMESTER_VERSION: Version must be >= 1 (got ${semester.version_number})`);
        }

        if (parentYear) {
            if (semester.academic_year_id !== parentYear.academic_year_id) {
                throw new Error(`SEMESTER_ACADEMIC_YEAR_MISMATCH: Semester year ${semester.academic_year_id} does not match parent ${parentYear.academic_year_id}`);
            }
            const semStart = new Date(semester.start_at).getTime();
            const semEnd = new Date(semester.end_at).getTime();
            const yrStart = new Date(parentYear.start_at).getTime();
            const yrEnd = new Date(parentYear.end_at).getTime();

            if (semStart < yrStart || semEnd > yrEnd) {
                throw new Error(`SEMESTER_OUTSIDE_ACADEMIC_YEAR: Semester dates [${semester.start_at}, ${semester.end_at}] outside academic year [${parentYear.start_at}, ${parentYear.end_at}]`);
            }
        }
    }

    validateSemesterTransition(currentStatus: SemesterStatus, targetStatus: SemesterStatus): void {
        if (!currentStatus) {
            if (targetStatus !== 'DRAFT' && targetStatus !== 'ACTIVE') {
                throw new Error(`INVALID_INITIAL_SEMESTER_STATUS: ${targetStatus}`);
            }
            return;
        }

        if (currentStatus === targetStatus) {
            return;
        }

        if (currentStatus === 'ARCHIVED') {
            throw new Error('TERMINAL_SEMESTER_CANNOT_TRANSITION: Archived semester cannot transition');
        }

        const validTransitions: Record<SemesterStatus, SemesterStatus[]> = {
            DRAFT: ['ACTIVE', 'ARCHIVED'],
            ACTIVE: ['CLOSED', 'ARCHIVED'],
            CLOSED: ['ACTIVE', 'ARCHIVED'],
            ARCHIVED: []
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            throw new Error(`INVALID_SEMESTER_TRANSITION: Cannot transition from ${currentStatus} to ${targetStatus}`);
        }
    }

    validateCalendar(calendar: AcademicCalendar, parentSemester?: Semester): void {
        if (!calendar) {
            throw new Error('CALENDAR_NOT_FOUND: Calendar is missing');
        }
        this.validateIdentity({
            calendar_id: calendar.calendar_id,
            academic_year_id: calendar.academic_year_id,
            semester_id: calendar.semester_id
        });

        if (!AcademicCalendarValidationEngine.VALID_CALENDAR_STATUSES.includes(calendar.status)) {
            throw new Error(`INVALID_CALENDAR_STATUS: ${calendar.status}`);
        }

        if (parentSemester) {
            if (calendar.semester_id !== parentSemester.semester_id) {
                throw new Error(`CALENDAR_SEMESTER_MISMATCH: Calendar semester ${calendar.semester_id} does not match parent ${parentSemester.semester_id}`);
            }
            if (calendar.academic_year_id !== parentSemester.academic_year_id) {
                throw new Error(`CALENDAR_ACADEMIC_YEAR_MISMATCH: Calendar year ${calendar.academic_year_id} does not match parent ${parentSemester.academic_year_id}`);
            }
        }

        if (Array.isArray(calendar.events)) {
            for (const event of calendar.events) {
                this.validateCalendarEvent(event, parentSemester);
            }
        }
    }

    validateCalendarEvent(event: AcademicCalendarEvent, parentSemester?: Semester): void {
        if (!event) {
            throw new Error('CALENDAR_EVENT_NOT_FOUND: Calendar event is missing');
        }
        this.validateIdentity({
            event_id: event.event_id,
            calendar_id: event.calendar_id,
            label: event.title
        });

        if (!AcademicCalendarValidationEngine.VALID_EVENT_TYPES.includes(event.type)) {
            throw new Error(`INVALID_CALENDAR_EVENT_TYPE: Unknown event type ${event.type}`);
        }

        this.validateDateRange(event.start_at, event.end_at, 'INVALID_CALENDAR_EVENT_DATE_RANGE');

        if (parentSemester) {
            const evStart = new Date(event.start_at).getTime();
            const evEnd = new Date(event.end_at).getTime();
            const semStart = new Date(parentSemester.start_at).getTime();
            const semEnd = new Date(parentSemester.end_at).getTime();

            if (evStart < semStart || evEnd > semEnd) {
                throw new Error(`CALENDAR_EVENT_OUTSIDE_SEMESTER: Event dates [${event.start_at}, ${event.end_at}] fall outside semester [${parentSemester.start_at}, ${parentSemester.end_at}]`);
            }
        }
    }

    validateCalendarTransition(currentStatus: CalendarStatus, targetStatus: CalendarStatus): void {
        if (!currentStatus) {
            if (targetStatus !== 'DRAFT' && targetStatus !== 'ACTIVE') {
                throw new Error(`INVALID_INITIAL_CALENDAR_STATUS: ${targetStatus}`);
            }
            return;
        }

        if (currentStatus === targetStatus) {
            return;
        }

        if (currentStatus === 'ARCHIVED') {
            throw new Error('TERMINAL_CALENDAR_CANNOT_TRANSITION: Archived calendar cannot transition');
        }

        const validTransitions: Record<CalendarStatus, CalendarStatus[]> = {
            DRAFT: ['ACTIVE', 'PUBLISHED', 'ARCHIVED'],
            ACTIVE: ['PUBLISHED', 'ARCHIVED'],
            PUBLISHED: ['ACTIVE', 'ARCHIVED'],
            ARCHIVED: []
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            throw new Error(`INVALID_CALENDAR_TRANSITION: Cannot transition from ${currentStatus} to ${targetStatus}`);
        }
    }

    validateTeacherScope(
        teacher_id: string, 
        course_id: string, 
        authorizedCourses?: string[] | ((t: string, c: string) => boolean)
    ): void {
        this.validateIdentity({ teacher_id, course_id });

        if (!authorizedCourses) {
            return;
        }

        if (typeof authorizedCourses === 'function') {
            if (!authorizedCourses(teacher_id, course_id)) {
                throw new Error(`UNAUTHORIZED_TEACHER_ACADEMIC_SCOPE: Teacher ${teacher_id} is not authorized for course ${course_id}`);
            }
            return;
        }

        if (Array.isArray(authorizedCourses)) {
            if (!authorizedCourses.includes(course_id)) {
                throw new Error(`UNAUTHORIZED_TEACHER_ACADEMIC_SCOPE: Course ${course_id} is outside teacher ${teacher_id} scope`);
            }
        }
    }

    validateStudentScope(authenticated_student_id: string, target_student_id: string): void {
        this.validateIdentity({ student_id: authenticated_student_id });
        this.validateIdentity({ student_id: target_student_id });

        if (authenticated_student_id !== target_student_id) {
            throw new Error(`UNAUTHORIZED_STUDENT_SCOPE: Student ${authenticated_student_id} cannot access records for ${target_student_id}`);
        }
    }

    validateChecksum(expectedChecksum: string, actualChecksum: string): void {
        if (!expectedChecksum || !actualChecksum) {
            throw new Error('MISSING_CHECKSUM: Both expected and actual checksums are required');
        }
        if (expectedChecksum !== actualChecksum) {
            throw new Error(`ACADEMIC_PERIOD_CHECKSUM_MISMATCH: Expected ${expectedChecksum}, found ${actualChecksum}`);
        }
    }

    validateCurriculumContext(context: unknown): void {
        if (!context || typeof context !== 'object') {
            throw new Error('MISSING_CURRICULUM_CONTEXT: Curriculum context is required');
        }
        const ctx = context as Partial<PublishedArtifact['curriculum_context']>;
        if (!ctx.authority || !ctx.curriculum || !ctx.subject_name) {
            throw new Error('INVALID_CURRICULUM_CONTEXT_METADATA: Incomplete curriculum authority or metadata');
        }
        if (ctx.cp_verification_status !== 'PENDING_SOURCE' && ctx.cp_verification_status !== 'VERIFIED') {
            throw new Error(`INVALID_CP_VERIFICATION_STATUS: ${ctx.cp_verification_status}`);
        }
    }
}

export const academicCalendarValidationEngine = new AcademicCalendarValidationEngine();
