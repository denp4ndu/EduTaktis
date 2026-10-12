import { 
    AssessmentStatus, 
    AssessmentType, 
    AssessmentRubric, 
    AssessmentCriterion 
} from '../types/curriculum';

export class AssessmentValidationEngine {
    private static readonly VALID_ASSESSMENT_TYPES: AssessmentType[] = [
        'FORMATIVE', 
        'SUMMATIVE', 
        'PROJECT', 
        'PRACTICAL', 
        'QUIZ', 
        'PERFORMANCE'
    ];

    private static readonly SENSITIVE_PATTERNS = [
        /AIzaSy[A-Za-z0-9_-]{15,}/i,
        /sk-[A-Za-z0-9_-]{15,}/i,
        /bearer\s+[A-Za-z0-9_\-\.]{15,}/i,
        /system\s+prompt/i,
        /gemini/i,
        /generateContent/i
    ];

    validateIdentity(params: {
        assessment_id?: string;
        assignment_id?: string;
        activity_id?: string;
        course_id?: string;
        teacher_id?: string;
    }): void {
        if (!params.assignment_id || typeof params.assignment_id !== 'string' || params.assignment_id.trim().length === 0) {
            throw new Error('MISSING_OR_INVALID_ASSIGNMENT_ID');
        }
        if (!params.activity_id || typeof params.activity_id !== 'string' || params.activity_id.trim().length === 0) {
            throw new Error('MISSING_OR_INVALID_ACTIVITY_ID');
        }
        if (!params.course_id || typeof params.course_id !== 'string' || params.course_id.trim().length === 0) {
            throw new Error('MISSING_OR_INVALID_COURSE_ID');
        }
        if (!params.teacher_id || typeof params.teacher_id !== 'string' || params.teacher_id.trim().length === 0) {
            throw new Error('MISSING_OR_INVALID_TEACHER_ID');
        }
    }

    validateAssessmentType(type: AssessmentType): void {
        if (!AssessmentValidationEngine.VALID_ASSESSMENT_TYPES.includes(type)) {
            throw new Error(`INVALID_ASSESSMENT_TYPE: ${type}`);
        }
    }

    validateStatusTransition(currentStatus: AssessmentStatus | null, targetStatus: AssessmentStatus): void {
        if (!currentStatus) {
            if (targetStatus !== 'DRAFT' && targetStatus !== 'PUBLISHED') {
                throw new Error(`INVALID_INITIAL_ASSESSMENT_STATUS: ${targetStatus}`);
            }
            return;
        }

        if (currentStatus === targetStatus) {
            return;
        }

        if (currentStatus === 'ARCHIVED') {
            throw new Error('TERMINAL_STATE_ARCHIVED_CANNOT_TRANSITION');
        }

        const validTransitions: Record<AssessmentStatus, AssessmentStatus[]> = {
            DRAFT: ['PUBLISHED'],
            PUBLISHED: ['OPEN', 'ARCHIVED'],
            OPEN: ['CLOSED'],
            CLOSED: ['ARCHIVED'],
            ARCHIVED: []
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            throw new Error(`INVALID_ASSESSMENT_TRANSITION: ${currentStatus} -> ${targetStatus}`);
        }
    }

    validateMaxScoreAndPassingScore(maxScore: number, passingScore?: number): void {
        if (typeof maxScore !== 'number' || isNaN(maxScore) || !isFinite(maxScore) || maxScore <= 0) {
            throw new Error('INVALID_MAX_SCORE: max_score must be a positive finite number');
        }
        if (passingScore !== undefined) {
            if (typeof passingScore !== 'number' || isNaN(passingScore) || !isFinite(passingScore) || passingScore < 0 || passingScore > maxScore) {
                throw new Error('INVALID_PASSING_SCORE: passing_score must be between 0 and max_score');
            }
        }
    }

    validateRubric(rubric: AssessmentRubric, maxScore: number): void {
        if (!rubric.rubric_id || typeof rubric.rubric_id !== 'string') {
            throw new Error('INVALID_RUBRIC_ID');
        }
        if (!Array.isArray(rubric.criteria) || rubric.criteria.length === 0) {
            throw new Error('RUBRIC_MUST_HAVE_CRITERIA');
        }

        const seenIds = new Set<string>();
        let calculatedTotalMax = 0;
        let totalWeight = 0;

        for (const criterion of rubric.criteria) {
            if (!criterion.criterion_id || typeof criterion.criterion_id !== 'string') {
                throw new Error('INVALID_CRITERION_ID');
            }
            if (seenIds.has(criterion.criterion_id)) {
                throw new Error(`DUPLICATE_CRITERION_ID: ${criterion.criterion_id}`);
            }
            seenIds.add(criterion.criterion_id);

            if (typeof criterion.max_score !== 'number' || isNaN(criterion.max_score) || !isFinite(criterion.max_score) || criterion.max_score <= 0) {
                throw new Error(`INVALID_CRITERION_MAX_SCORE: ${criterion.criterion_id}`);
            }
            if (typeof criterion.weight !== 'number' || isNaN(criterion.weight) || !isFinite(criterion.weight) || criterion.weight < 0) {
                throw new Error(`INVALID_CRITERION_WEIGHT: ${criterion.criterion_id}`);
            }

            calculatedTotalMax += criterion.max_score;
            totalWeight += criterion.weight;
        }

        if (totalWeight <= 0) {
            throw new Error('RUBRIC_TOTAL_WEIGHT_MUST_BE_POSITIVE');
        }

        if (rubric.total_max_score !== undefined && rubric.total_max_score !== calculatedTotalMax) {
            throw new Error('RUBRIC_TOTAL_MAX_SCORE_MISMATCH');
        }
    }

    validateScore(rawScore: number, maxScore: number): void {
        if (typeof rawScore !== 'number' || isNaN(rawScore) || !isFinite(rawScore)) {
            throw new Error('INVALID_SCORE: raw_score must be a finite number');
        }
        if (rawScore < 0) {
            throw new Error('NEGATIVE_SCORE_REJECTED: raw_score cannot be negative');
        }
        if (rawScore > maxScore) {
            throw new Error(`SCORE_EXCEEDS_MAX_SCORE: raw_score (${rawScore}) cannot exceed max_score (${maxScore})`);
        }
    }

    validateRubricScores(rubricScores: Record<string, number>, rubric: AssessmentRubric): void {
        const criteriaMap = new Map<string, AssessmentCriterion>();
        for (const c of rubric.criteria) {
            criteriaMap.set(c.criterion_id, c);
        }

        for (const [criterionId, score] of Object.entries(rubricScores)) {
            const criterion = criteriaMap.get(criterionId);
            if (!criterion) {
                throw new Error(`UNKNOWN_CRITERION_ID_IN_SCORE: ${criterionId}`);
            }
            if (typeof score !== 'number' || isNaN(score) || !isFinite(score) || score < 0) {
                throw new Error(`INVALID_RUBRIC_SCORE: score for ${criterionId} must be a non-negative finite number`);
            }
            if (score > criterion.max_score) {
                throw new Error(`RUBRIC_SCORE_EXCEEDS_CRITERION_MAX: score (${score}) for ${criterionId} exceeds max (${criterion.max_score})`);
            }
        }
    }

    validateTeacherScope(teacherId: string, courseId: string, authorizedCourses: string[] | ((t: string, c: string) => boolean)): void {
        if (!teacherId || typeof teacherId !== 'string' || teacherId.trim().length === 0) {
            throw new Error('MISSING_OR_INVALID_TEACHER_ID');
        }
        if (typeof authorizedCourses === 'function') {
            if (!authorizedCourses(teacherId, courseId)) {
                throw new Error('UNAUTHORIZED_TEACHER_GRADING_SCOPE');
            }
        } else if (Array.isArray(authorizedCourses)) {
            if (!authorizedCourses.includes(courseId)) {
                throw new Error('UNAUTHORIZED_TEACHER_GRADING_SCOPE');
            }
        }
    }

    validateStudentScope(authenticatedStudentId: string, targetStudentId: string): void {
        if (!authenticatedStudentId || authenticatedStudentId !== targetStudentId) {
            throw new Error('UNAUTHORIZED_STUDENT_SCOPE');
        }
    }

    validateChecksum(expectedChecksum: string, actualChecksum: string): void {
        if (expectedChecksum !== actualChecksum) {
            throw new Error('ASSESSMENT_CHECKSUM_MISMATCH');
        }
    }

    validateSecurity(data: any): void {
        const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
        for (const pattern of AssessmentValidationEngine.SENSITIVE_PATTERNS) {
            if (pattern.test(jsonStr)) {
                throw new Error('SECURITY_LEAKAGE_DETECTED: Sensitive credential or system prompt pattern found in payload');
            }
        }
    }
}

export const assessmentValidationEngine = new AssessmentValidationEngine();
