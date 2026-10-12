import { StudentProgress, AuditEvent } from '../types/curriculum';
import { progressStorage } from './studentProgressStorageProvider';
import { learningSessionEngine } from './learningSessionEngine';
import { deliveryEngine } from './aiEducationalArtifactDeliveryEngine';
import { deepFreeze } from './aiPromptEngine';

export class StudentProgressEngine {
    async startActivity(studentId: string, sessionId: string, activityId: string): Promise<StudentProgress> {
        const session = await learningSessionEngine.getSession(sessionId);
        if (!session || session.student_id !== studentId) throw new Error('SESSION_ACCESS_DENIED');
        
        const content = await deliveryEngine.getPublishedContent(session.publication_id);
        if (!content.learning_activities.includes(activityId)) throw new Error('INVALID_ACTIVITY');
        
        const progress: StudentProgress = deepFreeze({
            progress_id: `PROG-${sessionId}-${activityId}-${Date.now()}`,
            session_id: sessionId,
            student_id: studentId,
            publication_id: session.publication_id,
            activity_id: activityId,
            progress_percent: 0,
            status: 'NOT_STARTED',
            started_at: new Date().toISOString(),
            last_updated_at: new Date().toISOString()
        });
        
        await progressStorage.updateProgress(progress);
        return progress;
    }

    async updateActivityProgress(studentId: string, sessionId: string, activityId: string, percent: number): Promise<StudentProgress> {
        if (percent < 0 || percent > 100 || isNaN(percent) || !isFinite(percent)) throw new Error('INVALID_PROGRESS');
        
        let progress = await progressStorage.getLatestProgress(sessionId, activityId);
        if (!progress) {
            const newProgress: StudentProgress = deepFreeze({
                progress_id: `PROG-${sessionId}-${activityId}-${Date.now()}`,
                session_id: sessionId,
                student_id: studentId,
                publication_id: `PUB-${sessionId}`,
                activity_id: activityId,
                progress_percent: percent,
                status: percent === 100 ? 'COMPLETED' : (percent > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'),
                started_at: new Date().toISOString(),
                last_updated_at: new Date().toISOString()
            });
            await progressStorage.updateProgress(newProgress);
            return newProgress;
        }
        
        if (progress.student_id !== studentId) throw new Error('SESSION_ACCESS_DENIED');
        
        const newStatus = percent === 100 ? 'COMPLETED' : (percent > 0 ? 'IN_PROGRESS' : 'NOT_STARTED');
        
        const newProgress: StudentProgress = deepFreeze({
            ...progress,
            progress_percent: percent,
            status: newStatus,
            last_updated_at: new Date().toISOString()
        });
        
        await progressStorage.updateProgress(newProgress);
        return newProgress;
    }
}

export const studentProgressEngine = new StudentProgressEngine();
