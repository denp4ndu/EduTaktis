import { ActivitySubmission } from '../types/curriculum';
import { submissionStorage } from './studentActivitySubmissionStorageProvider';
import { deepFreeze } from './aiPromptEngine';

export class StudentActivitySubmissionEngine {
    async createDraft(studentId: string, publicationId: string, activityId: string, content: any): Promise<ActivitySubmission> {
        const submission: ActivitySubmission = deepFreeze({
            submission_id: `SUB-${Date.now()}`,
            version: 1,
            previous_submission_id: null,
            student_id: studentId,
            publication_id: publicationId,
            activity_id: activityId,
            content,
            status: 'DRAFT',
            submitted_at: null,
            feedback: null
        });
        await submissionStorage.saveSubmission(submission);
        return submission;
    }
}
export const studentActivitySubmissionEngine = new StudentActivitySubmissionEngine();
