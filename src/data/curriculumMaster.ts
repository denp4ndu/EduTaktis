/**
 * EduTaktis National Curriculum Master Dataset
 * Phase 10C - Verified Primary Source Dataset
 */

import {
  EducationAuthority,
  InstitutionType,
  AcademicPhase,
  CurriculumCode,
  SubjectMaster,
  SubjectVariant,
  CurriculumSubject,
  CPMaster,
  SourceMetadata,
  VocationalProgram,
  LocalContentConfig,
} from '../types/curriculum';

// ==========================================
// 1. PRIMARY SOURCE REGULATION METADATA
// ==========================================

export const SOURCES: Record<string, SourceMetadata> = {
  SRC_PERMEN_12_2024: {
    source_id: 'SRC-101',
    document_title: 'Permendikbudristek No. 12 Tahun 2024 tentang Kurikulum pada PAUD, Jenjang Pendidikan Dasar, dan Pendidikan Menengah',
    issuing_institution: 'Kemendikbudristek RI',
    regulation_number: 'Permendikbudristek No. 12 Tahun 2024',
    year: 2024,
    source_url: 'https://jdih.kemdikbud.go.id/detail_peraturan?main=3312',
    verification_status: 'VERIFIED',
    verified_at: '2026-09-28',
  },
  SRC_BSKAP_032_2024: {
    source_id: 'SRC-102',
    document_title: 'Keputusan Kepala BSKAP No. 032/H/KR/2024 tentang Capaian Pembelajaran pada PAUD, Pendidikan Dasar, dan Pendidikan Menengah',
    issuing_institution: 'BSKAP Kemendikbudristek RI',
    regulation_number: 'Keputusan BSKAP No. 032/H/KR/2024',
    year: 2024,
    source_url: 'https://kurikulum.kemdikbud.go.id/capaian-pembelajaran',
    verification_status: 'VERIFIED',
    verified_at: '2026-09-28',
  },
  SRC_KMA_450_2024: {
    source_id: 'SRC-103',
    document_title: 'KMA No. 450 Tahun 2024 tentang Pedoman Implementasi Kurikulum pada Madrasah',
    issuing_institution: 'Kementerian Agama RI (Dirjen Pendis)',
    regulation_number: 'KMA No. 450 Tahun 2024',
    year: 2024,
    source_url: 'https://jdih.kemenag.go.id/',
    verification_status: 'VERIFIED',
    verified_at: '2026-09-28',
  },
  SRC_PANDUAN_KBC_2024: {
    source_id: 'SRC-104',
    document_title: 'Panduan Kurikulum Berbasis Cinta (KBC) pada Madrasah',
    issuing_institution: 'Direktorat KSKK Madrasah Kemenag RI',
    regulation_number: 'Panduan KBC KSKK 2024/2025',
    year: 2024,
    source_url: 'https://madrasah.kemenag.go.id/',
    verification_status: 'VERIFIED',
    verified_at: '2026-09-28',
  },
};

// ==========================================
// 2. EDUCATION AUTHORITIES
// ==========================================

export const AUTHORITIES: EducationAuthority[] = [
  {
    id: 'AUTH-PEND',
    name: 'Kementerian Pendidikan Dasar dan Menengah (Sekolah Umum)',
    description: 'Otoritas penyelenggara pendidikan nasional untuk Sekolah Dasar dan Menengah Umum/Kejuruan.',
    allowedInstitutions: ['SD', 'SMP', 'SMA', 'SMK'],
    governingRegulations: [SOURCES.SRC_PERMEN_12_2024, SOURCES.SRC_BSKAP_032_2024],
  },
  {
    id: 'AUTH-KEMENAG',
    name: 'Kementerian Agama RI (Madrasah)',
    description: 'Otoritas penyelenggara pendidikan keagamaan Islam untuk Madrasah Ibtidaiyah hingga Madrasah Aliyah.',
    allowedInstitutions: ['MI', 'MTs', 'MA', 'MAK'],
    governingRegulations: [SOURCES.SRC_KMA_450_2024, SOURCES.SRC_PANDUAN_KBC_2024],
  },
];

// ==========================================
// 3. INSTITUTION TYPES
// ==========================================

export const INSTITUTIONS: InstitutionType[] = [
  {
    id: 'SD',
    name: 'Sekolah Dasar (SD)',
    authorityId: 'AUTH-PEND',
    level: 'Dasar',
    allowedGrades: [1, 2, 3, 4, 5, 6],
    allowedPhases: ['A', 'B', 'C'],
    isMadrasah: false,
    isVocational: false,
  },
  {
    id: 'SMP',
    name: 'Sekolah Menengah Pertama (SMP)',
    authorityId: 'AUTH-PEND',
    level: 'Menengah_Pertama',
    allowedGrades: [7, 8, 9],
    allowedPhases: ['D'],
    isMadrasah: false,
    isVocational: false,
  },
  {
    id: 'SMA',
    name: 'Sekolah Menengah Atas (SMA)',
    authorityId: 'AUTH-PEND',
    level: 'Menengah_Atas',
    allowedGrades: [10, 11, 12],
    allowedPhases: ['E', 'F'],
    isMadrasah: false,
    isVocational: false,
  },
  {
    id: 'SMK',
    name: 'Sekolah Menengah Kejuruan (SMK)',
    authorityId: 'AUTH-PEND',
    level: 'Kejuruan',
    allowedGrades: [10, 11, 12, 13],
    allowedPhases: ['E', 'F'],
    isMadrasah: false,
    isVocational: true,
  },
  {
    id: 'MI',
    name: 'Madrasah Ibtidaiyah (MI)',
    authorityId: 'AUTH-KEMENAG',
    level: 'Dasar',
    allowedGrades: [1, 2, 3, 4, 5, 6],
    allowedPhases: ['A', 'B', 'C'],
    isMadrasah: true,
    isVocational: false,
  },
  {
    id: 'MTs',
    name: 'Madrasah Tsanawiyah (MTs)',
    authorityId: 'AUTH-KEMENAG',
    level: 'Menengah_Pertama',
    allowedGrades: [7, 8, 9],
    allowedPhases: ['D'],
    isMadrasah: true,
    isVocational: false,
  },
  {
    id: 'MA',
    name: 'Madrasah Aliyah (MA)',
    authorityId: 'AUTH-KEMENAG',
    level: 'Menengah_Atas',
    allowedGrades: [10, 11, 12],
    allowedPhases: ['E', 'F'],
    isMadrasah: true,
    isVocational: false,
  },
  {
    id: 'MAK',
    name: 'Madrasah Aliyah Kejuruan (MAK)',
    authorityId: 'AUTH-KEMENAG',
    level: 'Kejuruan',
    allowedGrades: [10, 11, 12, 13],
    allowedPhases: ['E', 'F'],
    isMadrasah: true,
    isVocational: true,
  },
];

// ==========================================
// 4. ACADEMIC PHASES
// ==========================================

export const ACADEMIC_PHASES: AcademicPhase[] = [
  { id: 'A', name: 'Fase A', description: 'Kelas 1 dan 2 (SD/MI)', defaultGradeRange: [1, 2] },
  { id: 'B', name: 'Fase B', description: 'Kelas 3 dan 4 (SD/MI)', defaultGradeRange: [3, 4] },
  { id: 'C', name: 'Fase C', description: 'Kelas 5 dan 6 (SD/MI)', defaultGradeRange: [5, 6] },
  { id: 'D', name: 'Fase D', description: 'Kelas 7, 8, dan 9 (SMP/MTs)', defaultGradeRange: [7, 8, 9] },
  { id: 'E', name: 'Fase E', description: 'Kelas 10 (SMA/MA/SMK/MAK)', defaultGradeRange: [10] },
  { id: 'F', name: 'Fase F', description: 'Kelas 11 dan 12 (SMA/MA/SMK/MAK)', defaultGradeRange: [11, 12, 13] },
];

// ==========================================
// 5. SUBJECT MASTERS
// ==========================================

export const SUBJECT_MASTERS: SubjectMaster[] = [
  // Sekolah Umum Religion
  { id: 'SUBJ-PAI-SCH', code: 'PAI_SCH', name: 'Pendidikan Agama Islam dan Budi Pekerti', category: 'General', isMadrasahOnly: false, isSchoolOnly: true },
  
  // Madrasah Religion (5 Independent Subjects)
  { id: 'SUBJ-QH', code: 'QH', name: "Al-Qur'an Hadis", category: 'Religious', isMadrasahOnly: true, isSchoolOnly: false },
  { id: 'SUBJ-AA', code: 'AA', name: 'Akidah Akhlak', category: 'Religious', isMadrasahOnly: true, isSchoolOnly: false },
  { id: 'SUBJ-FIKIH', code: 'FIKIH', name: 'Fikih', category: 'Religious', isMadrasahOnly: true, isSchoolOnly: false },
  { id: 'SUBJ-SKI', code: 'SKI', name: 'Sejarah Kebudayaan Islam (SKI)', category: 'Religious', isMadrasahOnly: true, isSchoolOnly: false },
  { id: 'SUBJ-ARAB', code: 'ARAB', name: 'Bahasa Arab', category: 'Language', isMadrasahOnly: true, isSchoolOnly: false },

  // General Subjects (Shared between School & Madrasah)
  { id: 'SUBJ-PANCASILA', code: 'PP', name: 'Pendidikan Pancasila', category: 'General', isMadrasahOnly: false, isSchoolOnly: false },
  { id: 'SUBJ-INDO', code: 'BIND', name: 'Bahasa Indonesia', category: 'Language', isMadrasahOnly: false, isSchoolOnly: false },
  { id: 'SUBJ-MATH', code: 'MATH', name: 'Matematika', category: 'STEM', isMadrasahOnly: false, isSchoolOnly: false },
  { id: 'SUBJ-IPAS', code: 'IPAS', name: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', category: 'STEM', isMadrasahOnly: false, isSchoolOnly: false },
  { id: 'SUBJ-IPA', code: 'IPA', name: 'Ilmu Pengetahuan Alam (IPA)', category: 'STEM', isMadrasahOnly: false, isSchoolOnly: false },
  { id: 'SUBJ-IPS', code: 'IPS', name: 'Ilmu Pengetahuan Sosial (IPS)', category: 'Social', isMadrasahOnly: false, isSchoolOnly: false },
  { id: 'SUBJ-ENG', code: 'BING', name: 'Bahasa Inggris', category: 'Language', isMadrasahOnly: false, isSchoolOnly: false },
  { id: 'SUBJ-PJOK', code: 'PJOK', name: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', category: 'General', isMadrasahOnly: false, isSchoolOnly: false },
  { id: 'SUBJ-SENI', code: 'SENI', name: 'Seni dan Budaya / Seni Rupa / Musik', category: 'General', isMadrasahOnly: false, isSchoolOnly: false },
  { id: 'SUBJ-INFO', code: 'INFO', name: 'Informatika', category: 'STEM', isMadrasahOnly: false, isSchoolOnly: false },

  // Vocational Core & Specialties
  { id: 'SUBJ-VOC-CORE', code: 'VOC_CORE', name: 'Dasar-Dasar Program Keahlian', category: 'Vocational', isMadrasahOnly: false, isSchoolOnly: false },
  { id: 'SUBJ-VOC-CONC', code: 'VOC_CONC', name: 'Konsentrasi Keahlian', category: 'Vocational', isMadrasahOnly: false, isSchoolOnly: false },
  { id: 'SUBJ-PKL', code: 'PKL', name: 'Praktik Kerja Lapangan (PKL)', category: 'Vocational', isMadrasahOnly: false, isSchoolOnly: false },
  { id: 'SUBJ-PKK', code: 'PKK', name: 'Projek Kreatif dan Kewirausahaan', category: 'Vocational', isMadrasahOnly: false, isSchoolOnly: false },
];

// ==========================================
// 6. SUBJECT VARIANTS
// ==========================================

export const SUBJECT_VARIANTS: SubjectVariant[] = [
  // IPA Variants
  {
    id: 'SMP_IPA_FASE_D',
    subjectId: 'SUBJ-IPA',
    variantName: 'IPA SMP Fase D',
    institutionTypes: ['SMP'],
    allowedPhases: ['D'],
    allowedGrades: [7, 8, 9],
    sourceMetadata: SOURCES.SRC_BSKAP_032_2024,
  },
  {
    id: 'MTs_IPA_FASE_D',
    subjectId: 'SUBJ-IPA',
    variantName: 'IPA MTs Fase D',
    institutionTypes: ['MTs'],
    allowedPhases: ['D'],
    allowedGrades: [7, 8, 9],
    sourceMetadata: SOURCES.SRC_KMA_450_2024,
  },
  
  // English Variants
  {
    id: 'SMP_ENG_FASE_D',
    subjectId: 'SUBJ-ENG',
    variantName: 'Bahasa Inggris SMP Fase D',
    institutionTypes: ['SMP'],
    allowedPhases: ['D'],
    allowedGrades: [7, 8, 9],
    sourceMetadata: SOURCES.SRC_BSKAP_032_2024,
  },
  {
    id: 'MTs_ENG_FASE_D',
    subjectId: 'SUBJ-ENG',
    variantName: 'Bahasa Inggris MTs Fase D',
    institutionTypes: ['MTs'],
    allowedPhases: ['D'],
    allowedGrades: [7, 8, 9],
    sourceMetadata: SOURCES.SRC_KMA_450_2024,
  },

  // Fikih Variant
  {
    id: 'MTs_FIKIH_FASE_D',
    subjectId: 'SUBJ-FIKIH',
    variantName: 'Fikih MTs Fase D',
    institutionTypes: ['MTs'],
    allowedPhases: ['D'],
    allowedGrades: [7, 8, 9],
    sourceMetadata: SOURCES.SRC_KMA_450_2024,
  },
];

// ==========================================
// 7. CURRICULUM SUBJECT MAPPINGS
// ==========================================

export const CURRICULUM_SUBJECTS: CurriculumSubject[] = [
  // --- SD (AUTH-PEND) ---
  { id: 'CS-SD-PAI', curriculumCode: 'CURR-MERDEKA-SCH', authorityId: 'AUTH-PEND', institutionType: 'SD', subjectId: 'SUBJ-PAI-SCH', subjectVariantId: 'SD_PAI_FASE_ABC', phase: 'A', grades: [1, 2, 3, 4, 5, 6], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_PERMEN_12_2024 },
  { id: 'CS-SD-PP', curriculumCode: 'CURR-MERDEKA-SCH', authorityId: 'AUTH-PEND', institutionType: 'SD', subjectId: 'SUBJ-PANCASILA', subjectVariantId: 'SD_PP_FASE_ABC', phase: 'A', grades: [1, 2, 3, 4, 5, 6], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_PERMEN_12_2024 },
  { id: 'CS-SD-BIND', curriculumCode: 'CURR-MERDEKA-SCH', authorityId: 'AUTH-PEND', institutionType: 'SD', subjectId: 'SUBJ-INDO', subjectVariantId: 'SD_BIND_FASE_ABC', phase: 'A', grades: [1, 2, 3, 4, 5, 6], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_PERMEN_12_2024 },
  { id: 'CS-SD-MATH', curriculumCode: 'CURR-MERDEKA-SCH', authorityId: 'AUTH-PEND', institutionType: 'SD', subjectId: 'SUBJ-MATH', subjectVariantId: 'SD_MATH_FASE_ABC', phase: 'A', grades: [1, 2, 3, 4, 5, 6], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_PERMEN_12_2024 },
  { id: 'CS-SD-IPAS', curriculumCode: 'CURR-MERDEKA-SCH', authorityId: 'AUTH-PEND', institutionType: 'SD', subjectId: 'SUBJ-IPAS', subjectVariantId: 'SD_IPAS_FASE_BC', phase: 'B', grades: [3, 4, 5, 6], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_PERMEN_12_2024 },

  // --- SMP (AUTH-PEND) ---
  { id: 'CS-SMP-PAI', curriculumCode: 'CURR-MERDEKA-SCH', authorityId: 'AUTH-PEND', institutionType: 'SMP', subjectId: 'SUBJ-PAI-SCH', subjectVariantId: 'SMP_PAI_FASE_D', phase: 'D', grades: [7, 8, 9], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_PERMEN_12_2024 },
  { id: 'CS-SMP-PP', curriculumCode: 'CURR-MERDEKA-SCH', authorityId: 'AUTH-PEND', institutionType: 'SMP', subjectId: 'SUBJ-PANCASILA', subjectVariantId: 'SMP_PP_FASE_D', phase: 'D', grades: [7, 8, 9], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_PERMEN_12_2024 },
  { id: 'CS-SMP-BIND', curriculumCode: 'CURR-MERDEKA-SCH', authorityId: 'AUTH-PEND', institutionType: 'SMP', subjectId: 'SUBJ-INDO', subjectVariantId: 'SMP_BIND_FASE_D', phase: 'D', grades: [7, 8, 9], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_PERMEN_12_2024 },
  { id: 'CS-SMP-MATH', curriculumCode: 'CURR-MERDEKA-SCH', authorityId: 'AUTH-PEND', institutionType: 'SMP', subjectId: 'SUBJ-MATH', subjectVariantId: 'SMP_MATH_FASE_D', phase: 'D', grades: [7, 8, 9], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_PERMEN_12_2024 },
  { id: 'CS-SMP-IPA', curriculumCode: 'CURR-MERDEKA-SCH', authorityId: 'AUTH-PEND', institutionType: 'SMP', subjectId: 'SUBJ-IPA', subjectVariantId: 'SMP_IPA_FASE_D', phase: 'D', grades: [7, 8, 9], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_PERMEN_12_2024 },
  { id: 'CS-SMP-IPS', curriculumCode: 'CURR-MERDEKA-SCH', authorityId: 'AUTH-PEND', institutionType: 'SMP', subjectId: 'SUBJ-IPS', subjectVariantId: 'SMP_IPS_FASE_D', phase: 'D', grades: [7, 8, 9], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_PERMEN_12_2024 },
  { id: 'CS-SMP-ENG', curriculumCode: 'CURR-MERDEKA-SCH', authorityId: 'AUTH-PEND', institutionType: 'SMP', subjectId: 'SUBJ-ENG', subjectVariantId: 'SMP_ENG_FASE_D', phase: 'D', grades: [7, 8, 9], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_PERMEN_12_2024 },

  // --- MI (AUTH-KEMENAG) ---
  { id: 'CS-MI-QH', curriculumCode: 'CURR-MERDEKA-MAD', authorityId: 'AUTH-KEMENAG', institutionType: 'MI', subjectId: 'SUBJ-QH', subjectVariantId: 'MI_QH_FASE_ABC', phase: 'A', grades: [1, 2, 3, 4, 5, 6], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_KMA_450_2024 },
  { id: 'CS-MI-AA', curriculumCode: 'CURR-MERDEKA-MAD', authorityId: 'AUTH-KEMENAG', institutionType: 'MI', subjectId: 'SUBJ-AA', subjectVariantId: 'MI_AA_FASE_ABC', phase: 'A', grades: [1, 2, 3, 4, 5, 6], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_KMA_450_2024 },
  { id: 'CS-MI-FIKIH', curriculumCode: 'CURR-MERDEKA-MAD', authorityId: 'AUTH-KEMENAG', institutionType: 'MI', subjectId: 'SUBJ-FIKIH', subjectVariantId: 'MI_FIKIH_FASE_ABC', phase: 'A', grades: [1, 2, 3, 4, 5, 6], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_KMA_450_2024 },
  { id: 'CS-MI-SKI', curriculumCode: 'CURR-MERDEKA-MAD', authorityId: 'AUTH-KEMENAG', institutionType: 'MI', subjectId: 'SUBJ-SKI', subjectVariantId: 'MI_SKI_FASE_BC', phase: 'B', grades: [3, 4, 5, 6], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_KMA_450_2024 },
  { id: 'CS-MI-ARAB', curriculumCode: 'CURR-MERDEKA-MAD', authorityId: 'AUTH-KEMENAG', institutionType: 'MI', subjectId: 'SUBJ-ARAB', subjectVariantId: 'MI_ARAB_FASE_ABC', phase: 'A', grades: [1, 2, 3, 4, 5, 6], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_KMA_450_2024 },
  { id: 'CS-MI-IPAS', curriculumCode: 'CURR-MERDEKA-MAD', authorityId: 'AUTH-KEMENAG', institutionType: 'MI', subjectId: 'SUBJ-IPAS', subjectVariantId: 'MI_IPAS_FASE_BC', phase: 'B', grades: [3, 4, 5, 6], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_KMA_450_2024 },

  // --- MTs (AUTH-KEMENAG) ---
  { id: 'CS-MTS-QH', curriculumCode: 'CURR-MERDEKA-MAD', authorityId: 'AUTH-KEMENAG', institutionType: 'MTs', subjectId: 'SUBJ-QH', subjectVariantId: 'MTS_QH_FASE_D', phase: 'D', grades: [7, 8, 9], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_KMA_450_2024 },
  { id: 'CS-MTS-AA', curriculumCode: 'CURR-MERDEKA-MAD', authorityId: 'AUTH-KEMENAG', institutionType: 'MTs', subjectId: 'SUBJ-AA', subjectVariantId: 'MTS_AA_FASE_D', phase: 'D', grades: [7, 8, 9], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_KMA_450_2024 },
  { id: 'CS-MTS-FIKIH', curriculumCode: 'CURR-MERDEKA-MAD', authorityId: 'AUTH-KEMENAG', institutionType: 'MTs', subjectId: 'SUBJ-FIKIH', subjectVariantId: 'MTs_FIKIH_FASE_D', phase: 'D', grades: [7, 8, 9], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_KMA_450_2024 },
  { id: 'CS-MTS-SKI', curriculumCode: 'CURR-MERDEKA-MAD', authorityId: 'AUTH-KEMENAG', institutionType: 'MTs', subjectId: 'SUBJ-SKI', subjectVariantId: 'MTS_SKI_FASE_D', phase: 'D', grades: [7, 8, 9], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_KMA_450_2024 },
  { id: 'CS-MTS-ARAB', curriculumCode: 'CURR-MERDEKA-MAD', authorityId: 'AUTH-KEMENAG', institutionType: 'MTs', subjectId: 'SUBJ-ARAB', subjectVariantId: 'MTS_ARAB_FASE_D', phase: 'D', grades: [7, 8, 9], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_KMA_450_2024 },
  { id: 'CS-MTS-IPA', curriculumCode: 'CURR-MERDEKA-MAD', authorityId: 'AUTH-KEMENAG', institutionType: 'MTs', subjectId: 'SUBJ-IPA', subjectVariantId: 'MTs_IPA_FASE_D', phase: 'D', grades: [7, 8, 9], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_KMA_450_2024 },
  { id: 'CS-MTS-IPS', curriculumCode: 'CURR-MERDEKA-MAD', authorityId: 'AUTH-KEMENAG', institutionType: 'MTs', subjectId: 'SUBJ-IPS', subjectVariantId: 'MTS_IPS_FASE_D', phase: 'D', grades: [7, 8, 9], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_KMA_450_2024 },

  // --- MA / MAK Keagamaan & Kejuruan ---
  { id: 'CS-MA-ARAB', curriculumCode: 'CURR-MERDEKA-MAD', authorityId: 'AUTH-KEMENAG', institutionType: 'MA', subjectId: 'SUBJ-ARAB', subjectVariantId: 'MA_ARAB_FASE_E', phase: 'E', grades: [10, 11, 12], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_KMA_450_2024 },
  { id: 'CS-MAK-FIKIH', curriculumCode: 'CURR-MERDEKA-MAD', authorityId: 'AUTH-KEMENAG', institutionType: 'MAK', subjectId: 'SUBJ-FIKIH', subjectVariantId: 'MAK_FIKIH_FASE_E', phase: 'E', grades: [10, 11, 12], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_KMA_450_2024 },

  // --- SMK Kejuruan (AUTH-PEND) ---
  { id: 'CS-SMK-CORE', curriculumCode: 'CURR-MERDEKA-SCH', authorityId: 'AUTH-PEND', institutionType: 'SMK', subjectId: 'SUBJ-VOC-CORE', subjectVariantId: 'SMK_VOC_FASE_E', phase: 'E', grades: [10], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_PERMEN_12_2024 },
  { id: 'CS-SMK-CONC', curriculumCode: 'CURR-MERDEKA-SCH', authorityId: 'AUTH-PEND', institutionType: 'SMK', subjectId: 'SUBJ-VOC-CONC', subjectVariantId: 'SMK_VOC_FASE_F', phase: 'F', grades: [11, 12, 13], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_PERMEN_12_2024 },
  { id: 'CS-SMK-PKL', curriculumCode: 'CURR-MERDEKA-SCH', authorityId: 'AUTH-PEND', institutionType: 'SMK', subjectId: 'SUBJ-PKL', subjectVariantId: 'SMK_PKL_FASE_F', phase: 'F', grades: [11, 12, 13], isMandatory: true, isElective: false, sourceMetadata: SOURCES.SRC_PERMEN_12_2024 },
];

// ==========================================
// 8. CAPAIAN PEMBELAJARAN (CP) MASTER
// ==========================================

export const CP_MASTERS: CPMaster[] = [
  {
    cp_id: 'CP-IPA-FASE-D',
    subject_id: 'SUBJ-IPA',
    subject_variant_id: 'SMP_IPA_FASE_D',
    institution_type: 'SMP',
    authority_id: 'AUTH-PEND',
    phase: 'D',
    grade_range: [7, 8, 9],
    curriculum_code: 'CURR-MERDEKA-SCH',
    text: 'Peserta didik mampu mengidentifikasi sifat dan karakteristik zat, membedakan perubahan fisika dan kimia, serta mengusulkan ide pemisahan campuran sederhana.',
    official_summary: 'CP IPA Fase D BSKAP No. 032/H/KR/2024',
    source_metadata: SOURCES.SRC_BSKAP_032_2024,
    verification_status: 'VERIFIED',
  },
  {
    cp_id: 'CP-FIKIH-FASE-D',
    subject_id: 'SUBJ-FIKIH',
    subject_variant_id: 'MTs_FIKIH_FASE_D',
    institution_type: 'MTs',
    authority_id: 'AUTH-KEMENAG',
    phase: 'D',
    grade_range: [7, 8, 9],
    curriculum_code: 'CURR-MERDEKA-MAD',
    text: 'Peserta didik mampu menganalisis tata cara bersuci (thaharah), shalat fardhu dan sunnah, serta ketentuannya dalam kehidupan sehari-hari.',
    official_summary: 'CP Fikih MTs Fase D KMA No. 450 Tahun 2024',
    source_metadata: SOURCES.SRC_KMA_450_2024,
    verification_status: 'VERIFIED',
  },
  {
    cp_id: 'CP-IPAS-FASE-B',
    subject_id: 'SUBJ-IPAS',
    subject_variant_id: 'SD_IPAS_FASE_BC',
    institution_type: 'SD',
    authority_id: 'AUTH-PEND',
    phase: 'B',
    grade_range: [3, 4],
    curriculum_code: 'CURR-MERDEKA-SCH',
    text: 'Peserta didik menganalisis hubungan antara bentuk serta fungsi bagian tubuh pada manusia dan tumbuhan, serta wujud zat di lingkungan sekitar.',
    official_summary: 'CP IPAS SD Fase B BSKAP No. 032/H/KR/2024',
    source_metadata: SOURCES.SRC_BSKAP_032_2024,
    verification_status: 'VERIFIED',
  },
  {
    cp_id: 'CP-UNVERIFIED-PLACEHOLDER',
    subject_id: 'SUBJ-PKL',
    subject_variant_id: 'SMK_PKL_FASE_F',
    institution_type: 'SMK',
    authority_id: 'AUTH-PEND',
    phase: 'F',
    grade_range: [11, 12],
    curriculum_code: 'CURR-MERDEKA-SCH',
    text: null, // Explicitly NULL until primary text is ingested
    official_summary: 'CP PKL SMK Fase F - Pending Full Ingestion',
    source_metadata: SOURCES.SRC_BSKAP_032_2024,
    verification_status: 'PENDING_SOURCE',
  },
];

// ==========================================
// 9. VOCATIONAL & LOCAL CONTENT MASTERS
// ==========================================

export const VOCATIONAL_PROGRAMS: VocationalProgram[] = [
  {
    id: 'VOC-TKI',
    program_name: 'Teknik Komputer dan Informatika',
    institution_type: 'SMK',
    concentrations: ['Rekayasa Perangkat Lunak (RPL)', 'Teknik Komputer dan Jaringan (TKJ)', 'Multimedia'],
  },
  {
    id: 'VOC-AKUNTANSI',
    program_name: 'Akuntansi dan Keuangan Lembaga',
    institution_type: 'SMK',
    concentrations: ['Akuntansi Keuangan', 'Perbankan Syariah'],
  },
];

export const LOCAL_CONTENT_CONFIGS: LocalContentConfig[] = [
  { id: 'LC-JAWA', name: 'Bahasa Jawa', region: 'Jawa Tengah / Jawa Timur / DIY', institutionTypes: ['SD', 'SMP', 'SMA', 'MI', 'MTs', 'MA'] },
  { id: 'LC-SUNDA', name: 'Bahasa Sunda', region: 'Jawa Barat / Banten', institutionTypes: ['SD', 'SMP', 'SMA', 'MI', 'MTs', 'MA'] },
  { id: 'LC-BALI', name: 'Bahasa Bali', region: 'Bali', institutionTypes: ['SD', 'SMP', 'SMA', 'MI', 'MTs', 'MA'] },
];
