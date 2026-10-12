import { PersistedArtifact, EducationalContentArtifact, ArtifactQuery } from '../types/curriculum';
import { persistenceEngine } from './aiEducationalArtifactPersistenceEngine';
import { deepFreeze } from './aiPromptEngine';
import { validateEducationalArtifact } from './aiEducationalArtifactValidationEngine';

export type RepositoryErrorType =
  | 'REPOSITORY_ARTIFACT_NOT_FOUND'
  | 'REPOSITORY_VERSION_NOT_FOUND'
  | 'REPOSITORY_INVALID_ARTIFACT'
  | 'REPOSITORY_INTEGRITY_ERROR'
  | 'REPOSITORY_DELETE_CONFIRMATION_REQUIRED';

export class RepositoryError extends Error {
  constructor(public code: RepositoryErrorType, message: string) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class ArtifactRepository {
  async createArtifact(artifact: EducationalContentArtifact): Promise<PersistedArtifact> {
    // Pipeline: validate -> deepFreeze -> persistence
    const saved = await persistenceEngine.saveArtifact(artifact);
    return deepFreeze(saved);
  }

  async getLatestArtifact(artifactId: string): Promise<PersistedArtifact> {
    const artifact = await persistenceEngine.getLatestArtifactVersion(artifactId);
    return deepFreeze(artifact);
  }

  async softDeleteArtifact(artifactId: string): Promise<void> {
    // Logic to mark as deleted in persistence metadata
    // For now, implementing as deletion from storage if per Phase 15 requirements
    const history = await persistenceEngine.listArtifacts({ artifactId });
    for (const item of history) {
        await persistenceEngine.deleteArtifact(item.metadata.versionId);
    }
  }

  // Placeholder for search/filter/sort
  async searchArtifacts(query: ArtifactQuery): Promise<PersistedArtifact[]> {
    const all = await persistenceEngine.listArtifacts();
    return all.filter((a: PersistedArtifact) => 
      (!query.artifactId || a.metadata.artifactId === query.artifactId) &&
      (!query.authorityId || a.artifact.curriculum_context.authority === query.authorityId)
    );
  }
}

export const repositoryEngine = new ArtifactRepository();
