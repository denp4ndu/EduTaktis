import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authoringEngine } from './aiEducationalArtifactAuthoringEngine';
import { repositoryEngine } from './aiEducationalArtifactRepositoryEngine';
import { EducationalContentArtifact } from '../types/curriculum';

let mockStorage: Record<string, string> = {};

beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal('localStorage', {
        getItem: vi.fn((key: string) => mockStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
        clear: vi.fn(() => { mockStorage = {}; }),
    });
});

const mockContext: any = { authority: 'AUTH-KEMENAG', institution: 'MTs', phase: 'D', subject_id: 'SUBJ-FIKIH', curriculum: 'CURR-MERDEKA-MAD', pedagogical_context: 'KURIKULUM_BERBASIS_CINTA', cp_verification_status: 'VERIFIED' };
const validArtifact: EducationalContentArtifact = { 
    title: 'T', 
    learning_objectives: ['O'], 
    learning_activities: ['A'], 
    assessment: 'A', 
    curriculum_context: mockContext,
    prerequisite: null,
    teaching_method: 'Direct',
    learning_steps: [],
    assessment_criteria: ['Rubric'],
    learning_resources: [],
    teacher_notes: '',
    differentiation: null,
    student_task: null,
    warnings: [],
    generated_at: new Date().toISOString()
};

describe('EduTaktis Phase 18: Authoring Engine', () => {
  it('TEST-104: Valid artifact can create editable draft', async () => {
    const saved = await repositoryEngine.createArtifact(validArtifact);
    const draft = await authoringEngine.createDraftFromArtifact(saved.metadata.artifactId);
    expect(draft.title).toBe(validArtifact.title);
  });

  it('TEST-106: Teacher can edit title', async () => {
    const saved = await repositoryEngine.createArtifact(validArtifact);
    await authoringEngine.createDraftFromArtifact(saved.metadata.artifactId);
    const updated = authoringEngine.updateDraft({ title: 'New Title' });
    expect(updated.title).toBe('New Title');
  });

  it('TEST-111: Authority cannot be modified', async () => {
    const saved = await repositoryEngine.createArtifact(validArtifact);
    await authoringEngine.createDraftFromArtifact(saved.metadata.artifactId);
    
    // Attempt illegal modification
    const illegalContext = {...mockContext, authority: 'AUTH-PEND'};
    authoringEngine.updateDraft({ curriculum_context: illegalContext });
    
    expect(authoringEngine.validateDraft()).toBe(false);
  });

  it('TEST-121: Invalid draft cannot be committed', async () => {
      const saved = await repositoryEngine.createArtifact(validArtifact);
      await authoringEngine.createDraftFromArtifact(saved.metadata.artifactId);
      authoringEngine.updateDraft({ title: '' }); // Invalid
      await expect(authoringEngine.commitDraft()).rejects.toThrow();
  });
});
