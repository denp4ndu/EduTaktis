import { 
    AttendanceSession, 
    AttendanceSessionStatus, 
    AttendanceRecord, 
    AttendanceStatus, 
    AttendanceReason, 
    AttendanceHistoryEntry, 
    AttendanceAuditEvent 
} from '../types/curriculum';
import { 
    attendanceRepositoryEngine, 
    AttendanceRepositoryEngine 
} from './attendanceRepositoryEngine';
import { 
    attendanceValidationEngine, 
    AttendanceValidationEngine 
} from './attendanceValidationEngine';
import { 
    academicCalendarRepositoryEngine, 
    AcademicCalendarRepositoryEngine 
} from './academicCalendarRepositoryEngine';

export interface CreateAttendanceSessionParams {
    academic_year_id: string;
    semester_id: string;
    course_id: string;
    course_period_id: string;
    learning_session_id?: string;
    teacher_id: string;
    title: string;
    session_date: string;
    start_at: string;
    end_at: string;
    actor_id: string;
    actor_role: string;
    status?: AttendanceSessionStatus;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
}

export interface TransitionAttendanceSessionParams {
    attendance_session_id: string;
    actor_id: string;
    actor_role: string;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
}

export interface MarkAttendanceParams {
    attendance_session_id: string;
    student_id: string;
    status: AttendanceStatus;
    reason?: AttendanceReason;
    late_minutes?: number;
    note?: string;
    actor_id: string;
    actor_role: string;
    enrollment_status?: string;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
}

export interface ReviseAttendanceParams {
    attendance_id: string;
    new_status: AttendanceStatus;
    new_reason?: AttendanceReason;
    new_late_minutes?: number;
    revision_reason: string;
    note?: string;
    actor_id: string;
    actor_role: string;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
}

export interface GetStudentAttendanceParams {
    authenticated_student_id: string;
    student_id: string;
    course_id?: string;
    course_period_id?: string;
    semester_id?: string;
}

export class AttendanceEngine {
    constructor(
        private repository: AttendanceRepositoryEngine = attendanceRepositoryEngine,
        private validator: AttendanceValidationEngine = attendanceValidationEngine,
        private calendarRepo: AcademicCalendarRepositoryEngine = academicCalendarRepositoryEngine
    ) {}

    private generateChecksum(data: unknown, prefix = 'AS-CHK-'): string {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return `${prefix}${Math.abs(hash).toString(16)}`;
    }

    // ==========================================
    // 1. SESSION MANAGEMENT
    // ==========================================
    async createAttendanceSession(params: CreateAttendanceSessionParams): Promise<AttendanceSession> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            academic_year_id: params.academic_year_id,
            semester_id: params.semester_id,
            course_id: params.course_id,
            course_period_id: params.course_period_id,
            teacher_id: params.teacher_id
        });

        if (params.teacher_authorized_courses) {
            this.validator.validateTeacherScope(
                params.teacher_id, 
                params.course_id, 
                params.teacher_authorized_courses
            );
        }

        const parentSemester = await this.calendarRepo.getSemester(params.semester_id);
        if (!parentSemester) {
            throw new Error(`SEMESTER_NOT_FOUND: Semester ${params.semester_id} does not exist`);
        }

        if (parentSemester.academic_year_id !== params.academic_year_id) {
            throw new Error(`SEMESTER_ACADEMIC_YEAR_MISMATCH: Semester ${params.semester_id} does not belong to year ${params.academic_year_id}`);
        }

        const parentPeriod = await this.calendarRepo.getCoursePeriod(params.course_period_id);
        if (!parentPeriod) {
            throw new Error(`COURSE_PERIOD_NOT_FOUND: Course period ${params.course_period_id} does not exist`);
        }

        if (parentPeriod.status !== 'ACTIVE') {
            throw new Error(`COURSE_PERIOD_NOT_ACTIVE: Attendance session cannot be created in ${parentPeriod.status} course period`);
        }

        this.validator.validateSessionDates(
            params.session_date,
            params.start_at,
            params.end_at,
            parentSemester.start_at,
            parentSemester.end_at,
            parentPeriod.start_at,
            parentPeriod.end_at
        );

        // Check duplicate attendance session for same course period and session_date / learning_session_id
        const existingSessions = await this.repository.listSessions({
            course_period_id: params.course_period_id
        });

        for (const es of existingSessions) {
            if (es.status === 'ARCHIVED') continue;
            if (params.learning_session_id && es.learning_session_id === params.learning_session_id) {
                throw new Error(`DUPLICATE_ATTENDANCE_SESSION: Attendance session for learning session ${params.learning_session_id} already exists`);
            }
            if (es.session_date === params.session_date && es.title === params.title) {
                throw new Error(`DUPLICATE_ATTENDANCE_SESSION: Attendance session on date ${params.session_date} with title '${params.title}' already exists`);
            }
        }

        const now = new Date().toISOString();
        const initialStatus: AttendanceSessionStatus = params.status || 'DRAFT';
        this.validator.validateSessionTransition('' as any, initialStatus);

        const sessionId = `AS-${params.course_id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const baseSession: AttendanceSession = {
            attendance_session_id: sessionId,
            academic_year_id: params.academic_year_id,
            semester_id: params.semester_id,
            course_id: params.course_id,
            course_period_id: params.course_period_id,
            learning_session_id: params.learning_session_id,
            teacher_id: params.teacher_id,
            title: params.title,
            session_date: params.session_date,
            start_at: params.start_at,
            end_at: params.end_at,
            status: initialStatus,
            version_number: 1,
            created_at: now,
            updated_at: now,
            checksum: ''
        };

        const checksum = this.generateChecksum({
            attendance_session_id: baseSession.attendance_session_id,
            course_id: baseSession.course_id,
            course_period_id: baseSession.course_period_id,
            session_date: baseSession.session_date,
            start_at: baseSession.start_at,
            end_at: baseSession.end_at,
            status: baseSession.status,
            version_number: baseSession.version_number
        }, 'AS-CHK-');

        const saved = await this.repository.saveSession({
            ...baseSession,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-ATT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.attendance_session_id,
            attendance_session_id: saved.attendance_session_id,
            course_id: saved.course_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'ATTENDANCE_SESSION_CREATED',
            version_number: saved.version_number,
            timestamp: now,
            checksum: saved.checksum,
            details: { title: saved.title, status: saved.status }
        });

        return saved;
    }

    async openAttendanceSession(params: TransitionAttendanceSessionParams): Promise<AttendanceSession> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({ attendance_session_id: params.attendance_session_id });

        const session = await this.repository.getSession(params.attendance_session_id);
        if (!session) {
            throw new Error(`ATTENDANCE_SESSION_NOT_FOUND: ${params.attendance_session_id}`);
        }

        if (params.teacher_authorized_courses) {
            this.validator.validateTeacherScope(
                params.actor_id, 
                session.course_id, 
                params.teacher_authorized_courses
            );
        }

        this.validator.validateSessionTransition(session.status, 'OPEN');

        const now = new Date().toISOString();
        const nextVersion = session.version_number + 1;
        const updated: AttendanceSession = {
            ...session,
            status: 'OPEN',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            attendance_session_id: updated.attendance_session_id,
            course_id: updated.course_id,
            course_period_id: updated.course_period_id,
            session_date: updated.session_date,
            start_at: updated.start_at,
            end_at: updated.end_at,
            status: updated.status,
            version_number: updated.version_number
        }, 'AS-CHK-');

        const saved = await this.repository.saveSession({
            ...updated,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-ATT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.attendance_session_id,
            attendance_session_id: saved.attendance_session_id,
            course_id: saved.course_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'ATTENDANCE_SESSION_OPENED',
            previous_status: session.status,
            new_status: saved.status,
            version_number: saved.version_number,
            timestamp: now,
            checksum: saved.checksum
        });

        return saved;
    }

    async closeAttendanceSession(params: TransitionAttendanceSessionParams): Promise<AttendanceSession> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({ attendance_session_id: params.attendance_session_id });

        const session = await this.repository.getSession(params.attendance_session_id);
        if (!session) {
            throw new Error(`ATTENDANCE_SESSION_NOT_FOUND: ${params.attendance_session_id}`);
        }

        if (params.teacher_authorized_courses) {
            this.validator.validateTeacherScope(
                params.actor_id, 
                session.course_id, 
                params.teacher_authorized_courses
            );
        }

        this.validator.validateSessionTransition(session.status, 'CLOSED');

        const now = new Date().toISOString();
        const nextVersion = session.version_number + 1;
        const updated: AttendanceSession = {
            ...session,
            status: 'CLOSED',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            attendance_session_id: updated.attendance_session_id,
            course_id: updated.course_id,
            course_period_id: updated.course_period_id,
            session_date: updated.session_date,
            start_at: updated.start_at,
            end_at: updated.end_at,
            status: updated.status,
            version_number: updated.version_number
        }, 'AS-CHK-');

        const saved = await this.repository.saveSession({
            ...updated,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-ATT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.attendance_session_id,
            attendance_session_id: saved.attendance_session_id,
            course_id: saved.course_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'ATTENDANCE_SESSION_CLOSED',
            previous_status: session.status,
            new_status: saved.status,
            version_number: saved.version_number,
            timestamp: now,
            checksum: saved.checksum
        });

        return saved;
    }

    async lockAttendanceSession(params: TransitionAttendanceSessionParams): Promise<AttendanceSession> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({ attendance_session_id: params.attendance_session_id });

        const session = await this.repository.getSession(params.attendance_session_id);
        if (!session) {
            throw new Error(`ATTENDANCE_SESSION_NOT_FOUND: ${params.attendance_session_id}`);
        }

        if (params.teacher_authorized_courses) {
            this.validator.validateTeacherScope(
                params.actor_id, 
                session.course_id, 
                params.teacher_authorized_courses
            );
        }

        this.validator.validateSessionTransition(session.status, 'LOCKED');

        const now = new Date().toISOString();
        const nextVersion = session.version_number + 1;
        const updated: AttendanceSession = {
            ...session,
            status: 'LOCKED',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            attendance_session_id: updated.attendance_session_id,
            course_id: updated.course_id,
            course_period_id: updated.course_period_id,
            session_date: updated.session_date,
            start_at: updated.start_at,
            end_at: updated.end_at,
            status: updated.status,
            version_number: updated.version_number
        }, 'AS-CHK-');

        const saved = await this.repository.saveSession({
            ...updated,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-ATT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.attendance_session_id,
            attendance_session_id: saved.attendance_session_id,
            course_id: saved.course_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'ATTENDANCE_SESSION_LOCKED',
            previous_status: session.status,
            new_status: saved.status,
            version_number: saved.version_number,
            timestamp: now,
            checksum: saved.checksum
        });

        return saved;
    }

    async archiveAttendanceSession(params: TransitionAttendanceSessionParams): Promise<AttendanceSession> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({ attendance_session_id: params.attendance_session_id });

        const session = await this.repository.getSession(params.attendance_session_id);
        if (!session) {
            throw new Error(`ATTENDANCE_SESSION_NOT_FOUND: ${params.attendance_session_id}`);
        }

        this.validator.validateSessionTransition(session.status, 'ARCHIVED');

        const now = new Date().toISOString();
        const nextVersion = session.version_number + 1;
        const updated: AttendanceSession = {
            ...session,
            status: 'ARCHIVED',
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.generateChecksum({
            attendance_session_id: updated.attendance_session_id,
            course_id: updated.course_id,
            course_period_id: updated.course_period_id,
            session_date: updated.session_date,
            start_at: updated.start_at,
            end_at: updated.end_at,
            status: updated.status,
            version_number: updated.version_number
        }, 'AS-CHK-');

        const saved = await this.repository.saveSession({
            ...updated,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-ATT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.attendance_session_id,
            attendance_session_id: saved.attendance_session_id,
            course_id: saved.course_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'ATTENDANCE_SESSION_ARCHIVED',
            previous_status: session.status,
            new_status: saved.status,
            version_number: saved.version_number,
            timestamp: now,
            checksum: saved.checksum
        });

        return saved;
    }

    // ==========================================
    // 2. ATTENDANCE MARKING & REVISION
    // ==========================================
    async markAttendance(params: MarkAttendanceParams): Promise<AttendanceRecord> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            attendance_session_id: params.attendance_session_id,
            student_id: params.student_id
        });

        const session = await this.repository.getSession(params.attendance_session_id);
        if (!session) {
            throw new Error(`ATTENDANCE_SESSION_NOT_FOUND: ${params.attendance_session_id}`);
        }

        if (session.status !== 'OPEN') {
            throw new Error(`ATTENDANCE_SESSION_NOT_OPEN: Cannot mark attendance in ${session.status} session`);
        }

        if (params.teacher_authorized_courses) {
            this.validator.validateTeacherScope(
                params.actor_id, 
                session.course_id, 
                params.teacher_authorized_courses
            );
        }

        // Student Enrollment Validation (ACTIVE required)
        const enrollmentStatus = params.enrollment_status || 'ACTIVE';
        this.validator.validateEnrollmentStatus(enrollmentStatus);

        const reason = params.reason || 'NONE';
        const lateMinutes = params.late_minutes ?? 0;
        this.validator.validateAttendanceStatus(params.status, reason, lateMinutes);

        // Check if attendance record already exists for this student in this session
        const existing = await this.repository.getRecordByStudentAndSession(
            params.attendance_session_id, 
            params.student_id
        );

        if (existing) {
            throw new Error(`DUPLICATE_STUDENT_ATTENDANCE: Student ${params.student_id} already marked in session ${params.attendance_session_id}`);
        }

        const now = new Date().toISOString();
        const attendanceId = `ATT-${params.student_id}-${session.attendance_session_id}`;
        const baseRecord: AttendanceRecord = {
            attendance_id: attendanceId,
            attendance_session_id: session.attendance_session_id,
            student_id: params.student_id,
            course_id: session.course_id,
            course_period_id: session.course_period_id,
            semester_id: session.semester_id,
            status: params.status,
            reason,
            late_minutes: lateMinutes,
            note: params.note,
            marked_by: params.actor_id,
            marked_at: now,
            version_number: 1,
            checksum: ''
        };

        const checksum = this.generateChecksum({
            attendance_id: baseRecord.attendance_id,
            attendance_session_id: baseRecord.attendance_session_id,
            student_id: baseRecord.student_id,
            course_id: baseRecord.course_id,
            status: baseRecord.status,
            reason: baseRecord.reason,
            late_minutes: baseRecord.late_minutes,
            version_number: baseRecord.version_number
        }, 'ATT-CHK-');

        const saved = await this.repository.saveRecord({
            ...baseRecord,
            checksum
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-ATT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.attendance_id,
            attendance_id: saved.attendance_id,
            attendance_session_id: saved.attendance_session_id,
            student_id: saved.student_id,
            course_id: saved.course_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'ATTENDANCE_MARKED',
            new_status: saved.status,
            version_number: saved.version_number,
            timestamp: now,
            checksum: saved.checksum,
            details: { reason: saved.reason, late_minutes: saved.late_minutes }
        });

        return saved;
    }

    async reviseAttendance(params: ReviseAttendanceParams): Promise<AttendanceRecord> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({ attendance_id: params.attendance_id });

        if (!params.revision_reason || params.revision_reason.trim() === '') {
            throw new Error('ATTENDANCE_REVISION_REASON_REQUIRED: Revision reason is required when modifying attendance record');
        }

        const record = await this.repository.getRecord(params.attendance_id);
        if (!record) {
            throw new Error(`ATTENDANCE_RECORD_NOT_FOUND: ${params.attendance_id}`);
        }

        const session = await this.repository.getSession(record.attendance_session_id);
        if (!session) {
            throw new Error(`ATTENDANCE_SESSION_NOT_FOUND: ${record.attendance_session_id}`);
        }

        if (session.status === 'LOCKED' || session.status === 'ARCHIVED') {
            throw new Error('ATTENDANCE_SESSION_ALREADY_LOCKED: Cannot revise attendance in locked or archived session');
        }

        if (params.teacher_authorized_courses) {
            this.validator.validateTeacherScope(
                params.actor_id, 
                record.course_id, 
                params.teacher_authorized_courses
            );
        }

        const newReason = params.new_reason || 'NONE';
        const newLateMinutes = params.new_late_minutes ?? 0;
        this.validator.validateAttendanceStatus(params.new_status, newReason, newLateMinutes);

        const now = new Date().toISOString();
        const nextVersion = record.version_number + 1;

        const updatedRecord: AttendanceRecord = {
            ...record,
            status: params.new_status,
            reason: newReason,
            late_minutes: newLateMinutes,
            note: params.note !== undefined ? params.note : record.note,
            revision_reason: params.revision_reason,
            version_number: nextVersion
        };

        const checksum = this.generateChecksum({
            attendance_id: updatedRecord.attendance_id,
            attendance_session_id: updatedRecord.attendance_session_id,
            student_id: updatedRecord.student_id,
            course_id: updatedRecord.course_id,
            status: updatedRecord.status,
            reason: updatedRecord.reason,
            late_minutes: updatedRecord.late_minutes,
            version_number: updatedRecord.version_number
        }, 'ATT-CHK-');

        const saved = await this.repository.saveRecord({
            ...updatedRecord,
            checksum
        });

        // Record historical entry
        const historyEntry: AttendanceHistoryEntry = {
            history_id: `HIST-ATT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            attendance_id: saved.attendance_id,
            attendance_session_id: saved.attendance_session_id,
            student_id: saved.student_id,
            version_number: saved.version_number,
            previous_status: record.status,
            new_status: saved.status,
            previous_reason: record.reason,
            new_reason: saved.reason,
            previous_late_minutes: record.late_minutes,
            new_late_minutes: saved.late_minutes,
            revision_reason: params.revision_reason,
            actor_id: params.actor_id,
            timestamp: now,
            checksum: saved.checksum
        };
        await this.repository.recordHistory(historyEntry);

        await this.repository.recordAuditEvent({
            event_id: `AE-ATT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: saved.attendance_id,
            attendance_id: saved.attendance_id,
            attendance_session_id: saved.attendance_session_id,
            student_id: saved.student_id,
            course_id: saved.course_id,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            action: 'ATTENDANCE_REVISED',
            previous_status: record.status,
            new_status: saved.status,
            version_number: saved.version_number,
            timestamp: now,
            checksum: saved.checksum,
            details: { revision_reason: params.revision_reason }
        });

        return saved;
    }

    // ==========================================
    // 3. QUERIES
    // ==========================================
    async getStudentAttendanceHistory(params: GetStudentAttendanceParams): Promise<AttendanceRecord[]> {
        this.validator.validateSecurity(params);
        this.validator.validateStudentScope(params.authenticated_student_id, params.student_id);

        const records = await this.repository.listRecords({
            student_id: params.student_id,
            course_id: params.course_id,
            course_period_id: params.course_period_id,
            semester_id: params.semester_id
        });

        await this.repository.recordAuditEvent({
            event_id: `AE-ATT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: params.student_id,
            student_id: params.student_id,
            course_id: params.course_id || 'ALL',
            actor_id: params.authenticated_student_id,
            actor_role: 'STUDENT',
            action: 'ATTENDANCE_VIEWED',
            version_number: 1,
            timestamp: new Date().toISOString(),
            checksum: ''
        });

        return records;
    }

    async getAttendanceSession(sessionId: string): Promise<AttendanceSession | null> {
        this.validator.validateIdentity({ attendance_session_id: sessionId });
        return this.repository.getSession(sessionId);
    }

    async listAttendanceSessions(filter?: {
        course_id?: string;
        course_period_id?: string;
        semester_id?: string;
        teacher_id?: string;
    }): Promise<AttendanceSession[]> {
        return this.repository.listSessions(filter);
    }

    async listAttendanceRecordsForSession(
        sessionId: string, 
        teacherId?: string, 
        teacherAuthorizedCourses?: string[] | ((t: string, c: string) => boolean)
    ): Promise<AttendanceRecord[]> {
        this.validator.validateIdentity({ attendance_session_id: sessionId });

        const session = await this.repository.getSession(sessionId);
        if (!session) {
            throw new Error(`ATTENDANCE_SESSION_NOT_FOUND: ${sessionId}`);
        }

        if (teacherId && teacherAuthorizedCourses) {
            this.validator.validateTeacherScope(teacherId, session.course_id, teacherAuthorizedCourses);
        }

        return this.repository.listRecords({
            attendance_session_id: sessionId
        });
    }
}

export const attendanceEngine = new AttendanceEngine();
