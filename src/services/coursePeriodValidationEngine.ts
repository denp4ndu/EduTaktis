import { 
    CoursePeriod, 
    CoursePeriodStatus, 
    Semester 
} from '../types/curriculum';

export class CoursePeriodValidationEngine {
    private static readonly VALID_COURSE_PERIOD_STATUSES: CoursePeriodStatus[] = [
        'DRAFT', 
        'SCHEDULED', 
        'ACTIVE', 
        'CLOSED', 
        'ARCHIVED'
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
                throw new Error('SECURITY_LEAKAGE_DETECTED: Forbidden credential or pattern detected in course period payload');
            }
        }
    }

    validateIdentity(params: {
        course_period_id?: string;
        course_id?: string;
        academic_year_id?: string;
        semester_id?: string;
        teacher_id?: string;
    }): void {
        if (params.course_period_id !== undefined && (!params.course_period_id || typeof params.course_period_id !== 'string' || params.course_period_id.trim() === '')) {
            throw new Error('INVALID_COURSE_PERIOD_ID: course_period_id must be a non-empty string');
        }
        if (params.course_id !== undefined && (!params.course_id || typeof params.course_id !== 'string' || params.course_id.trim() === '')) {
            throw new Error('INVALID_COURSE_ID: course_id must be a non-empty string');
        }
        if (params.academic_year_id !== undefined && (!params.academic_year_id || typeof params.academic_year_id !== 'string' || params.academic_year_id.trim() === '')) {
            throw new Error('INVALID_ACADEMIC_YEAR_ID: academic_year_id must be a non-empty string');
        }
        if (params.semester_id !== undefined && (!params.semester_id || typeof params.semester_id !== 'string' || params.semester_id.trim() === '')) {
            throw new Error('INVALID_SEMESTER_ID: semester_id must be a non-empty string');
        }
        if (params.teacher_id !== undefined && (!params.teacher_id || typeof params.teacher_id !== 'string' || params.teacher_id.trim() === '')) {
            throw new Error('INVALID_TEACHER_ID: teacher_id must be a non-empty string');
        }
    }

    validateCoursePeriodDates(start_at: string, end_at: string, semesterStart?: string, semesterEnd?: string): void {
        if (!start_at || !end_at) {
            throw new Error('INVALID_COURSE_PERIOD_DATE_RANGE: start_at and end_at are required');
        }
        const startDate = new Date(start_at);
        const endDate = new Date(end_at);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error('INVALID_COURSE_PERIOD_DATE_RANGE: Invalid date format');
        }

        if (startDate.getTime() >= endDate.getTime()) {
            throw new Error(`INVALID_COURSE_PERIOD_DATE_RANGE: start_at (${start_at}) must be strictly before end_at (${end_at})`);
        }

        if (semesterStart && semesterEnd) {
            const semStart = new Date(semesterStart).getTime();
            const semEnd = new Date(semesterEnd).getTime();

            if (startDate.getTime() < semStart || endDate.getTime() > semEnd) {
                throw new Error(`COURSE_PERIOD_OUTSIDE_SEMESTER: Course period [${start_at}, ${end_at}] is outside semester [${semesterStart}, ${semesterEnd}]`);
            }
        }
    }

    validateCoursePeriod(period: CoursePeriod, semester?: Semester): void {
        if (!period) {
            throw new Error('COURSE_PERIOD_NOT_FOUND: Course period is missing');
        }

        this.validateIdentity({
            course_period_id: period.course_period_id,
            course_id: period.course_id,
            academic_year_id: period.academic_year_id,
            semester_id: period.semester_id,
            teacher_id: period.teacher_id
        });

        if (!CoursePeriodValidationEngine.VALID_COURSE_PERIOD_STATUSES.includes(period.status)) {
            throw new Error(`INVALID_COURSE_PERIOD_STATUS: ${period.status}`);
        }

        if (typeof period.version_number !== 'number' || period.version_number < 1) {
            throw new Error(`INVALID_COURSE_PERIOD_VERSION: Version number must be >= 1 (got ${period.version_number})`);
        }

        this.validateCoursePeriodDates(
            period.start_at, 
            period.end_at, 
            semester?.start_at, 
            semester?.end_at
        );

        if (semester) {
            if (period.semester_id !== semester.semester_id) {
                throw new Error(`COURSE_PERIOD_SEMESTER_MISMATCH: Period semester ${period.semester_id} does not match ${semester.semester_id}`);
            }
            if (period.academic_year_id !== semester.academic_year_id) {
                throw new Error(`COURSE_PERIOD_YEAR_MISMATCH: Period year ${period.academic_year_id} does not match semester year ${semester.academic_year_id}`);
            }
        }
    }

    validateCoursePeriodTransition(currentStatus: CoursePeriodStatus, targetStatus: CoursePeriodStatus): void {
        if (!currentStatus) {
            if (targetStatus !== 'DRAFT' && targetStatus !== 'SCHEDULED' && targetStatus !== 'ACTIVE') {
                throw new Error(`INVALID_INITIAL_COURSE_PERIOD_STATUS: ${targetStatus}`);
            }
            return;
        }

        if (currentStatus === targetStatus) {
            return;
        }

        if (currentStatus === 'ARCHIVED') {
            throw new Error('TERMINAL_COURSE_PERIOD_CANNOT_TRANSITION: Archived course periods cannot transition');
        }

        const validTransitions: Record<CoursePeriodStatus, CoursePeriodStatus[]> = {
            DRAFT: ['SCHEDULED', 'ARCHIVED'],
            SCHEDULED: ['ACTIVE', 'CLOSED', 'ARCHIVED'],
            ACTIVE: ['CLOSED', 'ARCHIVED'],
            CLOSED: ['ACTIVE', 'ARCHIVED'],
            ARCHIVED: []
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            throw new Error(`INVALID_COURSE_PERIOD_TRANSITION: Cannot transition from ${currentStatus} to ${targetStatus}`);
        }
    }

    validateTeacherOwnership(teacher_id: string, course_id: string, ownershipMap?: Record<string, string>): void {
        this.validateIdentity({ teacher_id, course_id });

        if (!ownershipMap) {
            return;
        }

        const owner = ownershipMap[course_id];
        if (owner && owner !== teacher_id) {
            throw new Error(`UNAUTHORIZED_TEACHER_COURSE_SCOPE: Teacher ${teacher_id} does not own course ${course_id} (owner: ${owner})`);
        }
    }

    validateCoursePeriodScope(
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
                throw new Error(`UNAUTHORIZED_TEACHER_COURSE_SCOPE: Teacher ${teacher_id} is not authorized for course ${course_id}`);
            }
            return;
        }

        if (Array.isArray(authorizedCourses)) {
            if (!authorizedCourses.includes(course_id)) {
                throw new Error(`UNAUTHORIZED_TEACHER_COURSE_SCOPE: Course ${course_id} is outside teacher ${teacher_id} authorized scope`);
            }
        }
    }

    validateCoursePeriodChecksum(expectedChecksum: string, actualChecksum: string): void {
        if (!expectedChecksum || !actualChecksum) {
            throw new Error('MISSING_CHECKSUM: Both expected and actual checksums are required');
        }
        if (expectedChecksum !== actualChecksum) {
            throw new Error(`COURSE_PERIOD_CHECKSUM_MISMATCH: Expected ${expectedChecksum}, found ${actualChecksum}`);
        }
    }
}

export const coursePeriodValidationEngine = new CoursePeriodValidationEngine();
