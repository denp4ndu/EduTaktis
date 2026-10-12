/**
 * EduTaktis AI Educational Content Structuring Engine
 * Phase 13 - Transforms Validated AI Content into Structured Educational Artifacts
 */

import { AIPromptContext, EducationalContentArtifact } from '../types/curriculum';
import { validateEducationalArtifact } from './aiEducationalArtifactValidationEngine';

export type StructuringStatus = 'STRUCTURED' | 'WARNING' | 'BLOCKED' | 'ERROR';

export interface StructuringResult {
  status: StructuringStatus;
  artifact: EducationalContentArtifact | null;
  errors: string[];
  warnings: string[];
}

export function structureAIContent(
  context: AIPromptContext,
  rawAIResponse: string
): StructuringResult {
  const warnings: string[] = [];
  
  if (!rawAIResponse || rawAIResponse.trim().length === 0) {
    return { status: 'ERROR', artifact: null, errors: ['AI response is empty'], warnings: [] };
  }

  const titleMatch = rawAIResponse.match(/#\s+(.*)/);
  const title = titleMatch ? titleMatch[1].trim() : null;

  const getSection = (header: string) => {
    const regex = new RegExp(`##\\s+${header}[\\s\\S]*?(?=\\n##|$)`, 'i');
    const match = rawAIResponse.match(regex);
    return match ? match[0].replace(new RegExp(`##\\s+${header}`, 'i'), '').trim() : null;
  };

  const parseList = (section: string | null) => section ? section.split(/\n-|\n\*/).map(i => i.trim()).filter(i => i.length > 0) : [];

  const artifact: EducationalContentArtifact = {
    title,
    learning_objectives: parseList(getSection('Tujuan Pembelajaran|Learning Objectives')),
    prerequisite: getSection('Prasyarat|Prerequisite'),
    learning_activities: parseList(getSection('Kegiatan Pembelajaran|Learning Activities')),
    teaching_method: getSection('Metode Pengajaran|Teaching Method'),
    learning_steps: parseList(getSection('Langkah Kegiatan|Learning Steps')),
    assessment: getSection('Asesmen|Assessment'),
    assessment_criteria: parseList(getSection('Kriteria Asesmen|Assessment Criteria')),
    learning_resources: parseList(getSection('Sumber Belajar|Learning Resources')),
    differentiation: getSection('Diferensiasi|Differentiation'),
    student_task: getSection('Tugas Peserta Didik|Student Task'),
    teacher_notes: getSection('Catatan Guru|Teacher Notes'),
    curriculum_context: context,
    warnings,
    generated_at: new Date().toISOString(),
  };

  const validation = validateEducationalArtifact(artifact, context);
  if (!validation.isValid) {
      return {
          status: 'BLOCKED',
          artifact: null,
          errors: validation.errors as string[],
          warnings: validation.warnings as string[],
      };
  }

  return {
    status: validation.warnings.length > 0 ? 'WARNING' : 'STRUCTURED',
    artifact: validation.artifact!,
    errors: [],
    warnings: validation.warnings as string[],
  };
}
