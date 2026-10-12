import { describe, it, expect, beforeEach } from 'vitest';
import { 
    AcademicReportCardEngine, 
    CourseCalculationInput 
} from './academicReportCardEngine';
import { AcademicReportCardValidationEngine } from './academicReportCardValidationEngine';
import { 
    InMemoryAcademicReportCardStorageProvider 
} from './academicReportCardStorageProvider';
import { 
    AcademicReportCardRepositoryEngine 
} from './academicReportCardRepositoryEngine';
import { 
    InMemoryAssessmentStorageProvider 
} from './assessmentStorageProvider';
import { 
    PublishedArtifact, 
    AcademicReportCard, 
    GradeRecord, 
    Assessment 
} from '../types/curriculum';

describe('EduTaktis Phase 30: Academic Report Card & Final Grade Aggregation Engine', () => {
    let storage: InMemoryAcademicReportCardStorageProvider;
    let assessmentStorage: InMemoryAssessmentStorageProvider;
    let validator: AcademicReportCardValidationEngine;
    let repository: AcademicReportCardRepositoryEngine;
    let engine: AcademicReportCardEngine;

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

    const dummyPublishedArtifact: PublishedArtifact = {
        artifact_id: 'ART-TEST-30',
        source_version: 1,
        source_checksum: 'CHK-VALID-30',
        published_at: new Date().toISOString(),
        publication_id: 'PUB-TEST-30',
        publication_status: 'PUBLISHED',
        curriculum_context: dummyCurriculumContext,
        educational_content: {
            title: 'Vektor Matematika',
            learning_objectives: ['Obj 1'],
            prerequisite: null,
            learning_activities: [],
            teaching_method: null,
            learning_steps: [],
            assessment: null,
            assessment_criteria: [],
            learning_resources: [],
            differentiation: null,
            student_task: null,
            teacher_notes: null,
            curriculum_context: dummyCurriculumContext,
            warnings: [],
            generated_at: new Date().toISOString()
        },
        publication_metadata: {
            publication_id: 'PUB-TEST-30',
            artifact_id: 'ART-TEST-30',
            source_version: 1,
            source_checksum: 'CHK-VALID-30',
            published_at: new Date().toISOString(),
            published_by: 'TEA-001',
            publication_status: 'PUBLISHED'
        }
    };

    const sampleCourses: CourseCalculationInput[] = [
        {
            course_id: 'CRS-MAT-101',
            subject: 'Matematika Tingkat Lanjut',
            teacher_id: 'TEA-MAT-01',
            curriculum_context: dummyCurriculumContext,
            published_artifact: dummyPublishedArtifact,
            expected_checksum: 'CHK-VALID-30',
            assessments: [
                {
                    assessment_id: 'ASM-001',
                    assessment_title: 'Kuis Vektor Dasar',
                    assessment_type: 'QUIZ',
                    max_score: 100,
                    weight: 1
                },
                {
                    assessment_id: 'ASM-002',
                    assessment_title: 'Ujian Tengah Semester',
                    assessment_type: 'SUMMATIVE',
                    max_score: 100,
                    weight: 2
                }
            ]
        },
        {
            course_id: 'CRS-FIS-101',
            subject: 'Fisika Kuantum',
            teacher_id: 'TEA-FIS-01',
            curriculum_context: dummyCurriculumContext,
            assessments: [
                {
                    assessment_id: 'ASM-003',
                    assessment_title: 'Praktikum Optika',
                    assessment_type: 'PRACTICAL',
                    max_score: 100,
                    weight: 1
                }
            ]
        }
    ];

    beforeEach(async () => {
        storage = new InMemoryAcademicReportCardStorageProvider();
        assessmentStorage = new InMemoryAssessmentStorageProvider();
        validator = new AcademicReportCardValidationEngine();
        repository = new AcademicReportCardRepositoryEngine(storage, validator);
        engine = new AcademicReportCardEngine(repository, validator, assessmentStorage);

        // Seed assessment grades for student STU-001
        await assessmentStorage.saveGradeRecord({
            grade_id: 'GRD-001',
            assessment_id: 'ASM-001',
            submission_id: 'SUB-001',
            student_id: 'STU-001',
            course_id: 'CRS-MAT-101',
            teacher_id: 'TEA-MAT-01',
            raw_score: 80,
            max_score: 100,
            percentage: 80,
            grade: 'B',
            passed: true,
            version_number: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        await assessmentStorage.saveGradeRecord({
            grade_id: 'GRD-002',
            assessment_id: 'ASM-002',
            submission_id: 'SUB-002',
            student_id: 'STU-001',
            course_id: 'CRS-MAT-101',
            teacher_id: 'TEA-MAT-01',
            raw_score: 95,
            max_score: 100,
            percentage: 95,
            grade: 'A',
            passed: true,
            version_number: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        await assessmentStorage.saveGradeRecord({
            grade_id: 'GRD-003',
            assessment_id: 'ASM-003',
            submission_id: 'SUB-003',
            student_id: 'STU-001',
            course_id: 'CRS-FIS-101',
            teacher_id: 'TEA-FIS-01',
            raw_score: 90,
            max_score: 100,
            percentage: 90,
            grade: 'A',
            passed: true,
            version_number: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    });

    // ==========================================
    // 1. FINAL GRADE AGGREGATION & COMPLETENESS
    // ==========================================
    describe('1. Final Grade Aggregation & Completeness', () => {
        it('TEST-301: Calculates weighted average accurately for complete course assessments', async () => {
            const card = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: [sampleCourses[0]],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            expect(card.courses[0].final_percentage).toBe(90);
            expect(card.courses[0].grade_letter).toBe('A');
            expect(card.courses[0].passing_status).toBe(true);
            expect(card.courses[0].completion_status).toBe('COMPLETE');
            expect(card.status).toBe('CALCULATED');
            expect(card.overall_average).toBe(90);
            expect(card.overall_grade_letter).toBe('A');
        });

        it('TEST-302: Identifies incomplete assessments and marks status as INCOMPLETE', async () => {
            const card = await engine.calculateReportCard({
                student_id: 'STU-UNGRADED',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            expect(card.status).toBe('INCOMPLETE');
            expect(card.overall_status).toBe('INCOMPLETE');
            expect(card.courses[0].completion_status).toBe('NOT_GRADED');
            expect(card.completed_courses).toBe(0);
        });

        it('TEST-303: Partially graded course is marked INCOMPLETE', async () => {
            await assessmentStorage.saveGradeRecord({
                grade_id: 'GRD-PARTIAL-1',
                assessment_id: 'ASM-001',
                submission_id: 'SUB-P1',
                student_id: 'STU-PARTIAL',
                course_id: 'CRS-MAT-101',
                teacher_id: 'TEA-MAT-01',
                raw_score: 85,
                max_score: 100,
                percentage: 85,
                grade: 'B',
                passed: true,
                version_number: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            const card = await engine.calculateReportCard({
                student_id: 'STU-PARTIAL',
                academic_period: '2026/2027-SEMESTER-1',
                courses: [sampleCourses[0]],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            expect(card.courses[0].completion_status).toBe('INCOMPLETE');
            expect(card.status).toBe('INCOMPLETE');
        });

        it('TEST-304: Rejects assessment calculation with zero or negative weight', async () => {
            const invalidCourses: CourseCalculationInput[] = [{
                ...sampleCourses[0],
                assessments: [
                    {
                        assessment_id: 'ASM-NEG',
                        assessment_title: 'Invalid',
                        assessment_type: 'QUIZ',
                        max_score: 100,
                        weight: 0
                    }
                ]
            }];

            await expect(engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: invalidCourses,
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('INVALID_ASSESSMENT_WEIGHT');
        });

        it('TEST-305: Computes overall cumulative average across multiple complete courses', async () => {
            const card = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'ADMIN-01',
                actor_role: 'ADMIN'
            });

            expect(card.overall_average).toBe(90);
            expect(card.total_courses).toBe(2);
            expect(card.completed_courses).toBe(2);
            expect(card.status).toBe('CALCULATED');
        });

        it('TEST-306: Rejects calculation with empty courses list', async () => {
            await expect(engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: [],
                actor_id: 'ADMIN-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow('MISSING_COURSES_DATA');
        });

        it('TEST-307: Deterministic grade bands A, B, C, D, E verified', () => {
            expect(AcademicReportCardEngine.calculateGradeLetter(95)).toBe('A');
            expect(AcademicReportCardEngine.calculateGradeLetter(90)).toBe('A');
            expect(AcademicReportCardEngine.calculateGradeLetter(89.9)).toBe('B');
            expect(AcademicReportCardEngine.calculateGradeLetter(80)).toBe('B');
            expect(AcademicReportCardEngine.calculateGradeLetter(75)).toBe('C');
            expect(AcademicReportCardEngine.calculateGradeLetter(70)).toBe('C');
            expect(AcademicReportCardEngine.calculateGradeLetter(65)).toBe('D');
            expect(AcademicReportCardEngine.calculateGradeLetter(60)).toBe('D');
            expect(AcademicReportCardEngine.calculateGradeLetter(59.9)).toBe('E');
            expect(AcademicReportCardEngine.calculateGradeLetter(0)).toBe('E');
        });

        it('TEST-308: Boundary check at 90.0% yields grade A', () => {
            expect(AcademicReportCardEngine.calculateGradeLetter(90.0)).toBe('A');
        });

        it('TEST-309: Boundary check at 80.0% yields grade B', () => {
            expect(AcademicReportCardEngine.calculateGradeLetter(80.0)).toBe('B');
        });

        it('TEST-310: Boundary check at 70.0% yields grade C', () => {
            expect(AcademicReportCardEngine.calculateGradeLetter(70.0)).toBe('C');
        });

        it('TEST-311: Boundary check at 60.0% yields grade D', () => {
            expect(AcademicReportCardEngine.calculateGradeLetter(60.0)).toBe('D');
        });

        it('TEST-312: Boundary check below 60.0% yields grade E', () => {
            expect(AcademicReportCardEngine.calculateGradeLetter(59.99)).toBe('E');
        });

        it('TEST-313: Perfect score 100% yields grade A and passed status', async () => {
            await assessmentStorage.saveGradeRecord({
                grade_id: 'GRD-PERFECT',
                assessment_id: 'ASM-003',
                submission_id: 'SUB-PERF',
                student_id: 'STU-PERFECT',
                course_id: 'CRS-FIS-101',
                teacher_id: 'TEA-FIS-01',
                raw_score: 100,
                max_score: 100,
                percentage: 100,
                grade: 'A',
                passed: true,
                version_number: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            const card = await engine.calculateReportCard({
                student_id: 'STU-PERFECT',
                academic_period: '2026/2027-SEMESTER-1',
                courses: [sampleCourses[1]],
                actor_id: 'TEA-FIS-01',
                actor_role: 'TEACHER'
            });

            expect(card.overall_average).toBe(100);
            expect(card.overall_grade_letter).toBe('A');
            expect(card.courses[0].passing_status).toBe(true);
        });

        it('TEST-314: Failing course (<60%) produces failed passing_status', async () => {
            await assessmentStorage.saveGradeRecord({
                grade_id: 'GRD-FAIL',
                assessment_id: 'ASM-003',
                submission_id: 'SUB-FAIL',
                student_id: 'STU-FAIL',
                course_id: 'CRS-FIS-101',
                teacher_id: 'TEA-FIS-01',
                raw_score: 45,
                max_score: 100,
                percentage: 45,
                grade: 'E',
                passed: false,
                version_number: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            const card = await engine.calculateReportCard({
                student_id: 'STU-FAIL',
                academic_period: '2026/2027-SEMESTER-1',
                courses: [sampleCourses[1]],
                actor_id: 'TEA-FIS-01',
                actor_role: 'TEACHER'
            });

            expect(card.courses[0].final_percentage).toBe(45);
            expect(card.courses[0].grade_letter).toBe('E');
            expect(card.courses[0].passing_status).toBe(false);
        });
    });

    // ==========================================
    // 2. REPORT CARD LIFECYCLE & TRANSITIONS
    // ==========================================
    describe('2. Report Card Lifecycle State Machine', () => {
        it('TEST-315: Follows valid progression CALCULATED -> FINALIZED -> PUBLISHED', async () => {
            const calculated = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            expect(calculated.status).toBe('CALCULATED');

            const finalized = await engine.finalizeReportCard({
                report_card_id: calculated.report_card_id,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });
            expect(finalized.status).toBe('FINALIZED');
            expect(finalized.finalized_at).toBeDefined();

            const published = await engine.publishReportCard({
                report_card_id: finalized.report_card_id,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });
            expect(published.status).toBe('PUBLISHED');
            expect(published.published_at).toBeDefined();
        });

        it('TEST-316: Rejects finalization of INCOMPLETE report card', async () => {
            const incompleteCard = await engine.calculateReportCard({
                student_id: 'STU-NO-GRADES',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            expect(incompleteCard.status).toBe('INCOMPLETE');

            await expect(engine.finalizeReportCard({
                report_card_id: incompleteCard.report_card_id,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('GRADE_INCOMPLETE');
        });

        it('TEST-317: Rejects direct publishing of CALCULATED report card (must be FINALIZED first)', async () => {
            const calculated = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await expect(engine.publishReportCard({
                report_card_id: calculated.report_card_id,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('CANNOT_PUBLISH_NON_FINALIZED_REPORT_CARD');
        });

        it('TEST-318: Allows archiving from any non-archived state', async () => {
            const calculated = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const archived = await engine.archiveReportCard({
                report_card_id: calculated.report_card_id,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });
            expect(archived.status).toBe('ARCHIVED');
        });

        it('TEST-319: Terminal state protection: ARCHIVED cannot transition', async () => {
            const calculated = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const archived = await engine.archiveReportCard({
                report_card_id: calculated.report_card_id,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await expect(engine.finalizeReportCard({
                report_card_id: archived.report_card_id,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('TERMINAL_STATE_ARCHIVED_CANNOT_TRANSITION');
        });

        it('TEST-320: Rejects invalid status transition DRAFT -> FINALIZED in validator', () => {
            expect(() => {
                validator.validateStatusTransition('DRAFT', 'FINALIZED');
            }).toThrow('INVALID_REPORT_CARD_TRANSITION');
        });

        it('TEST-321: Rejects invalid status transition DRAFT -> PUBLISHED in validator', () => {
            expect(() => {
                validator.validateStatusTransition('DRAFT', 'PUBLISHED');
            }).toThrow('INVALID_REPORT_CARD_TRANSITION');
        });

        it('TEST-322: Rejects invalid status transition PUBLISHED -> CALCULATED without revision', () => {
            expect(() => {
                validator.validateStatusTransition('PUBLISHED', 'CALCULATED');
            }).toThrow('INVALID_REPORT_CARD_TRANSITION');
        });

        it('TEST-323: Rejects invalid status transition ARCHIVED -> PUBLISHED', () => {
            expect(() => {
                validator.validateStatusTransition('ARCHIVED', 'PUBLISHED');
            }).toThrow('TERMINAL_STATE_ARCHIVED_CANNOT_TRANSITION');
        });

        it('TEST-324: Validates initial status must be DRAFT, CALCULATED, or INCOMPLETE', () => {
            expect(() => {
                validator.validateStatusTransition(null, 'FINALIZED');
            }).toThrow('INVALID_INITIAL_REPORT_CARD_STATUS');
        });
    });

    // ==========================================
    // 3. STUDENT ISOLATION & TEACHER SCOPE
    // ==========================================
    describe('3. Student Isolation & Teacher Scope Boundary', () => {
        it('TEST-325: Student can view own report card', async () => {
            await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const card = await engine.getStudentReportCard({
                authenticated_student_id: 'STU-001',
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1'
            });

            expect(card).not.toBeNull();
            expect(card?.student_id).toBe('STU-001');
        });

        it('TEST-326: Student cannot view another student report card (Throws UNAUTHORIZED_STUDENT_SCOPE)', async () => {
            await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await expect(engine.getStudentReportCard({
                authenticated_student_id: 'STU-HACKER',
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1'
            })).rejects.toThrow('UNAUTHORIZED_STUDENT_SCOPE');
        });

        it('TEST-327: Authorized teacher can view student report card in authorized courses', async () => {
            await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const card = await engine.getTeacherReportCard({
                teacher_id: 'TEA-MAT-01',
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                teacher_authorized_courses: ['CRS-MAT-101', 'CRS-FIS-101']
            });

            expect(card).not.toBeNull();
            expect(card?.student_id).toBe('STU-001');
        });

        it('TEST-328: Unauthorized teacher is blocked from report card access', async () => {
            await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await expect(engine.getTeacherReportCard({
                teacher_id: 'TEA-ROGUE',
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                teacher_authorized_courses: ['CRS-HISTORY-999']
            })).rejects.toThrow('UNAUTHORIZED_TEACHER_REPORT_SCOPE');
        });

        it('TEST-329: Teacher scope validated via custom predicate function', () => {
            const predicate = (teacherId: string, courseId: string) => teacherId === 'TEA-MAT-01' && courseId === 'CRS-MAT-101';
            expect(() => {
                validator.validateTeacherScope('TEA-MAT-01', 'CRS-MAT-101', predicate);
            }).not.toThrow();

            expect(() => {
                validator.validateTeacherScope('TEA-MAT-01', 'CRS-OTHER', predicate);
            }).toThrow('UNAUTHORIZED_TEACHER_REPORT_SCOPE');
        });

        it('TEST-330: Empty teacher ID throws MISSING_OR_INVALID_TEACHER_ID', () => {
            expect(() => {
                validator.validateTeacherScope('', 'CRS-MAT-101', ['CRS-MAT-101']);
            }).toThrow('MISSING_OR_INVALID_TEACHER_ID');
        });

        it('TEST-331: Empty student scope throws UNAUTHORIZED_STUDENT_SCOPE', () => {
            expect(() => {
                validator.validateStudentScope('', 'STU-001');
            }).toThrow('UNAUTHORIZED_STUDENT_SCOPE');
        });
    });

    // ==========================================
    // 4. VERSIONING & REVISION INTEGRITY
    // ==========================================
    describe('4. Versioning & Revision Integrity', () => {
        it('TEST-332: Revising report card increments version monotonic (v1 -> v2)', async () => {
            const v1 = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });
            expect(v1.version_number).toBe(1);

            await assessmentStorage.saveGradeRecord({
                grade_id: 'GRD-001-REV',
                assessment_id: 'ASM-001',
                submission_id: 'SUB-001',
                student_id: 'STU-001',
                course_id: 'CRS-MAT-101',
                teacher_id: 'TEA-MAT-01',
                raw_score: 90,
                max_score: 100,
                percentage: 90,
                grade: 'A',
                passed: true,
                version_number: 2,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            const v2 = await engine.reviseReportCard({
                report_card_id: v1.report_card_id,
                revision_reason: 'Updated assignment 1 grade after re-evaluation',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            expect(v2.version_number).toBe(2);
            expect(v2.previous_version_id).toBe(v1.report_card_id);
            expect(v2.revision_reason).toBe('Updated assignment 1 grade after re-evaluation');
        });

        it('TEST-333: Revision without reason is strictly rejected', async () => {
            const v1 = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await expect(engine.reviseReportCard({
                report_card_id: v1.report_card_id,
                revision_reason: '',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('REVISION_REASON_REQUIRED');
        });

        it('TEST-334: Historical versions and revision history are preserved in repository', async () => {
            const v1 = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await engine.reviseReportCard({
                report_card_id: v1.report_card_id,
                revision_reason: 'Correction of midterm weight',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const history = await repository.getHistory(v1.report_card_id);
            expect(history.length).toBe(1);
            expect(history[0].revision_reason).toBe('Correction of midterm weight');
            expect(history[0].version_number).toBe(2);

            const retrievedV1 = await repository.getReportCard(v1.report_card_id);
            expect(retrievedV1?.version_number).toBe(1);
        });

        it('TEST-335: Multiple revisions increment monotonically v1 -> v2 -> v3', async () => {
            const v1 = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const v2 = await engine.reviseReportCard({
                report_card_id: v1.report_card_id,
                revision_reason: 'Revision 1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const v3 = await engine.reviseReportCard({
                report_card_id: v2.report_card_id,
                revision_reason: 'Revision 2',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            expect(v3.version_number).toBe(3);
            expect(v3.previous_version_id).toBe(v2.report_card_id);
        });

        it('TEST-336: Revisions preserve student_id and academic_period consistency', async () => {
            const v1 = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const v2 = await engine.reviseReportCard({
                report_card_id: v1.report_card_id,
                revision_reason: 'Revision check',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            expect(v2.student_id).toBe(v1.student_id);
            expect(v2.academic_period).toBe(v1.academic_period);
        });
    });

    // ==========================================
    // 5. CURRICULUM INTEGRITY & CP SAFETY
    // ==========================================
    describe('5. Curriculum Integrity & CP Safety', () => {
        it('TEST-337: Curriculum context retains official authority and metadata', async () => {
            const card = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            expect(card.curriculum_context.authority).toBe('AUTH-PEND');
            expect(card.curriculum_context.curriculum).toBe('CURR-MERDEKA-SCH');
            expect(card.curriculum_context.subject_name).toBe('Matematika Tingkat Lanjut');
        });

        it('TEST-338: CP status PENDING_SOURCE is preserved and cannot be elevated', async () => {
            const card = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            expect(card.curriculum_context.cp_verification_status).toBe('PENDING_SOURCE');
        });

        it('TEST-339: Rejects invalid or missing curriculum context', async () => {
            const invalidCourses: CourseCalculationInput[] = [{
                ...sampleCourses[0],
                curriculum_context: null as any
            }];

            await expect(engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: invalidCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('MISSING_CURRICULUM_CONTEXT');
        });

        it('TEST-340: Rejects incomplete curriculum context metadata', () => {
            expect(() => {
                validator.validateCurriculumContext({
                    authority: '',
                    institution: 'SMA 1',
                    subject: 'Math'
                } as any);
            }).toThrow('INVALID_CURRICULUM_CONTEXT_METADATA');
        });
    });

    // ==========================================
    // 6. CHECKSUM VERIFICATION
    // ==========================================
    describe('6. Checksum Verification & Tamper Detection', () => {
        it('TEST-341: Valid checksum allows report card generation', async () => {
            const card = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: [sampleCourses[0]],
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            expect(card.checksum).toBeDefined();
            expect(card.checksum.startsWith('RC-CHK-')).toBe(true);
        });

        it('TEST-342: Checksum mismatch between expected and actual published artifact triggers rejection', async () => {
            const corruptedCourses: CourseCalculationInput[] = [{
                ...sampleCourses[0],
                expected_checksum: 'MISMATCH-CHECKSUM-999'
            }];

            await expect(engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: corruptedCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('REPORT_CARD_CHECKSUM_MISMATCH');
        });

        it('TEST-343: Validator directly validates matching checksums', () => {
            expect(() => {
                validator.validateChecksum('CHK-1', 'CHK-1');
            }).not.toThrow();
        });

        it('TEST-344: Validator directly throws on mismatching checksums', () => {
            expect(() => {
                validator.validateChecksum('CHK-1', 'CHK-2');
            }).toThrow('REPORT_CARD_CHECKSUM_MISMATCH');
        });
    });

    // ==========================================
    // 7. SECURITY & LEAKAGE DETECTION
    // ==========================================
    describe('7. Security Leakage Prevention', () => {
        it('TEST-345: Detects and blocks API keys in payload (AIzaSy...)', async () => {
            const leakedCourses: CourseCalculationInput[] = [{
                ...sampleCourses[0],
                subject: 'Matematika AIzaSy1234567890abcdefghij'
            }];

            await expect(engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: leakedCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('SECURITY_LEAKAGE_DETECTED');
        });

        it('TEST-346: Detects and blocks Bearer token leakage in payload', async () => {
            const leakedCourses: CourseCalculationInput[] = [{
                ...sampleCourses[0],
                subject: 'Fisika Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
            }];

            await expect(engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: leakedCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('SECURITY_LEAKAGE_DETECTED');
        });

        it('TEST-347: Detects and blocks system prompt text in payload', async () => {
            const leakedCourses: CourseCalculationInput[] = [{
                ...sampleCourses[0],
                subject: 'Class with system prompt override instructions'
            }];

            await expect(engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: leakedCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow('SECURITY_LEAKAGE_DETECTED');
        });

        it('TEST-348: Detects and blocks gemini keyword in payload', () => {
            expect(() => {
                validator.validateSecurity({ text: 'gemini model generation' });
            }).toThrow('SECURITY_LEAKAGE_DETECTED');
        });

        it('TEST-349: Detects and blocks generateContent keyword in payload', () => {
            expect(() => {
                validator.validateSecurity({ text: 'call generateContent()' });
            }).toThrow('SECURITY_LEAKAGE_DETECTED');
        });

        it('TEST-350: Detects and blocks OpenAI sk- keys in payload', () => {
            expect(() => {
                validator.validateSecurity({ text: 'sk-1234567890abcdefghij' });
            }).toThrow('SECURITY_LEAKAGE_DETECTED');
        });
    });

    // ==========================================
    // 8. IMMUTABILITY & DEEP FREEZE
    // ==========================================
    describe('8. Domain Object Immutability', () => {
        it('TEST-351: AcademicReportCard returned by engine is deeply frozen', async () => {
            const card = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            expect(Object.isFrozen(card)).toBe(true);
            expect(Object.isFrozen(card.courses)).toBe(true);
            expect(Object.isFrozen(card.courses[0])).toBe(true);
            expect(Object.isFrozen(card.courses[0].assessment_summary)).toBe(true);
            expect(Object.isFrozen(card.curriculum_context)).toBe(true);

            expect(() => {
                (card as any).overall_average = 100;
            }).toThrow();
        });

        it('TEST-352: ReportCardHistoryEntry is deeply frozen', async () => {
            const v1 = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await engine.reviseReportCard({
                report_card_id: v1.report_card_id,
                revision_reason: 'Reason A',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const history = await repository.getHistory(v1.report_card_id);
            expect(Object.isFrozen(history)).toBe(true);
            expect(Object.isFrozen(history[0])).toBe(true);
        });

        it('TEST-353: ReportCardAuditEvent is deeply frozen', async () => {
            const card = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const events = await repository.getAuditEvents(card.report_card_id);
            expect(Object.isFrozen(events)).toBe(true);
            expect(Object.isFrozen(events[0])).toBe(true);
        });

        it('TEST-354: Nested course assessments cannot be mutated', async () => {
            const card = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            expect(() => {
                (card.courses[0].assessment_summary[0] as any).raw_score = 999;
            }).toThrow();
        });
    });

    // ==========================================
    // 9. AUDIT TRAIL LOGGING
    // ==========================================
    describe('9. Immutable Audit Trail', () => {
        it('TEST-355: Creates audit events for calculate, finalize, publish, and view', async () => {
            const card = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await engine.finalizeReportCard({
                report_card_id: card.report_card_id,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await engine.publishReportCard({
                report_card_id: card.report_card_id,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await engine.getStudentReportCard({
                authenticated_student_id: 'STU-001',
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1'
            });

            const events = await repository.getAuditEvents(card.report_card_id);
            const eventTypes = events.map(e => e.event_type);

            expect(eventTypes).toContain('REPORT_CARD_CALCULATED');
            expect(eventTypes).toContain('REPORT_CARD_FINALIZED');
            expect(eventTypes).toContain('REPORT_CARD_PUBLISHED');
            expect(eventTypes).toContain('REPORT_CARD_VIEWED');
        });

        it('TEST-356: Archives report card logs REPORT_CARD_ARCHIVED event', async () => {
            const card = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await engine.archiveReportCard({
                report_card_id: card.report_card_id,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const events = await repository.getAuditEvents(card.report_card_id);
            const eventTypes = events.map(e => e.event_type);
            expect(eventTypes).toContain('REPORT_CARD_ARCHIVED');
        });

        it('TEST-357: Revising report card logs REPORT_CARD_REVISED event', async () => {
            const card = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const revised = await engine.reviseReportCard({
                report_card_id: card.report_card_id,
                revision_reason: 'Updated score',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            const events = await repository.getAuditEvents(revised.report_card_id);
            const eventTypes = events.map(e => e.event_type);
            expect(eventTypes).toContain('REPORT_CARD_REVISED');
        });

        it('TEST-358: Viewing by teacher logs REPORT_CARD_VIEWED with TEACHER role', async () => {
            const card = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-MAT-01',
                actor_role: 'TEACHER'
            });

            await engine.getTeacherReportCard({
                teacher_id: 'TEA-MAT-01',
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1'
            });

            const events = await repository.getAuditEvents(card.report_card_id);
            const viewEvent = events.find(e => e.actor_role === 'TEACHER' && e.event_type === 'REPORT_CARD_VIEWED');
            expect(viewEvent).toBeDefined();
        });
    });

    // ==========================================
    // 10. REPOSITORY & STORAGE ISOLATION
    // ==========================================
    describe('10. Repository & Storage Isolation', () => {
        it('TEST-359: List all report cards by student retrieves student cards only', async () => {
            await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            await engine.calculateReportCard({
                student_id: 'STU-002',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            const stu1Cards = await repository.listByStudent('STU-001');
            expect(stu1Cards.length).toBe(1);
            expect(stu1Cards[0].student_id).toBe('STU-001');
        });

        it('TEST-360: Clear all purges storage in memory provider', async () => {
            await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            await repository.clearAll();
            const all = await repository.listAll();
            expect(all.length).toBe(0);
        });

        it('TEST-361: Structural validation requires valid identity fields', () => {
            expect(() => {
                validator.validateIdentity({
                    student_id: '',
                    academic_period: '2026',
                    created_by: 'TEA-01'
                });
            }).toThrow('MISSING_OR_INVALID_STUDENT_ID');

            expect(() => {
                validator.validateIdentity({
                    student_id: 'STU-01',
                    academic_period: '',
                    created_by: 'TEA-01'
                });
            }).toThrow('MISSING_OR_INVALID_ACADEMIC_PERIOD');

            expect(() => {
                validator.validateIdentity({
                    student_id: 'STU-01',
                    academic_period: '2026',
                    created_by: ''
                });
            }).toThrow('MISSING_OR_INVALID_CREATED_BY');
        });

        it('TEST-362: Structural validation enforces valid overall_average range [0, 100]', () => {
            const invalidCard = {
                report_card_id: 'RC-1',
                student_id: 'STU-1',
                academic_period: '2026',
                status: 'CALCULATED',
                courses: [],
                overall_average: 150, // Invalid > 100
                overall_grade_letter: 'A',
                overall_status: 'COMPLETE',
                total_courses: 0,
                completed_courses: 0,
                version_number: 1,
                checksum: 'CHK-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                created_by: 'TEA-1',
                curriculum_context: dummyCurriculumContext
            } as any;

            expect(() => {
                validator.validateStructure(invalidCard);
            }).toThrow('INVALID_OVERALL_AVERAGE');
        });

        it('TEST-363: Structural validation requires valid version_number >= 1', () => {
            const invalidCard = {
                report_card_id: 'RC-1',
                student_id: 'STU-1',
                academic_period: '2026',
                status: 'CALCULATED',
                courses: [],
                overall_average: 80,
                overall_grade_letter: 'B',
                overall_status: 'COMPLETE',
                total_courses: 0,
                completed_courses: 0,
                version_number: 0, // Invalid < 1
                checksum: 'CHK-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                created_by: 'TEA-1',
                curriculum_context: dummyCurriculumContext
            } as any;

            expect(() => {
                validator.validateStructure(invalidCard);
            }).toThrow('INVALID_VERSION_NUMBER');
        });

        it('TEST-364: Structural validation rejects unknown report card status', () => {
            const invalidCard = {
                report_card_id: 'RC-1',
                student_id: 'STU-1',
                academic_period: '2026',
                status: 'UNKNOWN_STATUS' as any,
                courses: [],
                overall_average: 80,
                overall_grade_letter: 'B',
                overall_status: 'COMPLETE',
                total_courses: 0,
                completed_courses: 0,
                version_number: 1,
                checksum: 'CHK-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                created_by: 'TEA-1',
                curriculum_context: dummyCurriculumContext
            } as any;

            expect(() => {
                validator.validateStructure(invalidCard);
            }).toThrow('INVALID_REPORT_CARD_STATUS');
        });

        it('TEST-365: getLatestByStudent returns the highest version number card', async () => {
            const v1 = await engine.calculateReportCard({
                student_id: 'STU-001',
                academic_period: '2026/2027-SEMESTER-1',
                courses: sampleCourses,
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            const v2 = await engine.reviseReportCard({
                report_card_id: v1.report_card_id,
                revision_reason: 'Second version',
                courses: sampleCourses,
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            });

            const latest = await repository.getLatestByStudent('STU-001', '2026/2027-SEMESTER-1');
            expect(latest?.version_number).toBe(2);
            expect(latest?.report_card_id).toBe(v2.report_card_id);
        });

        it('TEST-366: getReportCard returns null for non-existent id', async () => {
            const result = await repository.getReportCard('NON-EXISTENT-ID');
            expect(result).toBeNull();
        });

        it('TEST-367: getLatestByStudent returns null if no cards exist', async () => {
            const result = await repository.getLatestByStudent('NON-EXISTENT-STU', '2026');
            expect(result).toBeNull();
        });

        it('TEST-368: getHistory returns empty array for report card with no revisions', async () => {
            const history = await repository.getHistory('NO-HISTORY-ID');
            expect(history).toEqual([]);
        });

        it('TEST-369: getAuditEvents returns empty array for report card with no events', async () => {
            const events = await repository.getAuditEvents('NO-EVENTS-ID');
            expect(events).toEqual([]);
        });

        it('TEST-370: getStudentReportCard returns null when student has no report card', async () => {
            const result = await engine.getStudentReportCard({
                authenticated_student_id: 'STU-NEW',
                student_id: 'STU-NEW',
                academic_period: '2026'
            });
            expect(result).toBeNull();
        });

        it('TEST-371: getTeacherReportCard returns null when student has no report card', async () => {
            const result = await engine.getTeacherReportCard({
                teacher_id: 'TEA-01',
                student_id: 'STU-NEW',
                academic_period: '2026'
            });
            expect(result).toBeNull();
        });
    });
});
