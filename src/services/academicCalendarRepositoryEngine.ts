import { 
    AcademicYear, 
    Semester, 
    AcademicCalendar, 
    CoursePeriod, 
    AcademicPeriodHistoryEntry, 
    CoursePeriodHistoryEntry, 
    AcademicCalendarAuditEvent 
} from '../types/curriculum';
import { 
    academicCalendarStorageProvider, 
    AcademicCalendarStorageProvider 
} from './academicCalendarStorageProvider';

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

export class AcademicCalendarRepositoryEngine {
    constructor(
        private storage: AcademicCalendarStorageProvider = academicCalendarStorageProvider
    ) {}

    // ==========================================
    // ACADEMIC YEAR
    // ==========================================
    async saveAcademicYear(year: AcademicYear): Promise<AcademicYear> {
        const saved = await this.storage.saveAcademicYear(year);
        return deepFreeze(saved);
    }

    async getAcademicYear(id: string): Promise<AcademicYear | null> {
        const year = await this.storage.getAcademicYear(id);
        return year ? deepFreeze(year) : null;
    }

    async getAcademicYearByCode(code: string): Promise<AcademicYear | null> {
        const year = await this.storage.getAcademicYearByCode(code);
        return year ? deepFreeze(year) : null;
    }

    async listAcademicYears(): Promise<AcademicYear[]> {
        const years = await this.storage.listAcademicYears();
        // Deterministic sorting by start_at descending
        years.sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());
        return deepFreeze(years);
    }

    // ==========================================
    // SEMESTER
    // ==========================================
    async saveSemester(semester: Semester): Promise<Semester> {
        const saved = await this.storage.saveSemester(semester);
        return deepFreeze(saved);
    }

    async getSemester(id: string): Promise<Semester | null> {
        const semester = await this.storage.getSemester(id);
        return semester ? deepFreeze(semester) : null;
    }

    async listSemesters(academicYearId?: string): Promise<Semester[]> {
        const semesters = await this.storage.listSemesters(academicYearId);
        // Deterministic sorting by sequence ascending
        semesters.sort((a, b) => a.sequence - b.sequence);
        return deepFreeze(semesters);
    }

    // ==========================================
    // ACADEMIC CALENDAR
    // ==========================================
    async saveCalendar(calendar: AcademicCalendar): Promise<AcademicCalendar> {
        const saved = await this.storage.saveCalendar(calendar);
        return deepFreeze(saved);
    }

    async getCalendar(id: string): Promise<AcademicCalendar | null> {
        const calendar = await this.storage.getCalendar(id);
        return calendar ? deepFreeze(calendar) : null;
    }

    async getCalendarBySemester(semesterId: string): Promise<AcademicCalendar | null> {
        const calendar = await this.storage.getCalendarBySemester(semesterId);
        return calendar ? deepFreeze(calendar) : null;
    }

    async listCalendars(): Promise<AcademicCalendar[]> {
        const calendars = await this.storage.listCalendars();
        return deepFreeze(calendars);
    }

    // ==========================================
    // COURSE PERIOD
    // ==========================================
    async saveCoursePeriod(period: CoursePeriod): Promise<CoursePeriod> {
        const saved = await this.storage.saveCoursePeriod(period);
        return deepFreeze(saved);
    }

    async getCoursePeriod(id: string): Promise<CoursePeriod | null> {
        const period = await this.storage.getCoursePeriod(id);
        return period ? deepFreeze(period) : null;
    }

    async listCoursePeriods(filter?: {
        course_id?: string;
        academic_year_id?: string;
        semester_id?: string;
        teacher_id?: string;
    }): Promise<CoursePeriod[]> {
        const periods = await this.storage.listCoursePeriods(filter);
        // Deterministic sort by start_at ascending
        periods.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
        return deepFreeze(periods);
    }

    // ==========================================
    // HISTORY & AUDIT LOGS
    // ==========================================
    async recordHistory(entry: AcademicPeriodHistoryEntry | CoursePeriodHistoryEntry): Promise<void> {
        await this.storage.saveHistoryEntry(entry);
    }

    async getHistory(entityId: string): Promise<(AcademicPeriodHistoryEntry | CoursePeriodHistoryEntry)[]> {
        const entries = await this.storage.getHistory(entityId);
        entries.sort((a, b) => a.version_number - b.version_number);
        return deepFreeze(entries);
    }

    async recordAuditEvent(event: AcademicCalendarAuditEvent): Promise<void> {
        await this.storage.saveAuditEvent(event);
    }

    async getAuditEvents(entityId?: string): Promise<AcademicCalendarAuditEvent[]> {
        const events = await this.storage.getAuditEvents(entityId);
        events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return deepFreeze(events);
    }

    async clear(): Promise<void> {
        await this.storage.clear();
    }
}

export const academicCalendarRepositoryEngine = new AcademicCalendarRepositoryEngine();
