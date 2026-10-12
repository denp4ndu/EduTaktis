import { EducationalContentArtifact, EducationalArtifactDiff, DiffStatus, FieldDiff } from '../types/curriculum';
import { repositoryEngine } from './aiEducationalArtifactRepositoryEngine';
import { persistenceEngine } from './aiEducationalArtifactPersistenceEngine';
import { deepFreeze } from './aiPromptEngine';
import { validateEducationalArtifact } from './aiEducationalArtifactValidationEngine';

export class DiffEngine {
  async compareArtifactVersions(artifactId: string, versionA: number, versionB: number): Promise<EducationalArtifactDiff> {
    if (versionA === versionB) throw new Error('SAME_VERSION_COMPARISON');

    const history = await persistenceEngine.listArtifacts({ artifactId });
    const artA = history.find(h => h.metadata.versionNumber === versionA);
    const artB = history.find(h => h.metadata.versionNumber === versionB);

    if (!artA || !artB) throw new Error('VERSION_NOT_FOUND');
    
    // Validate both
    const valA = validateEducationalArtifact(artA.artifact, artA.artifact.curriculum_context);
    const valB = validateEducationalArtifact(artB.artifact, artB.artifact.curriculum_context);
    if (!valA.isValid || !valB.isValid) throw new Error('ARTIFACT_VALIDATION_FAILED');

    return deepFreeze(this.generateDiff(artA.artifact, artB.artifact, versionA, versionB, artifactId));
  }

  private generateDiff(
    artA: EducationalContentArtifact, 
    artB: EducationalContentArtifact, 
    vA: number, 
    vB: number, 
    id: string
  ): EducationalArtifactDiff {
    const metadataDiff = this.compareMetadata(artA.curriculum_context, artB.curriculum_context);
    const contentDiff = this.compareContent(artA, artB);
    
    const isSecurityViolation = Object.values(metadataDiff).includes('SECURITY_VIOLATION');
    
    return {
      artifactId: id,
      versionA: vA,
      versionB: vB,
      status: isSecurityViolation ? 'BLOCKED' : 'SUCCESS',
      metadata: metadataDiff,
      educationalContent: contentDiff,
      summary: {
        changedFields: Object.values(contentDiff).filter(f => f.changed).length,
        metadataChanged: Object.values(metadataDiff).includes('MODIFIED'),
        editableContentChanged: Object.values(contentDiff).some(f => f.changed)
      }
    };
  }

  private compareMetadata(ctxA: any, ctxB: any): any {
    const keys = ['authority', 'institution', 'grade', 'phase', 'curriculum', 'subject_id', 'pedagogical_context', 'cp_verification_status'];
    const diff: any = {};
    for (const key of keys) {
      if (ctxA[key] !== ctxB[key]) {
        diff[key] = 'SECURITY_VIOLATION';
      } else {
        diff[key] = 'UNCHANGED';
      }
    }
    return diff;
  }

  private compareContent(artA: EducationalContentArtifact, artB: EducationalContentArtifact): EducationalArtifactDiff['educationalContent'] {
    const keys: (keyof EducationalContentArtifact)[] = [
      'title', 'learning_objectives', 'learning_activities', 'assessment', 
      'learning_resources', 'teacher_notes', 'differentiation', 'student_task'
    ];
    const diff: any = {};
    for (const key of keys) {
      const before = artA[key];
      const after = artB[key];
      const changed = JSON.stringify(before) !== JSON.stringify(after);
      diff[key] = { changed, before, after };
    }
    return diff;
  }
}

export const diffEngine = new DiffEngine();
