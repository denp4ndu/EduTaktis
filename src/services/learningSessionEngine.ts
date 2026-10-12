import { LearningSession } from '../types/curriculum';
import { deliveryEngine } from './aiEducationalArtifactDeliveryEngine';
import { progressStorage } from './studentProgressStorageProvider';
import { deepFreeze } from './aiPromptEngine';

export class LearningSessionEngine {
    async startSession(studentId: string, publicationId: string): Promise<LearningSession> {
        const publication = await deliveryEngine.getPublishedArtifact(publicationId);
        
        const session: LearningSession = deepFreeze({
            session_id: `SES-${studentId}-${publicationId}-${Date.now()}`,
            student_id: studentId,
            publication_id: publicationId,
            artifact_id: publication.artifact_id,
            source_version: publication.source_version,
            source_checksum: publication.source_checksum,
            started_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
            status: 'ACTIVE'
        });
        
        await progressStorage.createSession(session);
        return session;
    }
    
    async getSession(sessionId: string): Promise<LearningSession | null> {
        return await progressStorage.getSession(sessionId);
    }
}

export const learningSessionEngine = new LearningSessionEngine();
