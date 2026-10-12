import { ActivitySubmission, TeacherFeedback } from '../types/curriculum';
import { submissionStorage } from './studentActivitySubmissionStorageProvider';
import { deepFreeze } from './aiPromptEngine';

export class TeacherSubmissionReviewEngine {
    async provideFeedback(submissionId: string, teacherId: string, feedback: TeacherFeedback): Promise<ActivitySubmission> {
        if (feedback.score !== null && (feedback.score < 0 || feedback.score > 100)) throw new Error('INVALID_SCORE');
        
        const submission = await submissionStorage.getSubmission(submissionId);
        if (!submission) throw new Error('SUBMISSION_NOT_FOUND');
        
        const reviewedSubmission: ActivitySubmission = deepFreeze({
            ...submission,
            status: feedback.review_status,
            feedback: feedback
        });
        
        await submissionStorage.saveSubmission(reviewedSubmission);
        return reviewedSubmission;
    }
}
export const teacherSubmissionReviewEngine = new TeacherSubmissionReviewEngine();
