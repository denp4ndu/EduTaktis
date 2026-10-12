import { PublishedArtifact, PublicationStatus, PublicationMetadata } from '../types/curriculum';
import { repositoryEngine } from './aiEducationalArtifactRepositoryEngine';
import { approvalEngine } from './aiEducationalArtifactApprovalEngine';
import { validateEducationalArtifact } from './aiEducationalArtifactValidationEngine';
import { persistenceEngine } from './aiEducationalArtifactPersistenceEngine';
import { deepFreeze } from './aiPromptEngine';
import { deliveryProvider } from './artifactDeliveryProvider';

const publicationHistory: Record<string, PublicationMetadata[]> = {};

export class PublishingEngine {

    async publishArtifact(artifactId: string, versionNumber: number): Promise<PublishedArtifact> {
        const artifact = await repositoryEngine.getLatestArtifact(artifactId);
        
        // 1. Validation
        if (artifact.metadata.versionNumber !== versionNumber) throw new Error('VERSION_MISMATCH');
        
        const status = await approvalEngine.getApprovalStatus(artifactId);
        if (status?.status !== 'released') throw new Error('ARTIFACT_NOT_RELEASED');
        
        const validation = validateEducationalArtifact(artifact.artifact, artifact.artifact.curriculum_context);
        if (!validation.isValid) throw new Error('INVALID_ARTIFACT');
        
        if (persistenceEngine.calculateChecksum(artifact.artifact) !== artifact.metadata.checksum) throw new Error('CHECKSUM_MISMATCH');
        
        // 2. Publication
        const publicationId = `PUB-${artifactId}-${versionNumber}-${Date.now()}`;
        const metadata: PublicationMetadata = {
            publication_id: publicationId,
            artifact_id: artifactId,
            source_version: versionNumber,
            source_checksum: artifact.metadata.checksum,
            published_at: new Date().toISOString(),
            published_by: 'SYSTEM',
            publication_status: 'PUBLISHED'
        };
        
        const publishedArtifact: PublishedArtifact = deepFreeze({
            artifact_id: artifactId,
            source_version: versionNumber,
            source_checksum: artifact.metadata.checksum,
            published_at: metadata.published_at,
            publication_id: publicationId,
            publication_status: 'PUBLISHED',
            curriculum_context: artifact.artifact.curriculum_context,
            educational_content: artifact.artifact,
            publication_metadata: metadata
        });

        if (!publicationHistory[artifactId]) publicationHistory[artifactId] = [];
        publicationHistory[artifactId].push(deepFreeze(metadata));
        
        await deliveryProvider.deliver(publishedArtifact);
        
        return publishedArtifact;
    }
}

export const publishingEngine = new PublishingEngine();
