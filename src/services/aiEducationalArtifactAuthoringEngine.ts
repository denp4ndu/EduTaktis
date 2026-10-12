import { EducationalContentArtifact, PersistedArtifact } from '../types/curriculum';
import { repositoryEngine } from './aiEducationalArtifactRepositoryEngine';
import { validateEducationalArtifact } from './aiEducationalArtifactValidationEngine';
import { validateAuthoringDraft } from './aiEducationalArtifactAuthoringValidationEngine';
import { deepFreeze } from './aiPromptEngine';

export type AuthoringState = 'idle' | 'editing' | 'validating' | 'invalid' | 'committing' | 'error';

export class AuthoringEngine {
    private currentDraft: EducationalContentArtifact | null = null;
    private originalArtifact: EducationalContentArtifact | null = null;
    private artifactId: string | null = null;

    async createDraftFromArtifact(artifactId: string): Promise<EducationalContentArtifact> {
        const persisted = await repositoryEngine.getLatestArtifact(artifactId);
        this.originalArtifact = deepFreeze(persisted.artifact);
        this.currentDraft = JSON.parse(JSON.stringify(this.originalArtifact)); // Deep clone for editing
        this.artifactId = artifactId;
        return this.currentDraft!;
    }

    updateDraft(changes: Partial<EducationalContentArtifact>): EducationalContentArtifact {
        if (!this.currentDraft) throw new Error('No active draft');
        this.currentDraft = deepFreeze({ ...this.currentDraft, ...changes });
        return this.currentDraft;
    }

    validateDraft(): boolean {
        if (!this.currentDraft || !this.originalArtifact) return false;
        const authoringIssues = validateAuthoringDraft(this.currentDraft, this.originalArtifact);
        const artifactIssues = validateEducationalArtifact(this.currentDraft, this.currentDraft.curriculum_context);
        return authoringIssues.length === 0 && artifactIssues.isValid;
    }

    async commitDraft(): Promise<PersistedArtifact> {
        if (!this.validateDraft() || !this.currentDraft || !this.artifactId) throw new Error('Invalid draft');
        const saved = await repositoryEngine.createArtifact(this.currentDraft);
        return saved;
    }
}

export const authoringEngine = new AuthoringEngine();
