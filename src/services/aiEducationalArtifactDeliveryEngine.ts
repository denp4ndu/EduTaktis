import { PublishedArtifact, PublishedLearningContent } from '../types/curriculum';
import { deliveryProvider } from './artifactDeliveryProvider';
import { persistenceEngine } from './aiEducationalArtifactPersistenceEngine';
import { deepFreeze } from './aiPromptEngine';

export class DeliveryEngine {

    async getPublishedArtifact(publicationId: string): Promise<PublishedArtifact> {
        const publication = await deliveryProvider.get(publicationId);
        if (!publication) throw new Error('PUBLICATION_NOT_FOUND');
        if (publication.publication_status !== 'PUBLISHED') throw new Error('PUBLICATION_NOT_PUBLISHED');
        
        // Verify Checksum
        if (persistenceEngine.calculateChecksum(publication.educational_content) !== publication.source_checksum) {
            throw new Error('DELIVERY_CHECKSUM_MISMATCH');
        }

        return deepFreeze(publication);
    }

    async listPublishedArtifacts(): Promise<PublishedArtifact[]> {
        const list = await deliveryProvider.list();
        return list.filter(p => p.publication_status === 'PUBLISHED').map(p => deepFreeze(p));
    }

    async getPublishedContent(publicationId: string): Promise<PublishedLearningContent> {
        const artifact = await this.getPublishedArtifact(publicationId);
        
        const content: PublishedLearningContent = {
            publication_id: artifact.publication_id,
            artifact_id: artifact.artifact_id,
            source_version: artifact.source_version,
            title: artifact.educational_content.title,
            curriculum_context: artifact.curriculum_context,
            learning_objectives: artifact.educational_content.learning_objectives,
            learning_activities: artifact.educational_content.learning_activities,
            assessment: artifact.educational_content.assessment,
            learning_resources: artifact.educational_content.learning_resources,
            differentiation: artifact.educational_content.differentiation,
            student_task: artifact.educational_content.student_task,
            teacher_notes: artifact.educational_content.teacher_notes,
        };
        
        return deepFreeze(content);
    }
}

export const deliveryEngine = new DeliveryEngine();
