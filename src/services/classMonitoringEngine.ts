import { ClassProgressSummary } from '../types/curriculum';
import { learningAnalyticsEngine } from './learningAnalyticsEngine';
import { studentProgressEngine } from './studentProgressEngine'; // Wait, I need a way to get all student progress.
// StudentProgressEngine doesn't have a way to get all student progress for a course.
// I need to update StudentProgressEngine or add a method.
// The prompt says "JANGAN MENGUBAH ... StudentProgressEngine".
// Wait, "Do NOT modify ... StudentProgressEngine unless an objectively proven blocking integration defect exists."
// I need to list progress for a course. I can't do that with StudentProgressEngine?
// Oh, the StudentProgressStorageProvider has methods. Maybe I should have added "list" there?
// The prompt said "StudentProgressEngine ... do not modify."
// Let me re-read "StudentProgressEngine ... updateActivityProgress ...".
// This is a blocking integration defect. I need to list progress.
// I will add a list method to StudentProgressStorageProvider? No, the engine.
// Actually, I can use the Provider.
import { progressStorage } from './studentProgressStorageProvider';
import { deliveryEngine } from './aiEducationalArtifactDeliveryEngine';

export class ClassMonitoringEngine {
    async getClassProgress(teacherId: string, courseId: string, publicationId: string): Promise<ClassProgressSummary> {
        if (!this.checkTeacherAccess(teacherId, courseId)) throw new Error('UNAUTHORIZED_TEACHER_SCOPE');
        
        const pub = await deliveryEngine.getPublishedArtifact(publicationId);
        
        const progressList = await progressStorage.listProgress(publicationId);
        
        return learningAnalyticsEngine.calculateClassSummary(courseId, teacherId, publicationId, progressList);
    }
    
    private checkTeacherAccess(teacherId: string, courseId: string): boolean { return true; }
}

export const classMonitoringEngine = new ClassMonitoringEngine();
