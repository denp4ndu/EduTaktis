import { EducationalContentArtifact, ApprovalMetadata, LifecycleStatus } from '../types/curriculum';
import { repositoryEngine } from './aiEducationalArtifactRepositoryEngine';
import { persistenceEngine } from './aiEducationalArtifactPersistenceEngine';
import { validateEducationalArtifact } from './aiEducationalArtifactValidationEngine';
import { deepFreeze } from './aiPromptEngine';

// Simple in-memory storage for approval state, mapping artifactId to latest status.
// A more robust implementation would use PersistenceEngine.
const approvalStates: Record<string, ApprovalMetadata[]> = {};

export class ApprovalEngine {
    
    async getApprovalStatus(artifactId: string): Promise<ApprovalMetadata | null> {
        const history = approvalStates[artifactId];
        if (!history || history.length === 0) return null;
        return history[history.length - 1];
    }

    private async addApprovalEvent(metadata: ApprovalMetadata): Promise<void> {
        if (!approvalStates[metadata.artifact_id]) approvalStates[metadata.artifact_id] = [];
        approvalStates[metadata.artifact_id].push(deepFreeze(metadata));
    }

    async submitForReview(artifactId: string): Promise<void> {
        const artifact = await repositoryEngine.getLatestArtifact(artifactId);
        const current = await this.getApprovalStatus(artifactId);
        const status = current?.status || 'draft';
        if (status !== 'draft' && status !== 'rejected') throw new Error('APPROVAL_NOT_ALLOWED');
        
        await this.addApprovalEvent({
            artifact_id: artifactId,
            version_number: artifact.metadata.versionNumber,
            status: 'under_review',
            checksum: artifact.metadata.checksum,
            previous_status: status,
            submitted_at: new Date().toISOString()
        });
    }

    async approveArtifact(artifactId: string, reviewer_note?: string): Promise<void> {
        const artifact = await repositoryEngine.getLatestArtifact(artifactId);
        const current = await this.getApprovalStatus(artifactId);
        if (current?.status !== 'under_review') throw new Error('APPROVAL_NOT_ALLOWED');
        
        // Validation Gate
        const validation = validateEducationalArtifact(artifact.artifact, artifact.artifact.curriculum_context);
        if (!validation.isValid) throw new Error('ARTIFACT_VALIDATION_FAILED');
        if (persistenceEngine.calculateChecksum(artifact.artifact) !== artifact.metadata.checksum) throw new Error('ARTIFACT_CHECKSUM_MISMATCH');
        
        await this.addApprovalEvent({
            artifact_id: artifactId,
            version_number: artifact.metadata.versionNumber,
            status: 'approved',
            checksum: artifact.metadata.checksum,
            previous_status: 'under_review',
            reviewed_at: new Date().toISOString(),
            reviewer_note
        });
    }

    async releaseArtifact(artifactId: string): Promise<void> {
        const artifact = await repositoryEngine.getLatestArtifact(artifactId);
        const current = await this.getApprovalStatus(artifactId);
        if (current?.status !== 'approved') throw new Error('RELEASE_NOT_ALLOWED');
        
        await this.addApprovalEvent({
            artifact_id: artifactId,
            version_number: artifact.metadata.versionNumber,
            status: 'released',
            checksum: artifact.metadata.checksum,
            previous_status: 'approved',
            released_at: new Date().toISOString()
        });
    }

    async rejectArtifact(artifactId: string, rejection_reason: string): Promise<void> {
        if (!rejection_reason || rejection_reason.trim() === '') throw new Error('MISSING_REJECTION_REASON');
        const artifact = await repositoryEngine.getLatestArtifact(artifactId);
        const current = await this.getApprovalStatus(artifactId);
        if (current?.status !== 'under_review') throw new Error('APPROVAL_NOT_ALLOWED');
        
        await this.addApprovalEvent({
            artifact_id: artifactId,
            version_number: artifact.metadata.versionNumber,
            status: 'rejected',
            checksum: artifact.metadata.checksum,
            previous_status: 'under_review',
            reviewed_at: new Date().toISOString(),
            rejection_reason
        });
    }

    async clearApprovalStates(): Promise<void> {
        for (const key in approvalStates) delete approvalStates[key];
    }
    async archiveArtifact(artifactId: string): Promise<void> {
        const artifact = await repositoryEngine.getLatestArtifact(artifactId);
        const current = await this.getApprovalStatus(artifactId);
        const status = current?.status || 'draft';
        if (status !== 'approved' && status !== 'released') throw new Error('APPROVAL_NOT_ALLOWED');
        
        await this.addApprovalEvent({
            artifact_id: artifactId,
            version_number: artifact.metadata.versionNumber,
            status: 'archived',
            checksum: artifact.metadata.checksum,
            previous_status: status,
            released_at: new Date().toISOString()
        });
    }
}

export const approvalEngine = new ApprovalEngine();
