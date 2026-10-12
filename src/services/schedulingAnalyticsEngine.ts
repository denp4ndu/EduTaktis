import { 
    TeacherWorkloadSummary, 
    ClassScheduleSummary, 
    RoomUtilizationSummary, 
    ScheduleConflictSummary, 
    InstitutionScheduleSummary,
    ScheduleEntry,
    TimeSlot
} from '../types/curriculum';
import { 
    SchedulingRepositoryEngine, 
    schedulingRepositoryEngine 
} from './schedulingRepositoryEngine';
import { 
    TeacherWorkloadEngine, 
    teacherWorkloadEngine 
} from './teacherWorkloadEngine';
import { 
    SchedulingEngine, 
    schedulingEngine 
} from './schedulingEngine';
import { deepFreeze } from './schedulingStorageProvider';
import { 
    SchedulingValidationEngine, 
    schedulingValidationEngine 
} from './schedulingValidationEngine';

export class SchedulingAnalyticsEngine {
    constructor(
        private repo: SchedulingRepositoryEngine = schedulingRepositoryEngine,
        private engine: SchedulingEngine = schedulingEngine,
        private workloadEngine: TeacherWorkloadEngine = teacherWorkloadEngine,
        private validator: SchedulingValidationEngine = schedulingValidationEngine
    ) {}

    private parseTimeToMinutes(timeStr: string): number {
        const parts = timeStr.split(':').map(p => parseInt(p, 10));
        return parts[0] * 60 + parts[1];
    }

    async getTeacherWorkload(
        teacherId: string, 
        institutionId: string, 
        semesterId: string
    ): Promise<TeacherWorkloadSummary> {
        this.validator.detectSecurityLeakage({ teacherId, institutionId, semesterId });
        const schedules = await this.repo.listScheduleEntries(institutionId, {
            semester_id: semesterId,
            teacher_id: teacherId
        });
        const timeSlots = await this.repo.listTimeSlots(institutionId);

        return this.workloadEngine.calculateTeacherWorkload(
            teacherId,
            institutionId,
            semesterId,
            schedules,
            timeSlots
        );
    }

    async getClassScheduleSummary(
        classId: string, 
        institutionId: string, 
        semesterId: string
    ): Promise<ClassScheduleSummary> {
        this.validator.detectSecurityLeakage({ classId, institutionId, semesterId });
        const schedules = await this.repo.listScheduleEntries(institutionId, {
            semester_id: semesterId,
            class_id: classId
        });
        const timeSlots = await this.repo.listTimeSlots(institutionId);
        const slotMap = new Map<string, TimeSlot>();
        for (const slot of timeSlots) {
            slotMap.set(slot.time_slot_id, slot);
        }

        const activeSchedules = schedules.filter(s => s.status === 'ACTIVE' || s.status === 'SCHEDULED');
        let totalMinutes = 0;
        const teachers = new Set<string>();
        const courses = new Set<string>();

        for (const s of activeSchedules) {
            teachers.add(s.teacher_id);
            courses.add(s.course_id);
            const slot = slotMap.get(s.time_slot_id);
            if (slot) {
                totalMinutes += (this.parseTimeToMinutes(slot.end_time) - this.parseTimeToMinutes(slot.start_time));
            }
        }

        const summary: ClassScheduleSummary = {
            class_id: classId,
            institution_id: institutionId,
            semester_id: semesterId,
            total_periods: activeSchedules.length,
            total_minutes: totalMinutes,
            unique_teachers: teachers.size,
            unique_courses: courses.size
        };

        return deepFreeze(summary);
    }

    async getRoomUtilizationSummary(
        roomId: string, 
        institutionId: string, 
        semesterId: string
    ): Promise<RoomUtilizationSummary> {
        this.validator.detectSecurityLeakage({ roomId, institutionId, semesterId });
        const room = await this.repo.getLearningRoom(roomId);
        if (!room) {
            throw new Error(`INVALID_ROOM: Room ${roomId} not found`);
        }

        const schedules = await this.repo.listScheduleEntries(institutionId, {
            semester_id: semesterId,
            room_id: roomId
        });
        const timeSlots = await this.repo.listTimeSlots(institutionId);
        const slotMap = new Map<string, TimeSlot>();
        for (const slot of timeSlots) {
            slotMap.set(slot.time_slot_id, slot);
        }

        const activeSchedules = schedules.filter(s => s.status === 'ACTIVE' || s.status === 'SCHEDULED');
        let utilizedMinutes = 0;

        for (const s of activeSchedules) {
            const slot = slotMap.get(s.time_slot_id);
            if (slot) {
                utilizedMinutes += (this.parseTimeToMinutes(slot.end_time) - this.parseTimeToMinutes(slot.start_time));
            }
        }

        // Standard weekly capacity: assume total available time slots in institution as baseline
        const totalPossibleSlots = timeSlots.filter(s => s.status === 'ACTIVE').length;
        const utilizationPercentage = totalPossibleSlots > 0 
            ? Number(((activeSchedules.length / totalPossibleSlots) * 100).toFixed(1))
            : 0;

        const summary: RoomUtilizationSummary = {
            room_id: roomId,
            institution_id: institutionId,
            semester_id: semesterId,
            utilized_periods: activeSchedules.length,
            utilized_minutes: utilizedMinutes,
            capacity: room.capacity,
            utilization_percentage: utilizationPercentage
        };

        return deepFreeze(summary);
    }

    async getScheduleConflictSummary(
        institutionId: string, 
        semesterId: string
    ): Promise<ScheduleConflictSummary> {
        this.validator.detectSecurityLeakage({ institutionId, semesterId });
        const conflicts = await this.engine.detectScheduleConflicts(institutionId, semesterId);

        const critical = conflicts.filter(c => c.severity === 'CRITICAL').length;
        const warning = conflicts.filter(c => c.severity === 'WARNING').length;

        const summary: ScheduleConflictSummary = {
            institution_id: institutionId,
            semester_id: semesterId,
            total_conflicts: conflicts.length,
            critical_conflicts: critical,
            warning_conflicts: warning,
            conflicts
        };

        return deepFreeze(summary);
    }

    async getInstitutionScheduleSummary(
        institutionId: string, 
        semesterId: string
    ): Promise<InstitutionScheduleSummary> {
        this.validator.detectSecurityLeakage({ institutionId, semesterId });
        const allSchedules = await this.repo.listScheduleEntries(institutionId, { semester_id: semesterId });
        const activeSchedules = allSchedules.filter(s => s.status === 'ACTIVE' || s.status === 'SCHEDULED');
        const rooms = await this.repo.listLearningRooms(institutionId);
        const slots = await this.repo.listTimeSlots(institutionId);
        const conflicts = await this.engine.detectScheduleConflicts(institutionId, semesterId);

        const summary: InstitutionScheduleSummary = {
            institution_id: institutionId,
            semester_id: semesterId,
            total_schedules: allSchedules.length,
            active_schedules: activeSchedules.length,
            total_rooms: rooms.length,
            total_time_slots: slots.length,
            total_conflicts: conflicts.length
        };

        return deepFreeze(summary);
    }
}

export const schedulingAnalyticsEngine = new SchedulingAnalyticsEngine();
