import { 
    ClassEnrollment, 
    EnrollmentStatus, 
    EnrollmentAuditEvent, 
    StudentRoster, 
    StudentRosterEntry,
    Assignment 
} from '../types/curriculum';
import { classEnrollmentStorage, ClassEnrollmentStorageProvider } from './classEnrollmentStorageProvider';
import { classEnrollmentValidationEngine, ClassEnrollmentValidationEngine } from './classEnrollmentValidationEngine';
import { deepFreeze } from './aiPromptEngine';

export interface CreateEnrollmentParams {
    student_id: string;
    course_id: string;
    class_id?: string;
    initial_status?: EnrollmentStatus;
    actor_id: string;
    actor_role: 'TEACHER' | 'STUDENT' | 'ADMIN' | 'SYSTEM';
    audit_metadata?: Record<string, any>;
    teacher_authorized_courses?: string[] | ((t: string, c: string) => boolean);
}

export class ClassEnrollmentEngine {
    constructor(
        private storage: ClassEnrollmentStorageProvider = classEnrollmentStorage,
        private validator: ClassEnrollmentValidationEngine = classEnrollmentValidationEngine
    ) {}

    async createEnrollment(params: CreateEnrollmentParams): Promise<ClassEnrollment> {
        this.validator.validateIdentity(params.student_id, params.course_id);
        this.validator.validateSecurity(params);

        if (params.actor_role === 'TEACHER' && params.teacher_authorized_courses) {
            this.validator.validateTeacherScope(params.actor_id, params.course_id, params.teacher_authorized_courses);
        }

        const initialStatus: EnrollmentStatus = params.initial_status || 'PENDING';
        this.validator.validateStatusTransition(null, initialStatus);

        const existing = await this.storage.getEnrollmentByStudentAndCourse(params.student_id, params.course_id);
        this.validator.validateDuplicateActive(existing, initialStatus);

        const enrollmentId = `ENR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const enrollment: ClassEnrollment = deepFreeze({
            enrollment_id: enrollmentId,
            student_id: params.student_id,
            course_id: params.course_id,
            class_id: params.class_id,
            enrollment_status: initialStatus,
            version_number: 1,
            created_at: now,
            updated_at: now,
            audit_metadata: params.audit_metadata
        });

        await this.storage.saveEnrollment(enrollment);

        const auditEvent: EnrollmentAuditEvent = deepFreeze({
            event_id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            enrollment_id: enrollmentId,
            student_id: params.student_id,
            course_id: params.course_id,
            previous_status: null,
            new_status: initialStatus,
            actor_id: params.actor_id,
            actor_role: params.actor_role,
            timestamp: now,
            version_number: 1
        });

        await this.storage.saveAuditEvent(auditEvent);
        return enrollment;
    }

    async updateEnrollmentStatus(
        enrollmentId: string,
        targetStatus: EnrollmentStatus,
        actorId: string,
        actorRole: 'TEACHER' | 'STUDENT' | 'ADMIN' | 'SYSTEM',
        teacherAuthorizedCourses?: string[] | ((t: string, c: string) => boolean)
    ): Promise<ClassEnrollment> {
        const current = await this.storage.getEnrollment(enrollmentId);
        if (!current) {
            throw new Error('ENROLLMENT_NOT_FOUND');
        }

        if (actorRole === 'TEACHER' && teacherAuthorizedCourses) {
            this.validator.validateTeacherScope(actorId, current.course_id, teacherAuthorizedCourses);
        }

        if (actorRole === 'STUDENT') {
            this.validator.validateStudentScope(actorId, current.student_id);
            if (targetStatus !== 'WITHDRAWN') {
                throw new Error('UNAUTHORIZED_STUDENT_STATUS_UPDATE');
            }
        }

        this.validator.validateStatusTransition(current.enrollment_status, targetStatus);

        if (targetStatus === 'ACTIVE' && current.enrollment_status !== 'ACTIVE') {
            const existingActive = await this.storage.getEnrollmentByStudentAndCourse(current.student_id, current.course_id);
            if (existingActive && existingActive.enrollment_id !== current.enrollment_id && existingActive.enrollment_status === 'ACTIVE') {
                throw new Error('DUPLICATE_ACTIVE_ENROLLMENT');
            }
        }

        const now = new Date().toISOString();
        const nextVersion = current.version_number + 1;

        const updated: ClassEnrollment = deepFreeze({
            ...current,
            enrollment_status: targetStatus,
            version_number: nextVersion,
            updated_at: now
        });

        await this.storage.saveEnrollment(updated);

        const auditEvent: EnrollmentAuditEvent = deepFreeze({
            event_id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            enrollment_id: current.enrollment_id,
            student_id: current.student_id,
            course_id: current.course_id,
            previous_status: current.enrollment_status,
            new_status: targetStatus,
            actor_id: actorId,
            actor_role: actorRole,
            timestamp: now,
            version_number: nextVersion
        });

        await this.storage.saveAuditEvent(auditEvent);
        return updated;
    }

    async getStudentEnrollments(studentId: string, authenticatedStudentId: string): Promise<ClassEnrollment[]> {
        this.validator.validateStudentScope(authenticatedStudentId, studentId);
        const list = await this.storage.listEnrollmentsByStudent(studentId);
        return deepFreeze(list) as unknown as ClassEnrollment[];
    }

    async getTeacherRoster(
        courseId: string,
        teacherId: string,
        authorizedCourses: string[] | ((t: string, c: string) => boolean),
        classId?: string
    ): Promise<StudentRoster> {
        this.validator.validateTeacherScope(teacherId, courseId, authorizedCourses);

        const enrollments = await this.storage.listEnrollmentsByCourse(courseId);
        const filtered = classId ? enrollments.filter(e => e.class_id === classId) : enrollments;

        const entries: StudentRosterEntry[] = filtered.map(e => ({
            student_id: e.student_id,
            enrollment_id: e.enrollment_id,
            status: e.enrollment_status,
            enrolled_at: e.created_at,
            updated_at: e.updated_at
        }));

        const activeCount = entries.filter(e => e.status === 'ACTIVE').length;

        const roster: StudentRoster = deepFreeze({
            course_id: courseId,
            class_id: classId,
            teacher_id: teacherId,
            generated_at: new Date().toISOString(),
            total_enrolled: entries.length,
            active_students: activeCount,
            entries
        });

        return roster;
    }

    async validateStudentAccess(studentId: string, courseId: string): Promise<{ allowed: boolean; enrollment: ClassEnrollment | null; reason?: string }> {
        const enrollment = await this.storage.getEnrollmentByStudentAndCourse(studentId, courseId);
        if (!enrollment) {
            return { allowed: false, enrollment: null, reason: 'STUDENT_NOT_ENROLLED' };
        }
        if (enrollment.enrollment_status !== 'ACTIVE') {
            return { allowed: false, enrollment, reason: `ENROLLMENT_${enrollment.enrollment_status}` };
        }
        return { allowed: true, enrollment };
    }

    async validateAssignmentVisibility(studentId: string, assignment: Assignment): Promise<{ allowed: boolean; reason?: string }> {
        const access = await this.validateStudentAccess(studentId, assignment.course_id);
        if (!access.allowed) {
            return { allowed: false, reason: access.reason };
        }

        if (assignment.target.target_type === 'STUDENT' && assignment.target.target_id !== studentId) {
            return { allowed: false, reason: 'ASSIGNMENT_TARGET_MISMATCH' };
        }

        if (assignment.status !== 'ACTIVE' && assignment.status !== 'SCHEDULED') {
            return { allowed: false, reason: `ASSIGNMENT_STATUS_${assignment.status}` };
        }

        return { allowed: true };
    }

    async validateSubmissionAuthorization(studentId: string, courseId: string): Promise<{ allowed: boolean; reason?: string }> {
        const access = await this.validateStudentAccess(studentId, courseId);
        if (!access.allowed) {
            throw new Error(`UNAUTHORIZED_SUBMISSION: ${access.reason}`);
        }
        return { allowed: true };
    }

    async validateProgressAuthorization(studentId: string, courseId: string): Promise<{ allowed: boolean; reason?: string }> {
        const access = await this.validateStudentAccess(studentId, courseId);
        if (!access.allowed) {
            throw new Error(`UNAUTHORIZED_PROGRESS_ACCESS: ${access.reason}`);
        }
        return { allowed: true };
    }
}

export const classEnrollmentEngine = new ClassEnrollmentEngine();
