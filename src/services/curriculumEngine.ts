/**
 * EduTaktis Curriculum Validation & Master Data Engine
 * Phase 10C - Type-safe Authoritative Validation Layer
 */

import {
  EducationAuthorityId,
  InstitutionTypeId,
  AcademicPhaseId,
  CurriculumCode,
  CurriculumSelection,
  ValidationResult,
  SubjectMaster,
  SubjectVariant,
  CPMaster,
} from '../types/curriculum';

import {
  AUTHORITIES,
  INSTITUTIONS,
  ACADEMIC_PHASES,
  SUBJECT_MASTERS,
  SUBJECT_VARIANTS,
  CURRICULUM_SUBJECTS,
  CP_MASTERS,
} from '../data/curriculumMaster';

/**
 * Deterministically derives Academic Phase from Institution and Grade
 */
export function getPhaseFromGrade(institutionId: InstitutionTypeId, grade: number): AcademicPhaseId {
  const inst = INSTITUTIONS.find((i) => i.id === institutionId);
  if (!inst) {
    throw new Error(`Invalid InstitutionTypeId: ${institutionId}`);
  }

  if (!inst.allowedGrades.includes(grade)) {
    throw new Error(`Grade ${grade} is not valid for ${institutionId}`);
  }

  if (institutionId === 'SD' || institutionId === 'MI') {
    if (grade === 1 || grade === 2) return 'A';
    if (grade === 3 || grade === 4) return 'B';
    if (grade === 5 || grade === 6) return 'C';
  }

  if (institutionId === 'SMP' || institutionId === 'MTs') {
    if (grade >= 7 && grade <= 9) return 'D';
  }

  if (institutionId === 'SMA' || institutionId === 'MA' || institutionId === 'SMK' || institutionId === 'MAK') {
    if (grade === 10) return 'E';
    if (grade >= 11) return 'F';
  }

  throw new Error(`Cannot determine phase for ${institutionId} Grade ${grade}`);
}

/**
 * Determines governing Curriculum Code from Institution
 */
export function getCurriculumForInstitution(institutionId: InstitutionTypeId): CurriculumCode {
  const inst = INSTITUTIONS.find((i) => i.id === institutionId);
  if (!inst) {
    throw new Error(`Invalid InstitutionTypeId: ${institutionId}`);
  }
  return inst.isMadrasah ? 'CURR-MERDEKA-MAD' : 'CURR-MERDEKA-SCH';
}

/**
 * Determines governing Education Authority from Institution
 */
export function getAuthorityForInstitution(institutionId: InstitutionTypeId): EducationAuthorityId {
  const inst = INSTITUTIONS.find((i) => i.id === institutionId);
  if (!inst) {
    throw new Error(`Invalid InstitutionTypeId: ${institutionId}`);
  }
  return inst.authorityId;
}

/**
 * Server-side & Service-layer Master Validation Boundary
 */
export function validateSelection(selection: CurriculumSelection): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const authority = AUTHORITIES.find((a) => a.id === selection.authorityId);
  if (!authority) {
    errors.push(`Invalid Education Authority: ${selection.authorityId}`);
    return { isValid: false, errors, warnings };
  }

  const institution = INSTITUTIONS.find((i) => i.id === selection.institutionId);
  if (!institution) {
    errors.push(`Invalid Institution: ${selection.institutionId}`);
    return { isValid: false, errors, warnings };
  }

  // 1. Authority <-> Institution Mismatch
  if (institution.authorityId !== selection.authorityId) {
    errors.push(`Authority Mismatch: ${selection.institutionId} belongs to ${institution.authorityId}, not ${selection.authorityId}`);
  }

  // 2. Grade Validation & Computed Phase
  if (!institution.allowedGrades.includes(selection.grade)) {
    errors.push(`Grade ${selection.grade} is invalid for ${selection.institutionId}`);
  }

  let computedPhase: AcademicPhaseId | undefined;
  try {
    computedPhase = getPhaseFromGrade(selection.institutionId, selection.grade);
  } catch (err: any) {
    errors.push(err.message);
  }

  const computedCurriculum = getCurriculumForInstitution(selection.institutionId);

  // 3. Subject Availability Validation
  const subject = SUBJECT_MASTERS.find((s) => s.id === selection.subjectId);
  if (!subject) {
    errors.push(`Invalid Subject ID: ${selection.subjectId}`);
  } else {
    // Check Madrasah vs School Restrictions
    if (subject.isMadrasahOnly && !institution.isMadrasah) {
      errors.push(`Subject '${subject.name}' is exclusive to Madrasah (Kemenag) and cannot be selected for ${selection.institutionId}`);
    }
    if (subject.isSchoolOnly && institution.isMadrasah) {
      errors.push(`Subject '${subject.name}' is exclusive to Public Schools (Kemendikdasmen) and cannot be selected for Madrasah (${selection.institutionId})`);
    }

    // IPAS Constraint (SD/MI Grades 3-6)
    if (selection.subjectId === 'SUBJ-IPAS') {
      if (selection.institutionId !== 'SD' && selection.institutionId !== 'MI') {
        errors.push(`IPAS is only available for SD / MI, not for ${selection.institutionId}`);
      } else if (selection.grade < 3) {
        errors.push(`IPAS is only available for Grades 3-6 (Fase B & C), not Grade ${selection.grade}`);
      }
    }

    // Standalone IPA / IPS Constraint (SMP / MTs Grades 7-9)
    if ((selection.subjectId === 'SUBJ-IPA' || selection.subjectId === 'SUBJ-IPS') && (selection.institutionId === 'SD' || selection.institutionId === 'MI')) {
      errors.push(`Standalone ${subject.name} is not available in SD / MI (use IPAS instead)`);
    }
  }

  // 4. Pedagogical Context (KBC) Constraint
  if (selection.pedagogicalContext === 'KURIKULUM_BERBASIS_CINTA') {
    if (selection.authorityId !== 'AUTH-KEMENAG' || !institution.isMadrasah) {
      errors.push(`Kurikulum Berbasis Cinta (KBC) is exclusive to Madrasah under Kemenag RI and cannot be applied to ${selection.institutionId}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    computedPhase,
    computedCurriculum,
  };
}

/**
 * Returns available subjects dynamically for a given selection context
 */
export function getAvailableSubjects(context: Partial<CurriculumSelection>): SubjectMaster[] {
  if (!context.institutionId) {
    return SUBJECT_MASTERS;
  }

  const inst = INSTITUTIONS.find((i) => i.id === context.institutionId);
  if (!inst) return [];

  return SUBJECT_MASTERS.filter((subject) => {
    // 1. Madrasah / School Only Filter
    if (subject.isMadrasahOnly && !inst.isMadrasah) return false;
    if (subject.isSchoolOnly && inst.isMadrasah) return false;

    // 2. IPAS Filter
    if (subject.id === 'SUBJ-IPAS') {
      if (inst.id !== 'SD' && inst.id !== 'MI') return false;
      if (context.grade && context.grade < 3) return false;
    }

    // 3. Standalone IPA/IPS Filter for SD/MI
    if ((subject.id === 'SUBJ-IPA' || subject.id === 'SUBJ-IPS') && (inst.id === 'SD' || inst.id === 'MI')) {
      return false;
    }

    // 4. Vocational Subjects Filter
    if (subject.category === 'Vocational' && !inst.isVocational) {
      return false;
    }

    // 5. Check CurriculumSubject Database Mapping
    const mapped = CURRICULUM_SUBJECTS.some(
      (cs) => cs.institutionType === inst.id && cs.subjectId === subject.id
    );

    return mapped || !inst.isMadrasah;
  });
}

/**
 * Retrieves official Capaian Pembelajaran (CP) record if available
 */
export function getCP(subjectId: string, phase: AcademicPhaseId, institutionId: InstitutionTypeId): CPMaster | null {
  const cp = CP_MASTERS.find(
    (c) => c.subject_id === subjectId && c.phase === phase && c.institution_type === institutionId
  );
  return cp || null;
}
