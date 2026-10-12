/**
 * EduTaktis AI Educational Artifact Validation Engine
 * Phase 14 - Authoritative Quality & Safety Gate for EducationalContentArtifact
 */

import { AIPromptContext, EducationalContentArtifact } from '../types/curriculum';
import { deepFreeze } from './aiPromptEngine';

export type ArtifactValidationIssue =
  | 'STRUCTURAL_INTEGRITY'
  | 'CURRICULUM_METADATA_INTEGRITY'
  | 'PHASE_MISMATCH'
  | 'SUBJECT_MISMATCH'
  | 'AUTHORITY_MISMATCH'
  | 'INSTITUTION_MISMATCH'
  | 'CURRICULUM_MISMATCH'
  | 'KBC_MISMATCH'
  | 'CP_FABRICATION'
  | 'REGULATION_FABRICATION'
  | 'CREDENTIAL_LEAK'
  | 'SYSTEM_PROMPT_LEAKAGE';

export interface ArtifactValidationResult {
  isValid: boolean;
  artifact?: EducationalContentArtifact;
  errors: ArtifactValidationIssue[];
  warnings: ArtifactValidationIssue[];
}

/**
 * Validates the artifact against trusted curriculum context and schema rules.
 */
export function validateEducationalArtifact(
  artifact: EducationalContentArtifact,
  trustedContext: AIPromptContext
): ArtifactValidationResult {
  const errors: ArtifactValidationIssue[] = [];
  const warnings: ArtifactValidationIssue[] = [];

  // 1. Structural Integrity Check
  if (!artifact.title || !artifact.learning_objectives || artifact.learning_objectives.length === 0 || !artifact.learning_activities || artifact.learning_activities.length === 0 || !artifact.assessment) {
      errors.push('STRUCTURAL_INTEGRITY');
  }

  // 2. Metadata Integrity Checks (Must use trustedContext)
  if (!artifact.curriculum_context) {
      errors.push('STRUCTURAL_INTEGRITY');
  } else {
      if (artifact.curriculum_context.authority !== trustedContext.authority) errors.push('AUTHORITY_MISMATCH');
      if (artifact.curriculum_context.institution !== trustedContext.institution) errors.push('INSTITUTION_MISMATCH');
      if (artifact.curriculum_context.grade !== trustedContext.grade) errors.push('STRUCTURAL_INTEGRITY'); // Grade mismatch
      if (artifact.curriculum_context.phase !== trustedContext.phase) errors.push('PHASE_MISMATCH');
      if (artifact.curriculum_context.subject_id !== trustedContext.subject_id) errors.push('SUBJECT_MISMATCH');
      if (artifact.curriculum_context.curriculum !== trustedContext.curriculum) errors.push('CURRICULUM_MISMATCH');
      if (artifact.curriculum_context.pedagogical_context !== trustedContext.pedagogical_context) errors.push('KBC_MISMATCH');
  }

  // 3. CP Integrity & Regulation Safety (No fabrication)
  const fabricatedPattern = /CP resmi|KMA 999|Permendikbudristek 999|Keputusan BSKAP 999/i;
  if (
    (trustedContext.cp_verification_status === 'PENDING_SOURCE' || !trustedContext.learning_outcome_cp) &&
    (/CP resmi/i.test(JSON.stringify(artifact)))
  ) {
    errors.push('CP_FABRICATION');
  }
  
  if (fabricatedPattern.test(JSON.stringify(artifact))) {
      errors.push('REGULATION_FABRICATION');
  }

  // 4. Security Checks (Credential/Leakage)
  const forbiddenPatterns = [
      /AIza[0-9A-Za-z-_]{35}/, 
      /SYSTEM INSTRUCTION/i, 
      /trusted internal instructions/i,
      /providerConfig/i,
      /bearer/i
  ];
  if (forbiddenPatterns.some(p => p.test(JSON.stringify(artifact)))) {
      errors.push('SYSTEM_PROMPT_LEAKAGE');
  }

  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  // Return frozen, validated artifact
  return {
    isValid: true,
    artifact: deepFreeze(artifact),
    errors,
    warnings,
  };
}
