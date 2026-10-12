import { EnrollmentStatus, ClassEnrollment } from '../types/curriculum';

export class ClassEnrollmentValidationEngine {
    private static readonly SENSITIVE_PATTERNS = [
        /AIzaSy[A-Za-z0-9_-]{15,}/i,
        /sk-[A-Za-z0-9_-]{15,}/i,
        /bearer\s+[A-Za-z0-9_\-\.]{15,}/i,
        /system\s+prompt/i,
        /gemini/i,
        /generateContent/i
    ];

    validateIdentity(studentId?: string, courseId?: string): void {
        if (!studentId || typeof studentId !== 'string' || studentId.trim().length === 0) {
            throw new Error('MISSING_OR_INVALID_STUDENT_ID');
        }
        if (!courseId || typeof courseId !== 'string' || courseId.trim().length === 0) {
            throw new Error('MISSING_OR_INVALID_COURSE_ID');
        }
    }

    validateStudentScope(authenticatedStudentId: string, targetStudentId: string): void {
        if (!authenticatedStudentId || authenticatedStudentId !== targetStudentId) {
            throw new Error('UNAUTHORIZED_STUDENT_SCOPE');
        }
    }

    validateTeacherScope(teacherId: string, courseId: string, authorizedCourses: string[] | ((t: string, c: string) => boolean)): void {
        if (!teacherId || typeof teacherId !== 'string' || teacherId.trim().length === 0) {
            throw new Error('MISSING_OR_INVALID_TEACHER_ID');
        }
        if (typeof authorizedCourses === 'function') {
            if (!authorizedCourses(teacherId, courseId)) {
                throw new Error('UNAUTHORIZED_TEACHER_SCOPE');
            }
        } else if (Array.isArray(authorizedCourses)) {
            if (!authorizedCourses.includes(courseId)) {
                throw new Error('UNAUTHORIZED_TEACHER_SCOPE');
            }
        }
    }

    validateStatusTransition(currentStatus: EnrollmentStatus | null, targetStatus: EnrollmentStatus): void {
        if (!currentStatus) {
            if (targetStatus !== 'PENDING' && targetStatus !== 'ACTIVE') {
                throw new Error(`INVALID_INITIAL_ENROLLMENT_STATUS: ${targetStatus}`);
            }
            return;
        }

        if (currentStatus === targetStatus) {
            return;
        }

        if (currentStatus === 'WITHDRAWN') {
            throw new Error('TERMINAL_STATE_WITHDRAWN_CANNOT_TRANSITION');
        }

        if (currentStatus === 'COMPLETED') {
            throw new Error('COMPLETED_STATE_CANNOT_TRANSITION');
        }

        const validTransitions: Record<EnrollmentStatus, EnrollmentStatus[]> = {
            PENDING: ['ACTIVE', 'WITHDRAWN'],
            ACTIVE: ['SUSPENDED', 'WITHDRAWN', 'COMPLETED'],
            SUSPENDED: ['ACTIVE', 'WITHDRAWN'],
            WITHDRAWN: [],
            COMPLETED: []
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            throw new Error(`INVALID_ENROLLMENT_TRANSITION: ${currentStatus} -> ${targetStatus}`);
        }
    }

    validateSecurity(data: any): void {
        const jsonStr = JSON.stringify(data || {});
        for (const pattern of ClassEnrollmentValidationEngine.SENSITIVE_PATTERNS) {
            if (pattern.test(jsonStr)) {
                throw new Error('SECURITY_LEAKAGE_DETECTED');
            }
        }
    }

    validateDuplicateActive(existingEnrollment: ClassEnrollment | null, targetStatus: EnrollmentStatus): void {
        if (existingEnrollment && existingEnrollment.enrollment_status === 'ACTIVE' && targetStatus === 'ACTIVE') {
            throw new Error('DUPLICATE_ACTIVE_ENROLLMENT');
        }
    }
}

export const classEnrollmentValidationEngine = new ClassEnrollmentValidationEngine();
