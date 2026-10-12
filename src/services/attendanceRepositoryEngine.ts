import { 
    AttendanceSession, 
    AttendanceRecord, 
    AttendanceHistoryEntry, 
    AttendanceAuditEvent 
} from '../types/curriculum';
import { 
    attendanceStorageProvider, 
    AttendanceStorageProvider 
} from './attendanceStorageProvider';

function deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    const propNames = Object.getOwnPropertyNames(obj);
    for (const name of propNames) {
        const value = (obj as any)[name];
        if (value && typeof value === 'object') {
            deepFreeze(value);
        }
    }
    return Object.freeze(obj);
}

export class AttendanceRepositoryEngine {
    constructor(
        private storage: AttendanceStorageProvider = attendanceStorageProvider
    ) {}

    // ==========================================
    // SESSIONS
    // ==========================================
    async saveSession(session: AttendanceSession): Promise<AttendanceSession> {
        const saved = await this.storage.saveSession(session);
        return deepFreeze(saved);
    }

    async getSession(sessionId: string): Promise<AttendanceSession | null> {
        const session = await this.storage.getSession(sessionId);
        return session ? deepFreeze(session) : null;
    }

    async listSessions(filter?: {
        course_id?: string;
        course_period_id?: string;
        semester_id?: string;
        teacher_id?: string;
    }): Promise<AttendanceSession[]> {
        const sessions = await this.storage.listSessions(filter);
        // Deterministic sorting by session_date descending, then start_at ascending
        sessions.sort((a, b) => {
            const dateDiff = new Date(b.session_date).getTime() - new Date(a.session_date).getTime();
            if (dateDiff !== 0) return dateDiff;
            return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
        });
        return deepFreeze(sessions);
    }

    // ==========================================
    // RECORDS
    // ==========================================
    async saveRecord(record: AttendanceRecord): Promise<AttendanceRecord> {
        const saved = await this.storage.saveRecord(record);
        return deepFreeze(saved);
    }

    async getRecord(recordId: string): Promise<AttendanceRecord | null> {
        const record = await this.storage.getRecord(recordId);
        return record ? deepFreeze(record) : null;
    }

    async getRecordByStudentAndSession(sessionId: string, studentId: string): Promise<AttendanceRecord | null> {
        const record = await this.storage.getRecordByStudentAndSession(sessionId, studentId);
        return record ? deepFreeze(record) : null;
    }

    async listRecords(filter?: {
        attendance_session_id?: string;
        student_id?: string;
        course_id?: string;
        course_period_id?: string;
        semester_id?: string;
    }): Promise<AttendanceRecord[]> {
        const records = await this.storage.listRecords(filter);
        // Deterministic sort by marked_at ascending, then student_id ascending
        records.sort((a, b) => {
            const timeDiff = new Date(a.marked_at).getTime() - new Date(b.marked_at).getTime();
            if (timeDiff !== 0) return timeDiff;
            return a.student_id.localeCompare(b.student_id);
        });
        return deepFreeze(records);
    }

    // ==========================================
    // HISTORY & AUDITING
    // ==========================================
    async recordHistory(entry: AttendanceHistoryEntry): Promise<void> {
        await this.storage.saveHistoryEntry(entry);
    }

    async getHistory(attendanceId: string): Promise<AttendanceHistoryEntry[]> {
        const entries = await this.storage.getHistory(attendanceId);
        entries.sort((a, b) => a.version_number - b.version_number);
        return deepFreeze(entries);
    }

    async recordAuditEvent(event: AttendanceAuditEvent): Promise<void> {
        await this.storage.saveAuditEvent(event);
    }

    async getAuditEvents(filterId?: string): Promise<AttendanceAuditEvent[]> {
        const events = await this.storage.getAuditEvents(filterId);
        events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return deepFreeze(events);
    }

    async clear(): Promise<void> {
        await this.storage.clear();
    }
}

export const attendanceRepositoryEngine = new AttendanceRepositoryEngine();
