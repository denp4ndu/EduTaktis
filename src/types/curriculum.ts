/**
 * EduTaktis National Curriculum & Subject Master Data Types
 * Phase 10C - Strict Type System
 */

export type EducationAuthorityId = 'AUTH-PEND' | 'AUTH-KEMENAG';

export type InstitutionTypeId = 
  | 'SD' | 'SMP' | 'SMA' | 'SMK'  // Auth: AUTH-PEND
  | 'MI' | 'MTs' | 'MA' | 'MAK';  // Auth: AUTH-KEMENAG

export type AcademicPhaseId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type CurriculumCode = 'CURR-MERDEKA-SCH' | 'CURR-MERDEKA-MAD';

export type VerificationStatus = 
  | 'VERIFIED' 
  | 'PARTIALLY_VERIFIED' 
  | 'UNVERIFIED' 
  | 'PENDING_SOURCE' 
  | 'REJECTED';

export type PedagogicalFrameworkId = 'KURIKULUM_BERBASIS_CINTA' | 'DIFFERENTIATED_LEARNING' | 'NONE';

export interface SourceMetadata {
  source_id: string;
  document_title: string;
  issuing_institution: string;
  regulation_number?: string;
  year: number;
  source_url?: string;
  verification_status: VerificationStatus;
  verified_at?: string;
}

export interface EducationAuthority {
  id: EducationAuthorityId;
  name: string;
  description: string;
  allowedInstitutions: InstitutionTypeId[];
  governingRegulations: SourceMetadata[];
}

export interface InstitutionType {
  id: InstitutionTypeId;
  name: string;
  authorityId: EducationAuthorityId;
  level: 'PAUD' | 'Dasar' | 'Menengah_Pertama' | 'Menengah_Atas' | 'Kejuruan';
  allowedGrades: number[];
  allowedPhases: AcademicPhaseId[];
  isMadrasah: boolean;
  isVocational: boolean;
}

export interface AcademicPhase {
  id: AcademicPhaseId;
  name: string;
  description: string;
  defaultGradeRange: number[];
}

export interface SubjectMaster {
  id: string; // e.g. SUBJ-IPA, SUBJ-FIKIH
  code: string;
  name: string;
  category: 'General' | 'Religious' | 'STEM' | 'Language' | 'Social' | 'Vocational' | 'LocalContent';
  isMadrasahOnly: boolean;
  isSchoolOnly: boolean;
  description?: string;
}

export interface SubjectVariant {
  id: string; // e.g. SMP_IPA_FASE_D, MTs_FIKIH_FASE_D
  subjectId: string;
  variantName: string;
  institutionTypes: InstitutionTypeId[];
  allowedPhases: AcademicPhaseId[];
  allowedGrades: number[];
  sourceMetadata: SourceMetadata;
}

export interface CurriculumSubject {
  id: string;
  curriculumCode: CurriculumCode;
  authorityId: EducationAuthorityId;
  institutionType: InstitutionTypeId;
  subjectId: string;
  subjectVariantId: string;
  phase: AcademicPhaseId;
  grades: number[];
  isMandatory: boolean;
  isElective: boolean;
  sourceMetadata: SourceMetadata;
}

export interface CPMaster {
  cp_id: string;
  subject_id: string;
  subject_variant_id: string;
  institution_type: InstitutionTypeId;
  authority_id: EducationAuthorityId;
  phase: AcademicPhaseId;
  grade_range: number[];
  curriculum_code: CurriculumCode;
  text: string | null;
  official_summary?: string;
  source_metadata: SourceMetadata;
  verification_status: VerificationStatus;
}

export interface VocationalProgram {
  id: string;
  program_name: string;
  institution_type: 'SMK' | 'MAK';
  concentrations: string[];
}

export interface LocalContentConfig {
  id: string;
  name: string; // e.g., Bahasa Jawa, Bahasa Sunda
  region?: string;
  institutionTypes: InstitutionTypeId[];
}

export interface CurriculumSelection {
  authorityId: EducationAuthorityId;
  institutionId: InstitutionTypeId;
  grade: number;
  subjectId: string;
  subjectVariantId?: string;
  pedagogicalContext?: PedagogicalFrameworkId;
  localContentId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  computedPhase?: AcademicPhaseId;
  computedCurriculum?: CurriculumCode;
}

export interface AIPromptContext {
  authority: EducationAuthorityId;
  authority_name: string;
  institution: InstitutionTypeId;
  institution_name: string;
  grade: number;
  phase: AcademicPhaseId;
  curriculum: CurriculumCode;
  subject_id: string;
  subject_name: string;
  subject_variant: string;
  learning_outcome_cp: string | null;
  cp_verification_status: VerificationStatus;
  pedagogical_context: PedagogicalFrameworkId | null;
  pedagogical_context_instructions: string | null;
  is_madrasah: boolean;
  is_vocational: boolean;
  source_regulation: string;
}

export interface EducationalContentArtifact {
  title: string | null;
  learning_objectives: string[];
  prerequisite: string | null;
  learning_activities: string[];
  teaching_method: string | null;
  learning_steps: string[];
  assessment: string | null;
  assessment_criteria: string[];
  learning_resources: string[];
  differentiation: string | null;
  student_task: string | null;
  teacher_notes: string | null;
  curriculum_context: AIPromptContext;
  warnings: string[];
  generated_at: string;
}

export interface ArtifactPersistenceMetadata {
  artifactId: string;
  versionId: string;
  versionNumber: number;
  createdAt: string;
  updatedAt: string;
  checksum: string;
}

export interface PersistedArtifact {
  artifact: EducationalContentArtifact;
  metadata: ArtifactPersistenceMetadata;
}

export interface ArtifactQuery {
  artifactId?: string;
  authorityId?: EducationAuthorityId;
  subjectId?: string;
}
export type DiffStatus = 'UNCHANGED' | 'MODIFIED' | 'BLOCKED' | 'UNVERIFIED_CONTENT_CHANGE' | 'SECURITY_VIOLATION';

export interface FieldDiff {
  changed: boolean;
  before: unknown;
  after: unknown;
}

export interface EducationalArtifactDiff {
  artifactId: string;
  versionA: number;
  versionB: number;
  status: 'BLOCKED' | 'SUCCESS';
  metadata: {
    authority: DiffStatus;
    institution: DiffStatus;
    grade: DiffStatus;
    phase: DiffStatus;
    curriculum: DiffStatus;
    subject: DiffStatus;
    pedagogical_context: DiffStatus;
    cp_verification_status: DiffStatus;
  };
  educationalContent: {
    title: FieldDiff;
    learning_objectives: FieldDiff;
    learning_activities: FieldDiff;
    assessment: FieldDiff;
    learning_resources: FieldDiff;
    teacher_notes: FieldDiff;
    differentiation: FieldDiff;
    student_task: FieldDiff;
  };
  summary: {
    changedFields: number;
    metadataChanged: boolean;
    editableContentChanged: boolean;
  };
}
export type LifecycleStatus = 'draft' | 'under_review' | 'rejected' | 'approved' | 'released' | 'archived';

export interface ApprovalMetadata {
    artifact_id: string;
    version_number: number;
    status: LifecycleStatus;
    submitted_at?: string;
    reviewed_at?: string;
    released_at?: string;
    reviewer_note?: string;
    rejection_reason?: string;
    checksum: string;
    previous_status: LifecycleStatus;
}

export type PublicationStatus = 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';

export interface PublicationMetadata {
    publication_id: string;
    artifact_id: string;
    source_version: number;
    source_checksum: string;
    published_at: string;
    published_by: string;
    publication_status: PublicationStatus;
}

export interface PublishedArtifact {
    artifact_id: string;
    source_version: number;
    source_checksum: string;
    published_at: string;
    publication_id: string;
    publication_status: PublicationStatus;
    curriculum_context: AIPromptContext;
    educational_content: EducationalContentArtifact;
    publication_metadata: PublicationMetadata;
}

export interface PublishedLearningContent {
    publication_id: string;
    artifact_id: string;
    source_version: number;
    title: string | null;
    curriculum_context: AIPromptContext;
    learning_objectives: string[];
    learning_activities: string[];
    assessment: string | null;
    learning_resources: string[];
    differentiation: string | null;
    student_task: string | null;
    teacher_notes: string | null;
}

export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
export type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface LearningSession {
    session_id: string;
    student_id: string;
    publication_id: string;
    artifact_id: string;
    source_version: number;
    source_checksum: string;
    started_at: string;
    last_activity_at: string;
    completed_at?: string;
    status: SessionStatus;
}

export interface StudentProgress {
    progress_id: string;
    session_id: string;
    student_id: string;
    publication_id: string;
    activity_id: string;
    progress_percent: number;
    status: ProgressStatus;
    started_at: string;
    completed_at?: string;
    last_updated_at: string;
}

export interface AuditEvent {
    event_id: string;
    student_id: string;
    session_id: string;
    publication_id: string;
    activity_id: string;
    timestamp: string;
    previous_status: string;
    new_status: string;
}

export interface ClassProgressSummary {
    course_id: string;
    teacher_id: string;
    publication_id: string;
    total_students: number;
    active_students: number;
    completed_students: number;
    average_progress: number;
    completion_rate: number;
    last_activity_at: string;
    generated_at: string;
}

export interface StudentProgressSummary {
    student_id: string;
    course_id: string;
    publication_id: string;
    session_status: SessionStatus;
    progress_percent: number;
    completed_activities: number;
    total_required_activities: number;
    last_activity_at: string;
}

export interface ActivityProgressSummary {
    activity_id: string;
    title: string;
    required: boolean;
    total_students: number;
    started_students: number;
    completed_students: number;
    completion_rate: number;
    average_progress: number;
}

export interface RecentActivity {
    activity_id: string;
    course_id: string;
    status: ProgressStatus;
    progress_percent: number;
    timestamp: string;
}

export interface StudentCourseProgressSummary {
    course_id: string;
    publication_id: string;
    title: string;
    subject: string;
    grade: number;
    progress_percent: number;
    status: ProgressStatus;
    completed_activities: number;
    total_required_activities: number;
    last_activity_at: string;
}

export interface StudentActivityProgressSummary {
    activity_id: string;
    title: string;
    required: boolean;
    status: ProgressStatus;
    progress_percent: number;
    started_at: string;
    completed_at?: string;
}

export interface StudentLearningDashboard {
    student_id: string;
    generated_at: string;
    total_courses: number;
    active_courses: number;
    completed_courses: number;
    overall_progress: number;
    course_summaries: StudentCourseProgressSummary[];
    recent_activity: RecentActivity[];
}

export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'RETURNED' | 'RESUBMITTED' | 'ACCEPTED' | 'REJECTED';

export interface SubmissionAttachment {
    attachment_id: string;
    filename: string;
    file_size: number;
    mime_type: string;
}

export interface SubmissionContent {
    text: string;
    attachments: SubmissionAttachment[];
}

export interface TeacherFeedback {
    feedback_text: string | null;
    score: number | null;
    reviewer_id: string;
    reviewed_at: string;
    review_status: SubmissionStatus;
}

export interface ActivitySubmission {
    submission_id: string;
    version: number;
    previous_submission_id: string | null;
    student_id: string;
    publication_id: string;
    activity_id: string;
    content: SubmissionContent;
    status: SubmissionStatus;
    submitted_at: string | null;
    feedback: TeacherFeedback | null;
}

export interface SubmissionAuditEvent {
    event_id: string;
    event_type: string;
    student_id: string;
    teacher_id: string | null;
    submission_id: string;
    submission_version: number;
    timestamp: string;
}

export type AssignmentStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export interface AssignmentTarget {
    target_type: 'CLASS' | 'STUDENT';
    target_id: string;
}

export interface AssignmentSchedule {
    start_at: string;
    due_at: string;
    timezone: string;
}

export interface AssignmentSubmissionPolicy {
    allow_submission: boolean;
    allow_resubmission: boolean;
    allow_late_submission: boolean;
    max_attempts: number;
    requires_teacher_review: boolean;
}

export interface Assignment {
    assignment_id: string;
    teacher_id: string;
    course_id: string;
    publication_id: string;
    artifact_id: string;
    version_number: number;
    activity_id: string;
    target: AssignmentTarget;
    status: AssignmentStatus;
    schedule: AssignmentSchedule;
    policy: AssignmentSubmissionPolicy;
    created_at: string;
    updated_at: string;
}

export interface AssignmentAuditEvent {
    event_id: string;
    assignment_id: string;
    teacher_id: string;
    version_number: number;
    event_type: string;
    timestamp: string;
}

export type EnrollmentStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN' | 'COMPLETED';

export interface ClassEnrollment {
    enrollment_id: string;
    student_id: string;
    course_id: string;
    class_id?: string;
    enrollment_status: EnrollmentStatus;
    version_number: number;
    created_at: string;
    updated_at: string;
    audit_metadata?: Record<string, any>;
}

export interface EnrollmentAuditEvent {
    event_id: string;
    enrollment_id: string;
    student_id: string;
    course_id: string;
    previous_status: EnrollmentStatus | null;
    new_status: EnrollmentStatus;
    actor_id: string;
    actor_role: 'TEACHER' | 'STUDENT' | 'ADMIN' | 'SYSTEM';
    timestamp: string;
    version_number: number;
}

export interface StudentRosterEntry {
    student_id: string;
    enrollment_id: string;
    status: EnrollmentStatus;
    enrolled_at: string;
    updated_at: string;
}

export interface StudentRoster {
    course_id: string;
    class_id?: string;
    teacher_id: string;
    generated_at: string;
    total_enrolled: number;
    active_students: number;
    entries: StudentRosterEntry[];
}

// Phase 29 Types: Assessment, Grading & Academic Evaluation
export type AssessmentStatus = 'DRAFT' | 'PUBLISHED' | 'OPEN' | 'CLOSED' | 'ARCHIVED';

export type AssessmentType = 'FORMATIVE' | 'SUMMATIVE' | 'PROJECT' | 'PRACTICAL' | 'QUIZ' | 'PERFORMANCE';

export interface AssessmentCriterion {
    criterion_id: string;
    criterion_name: string;
    description: string;
    max_score: number;
    weight: number;
}

export interface AssessmentRubric {
    rubric_id: string;
    criteria: AssessmentCriterion[];
    total_max_score: number;
}

export interface Assessment {
    assessment_id: string;
    assignment_id: string;
    activity_id: string;
    course_id: string;
    teacher_id: string;
    assessment_status: AssessmentStatus;
    assessment_type: AssessmentType;
    title: string;
    description?: string;
    max_score: number;
    passing_score?: number;
    rubric?: AssessmentRubric;
    created_at: string;
    updated_at: string;
    version_number: number;
}

export interface GradeRecord {
    grade_id: string;
    assessment_id: string;
    submission_id: string;
    student_id: string;
    course_id: string;
    teacher_id: string;
    raw_score: number;
    max_score: number;
    percentage: number;
    grade: string;
    passed: boolean;
    rubric_scores?: Record<string, number>;
    feedback?: string;
    version_number: number;
    created_at: string;
    updated_at: string;
}

export interface GradeHistoryEntry {
    history_id: string;
    grade_id: string;
    previous_score: number;
    new_score: number;
    previous_percentage: number;
    new_percentage: number;
    previous_grade: string;
    new_grade: string;
    revision_reason: string;
    actor_id: string;
    timestamp: string;
    version_number: number;
}

export interface AssessmentAuditEvent {
    event_id: string;
    assessment_id: string;
    assignment_id?: string;
    student_id?: string;
    teacher_id?: string;
    event_type: 'ASSESSMENT_CREATED' | 'ASSESSMENT_PUBLISHED' | 'ASSESSMENT_OPENED' | 'ASSESSMENT_CLOSED' | 'ASSESSMENT_ARCHIVED' | 'GRADE_CREATED' | 'GRADE_REVISED' | 'FEEDBACK_ADDED' | 'GRADEBOOK_VIEWED';
    previous_state?: any;
    new_state?: any;
    version_number?: number;
    timestamp: string;
    actor_id: string;
    actor_role: string;
}

export interface StudentGradebookEntry {
    assessment_id: string;
    assessment_title: string;
    assessment_type: AssessmentType;
    raw_score: number;
    max_score: number;
    percentage: number;
    grade: string;
    passed: boolean;
    feedback?: string;
    graded_at: string;
    version_number: number;
    grade_history?: GradeHistoryEntry[];
}

export interface StudentGradebook {
    student_id: string;
    course_id: string;
    entries: StudentGradebookEntry[];
    aggregate_average: number;
    total_assessments: number;
    passed_count: number;
    failed_count: number;
    completion_rate: number;
    generated_at: string;
}

export interface TeacherGradebookStudentRow {
    student_id: string;
    grades: Record<string, {
        grade_id: string;
        raw_score: number;
        max_score: number;
        percentage: number;
        grade: string;
        passed: boolean;
    }>;
    average_percentage: number;
    passed_count: number;
    failed_count: number;
}

export interface TeacherGradebook {
    course_id: string;
    teacher_id: string;
    assessments: Assessment[];
    student_rows: TeacherGradebookStudentRow[];
    course_average_percentage: number;
    generated_at: string;
}

// ==========================================
// PHASE 30 — ACADEMIC REPORT CARD TYPES
// ==========================================

export type ReportCardStatus = 'DRAFT' | 'CALCULATED' | 'INCOMPLETE' | 'FINALIZED' | 'PUBLISHED' | 'ARCHIVED';
export type ReportCardCompletionStatus = 'COMPLETE' | 'INCOMPLETE' | 'NOT_GRADED';

export interface ReportCardAssessmentSummary {
    assessment_id: string;
    assessment_title: string;
    assessment_type: AssessmentType;
    max_score: number;
    weight: number;
    raw_score?: number;
    percentage?: number;
    grade_letter?: string;
    passed?: boolean;
    graded: boolean;
}

export interface ReportCardCourse {
    course_id: string;
    subject: string;
    teacher_id: string;
    assessment_summary: ReportCardAssessmentSummary[];
    final_percentage: number;
    grade_letter: string;
    passing_status: boolean;
    completion_status: ReportCardCompletionStatus;
}

export interface AcademicReportCard {
    report_card_id: string;
    student_id: string;
    academic_period: string;
    status: ReportCardStatus;
    courses: ReportCardCourse[];
    overall_average: number;
    overall_grade_letter: string;
    overall_status: ReportCardCompletionStatus;
    total_courses: number;
    completed_courses: number;
    version_number: number;
    previous_version_id?: string;
    checksum: string;
    published_at?: string;
    finalized_at?: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    revision_reason?: string;
    curriculum_context: PublishedArtifact['curriculum_context'];
    audit_metadata?: Record<string, unknown>;
}

export interface ReportCardAuditEvent {
    event_id: string;
    report_card_id: string;
    student_id: string;
    version_number: number;
    actor_id: string;
    actor_role: string;
    timestamp: string;
    checksum: string;
    event_type: 'REPORT_CARD_CREATED' | 'REPORT_CARD_CALCULATED' | 'REPORT_CARD_FINALIZED' | 'REPORT_CARD_PUBLISHED' | 'REPORT_CARD_REVISED' | 'REPORT_CARD_ARCHIVED' | 'REPORT_CARD_VIEWED';
    previous_state?: unknown;
    new_state?: unknown;
}

export interface ReportCardHistoryEntry {
    history_id: string;
    report_card_id: string;
    version_number: number;
    previous_overall_average: number;
    new_overall_average: number;
    previous_status: ReportCardStatus;
    new_status: ReportCardStatus;
    revision_reason: string;
    actor_id: string;
    timestamp: string;
    checksum: string;
}

// ==========================================
// PHASE 31 — ACADEMIC TRANSCRIPT TYPES
// ==========================================

export type TranscriptStatus = 'DRAFT' | 'GENERATED' | 'VERIFIED' | 'PUBLISHED' | 'ARCHIVED';

export interface TranscriptCourse {
    course_id: string;
    subject_id: string;
    subject_name: string;
    teacher_id: string;
    academic_year: string;
    semester: string;
    final_percentage: number;
    final_grade_letter: string;
    passing_status: boolean;
    completion_status: ReportCardCompletionStatus;
    source_report_card_id: string;
    source_report_card_version: number;
    source_checksum: string;
}

export interface CumulativeAcademicSummary {
    total_courses: number;
    completed_courses: number;
    incomplete_courses: number;
    average_percentage: number;
    overall_grade_letter: string;
    grade_distribution: Record<string, number>;
    passed_courses: number;
    failed_courses: number;
}

export interface AcademicTranscript {
    transcript_id: string;
    student_id: string;
    academic_year: string;
    semester: string;
    status: TranscriptStatus;
    courses: TranscriptCourse[];
    cumulative_summary: CumulativeAcademicSummary;
    source_report_card_ids: string[];
    source_versions: Record<string, number>;
    source_checksums: Record<string, string>;
    generated_at: string;
    verified_at?: string;
    published_at?: string;
    version_number: number;
    previous_version_id?: string;
    revision_reason?: string;
    checksum: string;
    curriculum_context: PublishedArtifact['curriculum_context'];
    audit_metadata?: Record<string, unknown>;
}

export interface TranscriptAuditEvent {
    event_id: string;
    transcript_id: string;
    student_id: string;
    version_number: number;
    actor_id: string;
    actor_role: string;
    action: 'TRANSCRIPT_CREATED' | 'TRANSCRIPT_GENERATED' | 'TRANSCRIPT_VERIFIED' | 'TRANSCRIPT_PUBLISHED' | 'TRANSCRIPT_REGENERATED' | 'TRANSCRIPT_VIEWED' | 'TRANSCRIPT_ARCHIVED' | 'TRANSCRIPT_INVALIDATED';
    timestamp: string;
    source_checksum?: string;
    details?: Record<string, unknown>;
}

export interface TranscriptHistoryEntry {
    history_id: string;
    transcript_id: string;
    version_number: number;
    previous_average_percentage: number;
    new_average_percentage: number;
    previous_status: TranscriptStatus;
    new_status: TranscriptStatus;
    revision_reason: string;
    actor_id: string;
    timestamp: string;
    checksum: string;
}

// ==========================================
// PHASE 32 — ACADEMIC CALENDAR & COURSE PERIOD TYPES
// ==========================================

export type AcademicYearStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
export type SemesterStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
export type CoursePeriodStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
export type CalendarStatus = 'DRAFT' | 'ACTIVE' | 'PUBLISHED' | 'ARCHIVED';

export type AcademicCalendarEventType = 
    | 'TEACHING' 
    | 'HOLIDAY' 
    | 'EXAMINATION' 
    | 'ASSESSMENT' 
    | 'SUBMISSION_WINDOW' 
    | 'REPORTING' 
    | 'REPORT_CARD' 
    | 'ACADEMIC_EVENT' 
    | 'OTHER';

export interface AcademicYear {
    academic_year_id: string;
    code: string;
    label: string;
    start_at: string;
    end_at: string;
    status: AcademicYearStatus;
    version_number: number;
    created_at: string;
    updated_at: string;
    checksum: string;
    audit_metadata?: Record<string, unknown>;
}

export interface Semester {
    semester_id: string;
    academic_year_id: string;
    code: string;
    label: string;
    sequence: number;
    start_at: string;
    end_at: string;
    status: SemesterStatus;
    version_number: number;
    created_at: string;
    updated_at: string;
    checksum: string;
    audit_metadata?: Record<string, unknown>;
}

export interface AcademicCalendarEvent {
    event_id: string;
    calendar_id: string;
    type: AcademicCalendarEventType;
    title: string;
    description?: string;
    start_at: string;
    end_at: string;
    all_day: boolean;
    status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    version_number: number;
    course_id?: string;
}

export interface AcademicCalendar {
    calendar_id: string;
    academic_year_id: string;
    semester_id: string;
    events: AcademicCalendarEvent[];
    version_number: number;
    status: CalendarStatus;
    created_at: string;
    updated_at: string;
    checksum: string;
}

export interface CoursePeriod {
    course_period_id: string;
    course_id: string;
    academic_year_id: string;
    semester_id: string;
    teacher_id: string;
    start_at: string;
    end_at: string;
    status: CoursePeriodStatus;
    version_number: number;
    source_references?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    checksum: string;
}

export interface AcademicPeriodScope {
    academic_year_id: string;
    semester_id: string;
    course_period_id?: string;
}

export interface AcademicCalendarAuditEvent {
    event_id: string;
    entity_id: string;
    academic_year_id: string;
    semester_id?: string;
    course_period_id?: string;
    actor_id: string;
    actor_role: string;
    action: 
        | 'ACADEMIC_YEAR_CREATED' 
        | 'ACADEMIC_YEAR_ACTIVATED' 
        | 'ACADEMIC_YEAR_CLOSED' 
        | 'ACADEMIC_YEAR_ARCHIVED' 
        | 'SEMESTER_CREATED' 
        | 'SEMESTER_ACTIVATED' 
        | 'SEMESTER_CLOSED' 
        | 'SEMESTER_ARCHIVED' 
        | 'CALENDAR_CREATED' 
        | 'CALENDAR_UPDATED' 
        | 'CALENDAR_PUBLISHED' 
        | 'CALENDAR_ARCHIVED'
        | 'COURSE_PERIOD_CREATED' 
        | 'COURSE_PERIOD_SCHEDULED' 
        | 'COURSE_PERIOD_ACTIVATED' 
        | 'COURSE_PERIOD_CLOSED' 
        | 'COURSE_PERIOD_ARCHIVED' 
        | 'ACADEMIC_PERIOD_VIEWED';
    timestamp: string;
    version_number: number;
    checksum: string;
    details?: Record<string, unknown>;
}

export interface AcademicPeriodHistoryEntry {
    history_id: string;
    entity_id: string;
    entity_type: 'ACADEMIC_YEAR' | 'SEMESTER' | 'CALENDAR';
    version_number: number;
    previous_status: string;
    new_status: string;
    revision_reason: string;
    actor_id: string;
    timestamp: string;
    checksum: string;
}

export interface CoursePeriodHistoryEntry {
    history_id: string;
    course_period_id: string;
    version_number: number;
    previous_status: CoursePeriodStatus;
    new_status: CoursePeriodStatus;
    revision_reason: string;
    actor_id: string;
    timestamp: string;
    checksum: string;
}

// ==========================================
// PHASE 33 — STUDENT ATTENDANCE & ANALYTICS TYPES
// ==========================================

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'EXCUSED' | 'SICK' | 'ABSENT';
export type AttendanceSessionStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'LOCKED' | 'ARCHIVED';
export type AttendanceReason = 'NONE' | 'SICK' | 'OFFICIAL_ACTIVITY' | 'FAMILY_REASON' | 'AUTHORIZED_ABSENCE' | 'OTHER';

export interface AttendanceSession {
    attendance_session_id: string;
    academic_year_id: string;
    semester_id: string;
    course_id: string;
    course_period_id: string;
    learning_session_id?: string;
    teacher_id: string;
    title: string;
    session_date: string;
    start_at: string;
    end_at: string;
    status: AttendanceSessionStatus;
    version_number: number;
    created_at: string;
    updated_at: string;
    checksum: string;
}

export interface AttendanceRecord {
    attendance_id: string;
    attendance_session_id: string;
    student_id: string;
    course_id: string;
    course_period_id: string;
    semester_id: string;
    status: AttendanceStatus;
    reason: AttendanceReason;
    late_minutes: number;
    note?: string;
    marked_by: string;
    marked_at: string;
    version_number: number;
    revision_reason?: string;
    checksum: string;
}

export interface AttendanceHistoryEntry {
    history_id: string;
    attendance_id: string;
    attendance_session_id: string;
    student_id: string;
    version_number: number;
    previous_status: AttendanceStatus;
    new_status: AttendanceStatus;
    previous_reason?: AttendanceReason;
    new_reason?: AttendanceReason;
    previous_late_minutes?: number;
    new_late_minutes?: number;
    revision_reason: string;
    actor_id: string;
    timestamp: string;
    checksum: string;
}

export interface AttendanceAuditEvent {
    event_id: string;
    entity_id: string;
    attendance_id?: string;
    attendance_session_id?: string;
    student_id?: string;
    course_id: string;
    actor_id: string;
    actor_role: string;
    action: 
        | 'ATTENDANCE_SESSION_CREATED'
        | 'ATTENDANCE_SESSION_OPENED'
        | 'ATTENDANCE_SESSION_CLOSED'
        | 'ATTENDANCE_SESSION_LOCKED'
        | 'ATTENDANCE_SESSION_ARCHIVED'
        | 'ATTENDANCE_MARKED'
        | 'ATTENDANCE_REVISED'
        | 'ATTENDANCE_VIEWED'
        | 'ATTENDANCE_ANALYTICS_VIEWED';
    previous_status?: string;
    new_status?: string;
    version_number: number;
    timestamp: string;
    checksum: string;
    details?: Record<string, unknown>;
}

export interface StudentCourseAttendanceSummary {
    course_id: string;
    course_period_id: string;
    total_sessions: number;
    present_count: number;
    late_count: number;
    excused_count: number;
    sick_count: number;
    absent_count: number;
    attendance_percentage: number;
}

export interface StudentAttendanceSummary {
    student_id: string;
    semester_id: string;
    course_summaries: StudentCourseAttendanceSummary[];
    total_sessions: number;
    present_count: number;
    late_count: number;
    excused_count: number;
    sick_count: number;
    absent_count: number;
    overall_attendance_percentage: number;
}

export interface CourseAttendanceSummary {
    course_id: string;
    course_period_id: string;
    semester_id: string;
    total_students: number;
    total_sessions: number;
    present_rate: number;
    late_rate: number;
    absence_rate: number;
    course_attendance_percentage: number;
}

export interface SemesterAttendanceSummary {
    semester_id: string;
    academic_year_id: string;
    courses_count: number;
    students_count: number;
    total_attendance_records: number;
    semester_attendance_percentage: number;
}

export interface TeacherAttendanceMonitoring {
    teacher_id: string;
    course_id: string;
    course_period_id: string;
    semester_id: string;
    sessions_count: number;
    enrolled_students_count: number;
    course_attendance_summary: CourseAttendanceSummary;
    student_summaries: StudentAttendanceSummary[];
}

// ==========================================
// PHASE 34 — STUDENT BEHAVIOR, DISCIPLINE & GUIDANCE TYPES
// ==========================================

export type BehaviorEventStatus = 'DRAFT' | 'RECORDED' | 'REVIEWED' | 'RESOLVED' | 'ARCHIVED';

export type BehaviorCategory = 
    | 'POSITIVE_BEHAVIOR' 
    | 'ACHIEVEMENT' 
    | 'PARTICIPATION' 
    | 'WARNING' 
    | 'MINOR_VIOLATION' 
    | 'MAJOR_VIOLATION' 
    | 'ATTENDANCE_RELATED' 
    | 'ACADEMIC_CONDUCT' 
    | 'SOCIAL_CONDUCT' 
    | 'SAFETY_RELATED' 
    | 'OTHER';

export type BehaviorSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface StudentBehaviorEvent {
    event_id: string;
    student_id: string;
    academic_year_id: string;
    semester_id: string;
    course_id?: string;
    course_period_id?: string;
    learning_session_id?: string;
    attendance_session_id?: string;
    attendance_record_id?: string;
    category: BehaviorCategory;
    severity: BehaviorSeverity;
    title: string;
    description: string;
    event_date: string;
    reporter_id: string;
    reporter_role: string;
    reviewer_id?: string;
    reviewer_notes?: string;
    status: BehaviorEventStatus;
    case_id?: string;
    version_number: number;
    created_at: string;
    updated_at: string;
    checksum: string;
}

export type DisciplineCaseStatus = 
    | 'OPEN' 
    | 'UNDER_REVIEW' 
    | 'ACTION_REQUIRED' 
    | 'INTERVENTION_ACTIVE' 
    | 'RESOLVED' 
    | 'CLOSED' 
    | 'ARCHIVED';

export type DisciplineActionType = 
    | 'WARNING' 
    | 'COUNSELING' 
    | 'PARENT_CONTACT' 
    | 'RESTORATIVE_ACTION' 
    | 'BEHAVIOR_CONTRACT' 
    | 'SUPERVISED_ACTIVITY' 
    | 'TEMPORARY_RESTRICTION' 
    | 'OTHER';

export interface DisciplineAction {
    action_id: string;
    case_id: string;
    action_type: DisciplineActionType;
    description: string;
    assigned_to?: string;
    due_date?: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    actor_id: string;
    actor_role: string;
    created_at: string;
    version_number: number;
    checksum: string;
}

export interface DisciplineCase {
    case_id: string;
    student_id: string;
    academic_year_id: string;
    semester_id: string;
    event_ids: string[];
    title: string;
    description: string;
    severity: BehaviorSeverity;
    status: DisciplineCaseStatus;
    assigned_officer_id: string;
    assigned_officer_role: string;
    actions: DisciplineAction[];
    intervention_ids: string[];
    resolution_notes?: string;
    resolved_at?: string;
    closed_at?: string;
    version_number: number;
    created_at: string;
    updated_at: string;
    checksum: string;
}

export type InterventionStatus = 'PLANNED' | 'ACTIVE' | 'FOLLOW_UP' | 'COMPLETED' | 'ARCHIVED';

export type FollowUpStatus = 'SCHEDULED' | 'MISSED' | 'RESCHEDULED' | 'COMPLETED';

export interface BehaviorFollowUp {
    follow_up_id: string;
    intervention_id: string;
    scheduled_at: string;
    completed_at?: string;
    actor_id: string;
    notes?: string;
    status: FollowUpStatus;
    outcome?: string;
    version_number: number;
    checksum: string;
}

export interface GuidanceIntervention {
    intervention_id: string;
    student_id: string;
    case_id?: string;
    event_id?: string;
    academic_year_id: string;
    semester_id: string;
    intervention_type: string;
    goal: string;
    action_plan: string;
    start_at: string;
    expected_end_at: string;
    responsible_counselor_id: string;
    responsible_counselor_role: string;
    follow_ups: BehaviorFollowUp[];
    status: InterventionStatus;
    outcome?: string;
    version_number: number;
    created_at: string;
    updated_at: string;
    checksum: string;
}

export interface BehaviorHistoryEntry {
    history_id: string;
    entity_id: string;
    entity_type: 'BEHAVIOR_EVENT' | 'DISCIPLINE_CASE' | 'GUIDANCE_INTERVENTION' | 'BEHAVIOR_FOLLOW_UP';
    version_number: number;
    previous_status: string;
    new_status: string;
    revision_reason: string;
    actor_id: string;
    timestamp: string;
    checksum: string;
}

export interface BehaviorAuditEvent {
    audit_id: string;
    entity_id: string;
    entity_type: string;
    event_type: 
        | 'BEHAVIOR_EVENT_CREATED' 
        | 'BEHAVIOR_EVENT_RECORDED' 
        | 'BEHAVIOR_EVENT_REVIEWED' 
        | 'BEHAVIOR_EVENT_RESOLVED' 
        | 'BEHAVIOR_EVENT_ARCHIVED' 
        | 'DISCIPLINE_CASE_CREATED' 
        | 'DISCIPLINE_CASE_REVIEWED' 
        | 'DISCIPLINE_ACTION_CREATED' 
        | 'DISCIPLINE_INTERVENTION_STARTED' 
        | 'DISCIPLINE_CASE_RESOLVED' 
        | 'DISCIPLINE_CASE_CLOSED' 
        | 'DISCIPLINE_CASE_ARCHIVED' 
        | 'INTERVENTION_CREATED' 
        | 'INTERVENTION_FOLLOW_UP_SCHEDULED' 
        | 'INTERVENTION_FOLLOW_UP_COMPLETED' 
        | 'INTERVENTION_COMPLETED' 
        | 'BEHAVIOR_VIEWED' 
        | 'BEHAVIOR_ANALYTICS_VIEWED';
    actor_id: string;
    actor_role: string;
    timestamp: string;
    previous_status?: string;
    new_status?: string;
    version_number: number;
    checksum: string;
    details?: Record<string, unknown>;
}

export interface StudentBehaviorSummary {
    student_id: string;
    semester_id: string;
    total_events: number;
    positive_events: number;
    warning_events: number;
    violation_events: number;
    open_cases: number;
    resolved_cases: number;
    active_interventions: number;
    completed_interventions: number;
    follow_up_pending: number;
}

export interface TeacherBehaviorMonitoring {
    teacher_id: string;
    course_id: string;
    course_period_id: string;
    semester_id: string;
    student_count: number;
    event_count: number;
    open_case_count: number;
    intervention_count: number;
    students_requiring_attention: string[];
    student_summaries: StudentBehaviorSummary[];
}

// ==========================================
// PHASE 35 — STUDENT GUIDANCE, COUNSELING & INTERVENTION TYPES
// ==========================================

export type GuidanceCaseStatus = 
    | 'DRAFT' 
    | 'OPEN' 
    | 'IN_PROGRESS' 
    | 'ESCALATED' 
    | 'RESOLVED' 
    | 'CLOSED' 
    | 'ARCHIVED';

export type GuidancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type GuidanceSourceType = 
    | 'BEHAVIOR_EVENT' 
    | 'DISCIPLINE_CASE' 
    | 'TEACHER_REFERRAL' 
    | 'SELF_REFERRAL' 
    | 'PARENT_REFERRAL' 
    | 'ACADEMIC_CONCERN' 
    | 'ATTENDANCE_CONCERN' 
    | 'WELLBEING_CONCERN' 
    | 'OTHER';

export type GuidanceSessionStatus = 
    | 'SCHEDULED' 
    | 'COMPLETED' 
    | 'CANCELLED' 
    | 'NO_SHOW' 
    | 'RESCHEDULED';

export type InterventionPlanStatus = 
    | 'DRAFT' 
    | 'ACTIVE' 
    | 'PAUSED' 
    | 'COMPLETED' 
    | 'CANCELLED' 
    | 'ARCHIVED';

export type InterventionOutcome = 
    | 'IMPROVED' 
    | 'STABLE' 
    | 'NO_CHANGE' 
    | 'DECLINED' 
    | 'UNDETERMINED';

export type GuidanceFollowUpStatus = 
    | 'SCHEDULED' 
    | 'COMPLETED' 
    | 'MISSED' 
    | 'RESCHEDULED' 
    | 'CANCELLED';

export interface GuidanceCase {
    case_id: string;
    student_id: string;
    academic_year_id: string;
    semester_id: string;
    course_id?: string;
    source_type: GuidanceSourceType;
    source_reference_id?: string;
    priority: GuidancePriority;
    status: GuidanceCaseStatus;
    opened_at: string;
    assigned_counselor_id?: string;
    assigned_teacher_id?: string;
    assigned_headmaster_id?: string;
    summary: string;
    confidential_notes?: string;
    current_version: number;
    created_at: string;
    updated_at: string;
    checksum: string;
}

export interface GuidanceSession {
    session_id: string;
    case_id: string;
    student_id: string;
    counselor_id: string;
    scheduled_at: string;
    started_at?: string;
    completed_at?: string;
    status: GuidanceSessionStatus;
    session_summary: string;
    confidential_notes?: string;
    next_action?: string;
    version_number: number;
    revision_reason?: string;
    checksum: string;
}

export interface InterventionAction {
    action_id: string;
    plan_id: string;
    action_type: 
        | 'COUNSELING_SESSION' 
        | 'TEACHER_CHECK_IN' 
        | 'PARENT_MEETING' 
        | 'ACADEMIC_SUPPORT' 
        | 'ATTENDANCE_MONITORING' 
        | 'BEHAVIOR_MONITORING' 
        | 'REFERRAL' 
        | 'FOLLOW_UP' 
        | 'OTHER';
    description: string;
    assigned_to: string;
    due_at: string;
    completed_at?: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    outcome?: string;
    version_number: number;
    checksum: string;
}

export interface InterventionPlan {
    plan_id: string;
    case_id: string;
    student_id: string;
    objective: string;
    priority: GuidancePriority;
    status: InterventionPlanStatus;
    start_at: string;
    target_end_at: string;
    responsible_role: string;
    responsible_id: string;
    actions: InterventionAction[];
    version_number: number;
    created_at: string;
    updated_at: string;
    checksum: string;
}

export interface GuidanceFollowUp {
    follow_up_id: string;
    case_id: string;
    student_id: string;
    plan_id?: string;
    scheduled_at: string;
    completed_at?: string;
    status: GuidanceFollowUpStatus;
    notes: string;
    outcome?: string;
    next_follow_up_at?: string;
    version_number: number;
    checksum: string;
}

export interface GuidanceOutcome {
    outcome_id: string;
    case_id: string;
    student_id: string;
    plan_id?: string;
    follow_up_id?: string;
    outcome: InterventionOutcome;
    evaluation_notes: string;
    recorded_by: string;
    recorded_at: string;
    version_number: number;
    checksum: string;
}

export interface GuidanceHistoryEntry {
    history_id: string;
    entity_id: string;
    entity_type: 'GUIDANCE_CASE' | 'GUIDANCE_SESSION' | 'INTERVENTION_PLAN' | 'GUIDANCE_FOLLOWUP' | 'GUIDANCE_OUTCOME';
    previous_version: number;
    new_version: number;
    previous_status?: string;
    new_status?: string;
    revision_reason: string;
    actor_id: string;
    timestamp: string;
    checksum: string;
}

export interface GuidanceAuditEvent {
    audit_id: string;
    entity_id: string;
    entity_type: string;
    event_type: 
        | 'GUIDANCE_CASE_CREATED' 
        | 'GUIDANCE_CASE_OPENED' 
        | 'GUIDANCE_CASE_ASSIGNED' 
        | 'GUIDANCE_CASE_ESCALATED' 
        | 'GUIDANCE_CASE_RESOLVED' 
        | 'GUIDANCE_CASE_CLOSED' 
        | 'GUIDANCE_CASE_ARCHIVED' 
        | 'GUIDANCE_SESSION_SCHEDULED' 
        | 'GUIDANCE_SESSION_COMPLETED' 
        | 'GUIDANCE_SESSION_CANCELLED' 
        | 'INTERVENTION_PLAN_CREATED' 
        | 'INTERVENTION_PLAN_ACTIVATED' 
        | 'INTERVENTION_PLAN_PAUSED' 
        | 'INTERVENTION_PLAN_COMPLETED' 
        | 'INTERVENTION_PLAN_CANCELLED' 
        | 'GUIDANCE_FOLLOWUP_CREATED' 
        | 'GUIDANCE_FOLLOWUP_COMPLETED' 
        | 'GUIDANCE_OUTCOME_RECORDED' 
        | 'GUIDANCE_VIEWED' 
        | 'GUIDANCE_ANALYTICS_VIEWED';
    actor_id: string;
    actor_role: string;
    timestamp: string;
    previous_status?: string;
    new_status?: string;
    version_number: number;
    checksum: string;
    details?: Record<string, unknown>;
}

export interface StudentSafeGuidanceCaseProjection {
    case_id: string;
    student_id: string;
    source_type: GuidanceSourceType;
    priority: GuidancePriority;
    status: GuidanceCaseStatus;
    opened_at: string;
    assigned_counselor_name?: string;
    summary: string;
    has_active_intervention: boolean;
    scheduled_sessions_count: number;
    completed_sessions_count: number;
    updated_at: string;
}

export interface StudentGuidanceSummary {
    student_id: string;
    semester_id: string;
    total_cases: number;
    open_cases: number;
    resolved_cases: number;
    active_interventions: number;
    completed_interventions: number;
    scheduled_followups: number;
    completed_followups: number;
    missed_followups: number;
    current_priority: GuidancePriority;
    latest_outcome: InterventionOutcome;
}

export interface ClassGuidanceSummary {
    course_id: string;
    course_period_id: string;
    semester_id: string;
    student_count: number;
    students_with_guidance_cases: number;
    open_case_count: number;
    active_intervention_count: number;
    resolved_case_count: number;
    high_priority_case_count: number;
    critical_case_count: number;
}

export interface InterventionEffectivenessSummary {
    semester_id: string;
    total_interventions: number;
    completed_interventions: number;
    improved_count: number;
    stable_count: number;
    no_change_count: number;
    declined_count: number;
    undetermined_count: number;
    improvement_rate: number;
}

export interface TeacherGuidanceMonitoring {
    teacher_id: string;
    course_id: string;
    course_period_id: string;
    semester_id: string;
    class_summary: ClassGuidanceSummary;
    student_guidance_statuses: Array<{
        student_id: string;
        has_open_case: boolean;
        priority: GuidancePriority;
        status: GuidanceCaseStatus;
        active_intervention_count: number;
        has_warning: boolean;
    }>;
}

export interface CounselorGuidanceDashboard {
    counselor_id: string;
    semester_id: string;
    total_assigned_cases: number;
    open_cases: GuidanceCase[];
    escalated_cases: GuidanceCase[];
    upcoming_sessions: GuidanceSession[];
    overdue_follow_ups: GuidanceFollowUp[];
    active_plans: InterventionPlan[];
    recent_outcomes: GuidanceOutcome[];
    effectiveness_summary: InterventionEffectivenessSummary;
}

// ==========================================
// PHASE 36: PARENT/GUARDIAN PORTAL & STUDENT ACADEMIC-WELLBEING MONITORING
// ==========================================

export type GuardianStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'ARCHIVED';
export type GuardianRole = 'PARENT' | 'LEGAL_GUARDIAN' | 'AUTHORIZED_CAREGIVER';
export type GuardianRelationshipType = 'PARENT' | 'LEGAL_GUARDIAN' | 'AUTHORIZED_CAREGIVER';
export type GuardianRelationshipStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'ARCHIVED';

export interface Guardian {
    guardian_id: string;
    display_name: string;
    email?: string;
    phone?: string;
    role: GuardianRole;
    status: GuardianStatus;
    version_number: number;
    created_at: string;
    updated_at: string;
    checksum: string;
}

export interface GuardianStudentRelationship {
    relationship_id: string;
    guardian_id: string;
    student_id: string;
    relationship_type: GuardianRelationshipType;
    status: GuardianRelationshipStatus;
    effective_from: string;
    effective_until?: string;
    is_primary_contact: boolean;
    emergency_contact_priority?: number;
    notes?: string;
    version_number: number;
    created_at: string;
    updated_at: string;
    checksum: string;
}

export interface GuardianAuditEvent {
    event_id: string;
    entity_id: string;
    entity_type: 'GUARDIAN' | 'GUARDIAN_STUDENT_RELATIONSHIP' | 'PARENT_PORTAL';
    event_type: 
        | 'GUARDIAN_REGISTERED'
        | 'GUARDIAN_UPDATED'
        | 'GUARDIAN_STATUS_CHANGED'
        | 'GUARDIAN_ARCHIVED'
        | 'RELATIONSHIP_CREATED'
        | 'RELATIONSHIP_UPDATED'
        | 'RELATIONSHIP_STATUS_CHANGED'
        | 'RELATIONSHIP_ARCHIVED'
        | 'PARENT_DASHBOARD_ACCESSED'
        | 'STUDENT_MONITORING_ACCESSED'
        | 'UNAUTHORIZED_ACCESS_ATTEMPT';
    actor_id: string;
    actor_role: string;
    timestamp: string;
    details?: Record<string, unknown>;
    version_number: number;
    checksum: string;
}

export interface ParentAcademicPeriodSummary {
    course_period_id: string;
    course_id: string;
    subject_id: string;
    semester_id: string;
    academic_year: string;
    teacher_name?: string;
    status: string;
}

export interface ParentCourseProgressSummary {
    course_period_id: string;
    course_name: string;
    subject_id: string;
    total_activities: number;
    completed_activities: number;
    progress_percentage: number;
    completion_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    last_activity_at?: string;
}

export interface ParentAttendanceSummary {
    student_id: string;
    semester_id: string;
    total_sessions: number;
    present_count: number;
    late_count: number;
    excused_count: number;
    sick_count: number;
    absent_count: number;
    attendance_percentage: number;
    is_at_risk: boolean;
}

export interface ParentAssessmentSummary {
    student_id: string;
    course_period_id: string;
    total_assessments: number;
    completed_assessments: number;
    average_score: number;
    passing_grade: number;
    is_passing: boolean;
    graded_items: Array<{
        assessment_id: string;
        title: string;
        score: number;
        max_score: number;
        is_passed: boolean;
        graded_at?: string;
    }>;
}

export interface ParentReportCardSummary {
    report_card_id: string;
    student_id: string;
    semester_id: string;
    academic_year: string;
    status: 'DRAFT' | 'GENERATED' | 'PUBLISHED' | 'REVOKED' | 'ARCHIVED';
    overall_gpa?: number;
    overall_predicate?: string;
    is_published: boolean;
    published_at?: string;
}

export interface ParentTranscriptSummary {
    transcript_id: string;
    student_id: string;
    status: 'DRAFT' | 'GENERATED' | 'PUBLISHED' | 'REVOKED' | 'ARCHIVED';
    cumulative_gpa: number;
    total_credits: number;
    is_published: boolean;
    published_at?: string;
}

export interface ParentBehaviorSummary {
    student_id: string;
    semester_id: string;
    total_events: number;
    positive_count: number;
    neutral_count: number;
    warning_count: number;
    violation_count: number;
    behavior_index: number;
    standing: 'EXEMPLARY' | 'GOOD' | 'SATISFACTORY' | 'NEEDS_IMPROVEMENT' | 'CRITICAL';
}

export interface ParentGuidanceSummary {
    student_id: string;
    has_active_guidance: boolean;
    active_case_count: number;
    scheduled_sessions_count: number;
    completed_sessions_count: number;
    has_active_intervention: boolean;
    intervention_status?: string;
    overall_standing: 'NORMAL' | 'MONITORED' | 'SUPPORT_ACTIVE' | 'ACTION_REQUIRED';
}

export interface ParentRecentActivity {
    activity_id: string;
    activity_type: 'ATTENDANCE' | 'SUBMISSION' | 'GRADE' | 'BEHAVIOR' | 'GUIDANCE' | 'REPORT_CARD';
    title: string;
    description: string;
    timestamp: string;
    status?: string;
}

export interface ParentStudentOverview {
    student_id: string;
    student_display_name: string;
    relationship_type: GuardianRelationshipType;
    is_primary_contact: boolean;
    attendance_rate: number;
    average_academic_score: number;
    behavior_standing: 'EXEMPLARY' | 'GOOD' | 'SATISFACTORY' | 'NEEDS_IMPROVEMENT' | 'CRITICAL';
    guidance_standing: 'NORMAL' | 'MONITORED' | 'SUPPORT_ACTIVE' | 'ACTION_REQUIRED';
    active_courses_count: number;
    has_action_items: boolean;
}

export interface ParentDashboard {
    guardian_id: string;
    student_id: string;
    student_display_name: string;
    relationship_type: GuardianRelationshipType;
    is_primary_contact: boolean;
    academic_periods: ParentAcademicPeriodSummary[];
    course_progress: ParentCourseProgressSummary[];
    attendance: ParentAttendanceSummary;
    assessments: ParentAssessmentSummary[];
    report_card?: ParentReportCardSummary;
    transcript?: ParentTranscriptSummary;
    behavior: ParentBehaviorSummary;
    guidance: ParentGuidanceSummary;
    recent_activities: ParentRecentActivity[];
    generated_at: string;
    source_versions: Record<string, number | string>;
    checksum: string;
}

// ==========================================
// PHASE 37: NOTIFICATION, COMMUNICATION & PARENT-TEACHER ENGAGEMENT
// ==========================================

export type NotificationStatus = 
    | 'QUEUED' 
    | 'PROCESSING' 
    | 'DELIVERED' 
    | 'READ' 
    | 'FAILED' 
    | 'CANCELLED' 
    | 'ARCHIVED';

export type NotificationPriority = 
    | 'LOW' 
    | 'NORMAL' 
    | 'HIGH' 
    | 'URGENT';

export type NotificationChannel = 
    | 'IN_APP' 
    | 'EMAIL' 
    | 'SMS' 
    | 'PUSH' 
    | 'SYSTEM';

export type NotificationCategory = 
    | 'ACADEMIC' 
    | 'ASSIGNMENT' 
    | 'ASSESSMENT' 
    | 'ATTENDANCE' 
    | 'REPORT_CARD' 
    | 'TRANSCRIPT' 
    | 'BEHAVIOR' 
    | 'GUIDANCE' 
    | 'COURSE' 
    | 'CALENDAR' 
    | 'SYSTEM' 
    | 'COMMUNICATION' 
    | 'ADMINISTRATIVE';

export type NotificationRecipientType = 
    | 'STUDENT' 
    | 'GUARDIAN' 
    | 'TEACHER' 
    | 'COUNSELOR' 
    | 'ADMIN' 
    | 'HEADMASTER';

export type NotificationPrivacyLevel = 
    | 'PUBLIC_WITHIN_CLASS' 
    | 'PRIVATE_PARTICIPANTS' 
    | 'GUARDIAN_ONLY' 
    | 'TEACHER_ONLY' 
    | 'COUNSELOR_RESTRICTED' 
    | 'ADMIN_RESTRICTED';

export interface Notification {
    notification_id: string;
    category: NotificationCategory;
    priority: NotificationPriority;
    privacy_level: NotificationPrivacyLevel;
    title: string;
    body: string;
    recipient_type: NotificationRecipientType;
    recipient_id: string;
    source_type: string;
    source_id: string;
    channel: NotificationChannel;
    status: NotificationStatus;
    metadata?: Record<string, unknown>;
    created_at: string;
    delivered_at?: string;
    read_at?: string;
    version_number: number;
    checksum: string;
}

export interface NotificationRecipientState {
    state_id: string;
    notification_id: string;
    recipient_id: string;
    status: 'DELIVERED' | 'READ' | 'ARCHIVED';
    read_at?: string;
    version_number: number;
    updated_at: string;
    checksum: string;
}

export interface NotificationQuietHours {
    enabled: boolean;
    start_time: string; // HH:mm format, e.g. "21:00"
    end_time: string;   // HH:mm format, e.g. "06:00"
}

export interface NotificationPreference {
    preference_id: string;
    actor_id: string;
    actor_role: string;
    category: NotificationCategory;
    channel: NotificationChannel;
    enabled: boolean;
    quiet_hours?: NotificationQuietHours;
    version_number: number;
    updated_at: string;
    checksum: string;
}

export interface NotificationHistoryEntry {
    history_id: string;
    notification_id: string;
    version_number: number;
    previous_status: NotificationStatus;
    new_status: NotificationStatus;
    reason: string;
    actor_id: string;
    timestamp: string;
    checksum: string;
}

export interface NotificationAuditEvent {
    audit_id: string;
    event_type: 
        | 'NOTIFICATION_CREATED'
        | 'NOTIFICATION_QUEUED'
        | 'NOTIFICATION_DELIVERED'
        | 'NOTIFICATION_READ'
        | 'NOTIFICATION_FAILED'
        | 'NOTIFICATION_CANCELLED'
        | 'NOTIFICATION_ARCHIVED'
        | 'NOTIFICATION_PREFERENCE_UPDATED'
        | 'NOTIFICATION_VIEWED';
    notification_id: string;
    recipient_id?: string;
    actor_id: string;
    actor_role: string;
    timestamp: string;
    version_number: number;
    details?: Record<string, unknown>;
    checksum: string;
}

export type CommunicationThreadStatus = 
    | 'DRAFT' 
    | 'OPEN' 
    | 'ACTIVE' 
    | 'ARCHIVED';

export type CommunicationMessageStatus = 
    | 'DRAFT' 
    | 'SENT' 
    | 'READ' 
    | 'ARCHIVED';

export interface CommunicationThread {
    thread_id: string;
    subject: string;
    participant_ids: string[];
    participant_roles: Record<string, string>; // actor_id -> role
    context_type: 'STUDENT_COURSE' | 'STUDENT_WELLBEING' | 'ACADEMIC_GENERAL' | 'ADMINISTRATIVE';
    student_id: string;
    course_id?: string;
    course_period_id?: string;
    privacy_level: NotificationPrivacyLevel;
    status: CommunicationThreadStatus;
    created_at: string;
    updated_at: string;
    version_number: number;
    checksum: string;
}

export interface CommunicationMessage {
    message_id: string;
    thread_id: string;
    sender_id: string;
    sender_role: string;
    body: string;
    status: CommunicationMessageStatus;
    created_at: string;
    edited_at?: string;
    read_by?: Record<string, string>; // recipient_id -> timestamp
    version_number: number;
    checksum: string;
}

export interface CommunicationHistoryEntry {
    history_id: string;
    message_id: string;
    thread_id: string;
    version_number: number;
    previous_body?: string;
    new_body: string;
    previous_status?: CommunicationMessageStatus;
    new_status: CommunicationMessageStatus;
    reason: string;
    actor_id: string;
    timestamp: string;
    checksum: string;
}

export interface CommunicationAuditEvent {
    audit_id: string;
    thread_id: string;
    message_id?: string;
    event_type: 
        | 'THREAD_CREATED'
        | 'THREAD_ACTIVATED'
        | 'THREAD_ARCHIVED'
        | 'MESSAGE_SENT'
        | 'MESSAGE_READ'
        | 'MESSAGE_ARCHIVED'
        | 'MESSAGE_REVISED'
        | 'COMMUNICATION_VIEWED';
    actor_id: string;
    actor_role: string;
    timestamp: string;
    details?: Record<string, unknown>;
    checksum: string;
}

export interface NotificationSummary {
    recipient_id: string;
    unread_count: number;
    high_priority_count: number;
    urgent_count: number;
    category_breakdown: Record<NotificationCategory, number>;
    latest_notifications: Notification[];
}

export interface ParentTeacherCommunicationSummary {
    actor_id: string;
    thread_count: number;
    unread_count: number;
    active_thread_count: number;
    latest_message_at?: string;
    threads: CommunicationThread[];
}

// ==========================================
// PHASE 38: AUTHENTICATION & AUTHORIZATION ENGINE
// ==========================================

export type UserAccountStatus = 
    | 'PENDING' 
    | 'ACTIVE' 
    | 'SUSPENDED' 
    | 'LOCKED' 
    | 'REVOKED' 
    | 'ARCHIVED';

export type UserRole = 
    | 'STUDENT' 
    | 'TEACHER' 
    | 'PARENT' 
    | 'LEGAL_GUARDIAN' 
    | 'AUTHORIZED_CAREGIVER' 
    | 'COUNSELOR' 
    | 'DISCIPLINE_OFFICER' 
    | 'HEADMASTER' 
    | 'ADMIN';

export type Permission = 
    | 'identity:read'
    | 'identity:write'
    | 'user:read'
    | 'user:write'
    | 'session:read'
    | 'session:revoke'
    | 'student:read'
    | 'student:write'
    | 'teacher:read'
    | 'teacher:write'
    | 'guardian:read'
    | 'guardian:write'
    | 'course:read'
    | 'course:write'
    | 'attendance:read'
    | 'attendance:write'
    | 'assessment:read'
    | 'assessment:write'
    | 'grade:read'
    | 'grade:write'
    | 'report_card:read'
    | 'report_card:write'
    | 'transcript:read'
    | 'transcript:write'
    | 'behavior:read'
    | 'behavior:write'
    | 'guidance:read'
    | 'guidance:write'
    | 'notification:read'
    | 'notification:write'
    | 'communication:read'
    | 'communication:write'
    | 'audit:read'
    | 'security:manage';

export interface RolePermission {
    role: UserRole;
    permissions: Permission[];
}

export interface UserAccount {
    user_id: string;
    username: string;
    display_name: string;
    email: string;
    role: UserRole;
    status: UserAccountStatus;
    actor_id?: string; // Links to student_id, teacher_id, guardian_id, counselor_id
    created_at: string;
    updated_at: string;
    version_number: number;
    checksum: string;
}

export interface PasswordCredential {
    credential_id: string;
    user_id: string;
    password_hash: string;
    salt: string;
    algorithm: string;
    created_at: string;
    version_number: number;
    is_revoked: boolean;
    checksum: string;
}

export interface AccountSecurityState {
    user_id: string;
    failed_attempt_count: number;
    last_failed_at?: string;
    locked_at?: string;
    lock_reason?: string;
    last_successful_login_at?: string;
    password_changed_at?: string;
    version_number: number;
    checksum: string;
}

export type UserSessionStatus = 
    | 'ACTIVE' 
    | 'EXPIRED' 
    | 'REVOKED' 
    | 'TERMINATED';

export interface UserSession {
    session_id: string;
    user_id: string;
    role: UserRole;
    actor_id?: string;
    ip_address?: string;
    user_agent?: string;
    status: UserSessionStatus;
    created_at: string;
    expires_at: string;
    last_activity_at: string;
    version_number: number;
    checksum: string;
}

export interface AuthenticatedIdentity {
    user_id: string;
    username: string;
    display_name: string;
    email: string;
    role: UserRole;
    status: UserAccountStatus;
    actor_id?: string;
    created_at: string;
    version_number: number;
}

export interface AuthenticationResult {
    success: boolean;
    identity?: AuthenticatedIdentity;
    session?: UserSession;
    error?: string;
    error_code?: string;
}

export interface AuthenticationFailure {
    error_code: string;
    message: string;
    timestamp: string;
}

export interface AuthorizationContext {
    user_id: string;
    role: UserRole;
    actor_id?: string;
    target_resource: string;
    action: string;
    target_student_id?: string;
    target_course_id?: string;
    target_teacher_id?: string;
    target_guardian_id?: string;
    target_counselor_id?: string;
    target_scope?: Record<string, unknown>;
    checksum?: string;
}

export interface AuthorizationDecision {
    granted: boolean;
    reason?: string;
    user_id: string;
    role: UserRole;
    permission?: Permission;
    resource: string;
    action: string;
    timestamp: string;
    checksum: string;
}

export type SecurityEventType = 
    | 'AUTHENTICATION_SUCCESS'
    | 'AUTHENTICATION_FAILURE'
    | 'ACCOUNT_LOCKED'
    | 'ACCOUNT_UNLOCKED'
    | 'SESSION_CREATED'
    | 'SESSION_REFRESHED'
    | 'SESSION_REVOKED'
    | 'SESSION_EXPIRED'
    | 'LOGOUT'
    | 'PASSWORD_CHANGED'
    | 'PASSWORD_RESET_REQUESTED'
    | 'PASSWORD_RESET_COMPLETED'
    | 'AUTHORIZATION_GRANTED'
    | 'AUTHORIZATION_DENIED'
    | 'SCOPE_ACCESS_DENIED'
    | 'SECURITY_POLICY_VIOLATION'
    | 'CREDENTIAL_REVOKED';

export interface SecurityEvent {
    event_id: string;
    event_type: SecurityEventType;
    actor_id: string;
    actor_role: string;
    target_user_id?: string;
    ip_address?: string;
    details?: Record<string, unknown>;
    timestamp: string;
    checksum: string;
}

export interface AuthenticationAuditEvent extends SecurityEvent {}

// ==========================================
// PHASE 39: FRONTEND APPLICATION ARCHITECTURE & SECURE UI SHELL
// ==========================================

export type BootstrapState = 
    | 'INITIALIZING'
    | 'AUTHENTICATING'
    | 'AUTHENTICATED'
    | 'UNAUTHENTICATED'
    | 'SESSION_EXPIRED'
    | 'AUTHORIZATION_DENIED'
    | 'ERROR'
    | 'READY';

export interface FrontendAuthState {
    state: BootstrapState;
    identity: AuthenticatedIdentity | null;
    session: UserSession | null;
    error: string | null;
}

export interface RouteDefinition {
    path: string;
    label: string;
    icon?: string;
    category?: string;
    requiredAuthentication: boolean;
    requiredRoles?: UserRole[];
    requiredPermissions?: Permission[];
    scopeType?: 'student' | 'teacher' | 'guardian' | 'counselor' | 'discipline' | 'admin' | 'none';
    component?: React.ComponentType<any>;
}

export interface NavigationItem {
    id: string;
    path: string;
    label: string;
    icon: string;
    badge?: string | number;
    category?: string;
}

export type ApplicationErrorType = 
    | 'AUTHENTICATION_ERROR'
    | 'AUTHORIZATION_ERROR'
    | 'SESSION_EXPIRED'
    | 'VALIDATION_ERROR'
    | 'DOMAIN_ERROR'
    | 'NETWORK_ERROR'
    | 'UNKNOWN_ERROR';

export interface ApplicationErrorRecord {
    error_id: string;
    type: ApplicationErrorType;
    message: string;
    timestamp: string;
    context?: Record<string, unknown>;
}

// ==========================================
// PHASE 40: SCHOOL ADMINISTRATION, MASTER DATA & INSTITUTIONAL GOVERNANCE ENGINE
// ==========================================

export type InstitutionStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'ARCHIVED';

export type SchoolInstitutionType = 
    | 'ELEMENTARY' 
    | 'JUNIOR_HIGH' 
    | 'SENIOR_HIGH' 
    | 'VOCATIONAL' 
    | 'HIGHER_EDUCATION' 
    | 'OTHER';

export interface InstitutionAddress {
    street: string;
    city: string;
    state_province?: string;
    postal_code?: string;
    country: string;
}

export interface InstitutionContact {
    email: string;
    phone: string;
    website?: string;
}

export interface Institution {
    institution_id: string;
    institution_code: string;
    institution_name: string;
    institution_type: SchoolInstitutionType;
    legal_name: string;
    address: InstitutionAddress;
    contact_information: InstitutionContact;
    timezone: string;
    locale: string;
    status: InstitutionStatus;
    version_number: number;
    checksum: string;
    created_at: string;
    updated_at: string;
}

export type OrganizationUnitType = 
    | 'SCHOOL' 
    | 'FACULTY' 
    | 'DEPARTMENT' 
    | 'PROGRAM' 
    | 'DIVISION' 
    | 'OTHER';

export type OrganizationUnitStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export interface OrganizationUnit {
    organization_unit_id: string;
    institution_id: string;
    parent_unit_id?: string | null;
    unit_code: string;
    unit_name: string;
    unit_type: OrganizationUnitType;
    status: OrganizationUnitStatus;
    manager_actor_id?: string;
    version_number: number;
    checksum: string;
    created_at: string;
    updated_at: string;
}

export type DepartmentStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export interface Department {
    department_id: string;
    institution_id: string;
    organization_unit_id: string;
    department_code: string;
    department_name: string;
    status: DepartmentStatus;
    head_teacher_id?: string;
    version_number: number;
    checksum: string;
    created_at: string;
    updated_at: string;
}

export type ProgramStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export interface Program {
    program_id: string;
    institution_id: string;
    department_id: string;
    program_code: string;
    program_name: string;
    status: ProgramStatus;
    coordinator_actor_id?: string;
    version_number: number;
    checksum: string;
    created_at: string;
    updated_at: string;
}

export type ClassStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export interface SchoolClass {
    class_id: string;
    institution_id: string;
    academic_year_id: string;
    semester_id: string;
    class_code: string;
    class_name: string;
    grade_level: number;
    program_id?: string;
    homeroom_teacher_id: string;
    status: ClassStatus;
    capacity: number;
    version_number: number;
    checksum: string;
    created_at: string;
    updated_at: string;
}

export type PlacementStatus = 'PLACED' | 'TRANSFERRED' | 'CANCELLED';

export interface StudentPlacement {
    placement_id: string;
    institution_id: string;
    student_id: string;
    class_id: string;
    academic_year_id: string;
    enrollment_id?: string;
    status: PlacementStatus;
    revision_reason?: string;
    version_number: number;
    checksum: string;
    created_at: string;
    updated_at: string;
}

export type AdminRoleAssignmentStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface AdministrativeRoleAssignment {
    assignment_id: string;
    institution_id: string;
    user_id: string;
    role: UserRole;
    status: AdminRoleAssignmentStatus;
    assigned_by: string;
    assigned_at: string;
    expires_at?: string;
    version_number: number;
    checksum: string;
}

export interface GovernanceSettings {
    settings_id: string;
    institution_id: string;
    attendance_policy_ref: string;
    grading_policy_ref: string;
    report_card_publication_mode: 'AUTOMATIC' | 'MANUAL_APPROVAL';
    transcript_generation_mode: 'OFFICIAL_SEALED' | 'DRAFT_ALLOWED';
    guardian_communication_enabled: boolean;
    notification_channels: string[];
    version_number: number;
    checksum: string;
    updated_at: string;
    updated_by: string;
}

export interface AdministrativeAuditEvent {
    audit_event_id: string;
    institution_id: string;
    actor_id: string;
    actor_role: string;
    entity_type: string;
    entity_id: string;
    action: string;
    previous_version?: number;
    new_version: number;
    timestamp: string;
    revision_reason?: string;
    checksum: string;
}

export interface InstitutionHistoryEntry {
    entry_id: string;
    institution_id: string;
    version_number: number;
    snapshot: Institution;
    changed_by: string;
    changed_at: string;
    reason?: string;
}

export interface OrganizationUnitHistoryEntry {
    entry_id: string;
    organization_unit_id: string;
    version_number: number;
    snapshot: OrganizationUnit;
    changed_by: string;
    changed_at: string;
    reason?: string;
}

export interface DepartmentHistoryEntry {
    entry_id: string;
    department_id: string;
    version_number: number;
    snapshot: Department;
    changed_by: string;
    changed_at: string;
    reason?: string;
}

export interface ProgramHistoryEntry {
    entry_id: string;
    program_id: string;
    version_number: number;
    snapshot: Program;
    changed_by: string;
    changed_at: string;
    reason?: string;
}

export interface ClassHistoryEntry {
    entry_id: string;
    class_id: string;
    version_number: number;
    snapshot: SchoolClass;
    changed_by: string;
    changed_at: string;
    reason?: string;
}

export interface AdministrativeRoleHistoryEntry {
    entry_id: string;
    assignment_id: string;
    version_number: number;
    snapshot: AdministrativeRoleAssignment;
    changed_by: string;
    changed_at: string;
    reason?: string;
}

export interface GovernanceSettingHistoryEntry {
    entry_id: string;
    settings_id: string;
    version_number: number;
    snapshot: GovernanceSettings;
    changed_by: string;
    changed_at: string;
    reason?: string;
}

export interface AdministrativeDashboard {
    institution: Institution;
    total_organization_units: number;
    total_departments: number;
    total_programs: number;
    total_classes: number;
    total_active_students_placed: number;
    governance: GovernanceSettings;
}

// ==========================================
// PHASE 41: ACADEMIC SCHEDULING, TIMETABLE & TEACHER WORKLOAD ENGINE
// ==========================================

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export type TimeSlotStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface TimeSlot {
    time_slot_id: string;
    institution_id: string;
    day_of_week: DayOfWeek;
    start_time: string;
    end_time: string;
    sequence: number;
    status: TimeSlotStatus;
    version_number: number;
    checksum: string;
    created_at: string;
    updated_at: string;
}

export type ScheduleStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export interface ScheduleEntry {
    schedule_id: string;
    institution_id: string;
    academic_year_id: string;
    semester_id: string;
    course_period_id: string;
    course_id: string;
    class_id: string;
    teacher_id: string;
    time_slot_id: string;
    room_id: string;
    effective_from: string;
    effective_until: string;
    status: ScheduleStatus;
    version_number: number;
    checksum: string;
    created_at: string;
    updated_at: string;
}

export type RoomType = 'CLASSROOM' | 'LABORATORY' | 'WORKSHOP' | 'AUDITORIUM' | 'LIBRARY' | 'OTHER';
export type RoomStatus = 'ACTIVE' | 'MAINTENANCE' | 'ARCHIVED';

export interface LearningRoom {
    room_id: string;
    institution_id: string;
    organization_unit_id?: string;
    name: string;
    code: string;
    capacity: number;
    room_type: RoomType;
    status: RoomStatus;
    version_number: number;
    checksum: string;
    created_at?: string;
    updated_at?: string;
}

export type TeacherWorkloadStatus = 'SCHEDULED_HOURS_ONLY' | 'STANDARD' | 'OVERLOAD' | 'UNDERLOAD';

export interface TeacherWorkloadSummary {
    teacher_id: string;
    institution_id: string;
    semester_id: string;
    scheduled_period_count: number;
    scheduled_minutes: number;
    scheduled_hours: number;
    course_count: number;
    class_count: number;
    workload_status: TeacherWorkloadStatus;
    calculated_at: string;
    checksum?: string;
}

export interface StudentTimetableEntry {
    student_id: string;
    schedule_id: string;
    course_id: string;
    class_id: string;
    teacher_id: string;
    time_slot_id: string;
    room_id: string;
    day_of_week?: DayOfWeek;
    start_time?: string;
    end_time?: string;
    sequence?: number;
    status?: ScheduleStatus;
}

export interface TeacherTimetableEntry {
    teacher_id: string;
    schedule_id: string;
    course_id: string;
    class_id: string;
    time_slot_id: string;
    room_id: string;
    day_of_week?: DayOfWeek;
    start_time?: string;
    end_time?: string;
    sequence?: number;
    status?: ScheduleStatus;
}

export type ScheduleConflictType = 
    | 'TEACHER_SCHEDULE_CONFLICT'
    | 'CLASS_SCHEDULE_CONFLICT'
    | 'ROOM_SCHEDULE_CONFLICT'
    | 'COURSE_PERIOD_SCHEDULE_CONFLICT'
    | 'SEMESTER_SCHEDULE_CONFLICT'
    | 'UNAUTHORIZED_TEACHER_SCHEDULE_SCOPE'
    | 'CROSS_INSTITUTION_SCHEDULE_ACCESS_DENIED'
    | 'OTHER';

export type ConflictSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface ScheduleConflict {
    conflict_id: string;
    institution_id: string;
    semester_id: string;
    schedule_id: string;
    conflict_type: ScheduleConflictType;
    severity: ConflictSeverity;
    entity_id: string;
    message: string;
    detected_at: string;
}

export interface ScheduleHistoryEntry {
    history_id: string;
    schedule_id: string;
    version_number: number;
    previous_snapshot: ScheduleEntry | null;
    new_snapshot: ScheduleEntry;
    revision_reason: string;
    actor_id: string;
    created_at: string;
    checksum: string;
}

export type ScheduleAuditEventType =
    | 'TIME_SLOT_CREATED'
    | 'TIME_SLOT_UPDATED'
    | 'ROOM_CREATED'
    | 'ROOM_UPDATED'
    | 'SCHEDULE_CREATED'
    | 'SCHEDULE_UPDATED'
    | 'SCHEDULE_SCHEDULED'
    | 'SCHEDULE_ACTIVATED'
    | 'SCHEDULE_CLOSED'
    | 'SCHEDULE_ARCHIVED'
    | 'SCHEDULE_REVISED'
    | 'SCHEDULE_VIEWED'
    | 'CONFLICT_DETECTED'
    | 'WORKLOAD_VIEWED'
    | 'TIMETABLE_VIEWED';

export interface ScheduleAuditEvent {
    event_id: string;
    event_type: ScheduleAuditEventType;
    actor_id: string;
    institution_id: string;
    entity_id: string;
    timestamp: string;
    version_number: number;
    checksum: string;
    details?: Record<string, unknown>;
}

export interface ClassScheduleSummary {
    class_id: string;
    institution_id: string;
    semester_id: string;
    total_periods: number;
    total_minutes: number;
    unique_teachers: number;
    unique_courses: number;
}

export interface RoomUtilizationSummary {
    room_id: string;
    institution_id: string;
    semester_id: string;
    utilized_periods: number;
    utilized_minutes: number;
    capacity: number;
    utilization_percentage: number;
}

export interface ScheduleConflictSummary {
    institution_id: string;
    semester_id: string;
    total_conflicts: number;
    critical_conflicts: number;
    warning_conflicts: number;
    conflicts: ScheduleConflict[];
}

export interface InstitutionScheduleSummary {
    institution_id: string;
    semester_id: string;
    total_schedules: number;
    active_schedules: number;
    total_rooms: number;
    total_time_slots: number;
    total_conflicts: number;
}

// ==========================================
// PHASE 42: ZERO-TRUST MVP INTEGRATION & OPERATIONAL READINESS
// ==========================================

export type MvpErrorCategory =
    | 'AUTHENTICATION_ERROR'
    | 'AUTHORIZATION_ERROR'
    | 'SESSION_EXPIRED'
    | 'VALIDATION_ERROR'
    | 'DOMAIN_ERROR'
    | 'NETWORK_ERROR'
    | 'UNKNOWN_ERROR';

export interface MvpStandardError {
    category: MvpErrorCategory;
    code: string;
    message: string;
    timestamp: string;
    correlation_id?: string;
}

export type MvpWorkflowAuditEventType =
    | 'MVP_SESSION_EXECUTED'
    | 'MVP_ATTENDANCE_RECORDED'
    | 'MVP_ASSESSMENT_SUBMITTED'
    | 'MVP_GRADE_RECORDED'
    | 'MVP_NOTIFICATION_DISPATCHED'
    | 'MVP_COMMUNICATION_DISPATCHED'
    | 'MVP_DASHBOARD_PROJECTED'
    | 'MVP_WORKLOAD_CALCULATED'
    | 'MVP_SECURITY_CHECK_PASSED';

export interface MvpWorkflowAuditEvent {
    event_id: string;
    event_type: MvpWorkflowAuditEventType;
    actor_id: string;
    actor_role: string;
    institution_id: string;
    target_entity: string;
    target_id: string;
    details: Record<string, unknown>;
    timestamp: string;
    checksum: string;
}

export interface MvpAdminDashboardProjection {
    institution_id: string;
    institution_name: string;
    total_students: number;
    total_teachers: number;
    active_classes: number;
    active_courses: number;
    today_sessions_count: number;
    attendance_rate_percentage: number;
    pending_assessments_count: number;
    published_report_cards_count: number;
    open_guidance_cases_count: number;
    unread_notifications_count: number;
    governance_status: string;
    calculated_at: string;
    checksum: string;
}

export interface MvpHeadmasterDashboardProjection {
    institution_id: string;
    institution_name: string;
    total_teachers: number;
    total_students: number;
    total_classes: number;
    scheduled_periods_count: number;
    teacher_overload_count: number;
    overall_attendance_percentage: number;
    active_guidance_cases: number;
    active_discipline_cases: number;
    average_institution_grade: number;
    recent_schedule_conflicts: number;
    calculated_at: string;
    checksum: string;
}

export interface MvpTeacherDashboardProjection {
    teacher_id: string;
    institution_id: string;
    assigned_courses_count: number;
    assigned_classes_count: number;
    today_classes: Array<{
        schedule_id: string;
        course_id: string;
        class_id: string;
        time_slot: string;
        room: string;
    }>;
    today_attendance_summary: {
        present: number;
        absent: number;
        late: number;
        excused: number;
    };
    pending_assessments_count: number;
    pending_grading_count: number;
    behavior_alerts_count: number;
    unread_parent_messages_count: number;
    workload_hours: number;
    calculated_at: string;
    checksum: string;
}

export interface MvpStudentDashboardProjection {
    student_id: string;
    institution_id: string;
    enrolled_courses_count: number;
    today_schedule: Array<{
        schedule_id: string;
        course_id: string;
        teacher_id: string;
        time_slot: string;
        room: string;
    }>;
    attendance_percentage: number;
    pending_assignments_count: number;
    current_average_grade: number;
    overall_progress_percentage: number;
    unread_notifications_count: number;
    behavior_standing: string;
    safe_guidance_status: string;
    calculated_at: string;
    checksum: string;
}

export interface MvpParentDashboardProjection {
    guardian_id: string;
    institution_id: string;
    authorized_children: Array<{
        student_id: string;
        student_name: string;
        class_id: string;
        attendance_percentage: number;
        current_average_grade: number;
        learning_progress_percentage: number;
        behavior_standing: string;
        safe_guidance_summary: string;
        pending_assignments_count: number;
    }>;
    unread_notifications_count: number;
    unread_teacher_messages_count: number;
    calculated_at: string;
    checksum: string;
}

export interface MvpCounselorDashboardProjection {
    counselor_id: string;
    institution_id: string;
    assigned_students_count: number;
    active_cases_count: number;
    upcoming_sessions_count: number;
    pending_interventions_count: number;
    critical_cases_count: number;
    calculated_at: string;
    checksum: string;
}

export interface MvpDisciplineDashboardProjection {
    officer_id: string;
    institution_id: string;
    total_events_this_month: number;
    active_discipline_cases_count: number;
    pending_actions_count: number;
    students_on_monitoring_count: number;
    calculated_at: string;
    checksum: string;
}

export interface EndToEndLearningSessionRequest {
    schedule_id: string;
    institution_id: string;
    course_id: string;
    class_id: string;
    teacher_id: string;
    topic: string;
    actor_id: string;
    actor_role: UserRole;
    student_attendances: Array<{
        student_id: string;
        status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
        notes?: string;
    }>;
    assessment?: {
        assessment_id: string;
        title: string;
        max_score: number;
        submissions: Array<{
            student_id: string;
            score: number;
            feedback?: string;
        }>;
    };
}

export interface EndToEndLearningSessionResult {
    session_id: string;
    schedule_id: string;
    institution_id: string;
    course_id: string;
    class_id: string;
    teacher_id: string;
    status: 'COMPLETED';
    attendance_records_count: number;
    absent_students_notified: string[];
    assessment_id?: string;
    grades_recorded_count: number;
    progress_updated_count: number;
    executed_at: string;
    checksum: string;
}

export type MvpNotificationDomainTrigger =
    | 'ATTENDANCE_MARKED_ABSENT'
    | 'GRADE_PUBLISHED'
    | 'REPORT_CARD_PUBLISHED'
    | 'TRANSCRIPT_GENERATED'
    | 'DISCIPLINE_ACTION_CREATED'
    | 'SCHEDULE_REVISED';

export interface MvpNotificationTriggerRequest {
    trigger: MvpNotificationDomainTrigger;
    institution_id: string;
    target_student_id: string;
    payload: Record<string, unknown>;
    actor_id: string;
    actor_role: UserRole;
}

export interface MvpCommunicationMessageRequest {
    institution_id: string;
    sender_id: string;
    sender_role: UserRole;
    recipient_id: string;
    recipient_role: UserRole;
    subject: string;
    content: string;
    student_id?: string;
    actor_id: string;
    actor_role: UserRole;
}


