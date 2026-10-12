import { ActivitySubmission, SubmissionAuditEvent } from '../types/curriculum';

export interface SubmissionStorageProvider {
    saveSubmission(submission: ActivitySubmission): Promise<void>;
    getSubmission(submissionId: string): Promise<ActivitySubmission | null>;
    listStudentSubmissions(studentId: string, activityId: string): Promise<ActivitySubmission[]>;
    createAuditEvent(event: SubmissionAuditEvent): Promise<void>;
}

export class InMemorySubmissionStorage implements SubmissionStorageProvider {
    private submissions: Record<string, ActivitySubmission> = {};
    private audits: SubmissionAuditEvent[] = [];

    async saveSubmission(submission: ActivitySubmission): Promise<void> { this.submissions[submission.submission_id] = submission; }
    async getSubmission(submissionId: string): Promise<ActivitySubmission | null> { return this.submissions[submissionId] || null; }
    async listStudentSubmissions(studentId: string, activityId: string): Promise<ActivitySubmission[]> {
        return Object.values(this.submissions).filter(s => s.student_id === studentId && s.activity_id === activityId);
    }
    async createAuditEvent(event: SubmissionAuditEvent): Promise<void> { this.audits.push(event); }
}

export const submissionStorage = new InMemorySubmissionStorage();
