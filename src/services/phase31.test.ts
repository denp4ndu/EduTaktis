import { describe, it, expect, beforeEach } from 'vitest';
import { 
    AcademicTranscriptEngine, 
    GenerateTranscriptParams 
} from './academicTranscriptEngine';
import { AcademicTranscriptValidationEngine } from './academicTranscriptValidationEngine';
import { 
    InMemoryAcademicTranscriptStorageProvider 
} from './academicTranscriptStorageProvider';
import { 
    AcademicTranscriptRepositoryEngine 
} from './academicTranscriptRepositoryEngine';
import { 
    InMemoryAcademicReportCardStorageProvider 
} from './academicReportCardStorageProvider';
import { 
    AcademicReportCardRepositoryEngine 
} from './academicReportCardRepositoryEngine';
import { 
    AcademicReportCard, 
    PublishedArtifact, 
    TranscriptCourse, 
    AcademicTranscript 
} from '../types/curriculum';

describe('EduTaktis Phase 31: Academic Transcript & Student Academic History Engine', () => {
    let transcriptStorage: InMemoryAcademicTranscriptStorageProvider;
    let reportCardStorage: InMemoryAcademicReportCardStorageProvider;
    let validator: AcademicTranscriptValidationEngine;
    let transcriptRepository: AcademicTranscriptRepositoryEngine;
    let reportCardRepository: AcademicReportCardRepositoryEngine;
    let engine: AcademicTranscriptEngine;

    const dummyCurriculumContext: PublishedArtifact['curriculum_context'] = {
        authority: 'AUTH-PEND',
        authority_name: 'Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi',
        institution: 'SMA',
        institution_name: 'SMA Negeri 1 EduTaktis',
        grade: 11,
        phase: 'F',
        curriculum: 'CURR-MERDEKA-SCH',
        subject_id: 'MAT_ADV',
        subject_name: 'Matematika Tingkat Lanjut',
        subject_variant: 'STANDARD',
        learning_outcome_cp: 'Aljabar dan Geometri Vektor',
        cp_verification_status: 'PENDING_SOURCE',
        pedagogical_context: null,
        pedagogical_context_instructions: null,
        is_madrasah: false,
        is_vocational: false,
        source_regulation: 'Permendikbudristek No 12/2024'
    };

    const dummyReportCard1: AcademicReportCard = {
        report_card_id: 'RC-STU-001-2026-SEM1',
        student_id: 'STU-001',
        academic_period: '2026/2027-SEMESTER-1',
        status: 'FINALIZED',
        courses: [
            {
                course_id: 'CRS-MAT-101',
                subject: 'Matematika Tingkat Lanjut',
                teacher_id: 'TEA-MAT-01',
                assessment_summary: [],
                final_percentage: 92,
                grade_letter: 'A',
                passing_status: true,
                completion_status: 'COMPLETE'
            },
            {
                course_id: 'CRS-FIS-101',
                subject: 'Fisika Kuantum',
                teacher_id: 'TEA-FIS-01',
                assessment_summary: [],
                final_percentage: 84,
                grade_letter: 'B',
                passing_status: true,
                completion_status: 'COMPLETE'
            }
        ],
        overall_average: 88,
        overall_grade_letter: 'B',
        overall_status: 'COMPLETE',
        total_courses: 2,
        completed_courses: 2,
        version_number: 1,
        checksum: 'RC-CHK-VALID-01',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'TEA-MAT-01',
        curriculum_context: dummyCurriculumContext
    };

    const dummyReportCard2: AcademicReportCard = {
        report_card_id: 'RC-STU-001-2026-SEM2',
        student_id: 'STU-001',
        academic_period: '2026/2027-SEMESTER-2',
        status: 'PUBLISHED',
        courses: [
            {
                course_id: 'CRS-KIM-101',
                subject: 'Kimia Organik',
                teacher_id: 'TEA-KIM-01',
                assessment_summary: [],
                final_percentage: 78,
                grade_letter: 'C',
                passing_status: true,
                completion_status: 'COMPLETE'
            },
            {
                course_id: 'CRS-BIO-101',
                subject: 'Biologi Molekuler',
                teacher_id: 'TEA-BIO-01',
                assessment_summary: [],
                final_percentage: 64,
                grade_letter: 'D',
                passing_status: true,
                completion_status: 'COMPLETE'
            }
        ],
        overall_average: 71,
        overall_grade_letter: 'C',
        overall_status: 'COMPLETE',
        total_courses: 2,
        completed_courses: 2,
        version_number: 1,
        checksum: 'RC-CHK-VALID-02',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'TEA-KIM-01',
        curriculum_context: dummyCurriculumContext
    };

    beforeEach(async () => {
        transcriptStorage = new InMemoryAcademicTranscriptStorageProvider();
        reportCardStorage = new InMemoryAcademicReportCardStorageProvider();
        validator = new AcademicTranscriptValidationEngine();
        transcriptRepository = new AcademicTranscriptRepositoryEngine(transcriptStorage, validator);
        reportCardRepository = new AcademicReportCardRepositoryEngine(reportCardStorage);
        engine = new AcademicTranscriptEngine(transcriptRepository, validator, reportCardRepository);

        // Seed report cards
        await reportCardRepository.saveReportCard(dummyReportCard1);
        await reportCardRepository.saveReportCard(dummyReportCard2);
    });

    // ==========================================
    // 1. TRANSCRIPT GENERATION & AGGREGATION
    // ==========================================
    describe('1. Transcript Generation & Cumulative Aggregation', () => {
        it('TEST-3101: Generates transcript correctly from finalized report cards', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            expect(transcript.student_id).toBe('STU-001');
            expect(transcript.status).toBe('GENERATED');
            expect(transcript.courses.length).toBe(2);
            expect(transcript.cumulative_summary.total_courses).toBe(2);
            expect(transcript.cumulative_summary.completed_courses).toBe(2);
            expect(transcript.cumulative_summary.passed_courses).toBe(2);
            expect(transcript.cumulative_summary.failed_courses).toBe(0);
            expect(transcript.cumulative_summary.average_percentage).toBe(88);
            expect(transcript.cumulative_summary.overall_grade_letter).toBe('B');
            expect(transcript.cumulative_summary.grade_distribution.A).toBe(1);
            expect(transcript.cumulative_summary.grade_distribution.B).toBe(1);
        });

        it('TEST-3102: Generates multi-semester cumulative transcript across multiple report cards', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'FULL-YEAR',
                source_report_cards: [dummyReportCard1, dummyReportCard2],
                actor_id: 'ADMIN-01',
                actor_role: 'ADMIN'
            });

            expect(transcript.courses.length).toBe(4);
            expect(transcript.cumulative_summary.average_percentage).toBe(79.5);
            expect(transcript.cumulative_summary.overall_grade_letter).toBe('C');
            expect(transcript.cumulative_summary.total_courses).toBe(4);
            expect(transcript.cumulative_summary.completed_courses).toBe(4);
            expect(transcript.cumulative_summary.grade_distribution.A).toBe(1);
            expect(transcript.cumulative_summary.grade_distribution.B).toBe(1);
            expect(transcript.cumulative_summary.grade_distribution.C).toBe(1);
            expect(transcript.cumulative_summary.grade_distribution.D).toBe(1);
        });

        it('TEST-3103: Grade letter conversion verified for all bands', () => {
            expect(AcademicTranscriptEngine.calculateGradeLetter(95)).toBe('A');
            expect(AcademicTranscriptEngine.calculateGradeLetter(90)).toBe('A');
            expect(AcademicTranscriptEngine.calculateGradeLetter(89.9)).toBe('B');
            expect(AcademicTranscriptEngine.calculateGradeLetter(80)).toBe('B');
            expect(AcademicTranscriptEngine.calculateGradeLetter(79.9)).toBe('C');
            expect(AcademicTranscriptEngine.calculateGradeLetter(70)).toBe('C');
            expect(AcademicTranscriptEngine.calculateGradeLetter(69.9)).toBe('D');
            expect(AcademicTranscriptEngine.calculateGradeLetter(60)).toBe('D');
            expect(AcademicTranscriptEngine.calculateGradeLetter(59.9)).toBe('E');
            expect(AcademicTranscriptEngine.calculateGradeLetter(0)).toBe('E');
        });

        it('TEST-3104: Detects failed course in cumulative summary', async () => {
            const failedReportCard: AcademicReportCard = {
                ...dummyReportCard1,
                report_card_id: 'RC-FAIL-1',
                courses: [
                    {
                        course_id: 'CRS-FAIL-101',
                        subject: 'Matematika Dasar',
                        teacher_id: 'TEA-01',
                        assessment_summary: [],
                        final_percentage: 45,
                        grade_letter: 'E',
                        passing_status: false,
                        completion_status: 'COMPLETE'
                    }
                ]
            };

            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [failedReportCard],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            expect(transcript.cumulative_summary.failed_courses).toBe(1);
            expect(transcript.cumulative_summary.passed_courses).toBe(0);
            expect(transcript.cumulative_summary.grade_distribution.E).toBe(1);
        });

        it('TEST-3105: Rejects transcript generation with empty source report cards', async () => {
            await expect(engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('TRANSCRIPT_SOURCE_REPORT_CARD_MISSING');
        });

        it('TEST-3106: Boundary test: exactly 90.0% yields grade A', () => {
            expect(AcademicTranscriptEngine.calculateGradeLetter(90.0)).toBe('A');
        });

        it('TEST-3107: Boundary test: exactly 80.0% yields grade B', () => {
            expect(AcademicTranscriptEngine.calculateGradeLetter(80.0)).toBe('B');
        });

        it('TEST-3108: Boundary test: exactly 70.0% yields grade C', () => {
            expect(AcademicTranscriptEngine.calculateGradeLetter(70.0)).toBe('C');
        });

        it('TEST-3109: Boundary test: exactly 60.0% yields grade D', () => {
            expect(AcademicTranscriptEngine.calculateGradeLetter(60.0)).toBe('D');
        });

        it('TEST-3110: Boundary test: 59.99% yields grade E', () => {
            expect(AcademicTranscriptEngine.calculateGradeLetter(59.99)).toBe('E');
        });

        it('TEST-3111: Detects incomplete courses in cumulative summary count', async () => {
            const incompleteRC: AcademicReportCard = {
                ...dummyReportCard1,
                report_card_id: 'RC-INCOMPLETE-1',
                courses: [
                    {
                        course_id: 'CRS-INCOMP-1',
                        subject: 'Astronomi',
                        teacher_id: 'TEA-01',
                        assessment_summary: [],
                        final_percentage: 50,
                        grade_letter: 'E',
                        passing_status: false,
                        completion_status: 'INCOMPLETE'
                    }
                ]
            };

            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [incompleteRC],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            expect(transcript.cumulative_summary.incomplete_courses).toBe(1);
            expect(transcript.cumulative_summary.completed_courses).toBe(0);
        });
    });

    // ==========================================
    // 2. SOURCE INTEGRITY & VALIDATION
    // ==========================================
    describe('2. Source Integrity & Scope Validation', () => {
        it('TEST-3112: Accepts FINALIZED and PUBLISHED source report cards', async () => {
            expect(() => {
                validator.validateSourceReportCard(dummyReportCard1); // FINALIZED
                validator.validateSourceReportCard(dummyReportCard2); // PUBLISHED
            }).not.toThrow();
        });

        it('TEST-3113: Rejects DRAFT or CALCULATED source report cards', () => {
            const draftRC = { ...dummyReportCard1, status: 'DRAFT' as any };
            const calcRC = { ...dummyReportCard1, status: 'CALCULATED' as any };
            const incompRC = { ...dummyReportCard1, status: 'INCOMPLETE' as any };

            expect(() => validator.validateSourceReportCard(draftRC)).toThrow('INVALID_SOURCE_REPORT_CARD_STATUS');
            expect(() => validator.validateSourceReportCard(calcRC)).toThrow('INVALID_SOURCE_REPORT_CARD_STATUS');
            expect(() => validator.validateSourceReportCard(incompRC)).toThrow('INVALID_SOURCE_REPORT_CARD_STATUS');
        });

        it('TEST-3114: Rejects source report card belonging to a different student', async () => {
            const foreignReportCard: AcademicReportCard = {
                ...dummyReportCard1,
                student_id: 'STU-OTHER-999'
            };

            await expect(engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [foreignReportCard],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('UNAUTHORIZED_STUDENT_SCOPE');
        });

        it('TEST-3115: Source version mismatch triggers TRANSCRIPT_SOURCE_VERSION_MISMATCH', () => {
            expect(() => {
                validator.validateSourceVersion(1, 2);
            }).toThrow('TRANSCRIPT_SOURCE_VERSION_MISMATCH');
        });

        it('TEST-3116: Source checksum mismatch triggers TRANSCRIPT_SOURCE_CHECKSUM_MISMATCH', () => {
            expect(() => {
                validator.validateSourceChecksum('CHK-A', 'CHK-B');
            }).toThrow('TRANSCRIPT_SOURCE_CHECKSUM_MISMATCH');
        });

        it('TEST-3117: Transcript checksum mismatch triggers TRANSCRIPT_CHECKSUM_MISMATCH', () => {
            expect(() => {
                validator.validateTranscriptChecksum('TR-CHK-A', 'TR-CHK-B');
            }).toThrow('TRANSCRIPT_CHECKSUM_MISMATCH');
        });

        it('TEST-3118: Null or missing source report card throws TRANSCRIPT_SOURCE_REPORT_CARD_MISSING', () => {
            expect(() => {
                validator.validateSourceReportCard(null as any);
            }).toThrow('TRANSCRIPT_SOURCE_REPORT_CARD_MISSING');
        });
    });

    // ==========================================
    // 3. LIFECYCLE & TRANSITIONS
    // ==========================================
    describe('3. Transcript Lifecycle State Machine', () => {
        it('TEST-3119: Follows valid lifecycle progression GENERATED -> VERIFIED -> PUBLISHED', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });
            expect(transcript.status).toBe('GENERATED');

            const verified = await engine.verifyTranscript({
                transcript_id: transcript.transcript_id,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });
            expect(verified.status).toBe('VERIFIED');
            expect(verified.verified_at).toBeDefined();

            const published = await engine.publishTranscript({
                transcript_id: verified.transcript_id,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });
            expect(published.status).toBe('PUBLISHED');
            expect(published.published_at).toBeDefined();
        });

        it('TEST-3120: Allows direct archiving from any active state', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const archived = await engine.archiveTranscript({
                transcript_id: transcript.transcript_id,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });
            expect(archived.status).toBe('ARCHIVED');
        });

        it('TEST-3121: Terminal state protection: ARCHIVED transcript cannot transition', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await engine.archiveTranscript({
                transcript_id: transcript.transcript_id,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await expect(engine.verifyTranscript({
                transcript_id: transcript.transcript_id,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('TERMINAL_STATE_ARCHIVED_CANNOT_TRANSITION');
        });

        it('TEST-3122: Rejects invalid transition DRAFT -> PUBLISHED in validator', () => {
            expect(() => {
                validator.validateStatusTransition('DRAFT', 'PUBLISHED');
            }).toThrow('INVALID_TRANSCRIPT_TRANSITION');
        });

        it('TEST-3123: Rejects invalid transition ARCHIVED -> PUBLISHED in validator', () => {
            expect(() => {
                validator.validateStatusTransition('ARCHIVED', 'PUBLISHED');
            }).toThrow('TERMINAL_STATE_ARCHIVED_CANNOT_TRANSITION');
        });

        it('TEST-3124: Validates initial status must be DRAFT or GENERATED', () => {
            expect(() => {
                validator.validateStatusTransition(null, 'VERIFIED');
            }).toThrow('INVALID_INITIAL_TRANSCRIPT_STATUS');
        });

        it('TEST-3125: Verify throws if transcript ID is not found', async () => {
            await expect(engine.verifyTranscript({
                transcript_id: 'NON-EXISTENT-TR',
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('TRANSCRIPT_NOT_FOUND');
        });

        it('TEST-3126: Publish throws if transcript ID is not found', async () => {
            await expect(engine.publishTranscript({
                transcript_id: 'NON-EXISTENT-TR',
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('TRANSCRIPT_NOT_FOUND');
        });
    });

    // ==========================================
    // 4. STUDENT ISOLATION & TEACHER SCOPE
    // ==========================================
    describe('4. Student Isolation & Teacher Scope Boundary', () => {
        it('TEST-3127: Student can view their own transcript', async () => {
            await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const transcript = await engine.getStudentTranscript({
                authenticated_student_id: 'STU-001',
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1'
            });

            expect(transcript).not.toBeNull();
            expect(transcript?.student_id).toBe('STU-001');
        });

        it('TEST-3128: Student cannot access another student transcript (Throws UNAUTHORIZED_STUDENT_SCOPE)', async () => {
            await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await expect(engine.getStudentTranscript({
                authenticated_student_id: 'STU-HACKER',
                student_id: 'STU-001'
            })).rejects.toThrow('UNAUTHORIZED_STUDENT_SCOPE');
        });

        it('TEST-3129: Authorized teacher can view student transcript within scope', async () => {
            await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const transcript = await engine.getTeacherTranscript({
                teacher_id: 'TEA-MAT-01',
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                teacher_authorized_courses: ['CRS-MAT-101', 'CRS-FIS-101']
            });

            expect(transcript).not.toBeNull();
            expect(transcript?.student_id).toBe('STU-001');
        });

        it('TEST-3130: Unauthorized teacher is rejected with UNAUTHORIZED_TEACHER_TRANSCRIPT_SCOPE', async () => {
            await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await expect(engine.getTeacherTranscript({
                teacher_id: 'TEA-ROGUE',
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                teacher_authorized_courses: ['CRS-UNAUTHORIZED-999']
            })).rejects.toThrow('UNAUTHORIZED_TEACHER_TRANSCRIPT_SCOPE');
        });

        it('TEST-3131: Teacher scope validated via custom predicate function', () => {
            const predicate = (t: string, c: string) => t === 'TEA-MAT-01' && c === 'CRS-MAT-101';
            expect(() => {
                validator.validateTeacherScope('TEA-MAT-01', 'CRS-MAT-101', predicate);
            }).not.toThrow();

            expect(() => {
                validator.validateTeacherScope('TEA-MAT-01', 'CRS-OTHER', predicate);
            }).toThrow('UNAUTHORIZED_TEACHER_TRANSCRIPT_SCOPE');
        });
    });

    // ==========================================
    // 5. REGENERATION & VERSIONING
    // ==========================================
    describe('5. Transcript Regeneration & Historical Versioning', () => {
        it('TEST-3132: Regenerating transcript increments version (v1 -> v2)', async () => {
            const v1 = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });
            expect(v1.version_number).toBe(1);

            const v2 = await engine.regenerateTranscript({
                transcript_id: v1.transcript_id,
                revision_reason: 'Updated report card linked',
                source_report_cards: [dummyReportCard1, dummyReportCard2],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            expect(v2.version_number).toBe(2);
            expect(v2.previous_version_id).toBe(v1.transcript_id);
            expect(v2.revision_reason).toBe('Updated report card linked');
        });

        it('TEST-3133: Regeneration without reason throws TRANSCRIPT_REVISION_REASON_REQUIRED', async () => {
            const v1 = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await expect(engine.regenerateTranscript({
                transcript_id: v1.transcript_id,
                revision_reason: '',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('TRANSCRIPT_REVISION_REASON_REQUIRED');
        });

        it('TEST-3134: Historical version remains intact after regeneration', async () => {
            const v1 = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await engine.regenerateTranscript({
                transcript_id: v1.transcript_id,
                revision_reason: 'Adding term 2 data',
                source_report_cards: [dummyReportCard1, dummyReportCard2],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const history = await transcriptRepository.getHistory(v1.transcript_id);
            expect(history.length).toBe(1);
            expect(history[0].version_number).toBe(2);
            expect(history[0].revision_reason).toBe('Adding term 2 data');

            const retrievedV1 = await transcriptRepository.getTranscript(v1.transcript_id);
            expect(retrievedV1?.version_number).toBe(1);
        });

        it('TEST-3135: Multiple regenerations increment v1 -> v2 -> v3 monotonically', async () => {
            const v1 = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            const v2 = await engine.regenerateTranscript({
                transcript_id: v1.transcript_id,
                revision_reason: 'Rev 1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            const v3 = await engine.regenerateTranscript({
                transcript_id: v2.transcript_id,
                revision_reason: 'Rev 2',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            expect(v3.version_number).toBe(3);
            expect(v3.previous_version_id).toBe(v2.transcript_id);
        });
    });

    // ==========================================
    // 6. CURRICULUM INTEGRITY & CP SAFETY
    // ==========================================
    describe('6. Curriculum Integrity & CP Safety', () => {
        it('TEST-3136: Preserves trusted curriculum context in transcript projection', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            expect(transcript.curriculum_context.authority).toBe('AUTH-PEND');
            expect(transcript.curriculum_context.curriculum).toBe('CURR-MERDEKA-SCH');
            expect(transcript.curriculum_context.subject_name).toBe('Matematika Tingkat Lanjut');
        });

        it('TEST-3137: CP verification status PENDING_SOURCE is preserved', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            expect(transcript.curriculum_context.cp_verification_status).toBe('PENDING_SOURCE');
        });

        it('TEST-3138: Rejects invalid or missing curriculum context in validator', () => {
            expect(() => {
                validator.validateCurriculumContext(null as any);
            }).toThrow('MISSING_CURRICULUM_CONTEXT');
        });

        it('TEST-3139: Rejects incomplete curriculum context metadata in validator', () => {
            expect(() => {
                validator.validateCurriculumContext({
                    authority: '',
                    institution: 'SMA'
                } as any);
            }).toThrow('INVALID_CURRICULUM_CONTEXT_METADATA');
        });
    });

    // ==========================================
    // 7. SECURITY & LEAKAGE DETECTION
    // ==========================================
    describe('7. Security Leakage Prevention', () => {
        it('TEST-3140: Blocks API key leakage in transcript params (AIzaSy...)', async () => {
            await expect(engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027 AIzaSy1234567890abcdefghij',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('TRANSCRIPT_SECURITY_LEAKAGE_DETECTED');
        });

        it('TEST-3141: Blocks Bearer token leakage in transcript params', async () => {
            await expect(engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1 Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('TRANSCRIPT_SECURITY_LEAKAGE_DETECTED');
        });

        it('TEST-3142: Blocks system prompt leakage in transcript params', async () => {
            await expect(engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027 system prompt inject instructions',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('TRANSCRIPT_SECURITY_LEAKAGE_DETECTED');
        });

        it('TEST-3143: Blocks gemini and generateContent keywords in validator', () => {
            expect(() => validator.validateSecurity({ prompt: 'gemini model generation' }))
                .toThrow('TRANSCRIPT_SECURITY_LEAKAGE_DETECTED');

            expect(() => validator.validateSecurity({ prompt: 'call generateContent()' }))
                .toThrow('TRANSCRIPT_SECURITY_LEAKAGE_DETECTED');
        });

        it('TEST-3144: Blocks OpenAI sk- API keys in validator', () => {
            expect(() => validator.validateSecurity({ key: 'sk-abcdef1234567890abcdef' }))
                .toThrow('TRANSCRIPT_SECURITY_LEAKAGE_DETECTED');
        });
    });

    // ==========================================
    // 8. IMMUTABILITY & DEEP FREEZE
    // ==========================================
    describe('8. Domain Object Immutability', () => {
        it('TEST-3145: AcademicTranscript returned by engine is deeply frozen', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            expect(Object.isFrozen(transcript)).toBe(true);
            expect(Object.isFrozen(transcript.courses)).toBe(true);
            expect(Object.isFrozen(transcript.courses[0])).toBe(true);
            expect(Object.isFrozen(transcript.cumulative_summary)).toBe(true);
            expect(Object.isFrozen(transcript.curriculum_context)).toBe(true);

            expect(() => {
                (transcript as any).status = 'PUBLISHED';
            }).toThrow();
        });

        it('TEST-3146: TranscriptHistoryEntry is deeply frozen', async () => {
            const v1 = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await engine.regenerateTranscript({
                transcript_id: v1.transcript_id,
                revision_reason: 'Reason A',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const history = await transcriptRepository.getHistory(v1.transcript_id);
            expect(Object.isFrozen(history)).toBe(true);
            expect(Object.isFrozen(history[0])).toBe(true);
        });

        it('TEST-3147: TranscriptAuditEvent is deeply frozen', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const events = await transcriptRepository.getAuditEvents(transcript.transcript_id);
            expect(Object.isFrozen(events)).toBe(true);
            expect(Object.isFrozen(events[0])).toBe(true);
        });

        it('TEST-3148: Nested cumulative summary grade distribution is frozen', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            expect(Object.isFrozen(transcript.cumulative_summary.grade_distribution)).toBe(true);
            expect(() => {
                (transcript.cumulative_summary.grade_distribution as any).A = 99;
            }).toThrow();
        });
    });

    // ==========================================
    // 9. AUDIT TRAIL LOGGING
    // ==========================================
    describe('9. Immutable Audit Trail', () => {
        it('TEST-3149: Creates audit events for generate, verify, publish, and view', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await engine.verifyTranscript({
                transcript_id: transcript.transcript_id,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await engine.publishTranscript({
                transcript_id: transcript.transcript_id,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await engine.getStudentTranscript({
                authenticated_student_id: 'STU-001',
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1'
            });

            const events = await transcriptRepository.getAuditEvents(transcript.transcript_id);
            const actions = events.map(e => e.action);

            expect(actions).toContain('TRANSCRIPT_GENERATED');
            expect(actions).toContain('TRANSCRIPT_VERIFIED');
            expect(actions).toContain('TRANSCRIPT_PUBLISHED');
            expect(actions).toContain('TRANSCRIPT_VIEWED');
        });

        it('TEST-3150: Archiving logs TRANSCRIPT_ARCHIVED audit event', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await engine.archiveTranscript({
                transcript_id: transcript.transcript_id,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const events = await transcriptRepository.getAuditEvents(transcript.transcript_id);
            const actions = events.map(e => e.action);
            expect(actions).toContain('TRANSCRIPT_ARCHIVED');
        });

        it('TEST-3151: Regenerating logs TRANSCRIPT_REGENERATED audit event', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const regenerated = await engine.regenerateTranscript({
                transcript_id: transcript.transcript_id,
                revision_reason: 'Updated grades',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const events = await transcriptRepository.getAuditEvents(regenerated.transcript_id);
            const actions = events.map(e => e.action);
            expect(actions).toContain('TRANSCRIPT_REGENERATED');
        });

        it('TEST-3152: Viewing by teacher logs TRANSCRIPT_VIEWED with TEACHER role', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await engine.getTeacherTranscript({
                teacher_id: 'TEA-MAT-01',
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1'
            });

            const events = await transcriptRepository.getAuditEvents(transcript.transcript_id);
            const viewEvent = events.find(e => e.actor_role === 'TEACHER' && e.action === 'TRANSCRIPT_VIEWED');
            expect(viewEvent).toBeDefined();
        });
    });

    // ==========================================
    // 10. REPOSITORY & STORAGE ISOLATION
    // ==========================================
    describe('10. Repository & Multi-Semester Queries', () => {
        it('TEST-3153: Queries transcripts by academic year and semester', async () => {
            await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-2',
                source_report_cards: [dummyReportCard2],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            const yearTranscripts = await transcriptRepository.listByAcademicYear('STU-001', '2026/2027');
            expect(yearTranscripts.length).toBe(2);

            const sem1Transcripts = await transcriptRepository.listBySemester('STU-001', '2026/2027', 'SEMESTER-1');
            expect(sem1Transcripts.length).toBe(1);
            expect(sem1Transcripts[0].semester).toBe('SEMESTER-1');
        });

        it('TEST-3154: getLatestTranscript returns the highest version number', async () => {
            const v1 = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            const v2 = await engine.regenerateTranscript({
                transcript_id: v1.transcript_id,
                revision_reason: 'Updated version',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            const latest = await transcriptRepository.getLatestTranscript('STU-001', '2026/2027', 'SEMESTER-1');
            expect(latest?.version_number).toBe(2);
            expect(latest?.transcript_id).toBe(v2.transcript_id);
        });

        it('TEST-3155: getTranscript returns null for non-existent id', async () => {
            const result = await transcriptRepository.getTranscript('NON-EXISTENT-ID');
            expect(result).toBeNull();
        });

        it('TEST-3156: Clear all purges all stored transcripts and history', async () => {
            await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            await transcriptRepository.clearAll();
            const all = await transcriptRepository.listAll();
            expect(all.length).toBe(0);
        });

        it('TEST-3157: List student transcripts returns only transcripts for the specific student', async () => {
            await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            const student2RC: AcademicReportCard = {
                ...dummyReportCard1,
                student_id: 'STU-002',
                report_card_id: 'RC-STU-002-2026'
            };
            await reportCardRepository.saveReportCard(student2RC);

            await engine.generateTranscript({
                student_id: 'STU-002',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [student2RC],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            const stu1Transcripts = await transcriptRepository.listStudentTranscripts('STU-001');
            expect(stu1Transcripts.length).toBe(1);
            expect(stu1Transcripts[0].student_id).toBe('STU-001');
        });

        it('TEST-3158: Structure validation rejects empty transcript_id', () => {
            expect(() => {
                validator.validateStructure({
                    transcript_id: '',
                    student_id: 'STU-01',
                    academic_year: '2026',
                    semester: 'SEM-1',
                    status: 'GENERATED',
                    courses: [],
                    cumulative_summary: {
                        total_courses: 0,
                        completed_courses: 0,
                        incomplete_courses: 0,
                        average_percentage: 0,
                        overall_grade_letter: 'E',
                        grade_distribution: {},
                        passed_courses: 0,
                        failed_courses: 0
                    },
                    source_report_card_ids: [],
                    source_versions: {},
                    source_checksums: {},
                    generated_at: new Date().toISOString(),
                    version_number: 1,
                    checksum: 'CHK',
                    curriculum_context: dummyCurriculumContext
                });
            }).toThrow('TRANSCRIPT_INVALID_STRUCTURE');
        });

        it('TEST-3159: Structure validation rejects invalid average_percentage (> 100)', () => {
            expect(() => {
                validator.validateStructure({
                    transcript_id: 'TR-1',
                    student_id: 'STU-01',
                    academic_year: '2026',
                    semester: 'SEM-1',
                    status: 'GENERATED',
                    courses: [],
                    cumulative_summary: {
                        total_courses: 0,
                        completed_courses: 0,
                        incomplete_courses: 0,
                        average_percentage: 150, // Invalid > 100
                        overall_grade_letter: 'A',
                        grade_distribution: {},
                        passed_courses: 0,
                        failed_courses: 0
                    },
                    source_report_card_ids: [],
                    source_versions: {},
                    source_checksums: {},
                    generated_at: new Date().toISOString(),
                    version_number: 1,
                    checksum: 'CHK',
                    curriculum_context: dummyCurriculumContext
                });
            }).toThrow('TRANSCRIPT_INVALID_STRUCTURE');
        });

        it('TEST-3160: Structure validation rejects invalid version_number (< 1)', () => {
            expect(() => {
                validator.validateStructure({
                    transcript_id: 'TR-1',
                    student_id: 'STU-01',
                    academic_year: '2026',
                    semester: 'SEM-1',
                    status: 'GENERATED',
                    courses: [],
                    cumulative_summary: {
                        total_courses: 0,
                        completed_courses: 0,
                        incomplete_courses: 0,
                        average_percentage: 80,
                        overall_grade_letter: 'B',
                        grade_distribution: {},
                        passed_courses: 0,
                        failed_courses: 0
                    },
                    source_report_card_ids: [],
                    source_versions: {},
                    source_checksums: {},
                    generated_at: new Date().toISOString(),
                    version_number: 0, // Invalid < 1
                    checksum: 'CHK',
                    curriculum_context: dummyCurriculumContext
                });
            }).toThrow('TRANSCRIPT_INVALID_STRUCTURE');
        });

        it('TEST-3161: Identity validation rejects missing academic_year', () => {
            expect(() => {
                validator.validateIdentity({
                    student_id: 'STU-01',
                    academic_year: '',
                    semester: 'SEM-1'
                });
            }).toThrow('MISSING_OR_INVALID_ACADEMIC_YEAR');
        });

        it('TEST-3162: Identity validation rejects missing semester', () => {
            expect(() => {
                validator.validateIdentity({
                    student_id: 'STU-01',
                    academic_year: '2026',
                    semester: ''
                });
            }).toThrow('MISSING_OR_INVALID_SEMESTER');
        });

        it('TEST-3163: getStudentTranscript returns null when no transcript exists for requested period', async () => {
            const result = await engine.getStudentTranscript({
                authenticated_student_id: 'STU-NONE',
                student_id: 'STU-NONE',
                academic_year: '2026',
                semester: 'SEM-1'
            });
            expect(result).toBeNull();
        });

        it('TEST-3164: getTeacherTranscript returns null when no transcript exists for requested period', async () => {
            const result = await engine.getTeacherTranscript({
                teacher_id: 'TEA-01',
                student_id: 'STU-NONE',
                academic_year: '2026',
                semester: 'SEM-1'
            });
            expect(result).toBeNull();
        });

        it('TEST-3165: Verify transcript fails if report card checksum in storage is modified (tamper detection)', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            // Tamper source report card checksum in storage
            const tamperedRC: AcademicReportCard = {
                ...dummyReportCard1,
                checksum: 'TAMPERED-CHECKSUM-999'
            };
            await reportCardRepository.saveReportCard(tamperedRC);

            await expect(engine.verifyTranscript({
                transcript_id: transcript.transcript_id,
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('TRANSCRIPT_SOURCE_CHECKSUM_MISMATCH');
        });

        it('TEST-3166: Verify transcript fails if report card version in storage is modified', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            // Update source report card version in storage
            const updatedRC: AcademicReportCard = {
                ...dummyReportCard1,
                version_number: 99
            };
            await reportCardRepository.saveReportCard(updatedRC);

            await expect(engine.verifyTranscript({
                transcript_id: transcript.transcript_id,
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('TRANSCRIPT_SOURCE_VERSION_MISMATCH');
        });

        it('TEST-3167: Structure validation rejects non-array courses', () => {
            expect(() => {
                validator.validateStructure({
                    transcript_id: 'TR-1',
                    student_id: 'STU-01',
                    academic_year: '2026',
                    semester: 'SEM-1',
                    status: 'GENERATED',
                    courses: 'NOT_AN_ARRAY' as any,
                    cumulative_summary: {
                        total_courses: 0,
                        completed_courses: 0,
                        incomplete_courses: 0,
                        average_percentage: 80,
                        overall_grade_letter: 'B',
                        grade_distribution: {},
                        passed_courses: 0,
                        failed_courses: 0
                    },
                    source_report_card_ids: [],
                    source_versions: {},
                    source_checksums: {},
                    generated_at: new Date().toISOString(),
                    version_number: 1,
                    checksum: 'CHK',
                    curriculum_context: dummyCurriculumContext
                });
            }).toThrow('TRANSCRIPT_INVALID_STRUCTURE');
        });

        it('TEST-3168: Structure validation rejects unknown transcript status', () => {
            expect(() => {
                validator.validateStructure({
                    transcript_id: 'TR-1',
                    student_id: 'STU-01',
                    academic_year: '2026',
                    semester: 'SEM-1',
                    status: 'UNKNOWN_STATUS' as any,
                    courses: [],
                    cumulative_summary: {
                        total_courses: 0,
                        completed_courses: 0,
                        incomplete_courses: 0,
                        average_percentage: 80,
                        overall_grade_letter: 'B',
                        grade_distribution: {},
                        passed_courses: 0,
                        failed_courses: 0
                    },
                    source_report_card_ids: [],
                    source_versions: {},
                    source_checksums: {},
                    generated_at: new Date().toISOString(),
                    version_number: 1,
                    checksum: 'CHK',
                    curriculum_context: dummyCurriculumContext
                });
            }).toThrow('TRANSCRIPT_INVALID_STRUCTURE');
        });

        it('TEST-3169: Revision reason validator rejects empty string and whitespace', () => {
            expect(() => validator.validateRevisionReason('')).toThrow('TRANSCRIPT_REVISION_REASON_REQUIRED');
            expect(() => validator.validateRevisionReason('   ')).toThrow('TRANSCRIPT_REVISION_REASON_REQUIRED');
            expect(() => validator.validateRevisionReason(undefined)).toThrow('TRANSCRIPT_REVISION_REASON_REQUIRED');
            expect(() => validator.validateRevisionReason('Valid reason')).not.toThrow();
        });

        it('TEST-3170: Cumulative summary calculates 100% completion rate when all courses complete', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            expect(transcript.cumulative_summary.completed_courses).toBe(transcript.cumulative_summary.total_courses);
            expect(transcript.cumulative_summary.incomplete_courses).toBe(0);
        });

        it('TEST-3171: Single course transcript with score 100% yields 100% average and grade A', async () => {
            const perfectRC: AcademicReportCard = {
                ...dummyReportCard1,
                report_card_id: 'RC-PERF-1',
                courses: [
                    {
                        course_id: 'CRS-PERF-101',
                        subject: 'Fisika Teori',
                        teacher_id: 'TEA-01',
                        assessment_summary: [],
                        final_percentage: 100,
                        grade_letter: 'A',
                        passing_status: true,
                        completion_status: 'COMPLETE'
                    }
                ]
            };

            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [perfectRC],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            expect(transcript.cumulative_summary.average_percentage).toBe(100);
            expect(transcript.cumulative_summary.overall_grade_letter).toBe('A');
        });

        it('TEST-3172: Single course transcript with score 0% yields 0% average and grade E', async () => {
            const zeroRC: AcademicReportCard = {
                ...dummyReportCard1,
                report_card_id: 'RC-ZERO-1',
                courses: [
                    {
                        course_id: 'CRS-ZERO-101',
                        subject: 'Biologi',
                        teacher_id: 'TEA-01',
                        assessment_summary: [],
                        final_percentage: 0,
                        grade_letter: 'E',
                        passing_status: false,
                        completion_status: 'COMPLETE'
                    }
                ]
            };

            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [zeroRC],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            expect(transcript.cumulative_summary.average_percentage).toBe(0);
            expect(transcript.cumulative_summary.overall_grade_letter).toBe('E');
            expect(transcript.cumulative_summary.failed_courses).toBe(1);
        });

        it('TEST-3173: Transcript verification passes when multiple source report cards all match', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'FULL-YEAR',
                source_report_cards: [dummyReportCard1, dummyReportCard2],
                actor_id: 'ADMIN-01',
                actor_role: 'ADMIN'
            });

            const verified = await engine.verifyTranscript({
                transcript_id: transcript.transcript_id,
                actor_id: 'ADMIN-01',
                actor_role: 'ADMIN'
            });

            expect(verified.status).toBe('VERIFIED');
            expect(verified.verified_at).toBeDefined();
        });

        it('TEST-3174: Transcript regeneration stores previous_version_id properly', async () => {
            const v1 = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            const v2 = await engine.regenerateTranscript({
                transcript_id: v1.transcript_id,
                revision_reason: 'Added new report card',
                source_report_cards: [dummyReportCard1, dummyReportCard2],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            expect(v2.previous_version_id).toBe(v1.transcript_id);
            expect(v2.version_number).toBe(2);
        });

        it('TEST-3175: Archiving a published transcript succeeds and sets status to ARCHIVED', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            const published = await engine.publishTranscript({
                transcript_id: transcript.transcript_id,
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            const archived = await engine.archiveTranscript({
                transcript_id: published.transcript_id,
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            expect(archived.status).toBe('ARCHIVED');
        });

        it('TEST-3176: Archiving prevents subsequent publishing of transcript', async () => {
            const transcript = await engine.generateTranscript({
                student_id: 'STU-001',
                academic_year: '2026/2027',
                semester: 'SEMESTER-1',
                source_report_cards: [dummyReportCard1],
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            const archived = await engine.archiveTranscript({
                transcript_id: transcript.transcript_id,
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            await expect(engine.publishTranscript({
                transcript_id: archived.transcript_id,
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('TERMINAL_STATE_ARCHIVED_CANNOT_TRANSITION');
        });

        it('TEST-3177: getAuditEvents returns empty array for transcript with no recorded events', async () => {
            const events = await transcriptRepository.getAuditEvents('NO-AUDIT-ID');
            expect(events).toEqual([]);
        });

        it('TEST-3178: getHistory returns empty array for transcript with no regenerations', async () => {
            const history = await transcriptRepository.getHistory('NO-HISTORY-ID');
            expect(history).toEqual([]);
        });

        it('TEST-3179: Security validation passes on clean academic payload', () => {
            expect(() => {
                validator.validateSecurity({
                    student_id: 'STU-001',
                    academic_year: '2026/2027',
                    courses: ['CRS-MAT-101']
                });
            }).not.toThrow();
        });

        it('TEST-3180: Rejects empty student_id in identity validator', () => {
            expect(() => {
                validator.validateIdentity({
                    student_id: '',
                    academic_year: '2026/2027',
                    semester: 'SEMESTER-1'
                });
            }).toThrow('MISSING_OR_INVALID_STUDENT_ID');
        });
    });
});
