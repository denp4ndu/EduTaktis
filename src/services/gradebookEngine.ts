import { 
    StudentGradebook, 
    StudentGradebookEntry, 
    TeacherGradebook, 
    TeacherGradebookStudentRow, 
    AssessmentAuditEvent 
} from '../types/curriculum';
import { assessmentStorageProvider, AssessmentStorageProvider } from './assessmentStorageProvider';
import { assessmentValidationEngine, AssessmentValidationEngine } from './assessmentValidationEngine';
import { deepFreeze } from './aiPromptEngine';

export class GradebookEngine {
    constructor(
        private storage: AssessmentStorageProvider = assessmentStorageProvider,
        private validator: AssessmentValidationEngine = assessmentValidationEngine
    ) {}

    async getStudentGradebook(
        studentId: string, 
        courseId: string, 
        authenticatedStudentId: string
    ): Promise<StudentGradebook> {
        this.validator.validateStudentScope(authenticatedStudentId, studentId);

        const assessments = await this.storage.getAssessmentsByCourse(courseId);
        const grades = await this.storage.getGradeRecordsByStudentAndCourse(studentId, courseId);
        const gradeMap = new Map(grades.map(g => [g.assessment_id, g]));

        const entries: StudentGradebookEntry[] = [];
        let totalScorePct = 0;
        let gradedCount = 0;
        let passedCount = 0;
        let failedCount = 0;

        for (const asm of assessments) {
            const grade = gradeMap.get(asm.assessment_id);
            if (grade) {
                const history = await this.storage.getGradeHistory(grade.grade_id);
                entries.push({
                    assessment_id: asm.assessment_id,
                    assessment_title: asm.title,
                    assessment_type: asm.assessment_type,
                    raw_score: grade.raw_score,
                    max_score: grade.max_score,
                    percentage: grade.percentage,
                    grade: grade.grade,
                    passed: grade.passed,
                    feedback: grade.feedback,
                    graded_at: grade.updated_at,
                    version_number: grade.version_number,
                    grade_history: history.length > 0 ? history : undefined
                });

                totalScorePct += grade.percentage;
                gradedCount++;
                if (grade.passed) {
                    passedCount++;
                } else {
                    failedCount++;
                }
            }
        }

        const aggregateAverage = gradedCount > 0 ? Math.round((totalScorePct / gradedCount) * 100) / 100 : 0;
        const completionRate = assessments.length > 0 ? Math.round((gradedCount / assessments.length) * 10000) / 100 : 0;
        const now = new Date().toISOString();

        const gradebook: StudentGradebook = deepFreeze({
            student_id: studentId,
            course_id: courseId,
            entries,
            aggregate_average: aggregateAverage,
            total_assessments: assessments.length,
            passed_count: passedCount,
            failed_count: failedCount,
            completion_rate: completionRate,
            generated_at: now
        });

        return gradebook;
    }

    async getTeacherGradebook(
        courseId: string, 
        teacherId: string, 
        teacherAuthorizedCourses?: string[] | ((t: string, c: string) => boolean),
        studentRosterIds?: string[]
    ): Promise<TeacherGradebook> {
        if (teacherAuthorizedCourses) {
            this.validator.validateTeacherScope(teacherId, courseId, teacherAuthorizedCourses);
        }

        const assessments = await this.storage.getAssessmentsByCourse(courseId);
        const allGrades = await this.storage.getGradeRecordsByCourse(courseId);

        const studentsMap = new Map<string, TeacherGradebookStudentRow>();

        // Pre-populate with roster if provided
        if (studentRosterIds) {
            for (const sId of studentRosterIds) {
                studentsMap.set(sId, {
                    student_id: sId,
                    grades: {},
                    average_percentage: 0,
                    passed_count: 0,
                    failed_count: 0
                });
            }
        }

        for (const grade of allGrades) {
            let row = studentsMap.get(grade.student_id);
            if (!row) {
                row = {
                    student_id: grade.student_id,
                    grades: {},
                    average_percentage: 0,
                    passed_count: 0,
                    failed_count: 0
                };
                studentsMap.set(grade.student_id, row);
            }

            row.grades[grade.assessment_id] = {
                grade_id: grade.grade_id,
                raw_score: grade.raw_score,
                max_score: grade.max_score,
                percentage: grade.percentage,
                grade: grade.grade,
                passed: grade.passed
            };
        }

        let overallCoursePctSum = 0;
        let overallStudentCountWithGrades = 0;

        const studentRows: TeacherGradebookStudentRow[] = [];

        for (const row of Array.from(studentsMap.values())) {
            const studentGrades = Object.values(row.grades);
            let sPctSum = 0;
            let sPassed = 0;
            let sFailed = 0;

            for (const g of studentGrades) {
                sPctSum += g.percentage;
                if (g.passed) sPassed++;
                else sFailed++;
            }

            const sAvg = studentGrades.length > 0 ? Math.round((sPctSum / studentGrades.length) * 100) / 100 : 0;
            row.average_percentage = sAvg;
            row.passed_count = sPassed;
            row.failed_count = sFailed;

            if (studentGrades.length > 0) {
                overallCoursePctSum += sAvg;
                overallStudentCountWithGrades++;
            }

            studentRows.push(row);
        }

        const courseAverage = overallStudentCountWithGrades > 0 
            ? Math.round((overallCoursePctSum / overallStudentCountWithGrades) * 100) / 100 
            : 0;

        const now = new Date().toISOString();

        const gradebook: TeacherGradebook = deepFreeze({
            course_id: courseId,
            teacher_id: teacherId,
            assessments,
            student_rows: studentRows,
            course_average_percentage: courseAverage,
            generated_at: now
        });

        const auditEvent: AssessmentAuditEvent = deepFreeze({
            event_id: `EVT-GB-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            assessment_id: 'COURSE_GRADEBOOK',
            teacher_id: teacherId,
            event_type: 'GRADEBOOK_VIEWED',
            new_state: { student_count: studentRows.length, assessment_count: assessments.length },
            timestamp: now,
            actor_id: teacherId,
            actor_role: 'TEACHER'
        });

        await this.storage.recordAuditEvent(auditEvent);

        return gradebook;
    }
}

export const gradebookEngine = new GradebookEngine();
