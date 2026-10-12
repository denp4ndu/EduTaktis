import { 
    TimeSlot, 
    DayOfWeek, 
    LearningRoom, 
    ScheduleEntry, 
    ScheduleStatus, 
    TeacherWorkloadSummary, 
    ScheduleAuditEvent, 
    ScheduleHistoryEntry 
} from '../types/curriculum';

export class SchedulingValidationEngine {
    private parseTimeToMinutes(timeStr: string): number {
        if (!timeStr || typeof timeStr !== 'string') {
            throw new Error('INVALID_TIME_RANGE: Time must be a valid string');
        }
        const parts = timeStr.split(':').map(p => parseInt(p, 10));
        if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) {
            throw new Error('INVALID_TIME_RANGE: Time must follow HH:mm format');
        }
        const hours = parts[0];
        const minutes = parts[1];
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            throw new Error('INVALID_TIME_RANGE: Hours must be 0-23 and minutes 0-59');
        }
        return hours * 60 + minutes;
    }

    validateTimeSlot(
        slot: Omit<TimeSlot, 'checksum'>, 
        existingSlots: TimeSlot[] = []
    ): void {
        if (!slot.time_slot_id || slot.time_slot_id.trim() === '') {
            throw new Error('INVALID_TIME_SLOT: time_slot_id cannot be empty');
        }
        if (!slot.institution_id || slot.institution_id.trim() === '') {
            throw new Error('INVALID_TIME_SLOT: institution_id cannot be empty');
        }

        const validDays: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
        if (!validDays.includes(slot.day_of_week)) {
            throw new Error(`INVALID_TIME_SLOT: Invalid day of week ${slot.day_of_week}`);
        }

        const startMin = this.parseTimeToMinutes(slot.start_time);
        const endMin = this.parseTimeToMinutes(slot.end_time);

        if (startMin >= endMin) {
            throw new Error(`INVALID_TIME_RANGE: start_time (${slot.start_time}) must be strictly earlier than end_time (${slot.end_time})`);
        }

        if (!Number.isInteger(slot.sequence) || slot.sequence <= 0) {
            throw new Error('INVALID_TIME_SLOT: sequence must be a positive integer');
        }

        // Check duplicates and overlaps within the same institution and day
        for (const existing of existingSlots) {
            if (existing.time_slot_id === slot.time_slot_id) continue;
            if (existing.institution_id !== slot.institution_id) continue;
            if (existing.day_of_week !== slot.day_of_week) continue;
            if (existing.status === 'ARCHIVED') continue;

            if (existing.sequence === slot.sequence) {
                throw new Error(`DUPLICATE_TIME_SLOT: Duplicate sequence ${slot.sequence} for day ${slot.day_of_week} in institution ${slot.institution_id}`);
            }

            const exStart = this.parseTimeToMinutes(existing.start_time);
            const exEnd = this.parseTimeToMinutes(existing.end_time);

            // Overlap check: start < exEnd && end > exStart
            if (startMin < exEnd && endMin > exStart) {
                throw new Error(`TIME_SLOT_OVERLAP: Time slot (${slot.start_time}-${slot.end_time}) overlaps with existing slot ${existing.time_slot_id} (${existing.start_time}-${existing.end_time})`);
            }
        }
    }

    validateLearningRoom(
        room: Omit<LearningRoom, 'checksum'>, 
        existingRooms: LearningRoom[] = []
    ): void {
        if (!room.room_id || room.room_id.trim() === '') {
            throw new Error('INVALID_ROOM: room_id cannot be empty');
        }
        if (!room.institution_id || room.institution_id.trim() === '') {
            throw new Error('INVALID_ROOM: institution_id cannot be empty');
        }
        if (!room.name || room.name.trim() === '') {
            throw new Error('INVALID_ROOM: room name cannot be empty');
        }
        if (!room.code || room.code.trim() === '') {
            throw new Error('INVALID_ROOM: room code cannot be empty');
        }

        if (!Number.isInteger(room.capacity) || room.capacity <= 0) {
            throw new Error('ROOM_CAPACITY_EXCEEDED: Room capacity must be a positive integer');
        }

        for (const existing of existingRooms) {
            if (existing.room_id === room.room_id) continue;
            if (existing.institution_id !== room.institution_id) continue;

            if (existing.code.toLowerCase() === room.code.toLowerCase()) {
                throw new Error(`DUPLICATE_ROOM_CODE: Room code ${room.code} already exists in institution ${room.institution_id}`);
            }
        }
    }

    validateScheduleTransition(
        currentStatus: ScheduleStatus, 
        targetStatus: ScheduleStatus
    ): void {
        if (currentStatus === 'ARCHIVED') {
            throw new Error('TERMINAL_SCHEDULE_CANNOT_TRANSITION: Cannot transition an ARCHIVED schedule');
        }

        const validTransitions: Record<ScheduleStatus, ScheduleStatus[]> = {
            DRAFT: ['SCHEDULED'],
            SCHEDULED: ['ACTIVE'],
            ACTIVE: ['CLOSED'],
            CLOSED: ['ARCHIVED'],
            ARCHIVED: []
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(targetStatus)) {
            throw new Error(`INVALID_SCHEDULE_TRANSITION: Cannot transition schedule from ${currentStatus} to ${targetStatus}`);
        }
    }

    validateRevisionReason(reason?: string): void {
        if (!reason || reason.trim().length === 0) {
            throw new Error('SCHEDULE_REVISION_REASON_REQUIRED: A valid revision reason is required when modifying a schedule');
        }
    }

    detectSecurityLeakage(payload: unknown): void {
        if (!payload) return;
        const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);

        const forbiddenPatterns = [
            /AIzaSy[A-Za-z0-9_-]{20,}/,
            /sk-[A-Za-z0-9_-]{20,}/,
            /Bearer\s+[A-Za-z0-9._-]+/i,
            /-----BEGIN[ A-Z0-9_-]*PRIVATE KEY-----/,
            /"password"\s*:\s*"[^"]+"/i,
            /"password_hash"\s*:\s*"[^"]+"/i,
            /"secret"\s*:\s*"[^"]+"/i,
            /"refresh_token"\s*:\s*"[^"]+"/i,
            /"access_token"\s*:\s*"[^"]+"/i,
            /generateContent/i,
            /GoogleGenAI/i,
            /@google\/genai/i,
            /system\s+prompt/i
        ];

        for (const pattern of forbiddenPatterns) {
            if (pattern.test(serialized)) {
                throw new Error(`SECURITY_LEAKAGE_DETECTED: Payload contains unauthorized secret, token, or prompt invocation matching ${pattern}`);
            }
        }
    }

    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }

    computeTimeSlotChecksum(slot: Omit<TimeSlot, 'checksum'>): string {
        const raw = `TS|${slot.time_slot_id}|${slot.institution_id}|${slot.day_of_week}|${slot.start_time}|${slot.end_time}|${slot.sequence}|${slot.status}|${slot.version_number}`;
        return `TS-CHK-${this.simpleHash(raw)}`;
    }

    computeRoomChecksum(room: Omit<LearningRoom, 'checksum'>): string {
        const raw = `ROOM|${room.room_id}|${room.institution_id}|${room.code}|${room.name}|${room.capacity}|${room.room_type}|${room.status}|${room.version_number}`;
        return `ROOM-CHK-${this.simpleHash(raw)}`;
    }

    computeScheduleChecksum(schedule: Omit<ScheduleEntry, 'checksum'>): string {
        const raw = `SCH|${schedule.schedule_id}|${schedule.institution_id}|${schedule.academic_year_id}|${schedule.semester_id}|${schedule.course_period_id}|${schedule.course_id}|${schedule.class_id}|${schedule.teacher_id}|${schedule.time_slot_id}|${schedule.room_id}|${schedule.effective_from}|${schedule.effective_until}|${schedule.status}|${schedule.version_number}`;
        return `SCH-CHK-${this.simpleHash(raw)}`;
    }

    computeWorkloadChecksum(workload: Omit<TeacherWorkloadSummary, 'checksum'>): string {
        const raw = `WORK|${workload.teacher_id}|${workload.institution_id}|${workload.semester_id}|${workload.scheduled_period_count}|${workload.scheduled_minutes}|${workload.scheduled_hours}|${workload.course_count}|${workload.class_count}|${workload.workload_status}`;
        return `WORK-CHK-${this.simpleHash(raw)}`;
    }

    computeAuditChecksum(event: Omit<ScheduleAuditEvent, 'checksum'>): string {
        const raw = `AUD|${event.event_id}|${event.event_type}|${event.institution_id}|${event.entity_id}|${event.actor_id}|${event.timestamp}|${event.version_number}`;
        return `AUD-CHK-${this.simpleHash(raw)}`;
    }

    computeHistoryChecksum(history: Omit<ScheduleHistoryEntry, 'checksum'>): string {
        const raw = `HIST|${history.history_id}|${history.schedule_id}|${history.version_number}|${history.revision_reason}|${history.actor_id}|${history.created_at}`;
        return `HIST-SCH-CHK-${this.simpleHash(raw)}`;
    }
}

export const schedulingValidationEngine = new SchedulingValidationEngine();
