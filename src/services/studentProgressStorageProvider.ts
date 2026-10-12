import { LearningSession, StudentProgress, AuditEvent } from '../types/curriculum';

export interface StudentProgressStorageProvider {
    createSession(session: LearningSession): Promise<void>;
    getSession(sessionId: string): Promise<LearningSession | null>;
    updateSession(session: LearningSession): Promise<void>;
    createProgressEvent(event: AuditEvent): Promise<void>;
    getProgressHistory(sessionId: string, activityId: string): Promise<AuditEvent[]>;
    getLatestProgress(sessionId: string, activityId: string): Promise<StudentProgress | null>;
    updateProgress(progress: StudentProgress): Promise<void>;
    listProgress(publicationId: string): Promise<StudentProgress[]>;
}

export class InMemoryProgressStorage implements StudentProgressStorageProvider {
    private sessions: Record<string, LearningSession> = {};
    private progress: Record<string, StudentProgress> = {};
    private audits: AuditEvent[] = [];

    async createSession(session: LearningSession): Promise<void> { this.sessions[session.session_id] = session; }
    async getSession(sessionId: string): Promise<LearningSession | null> { return this.sessions[sessionId] || null; }
    async updateSession(session: LearningSession): Promise<void> { this.sessions[session.session_id] = session; }
    async createProgressEvent(event: AuditEvent): Promise<void> { this.audits.push(event); }
    async getProgressHistory(sessionId: string, activityId: string): Promise<AuditEvent[]> { return this.audits.filter(a => a.session_id === sessionId && a.activity_id === activityId); }
    async getLatestProgress(sessionId: string, activityId: string): Promise<StudentProgress | null> { return this.progress[`${sessionId}-${activityId}`] || null; }
    async updateProgress(progress: StudentProgress): Promise<void> { this.progress[`${progress.session_id}-${progress.activity_id}`] = progress; }
    async listProgress(publicationId: string): Promise<StudentProgress[]> { return Object.values(this.progress).filter(p => p.publication_id === publicationId); }
}

export const progressStorage = new InMemoryProgressStorage();
