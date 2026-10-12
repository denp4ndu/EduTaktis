import { describe, it, expect, vi, beforeEach } from 'vitest';
import { diffEngine } from './aiEducationalArtifactDiffEngine';
import { persistenceEngine } from './aiEducationalArtifactPersistenceEngine';
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
const baseArtifact: EducationalContentArtifact = { 
    title: 'T1', 
    learning_objectives: ['O1'], 
    learning_activities: ['A1'], 
    assessment: 'A1', 
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

describe('EduTaktis Phase 19: Diff Engine', () => {
  it('TEST-110: Valid versions can be compared', async () => {
    const aid = 'ART-1';
    await persistenceEngine.saveArtifact(baseArtifact as any, aid);
    const v2Art = {...baseArtifact, title: 'T2'};
    await persistenceEngine.saveArtifact(v2Art as any, aid);
    
    const diff = await diffEngine.compareArtifactVersions(aid, 1, 2);
    expect(diff.status).toBe('SUCCESS');
    expect(diff.educationalContent.title.changed).toBe(true);
  });

  it('TEST-126: Authority metadata change is blocked', async () => {
    const aid = 'ART-1';
    await persistenceEngine.saveArtifact(baseArtifact as any, aid);
    const v2Art = {...baseArtifact, curriculum_context: {...mockContext, authority: 'AUTH-PEND'}};
    await persistenceEngine.saveArtifact(v2Art as any, aid);
    
    const diff = await diffEngine.compareArtifactVersions(aid, 1, 2);
    expect(diff.status).toBe('BLOCKED');
    expect(diff.metadata.authority).toBe('SECURITY_VIOLATION');
  });

  it('TEST-136: Diff result is deterministic', async () => {
    const aid = 'ART-1';
    await persistenceEngine.saveArtifact(baseArtifact as any, aid);
    const v2Art = {...baseArtifact, title: 'T2'};
    await persistenceEngine.saveArtifact(v2Art as any, aid);
    
    const diff1 = await diffEngine.compareArtifactVersions(aid, 1, 2);
    const diff2 = await diffEngine.compareArtifactVersions(aid, 1, 2);
    expect(diff1).toEqual(diff2);
  });
});
