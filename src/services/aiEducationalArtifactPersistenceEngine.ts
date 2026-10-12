/**
 * EduTaktis AI Educational Artifact Persistence Engine
 * Phase 15 - Versioning, Traceability, and Immutability
 */

import { EducationalContentArtifact, PersistedArtifact } from '../types/curriculum';
import { validateEducationalArtifact } from './aiEducationalArtifactValidationEngine';
import { ArtifactStorageProvider } from './artifactStorageProvider';
import { LocalStorageArtifactStorageProvider } from './localStorageArtifactStorageProvider';
import { deepFreeze } from './aiPromptEngine';

export type PersistenceErrorType =
  | 'ARTIFACT_NOT_FOUND'
  | 'ARTIFACT_INVALID'
  | 'ARTIFACT_VERSION_NOT_FOUND'
  | 'ARTIFACT_VERSION_CONFLICT'
  | 'ARTIFACT_STORAGE_ERROR'
  | 'ARTIFACT_INTEGRITY_ERROR'
  | 'ARTIFACT_MUTATION_DETECTED';

export class PersistenceError extends Error {
  constructor(public code: PersistenceErrorType, message: string) {
    super(message);
    this.name = 'PersistenceError';
  }
}

export class PersistenceEngine {
  private storage: ArtifactStorageProvider = new LocalStorageArtifactStorageProvider();

  async saveArtifact(artifact: EducationalContentArtifact, artifactId?: string): Promise<PersistedArtifact> {
    if (!artifact) throw new PersistenceError('ARTIFACT_INVALID', 'Artifact is null');

    // 1. Validation Gate
    const validation = validateEducationalArtifact(artifact, artifact.curriculum_context);
    if (!validation.isValid) throw new PersistenceError('ARTIFACT_INVALID', 'Artifact validation failed');

    // 2. Versioning Logic
    const history = await this.storage.list({ artifactId: artifactId || 'new' });
    const versionNumber = history.length + 1;
    const now = new Date().toISOString();
    
    const metadata = {
        artifactId: artifactId || `ART-${Math.random().toString(36).substring(2, 9)}`,
        versionId: `VER-${Math.random().toString(36).substring(2, 9)}`,
        versionNumber,
        createdAt: history.length === 0 ? now : history[0].metadata.createdAt,
        updatedAt: now,
        checksum: this.calculateChecksum(artifact)
    };

    const persisted: PersistedArtifact = deepFreeze({ artifact: validation.artifact!, metadata });
    await this.storage.save(persisted);
    return persisted;
  }

  async getLatestArtifactVersion(artifactId: string): Promise<PersistedArtifact> {
    const history = await this.storage.list({ artifactId });
    if (history.length === 0) throw new PersistenceError('ARTIFACT_NOT_FOUND', 'Artifact not found');
    return history.sort((a, b) => b.metadata.versionNumber - a.metadata.versionNumber)[0];
  }

  async listArtifacts(query?: any): Promise<PersistedArtifact[]> {
    return await this.storage.list(query);
  }

  async deleteArtifact(versionId: string): Promise<void> {
    await this.storage.delete(versionId);
  }

  public calculateChecksum(artifact: EducationalContentArtifact): string {
    return btoa(JSON.stringify(artifact));
  }
}

export const persistenceEngine = new PersistenceEngine();
