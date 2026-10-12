import { 
    Assessment, 
    GradeRecord, 
    GradeHistoryEntry, 
    AssessmentAuditEvent 
} from '../types/curriculum';

export interface AssessmentStorageProvider {
    saveAssessment(assessment: Assessment): Promise<void>;
    getAssessment(assessmentId: string): Promise<Assessment | null>;
    getAssessmentsByCourse(courseId: string): Promise<Assessment[]>;
    getAssessmentByAssignment(assignmentId: string): Promise<Assessment | null>;
    
    saveGradeRecord(grade: GradeRecord): Promise<void>;
    getGradeRecord(gradeId: string): Promise<GradeRecord | null>;
    getGradeRecordBySubmission(submissionId: string): Promise<GradeRecord | null>;
    getGradeRecordsByStudentAndCourse(studentId: string, courseId: string): Promise<GradeRecord[]>;
    getGradeRecordsByAssessment(assessmentId: string): Promise<GradeRecord[]>;
    getGradeRecordsByCourse(courseId: string): Promise<GradeRecord[]>;
    
    saveGradeHistory(history: GradeHistoryEntry): Promise<void>;
    getGradeHistory(gradeId: string): Promise<GradeHistoryEntry[]>;
    
    recordAuditEvent(event: AssessmentAuditEvent): Promise<void>;
    getAuditEventsByAssessment(assessmentId: string): Promise<AssessmentAuditEvent[]>;
    clearAll(): Promise<void>;
}

export class InMemoryAssessmentStorageProvider implements AssessmentStorageProvider {
    private assessments: Map<string, Assessment> = new Map();
    private grades: Map<string, GradeRecord> = new Map();
    private gradeHistory: Map<string, GradeHistoryEntry[]> = new Map();
    private auditEvents: AssessmentAuditEvent[] = [];

    async saveAssessment(assessment: Assessment): Promise<void> {
        this.assessments.set(assessment.assessment_id, assessment);
    }

    async getAssessment(assessmentId: string): Promise<Assessment | null> {
        return this.assessments.get(assessmentId) || null;
    }

    async getAssessmentsByCourse(courseId: string): Promise<Assessment[]> {
        return Array.from(this.assessments.values()).filter(a => a.course_id === courseId);
    }

    async getAssessmentByAssignment(assignmentId: string): Promise<Assessment | null> {
        return Array.from(this.assessments.values()).find(a => a.assignment_id === assignmentId) || null;
    }

    async saveGradeRecord(grade: GradeRecord): Promise<void> {
        this.grades.set(grade.grade_id, grade);
    }

    async getGradeRecord(gradeId: string): Promise<GradeRecord | null> {
        return this.grades.get(gradeId) || null;
    }

    async getGradeRecordBySubmission(submissionId: string): Promise<GradeRecord | null> {
        return Array.from(this.grades.values()).find(g => g.submission_id === submissionId) || null;
    }

    async getGradeRecordsByStudentAndCourse(studentId: string, courseId: string): Promise<GradeRecord[]> {
        return Array.from(this.grades.values()).filter(g => g.student_id === studentId && g.course_id === courseId);
    }

    async getGradeRecordsByAssessment(assessmentId: string): Promise<GradeRecord[]> {
        return Array.from(this.grades.values()).filter(g => g.assessment_id === assessmentId);
    }

    async getGradeRecordsByCourse(courseId: string): Promise<GradeRecord[]> {
        return Array.from(this.grades.values()).filter(g => g.course_id === courseId);
    }

    async saveGradeHistory(history: GradeHistoryEntry): Promise<void> {
        const list = this.gradeHistory.get(history.grade_id) || [];
        list.push(history);
        this.gradeHistory.set(history.grade_id, list);
    }

    async getGradeHistory(gradeId: string): Promise<GradeHistoryEntry[]> {
        return this.gradeHistory.get(gradeId) || [];
    }

    async recordAuditEvent(event: AssessmentAuditEvent): Promise<void> {
        this.auditEvents.push(event);
    }

    async getAuditEventsByAssessment(assessmentId: string): Promise<AssessmentAuditEvent[]> {
        return this.auditEvents.filter(e => e.assessment_id === assessmentId);
    }

    async clearAll(): Promise<void> {
        this.assessments.clear();
        this.grades.clear();
        this.gradeHistory.clear();
        this.auditEvents = [];
    }
}

export const assessmentStorageProvider = new InMemoryAssessmentStorageProvider();
