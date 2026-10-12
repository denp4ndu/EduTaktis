import { 
    AttendanceStatus, 
    AttendanceSessionStatus, 
    AttendanceReason, 
    AttendanceSession, 
    AttendanceRecord 
} from '../types/curriculum';

export class AttendanceValidationEngine {
    private static readonly VALID_SESSION_STATUSES: AttendanceSessionStatus[] = [
        'DRAFT', 
        'OPEN', 
        'CLOSED', 
        'LOCKED', 
        'ARCHIVED'
    ];

    private static readonly VALID_ATTENDANCE_STATUSES: AttendanceStatus[] = [
        'PRESENT', 
        'LATE', 
        'EXCUSED', 
        'SICK', 
        'ABSENT'
    ];

    private static readonly VALID_ATTENDANCE_REASONS: AttendanceReason[] = [
        'NONE', 
        'SICK', 
        'OFFICIAL_ACTIVITY', 
        'FAMILY_REASON', 
        'AUTHORIZED_ABSENCE', 
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
                throw new Error('SECURITY_LEAKAGE_DETECTED: Forbidden pattern or credential detected in attendance payload');
            }
        }
    }

    validateIdentity(params: {
        attendance_session_id?: string;
        attendance_id?: string;
        student_id?: string;
        course_id?: string;
        course_period_id?: string;
        semester_id?: string;
        academic_year_id?: string;
        teacher_id?: string;
    }): void {
        if (params.attendance_session_id !== undefined && (!params.attendance_session_id || typeof params.attendance_session_id !== 'string' || params.attendance_session_id.trim() === '')) {
            throw new Error('INVALID_ATTENDANCE_SESSION_ID: attendance_session_id must be a non-empty string');
        }
        if (params.attendance_id !== undefined && (!params.attendance_id || typeof params.attendance_id !== 'string' || params.attendance_id.trim() === '')) {
            throw new Error('INVALID_ATTENDANCE_ID: attendance_id must be a non-empty string');
        }
        if (params.student_id !== undefined && (!params.student_id || typeof params.student_id !== 'string' || params.student_id.trim() === '')) {
            throw new Error('INVALID_STUDENT_ID: student_id must be a non-empty string');
        }
        if (params.course_id !== undefined && (!params.course_id || typeof params.course_id !== 'string' || params.course_id.trim() === '')) {
            throw new Error('INVALID_COURSE_ID: course_id must be a non-empty string');
        }
        if (params.course_period_id !== undefined && (!params.course_period_id || typeof params.course_period_id !== 'string' || params.course_period_id.trim() === '')) {
            throw new Error('INVALID_COURSE_PERIOD_ID: course_period_id must be a non-empty string');
        }
        if (params.semester_id !== undefined && (!params.semester_id || typeof params.semester_id !== 'string' || params.semester_id.trim() === '')) {
            throw new Error('INVALID_SEMESTER_ID: semester_id must be a non-empty string');
        }
        if (params.academic_year_id !== undefined && (!params.academic_year_id || typeof params.academic_year_id !== 'string' || params.academic_year_id.trim() === '')) {
            throw new Error('INVALID_ACADEMIC_YEAR_ID: academic_year_id must be a non-empty string');
        }
        if (params.teacher_id !== undefined && (!params.teacher_id || typeof params.teacher_id !== 'string' || params.teacher_id.trim() === '')) {
            throw new Error('INVALID_TEACHER_ID: teacher_id must be a non-empty string');
        }
    }

    validateDateRange(start_at: string, end_at: string): void {
        if (!start_at || !end_at) {
            throw new Error('ATTENDANCE_INVALID_TIME_RANGE: start_at and end_at are required');
        }
        const startDate = new Date(start_at);
        const endDate = new Date(end_at);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error('ATTENDANCE_INVALID_TIME_RANGE: Invalid date format');
        }

        if (startDate.getTime() >= endDate.getTime()) {
            throw new Error(`ATTENDANCE_INVALID_TIME_RANGE: start_at (${start_at}) must be before end_at (${end_at})`);
        }
    }

    validateSessionDates(
        session_date: string, 
        start_at: string, 
        end_at: string, 
        semesterStart?: string, 
        semesterEnd?: string, 
        courseStart?: string, 
        courseEnd?: string
    ): void {
        this.validateDateRange(start_at, end_at);

        const dateObj = new Date(session_date);
        if (isNaN(dateObj.getTime())) {
            throw new Error('ATTENDANCE_INVALID_TIME_RANGE: Invalid session_date format');
        }

        const sessTime = dateObj.getTime();

        if (semesterStart && semesterEnd) {
            const semStart = new Date(semesterStart).getTime();
            const semEnd = new Date(semesterEnd).getTime();

            if (sessTime < semStart || sessTime > semEnd) {
                throw new Error(`ATTENDANCE_DATE_OUTSIDE_SEMESTER: Session date ${session_date} is outside semester window [${semesterStart}, ${semesterEnd}]`);
            }
        }

        if (courseStart && courseEnd) {
            const cpStart = new Date(courseStart).getTime();
            const cpEnd = new Date(courseEnd).getTime();

            if (sessTime < cpStart || sessTime > cpEnd) {
                throw new Error(`ATTENDANCE_DATE_OUTSIDE_COURSE_PERIOD: Session date ${session_date} is outside course period window [${courseStart}, ${courseEnd}]`);
            }
        }
    }

    validateSessionTransition(currentStatus: AttendanceSessionStatus, targetStatus: AttendanceSessionStatus): void {
        if (!currentStatus) {
            if (targetStatus !== 'DRAFT' && targetStatus !== 'OPEN') {
                throw new Error(`INVALID_INITIAL_ATTENDANCE_SESSION_STATUS: ${targetStatus}`);
            }
            return;
        }

        if (currentStatus === targetStatus) {
            return;
        }

        if (currentStatus === 'ARCHIVED') {
            throw new Error('TERMINAL_ATTENDANCE_SESSION_CANNOT_TRANSITION: Archived attendance sessions cannot transition');
        }

        if (currentStatus === 'LOCKED' && (targetStatus === 'OPEN' || targetStatus === 'DRAFT')) {
            throw new Error('ATTENDANCE_SESSION_ALREADY_LOCKED: Locked attendance sessions cannot return to open or draft');
        }

        const validTransitions: Record<AttendanceSessionStatus, AttendanceSessionStatus[]> = {
            DRAFT: ['OPEN', 'ARCHIVED'],
            OPEN: ['CLOSED', 'ARCHIVED'],
            CLOSED: ['LOCKED', 'OPEN', 'ARCHIVED'],
            LOCKED: ['ARCHIVED'],
            ARCHIVED: []
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            throw new Error(`INVALID_ATTENDANCE_SESSION_TRANSITION: Cannot transition from ${currentStatus} to ${targetStatus}`);
        }
    }

    validateAttendanceStatus(status: AttendanceStatus, reason: AttendanceReason = 'NONE', late_minutes = 0): void {
        if (!AttendanceValidationEngine.VALID_ATTENDANCE_STATUSES.includes(status)) {
            throw new Error(`INVALID_ATTENDANCE_STATUS: Unknown status ${status}`);
        }

        if (!AttendanceValidationEngine.VALID_ATTENDANCE_REASONS.includes(reason)) {
            throw new Error(`INVALID_ATTENDANCE_REASON: Unknown reason ${reason}`);
        }

        if (typeof late_minutes !== 'number' || isNaN(late_minutes) || !isFinite(late_minutes) || late_minutes < 0) {
            throw new Error(`INVALID_LATE_MINUTES: late_minutes must be a non-negative finite number (got ${late_minutes})`);
        }

        if (status !== 'LATE' && late_minutes !== 0) {
            throw new Error(`INVALID_LATE_MINUTES: late_minutes must be 0 for status ${status}`);
        }
    }

    validateEnrollmentStatus(enrollmentStatus: string): void {
        if (!enrollmentStatus || enrollmentStatus !== 'ACTIVE') {
            throw new Error(`STUDENT_NOT_ACTIVE_ENROLLMENT: Student enrollment is ${enrollmentStatus || 'UNKNOWN'} (must be ACTIVE)`);
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
                throw new Error(`UNAUTHORIZED_TEACHER_ATTENDANCE_SCOPE: Teacher ${teacher_id} is not authorized for course ${course_id}`);
            }
            return;
        }

        if (Array.isArray(authorizedCourses)) {
            if (!authorizedCourses.includes(course_id)) {
                throw new Error(`UNAUTHORIZED_TEACHER_ATTENDANCE_SCOPE: Course ${course_id} is outside teacher ${teacher_id} scope`);
            }
        }
    }

    validateStudentScope(authenticated_student_id: string, target_student_id: string): void {
        this.validateIdentity({ student_id: authenticated_student_id });
        this.validateIdentity({ student_id: target_student_id });

        if (authenticated_student_id !== target_student_id) {
            throw new Error(`UNAUTHORIZED_STUDENT_SCOPE: Student ${authenticated_student_id} cannot access attendance for ${target_student_id}`);
        }
    }

    validateChecksum(expectedChecksum: string, actualChecksum: string, isSession = false): void {
        if (!expectedChecksum || !actualChecksum) {
            throw new Error('MISSING_CHECKSUM: Both expected and actual checksums are required');
        }
        if (expectedChecksum !== actualChecksum) {
            const errName = isSession ? 'ATTENDANCE_SESSION_CHECKSUM_MISMATCH' : 'ATTENDANCE_CHECKSUM_MISMATCH';
            throw new Error(`${errName}: Expected ${expectedChecksum}, found ${actualChecksum}`);
        }
    }
}

export const attendanceValidationEngine = new AttendanceValidationEngine();
