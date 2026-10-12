import { Assignment, AssignmentAuditEvent } from '../types/curriculum';

export interface AssignmentStorageProvider {
    saveAssignment(assignment: Assignment): Promise<void>;
    getAssignment(assignmentId: string): Promise<Assignment | null>;
    listTeacherAssignments(teacherId: string): Promise<Assignment[]>;
    createAuditEvent(event: AssignmentAuditEvent): Promise<void>;
}

export class InMemoryAssignmentStorage implements AssignmentStorageProvider {
    private assignments: Record<string, Assignment> = {};
    private audits: AssignmentAuditEvent[] = [];

    async saveAssignment(assignment: Assignment): Promise<void> { this.assignments[assignment.assignment_id] = assignment; }
    async getAssignment(assignmentId: string): Promise<Assignment | null> { return this.assignments[assignmentId] || null; }
    async listTeacherAssignments(teacherId: string): Promise<Assignment[]> {
        return Object.values(this.assignments).filter(a => a.teacher_id === teacherId);
    }
    async createAuditEvent(event: AssignmentAuditEvent): Promise<void> { this.audits.push(event); }
}

export const assignmentStorage = new InMemoryAssignmentStorage();
