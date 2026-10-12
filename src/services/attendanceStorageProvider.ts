import { 
    AttendanceSession, 
    AttendanceRecord, 
    AttendanceHistoryEntry, 
    AttendanceAuditEvent 
} from '../types/curriculum';

export interface AttendanceStorageProvider {
    saveSession(session: AttendanceSession): Promise<AttendanceSession>;
    getSession(sessionId: string): Promise<AttendanceSession | null>;
    listSessions(filter?: {
        course_id?: string;
        course_period_id?: string;
        semester_id?: string;
        teacher_id?: string;
    }): Promise<AttendanceSession[]>;

    saveRecord(record: AttendanceRecord): Promise<AttendanceRecord>;
    getRecord(recordId: string): Promise<AttendanceRecord | null>;
    getRecordByStudentAndSession(sessionId: string, studentId: string): Promise<AttendanceRecord | null>;
    listRecords(filter?: {
        attendance_session_id?: string;
        student_id?: string;
        course_id?: string;
        course_period_id?: string;
        semester_id?: string;
    }): Promise<AttendanceRecord[]>;

    saveHistoryEntry(entry: AttendanceHistoryEntry): Promise<void>;
    getHistory(attendanceId: string): Promise<AttendanceHistoryEntry[]>;

    saveAuditEvent(event: AttendanceAuditEvent): Promise<void>;
    getAuditEvents(filterId?: string): Promise<AttendanceAuditEvent[]>;

    clear(): Promise<void>;
}

export class MemoryAttendanceStorageProvider implements AttendanceStorageProvider {
    private sessions: Map<string, AttendanceSession> = new Map();
    private records: Map<string, AttendanceRecord> = new Map();
    private historyEntries: AttendanceHistoryEntry[] = [];
    private auditEvents: AttendanceAuditEvent[] = [];

    async saveSession(session: AttendanceSession): Promise<AttendanceSession> {
        this.sessions.set(session.attendance_session_id, JSON.parse(JSON.stringify(session)));
        return JSON.parse(JSON.stringify(session));
    }

    async getSession(sessionId: string): Promise<AttendanceSession | null> {
        const session = this.sessions.get(sessionId);
        return session ? JSON.parse(JSON.stringify(session)) : null;
    }

    async listSessions(filter?: {
        course_id?: string;
        course_period_id?: string;
        semester_id?: string;
        teacher_id?: string;
    }): Promise<AttendanceSession[]> {
        let results = Array.from(this.sessions.values());
        if (filter) {
            if (filter.course_id) results = results.filter(s => s.course_id === filter.course_id);
            if (filter.course_period_id) results = results.filter(s => s.course_period_id === filter.course_period_id);
            if (filter.semester_id) results = results.filter(s => s.semester_id === filter.semester_id);
            if (filter.teacher_id) results = results.filter(s => s.teacher_id === filter.teacher_id);
        }
        return results.map(s => JSON.parse(JSON.stringify(s)));
    }

    async saveRecord(record: AttendanceRecord): Promise<AttendanceRecord> {
        this.records.set(record.attendance_id, JSON.parse(JSON.stringify(record)));
        return JSON.parse(JSON.stringify(record));
    }

    async getRecord(recordId: string): Promise<AttendanceRecord | null> {
        const rec = this.records.get(recordId);
        return rec ? JSON.parse(JSON.stringify(rec)) : null;
    }

    async getRecordByStudentAndSession(sessionId: string, studentId: string): Promise<AttendanceRecord | null> {
        for (const rec of this.records.values()) {
            if (rec.attendance_session_id === sessionId && rec.student_id === studentId) {
                return JSON.parse(JSON.stringify(rec));
            }
        }
        return null;
    }

    async listRecords(filter?: {
        attendance_session_id?: string;
        student_id?: string;
        course_id?: string;
        course_period_id?: string;
        semester_id?: string;
    }): Promise<AttendanceRecord[]> {
        let results = Array.from(this.records.values());
        if (filter) {
            if (filter.attendance_session_id) results = results.filter(r => r.attendance_session_id === filter.attendance_session_id);
            if (filter.student_id) results = results.filter(r => r.student_id === filter.student_id);
            if (filter.course_id) results = results.filter(r => r.course_id === filter.course_id);
            if (filter.course_period_id) results = results.filter(r => r.course_period_id === filter.course_period_id);
            if (filter.semester_id) results = results.filter(r => r.semester_id === filter.semester_id);
        }
        return results.map(r => JSON.parse(JSON.stringify(r)));
    }

    async saveHistoryEntry(entry: AttendanceHistoryEntry): Promise<void> {
        this.historyEntries.push(JSON.parse(JSON.stringify(entry)));
    }

    async getHistory(attendanceId: string): Promise<AttendanceHistoryEntry[]> {
        return this.historyEntries
            .filter(h => h.attendance_id === attendanceId)
            .map(h => JSON.parse(JSON.stringify(h)));
    }

    async saveAuditEvent(event: AttendanceAuditEvent): Promise<void> {
        this.auditEvents.push(JSON.parse(JSON.stringify(event)));
    }

    async getAuditEvents(filterId?: string): Promise<AttendanceAuditEvent[]> {
        if (!filterId) {
            return this.auditEvents.map(e => JSON.parse(JSON.stringify(e)));
        }
        return this.auditEvents
            .filter(e => e.entity_id === filterId || e.attendance_session_id === filterId || e.attendance_id === filterId || e.student_id === filterId || e.course_id === filterId)
            .map(e => JSON.parse(JSON.stringify(e)));
    }

    async clear(): Promise<void> {
        this.sessions.clear();
        this.records.clear();
        this.historyEntries = [];
        this.auditEvents = [];
    }
}

export const attendanceStorageProvider: AttendanceStorageProvider = new MemoryAttendanceStorageProvider();
