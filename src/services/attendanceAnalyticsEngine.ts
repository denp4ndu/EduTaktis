import { 
    StudentAttendanceSummary, 
    StudentCourseAttendanceSummary, 
    CourseAttendanceSummary, 
    SemesterAttendanceSummary, 
    TeacherAttendanceMonitoring 
} from '../types/curriculum';
import { 
    attendanceRepositoryEngine, 
    AttendanceRepositoryEngine 
} from './attendanceRepositoryEngine';
import { 
    attendanceValidationEngine, 
    AttendanceValidationEngine 
} from './attendanceValidationEngine';

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

export class AttendanceAnalyticsEngine {
    constructor(
        private repository: AttendanceRepositoryEngine = attendanceRepositoryEngine,
        private validator: AttendanceValidationEngine = attendanceValidationEngine
    ) {}

    static calculatePercentage(present: number, late: number, total: number): number {
        if (total === 0) return 0;
        const val = ((present + late) / total) * 100;
        return Math.round(val * 100) / 100;
    }

    async getStudentAttendanceSummary(
        studentId: string, 
        semesterId: string, 
        authenticatedStudentId?: string
    ): Promise<StudentAttendanceSummary> {
        this.validator.validateSecurity({ studentId, semesterId, authenticatedStudentId });
        this.validator.validateIdentity({ student_id: studentId, semester_id: semesterId });

        if (authenticatedStudentId) {
            this.validator.validateStudentScope(authenticatedStudentId, studentId);
        }

        const records = await this.repository.listRecords({
            student_id: studentId,
            semester_id: semesterId
        });

        // Group by course_id
        const courseMap = new Map<string, {
            course_id: string;
            course_period_id: string;
            present: number;
            late: number;
            excused: number;
            sick: number;
            absent: number;
            total: number;
        }>();

        for (const rec of records) {
            let entry = courseMap.get(rec.course_id);
            if (!entry) {
                entry = {
                    course_id: rec.course_id,
                    course_period_id: rec.course_period_id,
                    present: 0,
                    late: 0,
                    excused: 0,
                    sick: 0,
                    absent: 0,
                    total: 0
                };
                courseMap.set(rec.course_id, entry);
            }

            entry.total++;
            if (rec.status === 'PRESENT') entry.present++;
            else if (rec.status === 'LATE') entry.late++;
            else if (rec.status === 'EXCUSED') entry.excused++;
            else if (rec.status === 'SICK') entry.sick++;
            else if (rec.status === 'ABSENT') entry.absent++;
        }

        const courseSummaries: StudentCourseAttendanceSummary[] = [];
        let totalPresent = 0;
        let totalLate = 0;
        let totalExcused = 0;
        let totalSick = 0;
        let totalAbsent = 0;
        let totalSessions = 0;

        for (const entry of courseMap.values()) {
            const coursePct = AttendanceAnalyticsEngine.calculatePercentage(
                entry.present, 
                entry.late, 
                entry.total
            );

            courseSummaries.push({
                course_id: entry.course_id,
                course_period_id: entry.course_period_id,
                total_sessions: entry.total,
                present_count: entry.present,
                late_count: entry.late,
                excused_count: entry.excused,
                sick_count: entry.sick,
                absent_count: entry.absent,
                attendance_percentage: coursePct
            });

            totalPresent += entry.present;
            totalLate += entry.late;
            totalExcused += entry.excused;
            totalSick += entry.sick;
            totalAbsent += entry.absent;
            totalSessions += entry.total;
        }

        courseSummaries.sort((a, b) => a.course_id.localeCompare(b.course_id));

        const overallPct = AttendanceAnalyticsEngine.calculatePercentage(
            totalPresent, 
            totalLate, 
            totalSessions
        );

        const summary: StudentAttendanceSummary = {
            student_id: studentId,
            semester_id: semesterId,
            course_summaries: courseSummaries,
            total_sessions: totalSessions,
            present_count: totalPresent,
            late_count: totalLate,
            excused_count: totalExcused,
            sick_count: totalSick,
            absent_count: totalAbsent,
            overall_attendance_percentage: overallPct
        };

        await this.repository.recordAuditEvent({
            event_id: `AE-ATT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            entity_id: studentId,
            student_id: studentId,
            course_id: 'ALL',
            actor_id: authenticatedStudentId || studentId,
            actor_role: authenticatedStudentId ? 'STUDENT' : 'SYSTEM',
            action: 'ATTENDANCE_ANALYTICS_VIEWED',
            version_number: 1,
            timestamp: new Date().toISOString(),
            checksum: ''
        });

        return deepFreeze(summary);
    }

    async getCourseAttendanceSummary(
        courseId: string, 
        coursePeriodId: string, 
        semesterId: string,
        teacherId?: string,
        teacherAuthorizedCourses?: string[] | ((t: string, c: string) => boolean)
    ): Promise<CourseAttendanceSummary> {
        this.validator.validateSecurity({ courseId, coursePeriodId, semesterId, teacherId });
        this.validator.validateIdentity({ course_id: courseId, course_period_id: coursePeriodId, semester_id: semesterId });

        if (teacherId && teacherAuthorizedCourses) {
            this.validator.validateTeacherScope(teacherId, courseId, teacherAuthorizedCourses);
        }

        const records = await this.repository.listRecords({
            course_id: courseId,
            course_period_id: coursePeriodId,
            semester_id: semesterId
        });

        const sessions = await this.repository.listSessions({
            course_id: courseId,
            course_period_id: coursePeriodId,
            semester_id: semesterId
        });

        const uniqueStudents = new Set<string>();
        let presentCount = 0;
        let lateCount = 0;
        let absentCount = 0;

        for (const rec of records) {
            uniqueStudents.add(rec.student_id);
            if (rec.status === 'PRESENT') presentCount++;
            else if (rec.status === 'LATE') lateCount++;
            else if (rec.status === 'ABSENT') absentCount++;
        }

        const totalRecords = records.length;
        const presentRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 10000) / 100 : 0;
        const lateRate = totalRecords > 0 ? Math.round((lateCount / totalRecords) * 10000) / 100 : 0;
        const absenceRate = totalRecords > 0 ? Math.round((absentCount / totalRecords) * 10000) / 100 : 0;
        const coursePct = AttendanceAnalyticsEngine.calculatePercentage(presentCount, lateCount, totalRecords);

        const summary: CourseAttendanceSummary = {
            course_id: courseId,
            course_period_id: coursePeriodId,
            semester_id: semesterId,
            total_students: uniqueStudents.size,
            total_sessions: sessions.length,
            present_rate: presentRate,
            late_rate: lateRate,
            absence_rate: absenceRate,
            course_attendance_percentage: coursePct
        };

        return deepFreeze(summary);
    }

    async getSemesterAttendanceSummary(semesterId: string, academicYearId: string): Promise<SemesterAttendanceSummary> {
        this.validator.validateIdentity({ semester_id: semesterId, academic_year_id: academicYearId });

        const records = await this.repository.listRecords({ semester_id: semesterId });
        const uniqueCourses = new Set<string>();
        const uniqueStudents = new Set<string>();
        let presentCount = 0;
        let lateCount = 0;

        for (const rec of records) {
            uniqueCourses.add(rec.course_id);
            uniqueStudents.add(rec.student_id);
            if (rec.status === 'PRESENT') presentCount++;
            else if (rec.status === 'LATE') lateCount++;
        }

        const semesterPct = AttendanceAnalyticsEngine.calculatePercentage(
            presentCount, 
            lateCount, 
            records.length
        );

        const summary: SemesterAttendanceSummary = {
            semester_id: semesterId,
            academic_year_id: academicYearId,
            courses_count: uniqueCourses.size,
            students_count: uniqueStudents.size,
            total_attendance_records: records.length,
            semester_attendance_percentage: semesterPct
        };

        return deepFreeze(summary);
    }

    async getTeacherAttendanceMonitoring(params: {
        teacher_id: string;
        course_id: string;
        course_period_id: string;
        semester_id: string;
        teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
    }): Promise<TeacherAttendanceMonitoring> {
        this.validator.validateSecurity(params);
        this.validator.validateIdentity({
            teacher_id: params.teacher_id,
            course_id: params.course_id,
            course_period_id: params.course_period_id,
            semester_id: params.semester_id
        });

        if (params.teacher_authorized_courses) {
            this.validator.validateTeacherScope(
                params.teacher_id, 
                params.course_id, 
                params.teacher_authorized_courses
            );
        }

        const courseSummary = await this.getCourseAttendanceSummary(
            params.course_id, 
            params.course_period_id, 
            params.semester_id,
            params.teacher_id,
            params.teacher_authorized_courses
        );

        const records = await this.repository.listRecords({
            course_id: params.course_id,
            course_period_id: params.course_period_id,
            semester_id: params.semester_id
        });

        const studentIds = Array.from(new Set(records.map(r => r.student_id)));
        const studentSummaries: StudentAttendanceSummary[] = [];

        for (const sid of studentIds) {
            const stuSummary = await this.getStudentAttendanceSummary(sid, params.semester_id);
            studentSummaries.push(stuSummary);
        }

        studentSummaries.sort((a, b) => a.student_id.localeCompare(b.student_id));

        const monitoring: TeacherAttendanceMonitoring = {
            teacher_id: params.teacher_id,
            course_id: params.course_id,
            course_period_id: params.course_period_id,
            semester_id: params.semester_id,
            sessions_count: courseSummary.total_sessions,
            enrolled_students_count: studentIds.length,
            course_attendance_summary: courseSummary,
            student_summaries: studentSummaries
        };

        return deepFreeze(monitoring);
    }
}

export const attendanceAnalyticsEngine = new AttendanceAnalyticsEngine();
