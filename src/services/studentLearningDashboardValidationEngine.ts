import { StudentLearningDashboard } from '../types/curriculum';

export class StudentLearningDashboardValidationEngine {
    static validateDashboard(dashboard: StudentLearningDashboard): void {
        if (dashboard.overall_progress < 0 || dashboard.overall_progress > 100 || isNaN(dashboard.overall_progress) || !isFinite(dashboard.overall_progress)) {
            throw new Error('DASHBOARD_DATA_INVALID');
        }
        // Validate against sensitive data leakage (simplified check)
        const str = JSON.stringify(dashboard);
        if (str.includes('API_KEY') || str.includes('TOKEN')) {
            throw new Error('DASHBOARD_DATA_INVALID');
        }
    }
}
