import { 
    TeacherWorkloadSummary, 
    ScheduleEntry, 
    TimeSlot 
} from '../types/curriculum';
import { deepFreeze } from './schedulingStorageProvider';
import { 
    SchedulingValidationEngine, 
    schedulingValidationEngine 
} from './schedulingValidationEngine';

export class TeacherWorkloadEngine {
    constructor(
        private validator: SchedulingValidationEngine = schedulingValidationEngine
    ) {}

    private parseTimeToMinutes(timeStr: string): number {
        const parts = timeStr.split(':').map(p => parseInt(p, 10));
        return parts[0] * 60 + parts[1];
    }

    calculateTeacherWorkload(
        teacherId: string,
        institutionId: string,
        semesterId: string,
        schedules: ScheduleEntry[],
        timeSlots: TimeSlot[]
    ): TeacherWorkloadSummary {
        this.validator.detectSecurityLeakage({ teacherId, institutionId, semesterId });

        // Filter schedules for this teacher, semester, institution, and active/scheduled status
        const relevantSchedules = schedules.filter(s => 
            s.teacher_id === teacherId &&
            s.institution_id === institutionId &&
            s.semester_id === semesterId &&
            (s.status === 'ACTIVE' || s.status === 'SCHEDULED')
        );

        const slotMap = new Map<string, TimeSlot>();
        for (const slot of timeSlots) {
            slotMap.set(slot.time_slot_id, slot);
        }

        let scheduledMinutes = 0;
        const courses = new Set<string>();
        const classes = new Set<string>();

        for (const sched of relevantSchedules) {
            courses.add(sched.course_id);
            classes.add(sched.class_id);

            const slot = slotMap.get(sched.time_slot_id);
            if (slot) {
                const start = this.parseTimeToMinutes(slot.start_time);
                const end = this.parseTimeToMinutes(slot.end_time);
                scheduledMinutes += Math.max(0, end - start);
            }
        }

        const scheduledHours = Number((scheduledMinutes / 60).toFixed(2));

        const partial: Omit<TeacherWorkloadSummary, 'checksum'> = {
            teacher_id: teacherId,
            institution_id: institutionId,
            semester_id: semesterId,
            scheduled_period_count: relevantSchedules.length,
            scheduled_minutes: scheduledMinutes,
            scheduled_hours: scheduledHours,
            course_count: courses.size,
            class_count: classes.size,
            workload_status: 'SCHEDULED_HOURS_ONLY',
            calculated_at: new Date().toISOString()
        };

        const checksum = this.validator.computeWorkloadChecksum(partial);
        return deepFreeze({ ...partial, checksum });
    }
}

export const teacherWorkloadEngine = new TeacherWorkloadEngine();
