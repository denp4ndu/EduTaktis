import React from 'react';
import { teacherAssignmentEngine } from '../services/teacherAssignmentEngine';

export const TeacherAssignmentWorkspace: React.FC<{ teacherId: string }> = ({ teacherId }) => {
    const handleCreate = async () => {
        await teacherAssignmentEngine.createAssignment({
            assignment_id: `ASGN-${Date.now()}`,
            teacher_id: teacherId,
            course_id: 'C1',
            publication_id: 'P1',
            artifact_id: 'ART1',
            version_number: 1,
            activity_id: 'ACT1',
            target: { target_type: 'CLASS', target_id: 'CLASS1' },
            status: 'DRAFT',
            schedule: { start_at: '2026-10-01', due_at: '2026-10-10', timezone: 'UTC' },
            policy: { allow_submission: true, allow_resubmission: true, allow_late_submission: false, max_attempts: 1, requires_teacher_review: true },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    };

    return (
        <div className="p-4">
            <h1>Teacher Assignment Workspace</h1>
            <button className="bg-blue-500 text-white p-2" onClick={handleCreate}>Create Assignment</button>
        </div>
    );
};
