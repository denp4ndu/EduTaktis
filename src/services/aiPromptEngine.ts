/**
 * EduTaktis AI Prompt Context Engine
 * Phase 10D - Structured AI Prompt Context Builder, Safety Boundary & Runtime Immutability
 */

import {
  CurriculumSelection,
  AIPromptContext,
  ValidationResult,
} from '../types/curriculum';

import {
  AUTHORITIES,
  INSTITUTIONS,
  SUBJECT_MASTERS,
  SUBJECT_VARIANTS,
} from '../data/curriculumMaster';

import {
  validateSelection,
  getCP,
} from './curriculumEngine';

/**
 * Deep freezes an object hierarchy to guarantee runtime immutability.
 */
export function deepFreeze<T extends object>(obj: T): Readonly<T> {
  Object.keys(obj).forEach((prop) => {
    const val = (obj as any)[prop];
    if (val !== null && (typeof val === 'object' || typeof val === 'function') && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  });
  return Object.freeze(obj);
}

/**
 * Builds structured AI Prompt Context for Generative AI Generator.
 * Executes authoritative validation boundary and returns a runtime-frozen immutable context.
 */
export function buildAIPromptContext(selection: CurriculumSelection): AIPromptContext {
  const validation: ValidationResult = validateSelection(selection);

  if (!validation.isValid) {
    throw new Error(`Curriculum Selection Invalid: ${validation.errors.join('; ')}`);
  }

  const authority = AUTHORITIES.find((a) => a.id === selection.authorityId)!;
  const institution = INSTITUTIONS.find((i) => i.id === selection.institutionId)!;
  const subject = SUBJECT_MASTERS.find((s) => s.id === selection.subjectId)!;

  const phase = validation.computedPhase!;
  const curriculum = validation.computedCurriculum!;

  // Find variant if present
  const variant = SUBJECT_VARIANTS.find(
    (v) => v.subjectId === subject.id && v.institutionTypes.includes(institution.id)
  );

  // Retrieve official CP record if available
  const cpRecord = getCP(subject.id, phase, institution.id);

  // Build KBC Pedagogical Instructions
  let pedagogicalInstructions: string | null = null;
  if (selection.pedagogicalContext === 'KURIKULUM_BERBASIS_CINTA') {
    pedagogicalInstructions = `
[KBC PEDAGOGICAL CONSTRAINTS - KEMENTERIAN AGAMA RI]
1. Integrasikan nilai kasih sayang (rahmah), kedamaian, dan moderasi beragama (wasathiyah) dalam langkah kegiatan.
2. Gunakan kalimat interaksi yang santun, empatik, dan bebas dari gaya instruksi intimidatif.
3. Rancang aktivitas berdiferensiasi yang memuliakan potensi unik dan fitrah peserta didik madrasah.
4. Buat asesmen yang bersifat apresiatif tanpa mengurangi tolok ukur standar kompetensi.
*Catatan Penting: Pendekatan KBC tidak mengubah teks Capaian Pembelajaran (CP) resmi BSKAP/Kemenag.
`.trim();
  }

  const rawContext: AIPromptContext = {
    authority: authority.id,
    authority_name: authority.name,
    institution: institution.id,
    institution_name: institution.name,
    grade: selection.grade,
    phase,
    curriculum,
    subject_id: subject.id,
    subject_name: subject.name,
    subject_variant: variant ? variant.variantName : `${subject.name} ${institution.id}`,
    learning_outcome_cp: cpRecord ? cpRecord.text : null,
    cp_verification_status: cpRecord ? cpRecord.verification_status : 'PENDING_SOURCE',
    pedagogical_context: selection.pedagogicalContext || null,
    pedagogical_context_instructions: pedagogicalInstructions,
    is_madrasah: institution.isMadrasah,
    is_vocational: institution.isVocational,
    source_regulation: authority.governingRegulations[0].regulation_number || 'Dokumen Resmi Pemerintah',
  };

  // Enforce runtime immutability (FIND-02 Remediation)
  return deepFreeze(rawContext);
}

/**
 * Formats AIPromptContext into a production system prompt string for Gemini API
 */
export function formatSystemPrompt(context: AIPromptContext): string {
  const cpText = context.learning_outcome_cp
    ? `"${context.learning_outcome_cp}" [Verified Record]`
    : `[CP BELUM TERSEDIA DALAM MASTER DATA TERVERIFIKASI - SILAKAN MASUKKAN TEKS CP RESMI]`;

  return `
SYSTEM INSTRUCTION / AI DRAFTING ASSISTANT CONSTRAINT:
Anda adalah Asisten Pembuat Draf Pembelajaran (*Drafting Assistant*) untuk EduTaktis.
Output Anda adalah DRAF AWAL yang WAJIB dibaca ulang dan divalidasi oleh guru (*Human-in-the-Loop*).

[STRUCTURED CURRICULUM CONTEXT]
- Otoritas Pendidikan: ${context.authority_name} (${context.authority})
- Satuan Pendidikan: ${context.institution_name} (${context.institution})
- Kelas / Fase: Kelas ${context.grade} / ${context.phase}
- Kurikulum Resmi: ${context.curriculum} (${context.source_regulation})
- Mata Pelajaran: ${context.subject_name} (${context.subject_variant})
- Capaian Pembelajaran (CP): ${cpText}

${context.pedagogical_context_instructions || ''}

[SAFETY RULES]
1. Anda DILARANG mengarang teks CP, nomor regulasi, atau nomor keputusan pemerintah.
2. Anda DILARANG mengklaim bahwa draf ini divalidasi resmi oleh Kementerian Agama atau Kemendikbudristek.
3. Anda DILARANG mencampurkan mata pelajaran khusus madrasah ke sekolah umum, atau sebaliknya.
4. Buat langkah kegiatan yang realistis dan ramah peserta didik.
`.trim();
}
