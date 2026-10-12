import { 
    AcademicYear, 
    Semester, 
    AcademicCalendar, 
    CoursePeriod, 
    AcademicPeriodHistoryEntry, 
    CoursePeriodHistoryEntry, 
    AcademicCalendarAuditEvent 
} from '../types/curriculum';

export interface AcademicCalendarStorageProvider {
    // Academic Year
    saveAcademicYear(year: AcademicYear): Promise<AcademicYear>;
    getAcademicYear(id: string): Promise<AcademicYear | null>;
    getAcademicYearByCode(code: string): Promise<AcademicYear | null>;
    listAcademicYears(): Promise<AcademicYear[]>;

    // Semester
    saveSemester(semester: Semester): Promise<Semester>;
    getSemester(id: string): Promise<Semester | null>;
    listSemesters(academicYearId?: string): Promise<Semester[]>;

    // Academic Calendar
    saveCalendar(calendar: AcademicCalendar): Promise<AcademicCalendar>;
    getCalendar(id: string): Promise<AcademicCalendar | null>;
    getCalendarBySemester(semesterId: string): Promise<AcademicCalendar | null>;
    listCalendars(): Promise<AcademicCalendar[]>;

    // Course Period
    saveCoursePeriod(period: CoursePeriod): Promise<CoursePeriod>;
    getCoursePeriod(id: string): Promise<CoursePeriod | null>;
    listCoursePeriods(filter?: {
        course_id?: string;
        academic_year_id?: string;
        semester_id?: string;
        teacher_id?: string;
    }): Promise<CoursePeriod[]>;

    // History & Auditing
    saveHistoryEntry(entry: AcademicPeriodHistoryEntry | CoursePeriodHistoryEntry): Promise<void>;
    getHistory(entityId: string): Promise<(AcademicPeriodHistoryEntry | CoursePeriodHistoryEntry)[]>;
    saveAuditEvent(event: AcademicCalendarAuditEvent): Promise<void>;
    getAuditEvents(entityId?: string): Promise<AcademicCalendarAuditEvent[]>;

    // Storage Management (Testing)
    clear(): Promise<void>;
}

export class MemoryAcademicCalendarStorageProvider implements AcademicCalendarStorageProvider {
    private academicYears: Map<string, AcademicYear> = new Map();
    private semesters: Map<string, Semester> = new Map();
    private calendars: Map<string, AcademicCalendar> = new Map();
    private coursePeriods: Map<string, CoursePeriod> = new Map();
    private historyEntries: (AcademicPeriodHistoryEntry | CoursePeriodHistoryEntry)[] = [];
    private auditEvents: AcademicCalendarAuditEvent[] = [];

    async saveAcademicYear(year: AcademicYear): Promise<AcademicYear> {
        this.academicYears.set(year.academic_year_id, JSON.parse(JSON.stringify(year)));
        return JSON.parse(JSON.stringify(year));
    }

    async getAcademicYear(id: string): Promise<AcademicYear | null> {
        const item = this.academicYears.get(id);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }

    async getAcademicYearByCode(code: string): Promise<AcademicYear | null> {
        for (const item of this.academicYears.values()) {
            if (item.code === code) {
                return JSON.parse(JSON.stringify(item));
            }
        }
        return null;
    }

    async listAcademicYears(): Promise<AcademicYear[]> {
        return Array.from(this.academicYears.values()).map(item => JSON.parse(JSON.stringify(item)));
    }

    async saveSemester(semester: Semester): Promise<Semester> {
        this.semesters.set(semester.semester_id, JSON.parse(JSON.stringify(semester)));
        return JSON.parse(JSON.stringify(semester));
    }

    async getSemester(id: string): Promise<Semester | null> {
        const item = this.semesters.get(id);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }

    async listSemesters(academicYearId?: string): Promise<Semester[]> {
        let results = Array.from(this.semesters.values());
        if (academicYearId) {
            results = results.filter(s => s.academic_year_id === academicYearId);
        }
        return results.map(item => JSON.parse(JSON.stringify(item)));
    }

    async saveCalendar(calendar: AcademicCalendar): Promise<AcademicCalendar> {
        this.calendars.set(calendar.calendar_id, JSON.parse(JSON.stringify(calendar)));
        return JSON.parse(JSON.stringify(calendar));
    }

    async getCalendar(id: string): Promise<AcademicCalendar | null> {
        const item = this.calendars.get(id);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }

    async getCalendarBySemester(semesterId: string): Promise<AcademicCalendar | null> {
        for (const item of this.calendars.values()) {
            if (item.semester_id === semesterId) {
                return JSON.parse(JSON.stringify(item));
            }
        }
        return null;
    }

    async listCalendars(): Promise<AcademicCalendar[]> {
        return Array.from(this.calendars.values()).map(item => JSON.parse(JSON.stringify(item)));
    }

    async saveCoursePeriod(period: CoursePeriod): Promise<CoursePeriod> {
        this.coursePeriods.set(period.course_period_id, JSON.parse(JSON.stringify(period)));
        return JSON.parse(JSON.stringify(period));
    }

    async getCoursePeriod(id: string): Promise<CoursePeriod | null> {
        const item = this.coursePeriods.get(id);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }

    async listCoursePeriods(filter?: {
        course_id?: string;
        academic_year_id?: string;
        semester_id?: string;
        teacher_id?: string;
    }): Promise<CoursePeriod[]> {
        let results = Array.from(this.coursePeriods.values());
        if (filter) {
            if (filter.course_id) {
                results = results.filter(p => p.course_id === filter.course_id);
            }
            if (filter.academic_year_id) {
                results = results.filter(p => p.academic_year_id === filter.academic_year_id);
            }
            if (filter.semester_id) {
                results = results.filter(p => p.semester_id === filter.semester_id);
            }
            if (filter.teacher_id) {
                results = results.filter(p => p.teacher_id === filter.teacher_id);
            }
        }
        return results.map(item => JSON.parse(JSON.stringify(item)));
    }

    async saveHistoryEntry(entry: AcademicPeriodHistoryEntry | CoursePeriodHistoryEntry): Promise<void> {
        this.historyEntries.push(JSON.parse(JSON.stringify(entry)));
    }

    async getHistory(entityId: string): Promise<(AcademicPeriodHistoryEntry | CoursePeriodHistoryEntry)[]> {
        return this.historyEntries
            .filter(h => ('entity_id' in h && h.entity_id === entityId) || ('course_period_id' in h && h.course_period_id === entityId))
            .map(h => JSON.parse(JSON.stringify(h)));
    }

    async saveAuditEvent(event: AcademicCalendarAuditEvent): Promise<void> {
        this.auditEvents.push(JSON.parse(JSON.stringify(event)));
    }

    async getAuditEvents(entityId?: string): Promise<AcademicCalendarAuditEvent[]> {
        if (!entityId) {
            return this.auditEvents.map(e => JSON.parse(JSON.stringify(e)));
        }
        return this.auditEvents
            .filter(e => e.entity_id === entityId || e.academic_year_id === entityId || e.semester_id === entityId || e.course_period_id === entityId)
            .map(e => JSON.parse(JSON.stringify(e)));
    }

    async clear(): Promise<void> {
        this.academicYears.clear();
        this.semesters.clear();
        this.calendars.clear();
        this.coursePeriods.clear();
        this.historyEntries = [];
        this.auditEvents = [];
    }
}

export const academicCalendarStorageProvider: AcademicCalendarStorageProvider = new MemoryAcademicCalendarStorageProvider();
