import { PersistedArtifact, ArtifactQuery } from '../types/curriculum';

export interface ArtifactStorageProvider {
  save(persisted: PersistedArtifact): Promise<void>;
  get(versionId: string): Promise<PersistedArtifact | null>;
  list(query?: ArtifactQuery): Promise<PersistedArtifact[]>;
  delete(versionId: string): Promise<void>;
  exists(versionId: string): Promise<boolean>;
}
