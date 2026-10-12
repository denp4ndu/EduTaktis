import { ArtifactStorageProvider } from './artifactStorageProvider';
import { PersistedArtifact, ArtifactQuery } from '../types/curriculum';

const STORAGE_KEY = 'edutaktis_artifacts';

export class LocalStorageArtifactStorageProvider implements ArtifactStorageProvider {
  private getStorage(): Record<string, PersistedArtifact> {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  }

  private setStorage(storage: Record<string, PersistedArtifact>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  }

  async save(persisted: PersistedArtifact): Promise<void> {
    const storage = this.getStorage();
    storage[persisted.metadata.versionId] = persisted;
    this.setStorage(storage);
  }

  async get(versionId: string): Promise<PersistedArtifact | null> {
    return this.getStorage()[versionId] || null;
  }

  async list(query?: ArtifactQuery): Promise<PersistedArtifact[]> {
    const storage = this.getStorage();
    let results = Object.values(storage);
    
    if (query?.artifactId) {
      results = results.filter(a => a.metadata.artifactId === query.artifactId);
    }
    return results;
  }

  async delete(versionId: string): Promise<void> {
    const storage = this.getStorage();
    delete storage[versionId];
    this.setStorage(storage);
  }

  async exists(versionId: string): Promise<boolean> {
    return !!this.getStorage()[versionId];
  }
}
