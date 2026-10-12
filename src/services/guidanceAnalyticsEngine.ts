import { 
    StudentGuidanceSummary, 
    ClassGuidanceSummary, 
    InterventionEffectivenessSummary, 
    TeacherGuidanceMonitoring, 
    CounselorGuidanceDashboard, 
    GuidancePriority, 
    InterventionOutcome 
} from '../types/curriculum';
import { 
    guidanceRepositoryEngine, 
    GuidanceRepositoryEngine 
} from './guidanceRepositoryEngine';
import { 
    guidanceValidationEngine, 
    GuidanceValidationEngine 
} from './guidanceValidationEngine';

export class GuidanceAnalyticsEngine {
    constructor(
        private repository: GuidanceRepositoryEngine = guidanceRepositoryEngine,
        private validator: GuidanceValidationEngine = guidanceValidationEngine
    ) {}

    async getStudentGuidanceSummary(studentId: string, semesterId: string): Promise<StudentGuidanceSummary> {
        this.validator.validateIdentity({ student_id: studentId, semester_id: semesterId });

        const cases = await this.repository.listCases({ student_id: studentId, semester_id: semesterId });
        const activeCases = cases.filter(c => c.status !== 'ARCHIVED');

        const openCases = activeCases.filter(c => c.status === 'OPEN' || c.status === 'IN_PROGRESS' || c.status === 'ESCALATED');
        const resolvedCases = activeCases.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED');

        // Priority determination
        let currentPriority: GuidancePriority = 'LOW';
        if (openCases.some(c => c.priority === 'CRITICAL')) {
            currentPriority = 'CRITICAL';
        } else if (openCases.some(c => c.priority === 'HIGH')) {
            currentPriority = 'HIGH';
        } else if (openCases.some(c => c.priority === 'MEDIUM')) {
            currentPriority = 'MEDIUM';
        }

        const plans = await this.repository.listPlans({ student_id: studentId });
        const activeInterventions = plans.filter(p => p.status === 'ACTIVE').length;
        const completedInterventions = plans.filter(p => p.status === 'COMPLETED').length;

        const followUps = await this.repository.listFollowUps({ student_id: studentId });
        const scheduledFollowUps = followUps.filter(f => f.status === 'SCHEDULED' || f.status === 'RESCHEDULED').length;
        const completedFollowUps = followUps.filter(f => f.status === 'COMPLETED').length;
        const missedFollowUps = followUps.filter(f => f.status === 'MISSED').length;

        const outcomes = await this.repository.listOutcomes({ student_id: studentId });
        const latestOutcome: InterventionOutcome = outcomes.length > 0 ? outcomes[0].outcome : 'UNDETERMINED';

        return Object.freeze({
            student_id: studentId,
            semester_id: semesterId,
            total_cases: activeCases.length,
            open_cases: openCases.length,
            resolved_cases: resolvedCases.length,
            active_interventions: activeInterventions,
            completed_interventions: completedInterventions,
            scheduled_followups: scheduledFollowUps,
            completed_followups: completedFollowUps,
            missed_followups: missedFollowUps,
            current_priority: currentPriority,
            latest_outcome: latestOutcome
        });
    }

    async getClassGuidanceSummary(
        courseId: string, 
        coursePeriodId: string, 
        semesterId: string, 
        enrolledStudentIds: string[] = []
    ): Promise<ClassGuidanceSummary> {
        this.validator.validateIdentity({
            course_id: courseId,
            course_period_id: coursePeriodId,
            semester_id: semesterId
        });

        const cases = await this.repository.listCases({ semester_id: semesterId });
        const enrolledCases = cases.filter(c => enrolledStudentIds.includes(c.student_id) && c.status !== 'ARCHIVED');

        const studentsWithCases = new Set(enrolledCases.map(c => c.student_id)).size;
        const openCaseCount = enrolledCases.filter(c => c.status === 'OPEN' || c.status === 'IN_PROGRESS' || c.status === 'ESCALATED').length;
        const resolvedCaseCount = enrolledCases.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
        const highPriorityCount = enrolledCases.filter(c => c.priority === 'HIGH' && (c.status === 'OPEN' || c.status === 'IN_PROGRESS' || c.status === 'ESCALATED')).length;
        const criticalCount = enrolledCases.filter(c => c.priority === 'CRITICAL' && (c.status === 'OPEN' || c.status === 'IN_PROGRESS' || c.status === 'ESCALATED')).length;

        const plans = await this.repository.listPlans();
        const activeInterventionCount = plans.filter(p => enrolledStudentIds.includes(p.student_id) && p.status === 'ACTIVE').length;

        return Object.freeze({
            course_id: courseId,
            course_period_id: coursePeriodId,
            semester_id: semesterId,
            student_count: enrolledStudentIds.length,
            students_with_guidance_cases: studentsWithCases,
            open_case_count: openCaseCount,
            active_intervention_count: activeInterventionCount,
            resolved_case_count: resolvedCaseCount,
            high_priority_case_count: highPriorityCount,
            critical_case_count: criticalCount
        });
    }

    async getInterventionEffectivenessSummary(semesterId: string): Promise<InterventionEffectivenessSummary> {
        this.validator.validateIdentity({ semester_id: semesterId });

        const plans = await this.repository.listPlans();
        const outcomes = await this.repository.listOutcomes();

        let improvedCount = 0;
        let stableCount = 0;
        let noChangeCount = 0;
        let declinedCount = 0;
        let undeterminedCount = 0;

        for (const out of outcomes) {
            if (out.outcome === 'IMPROVED') improvedCount++;
            else if (out.outcome === 'STABLE') stableCount++;
            else if (out.outcome === 'NO_CHANGE') noChangeCount++;
            else if (out.outcome === 'DECLINED') declinedCount++;
            else undeterminedCount++;
        }

        const totalEvaluated = improvedCount + stableCount + noChangeCount + declinedCount;
        const improvementRate = totalEvaluated > 0 
            ? Math.round((improvedCount / totalEvaluated) * 10000) / 100 
            : 0;

        const completedPlans = plans.filter(p => p.status === 'COMPLETED').length;

        return Object.freeze({
            semester_id: semesterId,
            total_interventions: plans.length,
            completed_interventions: completedPlans,
            improved_count: improvedCount,
            stable_count: stableCount,
            no_change_count: noChangeCount,
            declined_count: declinedCount,
            undetermined_count: undeterminedCount,
            improvement_rate: improvementRate
        });
    }

    async getTeacherGuidanceMonitoring(
        teacherId: string, 
        courseId: string, 
        coursePeriodId: string, 
        semesterId: string, 
        enrolledStudentIds: string[] = []
    ): Promise<TeacherGuidanceMonitoring> {
        this.validator.validateIdentity({
            teacher_id: teacherId,
            course_id: courseId,
            course_period_id: coursePeriodId,
            semester_id: semesterId
        });

        const classSummary = await this.getClassGuidanceSummary(courseId, coursePeriodId, semesterId, enrolledStudentIds);

        const studentStatuses = [];
        for (const studentId of enrolledStudentIds) {
            const studentCases = await this.repository.listCases({ student_id: studentId, semester_id: semesterId });
            const openCases = studentCases.filter(c => c.status === 'OPEN' || c.status === 'IN_PROGRESS' || c.status === 'ESCALATED');

            let priority: GuidancePriority = 'LOW';
            let status: any = 'DRAFT';

            if (openCases.length > 0) {
                status = openCases[0].status;
                if (openCases.some(c => c.priority === 'CRITICAL')) priority = 'CRITICAL';
                else if (openCases.some(c => c.priority === 'HIGH')) priority = 'HIGH';
                else if (openCases.some(c => c.priority === 'MEDIUM')) priority = 'MEDIUM';
            }

            const plans = await this.repository.listPlans({ student_id: studentId });
            const activePlans = plans.filter(p => p.status === 'ACTIVE').length;

            studentStatuses.push({
                student_id: studentId,
                has_open_case: openCases.length > 0,
                priority,
                status: openCases.length > 0 ? openCases[0].status : (studentCases.length > 0 ? studentCases[0].status : 'CLOSED'),
                active_intervention_count: activePlans,
                has_warning: priority === 'HIGH' || priority === 'CRITICAL' || activePlans > 0
            });
        }

        return Object.freeze({
            teacher_id: teacherId,
            course_id: courseId,
            course_period_id: coursePeriodId,
            semester_id: semesterId,
            class_summary: classSummary,
            student_guidance_statuses: studentStatuses
        });
    }

    async getCounselorGuidanceDashboard(counselorId: string, semesterId: string): Promise<CounselorGuidanceDashboard> {
        this.validator.validateIdentity({ counselor_id: counselorId, semester_id: semesterId });

        const cases = await this.repository.listCases({ assigned_counselor_id: counselorId, semester_id: semesterId });
        const openCases = cases.filter(c => c.status === 'OPEN' || c.status === 'IN_PROGRESS');
        const escalatedCases = cases.filter(c => c.status === 'ESCALATED');

        const sessions = await this.repository.listSessions({ counselor_id: counselorId });
        const upcomingSessions = sessions.filter(s => s.status === 'SCHEDULED' || s.status === 'RESCHEDULED');

        const followUps = await this.repository.listFollowUps();
        const overdueFollowUps = followUps.filter(f => f.status === 'SCHEDULED' && new Date(f.scheduled_at).getTime() < Date.now());

        const plans = await this.repository.listPlans({ responsible_id: counselorId });
        const activePlans = plans.filter(p => p.status === 'ACTIVE');

        const recentOutcomes = await this.repository.listOutcomes();
        const effectivenessSummary = await this.getInterventionEffectivenessSummary(semesterId);

        return Object.freeze({
            counselor_id: counselorId,
            semester_id: semesterId,
            total_assigned_cases: cases.length,
            open_cases: openCases,
            escalated_cases: escalatedCases,
            upcoming_sessions: upcomingSessions,
            overdue_follow_ups: overdueFollowUps,
            active_plans: activePlans,
            recent_outcomes: recentOutcomes.slice(0, 10),
            effectiveness_summary: effectivenessSummary
        });
    }
}

export const guidanceAnalyticsEngine = new GuidanceAnalyticsEngine();
