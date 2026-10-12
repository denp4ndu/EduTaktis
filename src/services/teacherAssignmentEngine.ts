import { Assignment } from '../types/curriculum';
import { assignmentStorage } from './teacherAssignmentStorageProvider';
import { deepFreeze } from './aiPromptEngine';

export class TeacherAssignmentEngine {
    async createAssignment(assignment: Assignment): Promise<Assignment> {
        if (assignment.policy.max_attempts < 1) throw new Error('INVALID_POLICY');
        const frozenAssignment = deepFreeze(assignment);
        await assignmentStorage.saveAssignment(frozenAssignment);
        return frozenAssignment;
    }
}
export const teacherAssignmentEngine = new TeacherAssignmentEngine();
