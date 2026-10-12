import { 
    TimeSlot, 
    LearningRoom, 
    ScheduleEntry, 
    ScheduleStatus,
    ScheduleHistoryEntry, 
    ScheduleConflict, 
    ScheduleAuditEvent 
} from '../types/curriculum';
import { 
    SchedulingStorageProvider, 
    schedulingStorage, 
    deepFreeze 
} from './schedulingStorageProvider';
import { 
    SchedulingValidationEngine, 
    schedulingValidationEngine 
} from './schedulingValidationEngine';

export class SchedulingRepositoryEngine {
    constructor(
        private storage: SchedulingStorageProvider = schedulingStorage,
        private validator: SchedulingValidationEngine = schedulingValidationEngine
    ) {}

    // 1. TimeSlot
    async getTimeSlot(id: string): Promise<TimeSlot | null> {
        const slot = await this.storage.getTimeSlot(id);
        if (!slot) return null;

        const expected = this.validator.computeTimeSlotChecksum(slot);
        if (slot.checksum !== expected) {
            throw new Error(`TIME_SLOT_CHECKSUM_MISMATCH: Integrity check failed for time slot ${id}`);
        }
        return deepFreeze(slot);
    }

    async listTimeSlots(institutionId: string): Promise<TimeSlot[]> {
        const slots = await this.storage.listTimeSlots(institutionId);
        for (const slot of slots) {
            const expected = this.validator.computeTimeSlotChecksum(slot);
            if (slot.checksum !== expected) {
                throw new Error(`TIME_SLOT_CHECKSUM_MISMATCH: Integrity check failed for time slot ${slot.time_slot_id}`);
            }
        }
        return deepFreeze(slots);
    }

    // 2. LearningRoom
    async getLearningRoom(id: string): Promise<LearningRoom | null> {
        const room = await this.storage.getLearningRoom(id);
        if (!room) return null;

        const expected = this.validator.computeRoomChecksum(room);
        if (room.checksum !== expected) {
            throw new Error(`ROOM_CHECKSUM_MISMATCH: Integrity check failed for room ${id}`);
        }
        return deepFreeze(room);
    }

    async listLearningRooms(institutionId: string): Promise<LearningRoom[]> {
        const rooms = await this.storage.listLearningRooms(institutionId);
        for (const room of rooms) {
            const expected = this.validator.computeRoomChecksum(room);
            if (room.checksum !== expected) {
                throw new Error(`ROOM_CHECKSUM_MISMATCH: Integrity check failed for room ${room.room_id}`);
            }
        }
        return deepFreeze(rooms);
    }

    // 3. ScheduleEntry
    async getScheduleEntry(id: string): Promise<ScheduleEntry | null> {
        const entry = await this.storage.getScheduleEntry(id);
        if (!entry) return null;

        const expected = this.validator.computeScheduleChecksum(entry);
        if (entry.checksum !== expected) {
            throw new Error(`SCHEDULE_CHECKSUM_MISMATCH: Integrity check failed for schedule ${id}`);
        }
        return deepFreeze(entry);
    }

    async listScheduleEntries(institutionId: string, filter?: {
        semester_id?: string;
        class_id?: string;
        teacher_id?: string;
        room_id?: string;
        course_id?: string;
        status?: ScheduleStatus;
    }): Promise<ScheduleEntry[]> {
        const entries = await this.storage.listScheduleEntries(institutionId, filter);
        for (const entry of entries) {
            const expected = this.validator.computeScheduleChecksum(entry);
            if (entry.checksum !== expected) {
                throw new Error(`SCHEDULE_CHECKSUM_MISMATCH: Integrity check failed for schedule ${entry.schedule_id}`);
            }
        }
        return deepFreeze(entries);
    }

    // 4. ScheduleHistory
    async getScheduleHistory(scheduleId: string): Promise<ScheduleHistoryEntry[]> {
        const history = await this.storage.getScheduleHistory(scheduleId);
        return deepFreeze(history);
    }

    // 5. ScheduleConflict
    async getScheduleConflicts(institutionId: string, semesterId?: string): Promise<ScheduleConflict[]> {
        const conflicts = await this.storage.getScheduleConflicts(institutionId, semesterId);
        return deepFreeze(conflicts);
    }

    // 6. Audit
    async listAuditEvents(institutionId: string, entityId?: string): Promise<ScheduleAuditEvent[]> {
        const events = await this.storage.listAuditEvents(institutionId, entityId);
        return deepFreeze(events);
    }
}

export const schedulingRepositoryEngine = new SchedulingRepositoryEngine();
