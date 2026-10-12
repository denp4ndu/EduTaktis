import { EducationalContentArtifact } from '../types/curriculum';

export type AuthoringValidationIssue = 
    | 'IMMUTABLE_CURRICULUM_METADATA'
    | 'REQUIRED_FIELD_MISSING'
    | 'INVALID_STRUCTURE';

export function validateAuthoringDraft(
    draft: EducationalContentArtifact,
    original: EducationalContentArtifact
): AuthoringValidationIssue[] {
    const issues: AuthoringValidationIssue[] = [];

    // 1. Immutable fields check
    const trustedKeys: (keyof EducationalContentArtifact['curriculum_context'])[] = [
        'authority', 'institution', 'grade', 'phase', 'curriculum', 'subject_id', 
        'pedagogical_context', 'cp_verification_status'
    ];

    for (const key of trustedKeys) {
        if (draft.curriculum_context[key] !== original.curriculum_context[key]) {
            issues.push('IMMUTABLE_CURRICULUM_METADATA');
        }
    }

    // 2. Required fields check
    if (!draft.title || draft.learning_objectives.length === 0) {
        issues.push('REQUIRED_FIELD_MISSING');
    }

    return issues;
}
