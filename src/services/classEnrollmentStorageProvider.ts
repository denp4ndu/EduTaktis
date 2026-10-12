import { ClassEnrollment, EnrollmentAuditEvent } from '../types/curriculum';

export interface ClassEnrollmentStorageProvider {
    saveEnrollment(enrollment: ClassEnrollment): Promise<void>;
    getEnrollment(enrollmentId: string): Promise<ClassEnrollment | null>;
    getEnrollmentByStudentAndCourse(studentId: string, courseId: string): Promise<ClassEnrollment | null>;
    listEnrollmentsByCourse(courseId: string): Promise<ClassEnrollment[]>;
    listEnrollmentsByStudent(studentId: string): Promise<ClassEnrollment[]>;
    saveAuditEvent(event: EnrollmentAuditEvent): Promise<void>;
    getAuditEvents(enrollmentId: string): Promise<EnrollmentAuditEvent[]>;
    clear(): Promise<void>;
}

export class InMemoryClassEnrollmentStorage implements ClassEnrollmentStorageProvider {
    private enrollments: Map<string, ClassEnrollment> = new Map();
    private enrollmentHistory: Map<string, ClassEnrollment[]> = new Map();
    private auditEvents: EnrollmentAuditEvent[] = [];

    async saveEnrollment(enrollment: ClassEnrollment): Promise<void> {
        this.enrollments.set(enrollment.enrollment_id, enrollment);
        const history = this.enrollmentHistory.get(enrollment.enrollment_id) || [];
        history.push(enrollment);
        this.enrollmentHistory.set(enrollment.enrollment_id, history);
    }

    async getEnrollment(enrollmentId: string): Promise<ClassEnrollment | null> {
        return this.enrollments.get(enrollmentId) || null;
    }

    async getEnrollmentByStudentAndCourse(studentId: string, courseId: string): Promise<ClassEnrollment | null> {
        for (const enrollment of this.enrollments.values()) {
            if (enrollment.student_id === studentId && enrollment.course_id === courseId) {
                return enrollment;
            }
        }
        return null;
    }

    async listEnrollmentsByCourse(courseId: string): Promise<ClassEnrollment[]> {
        return Array.from(this.enrollments.values()).filter(e => e.course_id === courseId);
    }

    async listEnrollmentsByStudent(studentId: string): Promise<ClassEnrollment[]> {
        return Array.from(this.enrollments.values()).filter(e => e.student_id === studentId);
    }

    async saveAuditEvent(event: EnrollmentAuditEvent): Promise<void> {
        this.auditEvents.push(event);
    }

    async getAuditEvents(enrollmentId: string): Promise<EnrollmentAuditEvent[]> {
        return this.auditEvents.filter(e => e.enrollment_id === enrollmentId);
    }

    async clear(): Promise<void> {
        this.enrollments.clear();
        this.enrollmentHistory.clear();
        this.auditEvents = [];
    }
}

export const classEnrollmentStorage = new InMemoryClassEnrollmentStorage();
