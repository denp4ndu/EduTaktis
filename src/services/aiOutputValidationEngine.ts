/**
 * EduTaktis AI Output Validation Engine
 * Phase 12 - Educational Quality & Safety Gate
 *
 * Validates raw Gemini response against trusted curriculum context.
 */

import { AIPromptContext } from '../types/curriculum';

export type ValidationStatus = 'VALID' | 'INVALID' | 'WARNING' | 'BLOCKED';

export interface AIOutputValidationResult {
  isValid: boolean;
  status: ValidationStatus;
  response: string | null;
  warnings: string[];
  errors: string[];
  validationIssues: string[];
  curriculumContext: AIPromptContext;
  validatedAt: string;
}

export function validateAIOutput(context: AIPromptContext, rawResponse: string): AIOutputValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const validationIssues: string[] = [];
  let status: ValidationStatus = 'VALID';

  // 1. Structural Validation
  if (!rawResponse || rawResponse.trim().length === 0) {
    errors.push('AI response is empty');
    return createBlockedResult(context, errors, validationIssues);
  }

  // 2. Credential Safety Check
  const credentialPatterns = [/AIza[0-9A-Za-z-_]{35}/, /Bearer\s+[a-zA-Z0-9-._~+/]+=*/];
  for (const pattern of credentialPatterns) {
    if (pattern.test(rawResponse)) {
      errors.push('Credential leakage detected');
      validationIssues.push('CREDENTIAL_LEAK');
      return createBlockedResult(context, errors, validationIssues);
    }
  }

  // 3. Regulation Anti-Fabrication
  const regPattern = /(Permendikbudristek|KMA|Kepmendikbud|BSKAP)\s+No\.\s+\d+/gi;
  const matches = rawResponse.match(regPattern);
  if (matches) {
    // Basic heuristic: if it claims a regulation not in the context source, flag it
    const trustedReg = context.source_regulation;
    for (const match of matches) {
      if (!match.includes(trustedReg.replace(/Dokumen Resmi Pemerintah/g, ''))) {
        validationIssues.push('REGULATION_FABRICATION');
        status = 'BLOCKED';
        errors.push('Fabricated regulation detection');
      }
    }
  }

  // 4. CP Safety Check
  if (context.cp_verification_status === 'PENDING_SOURCE' || !context.learning_outcome_cp) {
    const cpClaims = [/CP resmi/i, /berdasarkan KMA/i, /resmi Kementerian/i];
    for (const pattern of cpClaims) {
      if (pattern.test(rawResponse)) {
        validationIssues.push('CP_FABRICATION');
        status = 'BLOCKED';
        errors.push('Fabrication of official CP claimed');
      }
    }
  }

  // 5. Authority Isolation
  if (context.authority === 'AUTH-PEND' && /Fikih|Akidah Akhlak|SKI|Al-Qur'an Hadis|Bahasa Arab/i.test(rawResponse)) {
     warnings.push('Potensi kontaminasi subjek madrasah pada sekolah umum terdeteksi');
     if (status !== 'BLOCKED') status = 'WARNING';
  }

  // 6. System Prompt Leakage
  if (/SYSTEM INSTRUCTION|STRICT CANONICAL SECURITY|HIERARCHY RULES/i.test(rawResponse)) {
      validationIssues.push('SYSTEM_PROMPT_LEAKAGE');
      status = 'BLOCKED';
      errors.push('System prompt leakage detected');
  }

  if (status === 'BLOCKED') {
      return createBlockedResult(context, errors, validationIssues);
  }

  return {
    isValid: true,
    status,
    response: rawResponse,
    warnings,
    errors,
    validationIssues,
    curriculumContext: context,
    validatedAt: new Date().toISOString(),
  };
}

function createBlockedResult(context: AIPromptContext, errors: string[], validationIssues: string[]): AIOutputValidationResult {
  return {
    isValid: false,
    status: 'BLOCKED',
    response: null,
    warnings: [],
    errors,
    validationIssues,
    curriculumContext: context,
    validatedAt: new Date().toISOString(),
  };
}
