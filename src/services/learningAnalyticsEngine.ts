import { StudentProgress, ClassProgressSummary, StudentProgressSummary, ActivityProgressSummary } from '../types/curriculum';
import { deepFreeze } from './aiPromptEngine';

export class LearningAnalyticsEngine {
    validateClassProgressSummary(summary: ClassProgressSummary): boolean {
        return summary.total_students >= 0 && summary.completed_students >= 0 && summary.active_students >= 0 && summary.average_progress >= 0 && summary.average_progress <= 100;
    }

    calculateClassSummary(courseId: string, teacherId: string, publicationId: string, progresses: StudentProgress[]): ClassProgressSummary {
        const total = progresses.length;
        if (total === 0) {
            return deepFreeze({ course_id: courseId, teacher_id: teacherId, publication_id: publicationId, total_students: 0, active_students: 0, completed_students: 0, average_progress: 0, completion_rate: 0, last_activity_at: new Date().toISOString(), generated_at: new Date().toISOString() });
        }
        const completed = progresses.filter(p => p.status === 'COMPLETED').length;
        const active = progresses.filter(p => p.status === 'IN_PROGRESS').length;
        const avg = progresses.reduce((sum, p) => sum + p.progress_percent, 0) / total;
        
        return deepFreeze({
            course_id: courseId, teacher_id: teacherId, publication_id: publicationId,
            total_students: total, active_students: active, completed_students: completed,
            average_progress: avg, completion_rate: (completed / total) * 100,
            last_activity_at: new Date().toISOString(), generated_at: new Date().toISOString()
        });
    }
}

export const learningAnalyticsEngine = new LearningAnalyticsEngine();
