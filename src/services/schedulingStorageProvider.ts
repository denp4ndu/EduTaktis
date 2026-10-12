import { 
    TimeSlot, 
    LearningRoom, 
    ScheduleEntry, 
    ScheduleStatus,
    ScheduleHistoryEntry, 
    ScheduleConflict, 
    ScheduleAuditEvent 
} from '../types/curriculum';

export function deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    const propNames = Object.getOwnPropertyNames(obj);
    for (const name of propNames) {
        const value = (obj as Record<string, unknown>)[name];
        if (value && typeof value === 'object') {
            deepFreeze(value);
        }
    }
    return Object.freeze(obj);
}

export function cloneDeep<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

export interface SchedulingStorageProvider {
    // TimeSlot
    saveTimeSlot(slot: TimeSlot): Promise<void>;
    getTimeSlot(id: string): Promise<TimeSlot | null>;
    listTimeSlots(institutionId: string): Promise<TimeSlot[]>;

    // LearningRoom
    saveLearningRoom(room: LearningRoom): Promise<void>;
    getLearningRoom(id: string): Promise<LearningRoom | null>;
    listLearningRooms(institutionId: string): Promise<LearningRoom[]>;

    // ScheduleEntry
    saveScheduleEntry(entry: ScheduleEntry): Promise<void>;
    getScheduleEntry(id: string): Promise<ScheduleEntry | null>;
    listScheduleEntries(institutionId: string, filter?: {
        semester_id?: string;
        class_id?: string;
        teacher_id?: string;
        room_id?: string;
        course_id?: string;
        status?: ScheduleStatus;
    }): Promise<ScheduleEntry[]>;

    // ScheduleHistory
    saveScheduleHistory(entry: ScheduleHistoryEntry): Promise<void>;
    getScheduleHistory(scheduleId: string): Promise<ScheduleHistoryEntry[]>;

    // ScheduleConflict
    saveScheduleConflict(conflict: ScheduleConflict): Promise<void>;
    getScheduleConflicts(institutionId: string, semesterId?: string): Promise<ScheduleConflict[]>;
    clearScheduleConflicts(institutionId: string, semesterId?: string): Promise<void>;

    // Audit
    saveAuditEvent(event: ScheduleAuditEvent): Promise<void>;
    listAuditEvents(institutionId: string, entityId?: string): Promise<ScheduleAuditEvent[]>;

    // Maintenance
    clear(): Promise<void>;
}

export class InMemorySchedulingStorageProvider implements SchedulingStorageProvider {
    private timeSlots = new Map<string, TimeSlot>();
    private rooms = new Map<string, LearningRoom>();
    private schedules = new Map<string, ScheduleEntry>();
    private histories = new Map<string, ScheduleHistoryEntry[]>();
    private conflicts: ScheduleConflict[] = [];
    private auditEvents: ScheduleAuditEvent[] = [];

    async saveTimeSlot(slot: TimeSlot): Promise<void> {
        this.timeSlots.set(slot.time_slot_id, cloneDeep(slot));
    }

    async getTimeSlot(id: string): Promise<TimeSlot | null> {
        const item = this.timeSlots.get(id);
        return item ? deepFreeze(cloneDeep(item)) : null;
    }

    async listTimeSlots(institutionId: string): Promise<TimeSlot[]> {
        const list = Array.from(this.timeSlots.values())
            .filter(s => s.institution_id === institutionId)
            .map(s => cloneDeep(s));
        return deepFreeze(list);
    }

    async saveLearningRoom(room: LearningRoom): Promise<void> {
        this.rooms.set(room.room_id, cloneDeep(room));
    }

    async getLearningRoom(id: string): Promise<LearningRoom | null> {
        const item = this.rooms.get(id);
        return item ? deepFreeze(cloneDeep(item)) : null;
    }

    async listLearningRooms(institutionId: string): Promise<LearningRoom[]> {
        const list = Array.from(this.rooms.values())
            .filter(r => r.institution_id === institutionId)
            .map(r => cloneDeep(r));
        return deepFreeze(list);
    }

    async saveScheduleEntry(entry: ScheduleEntry): Promise<void> {
        this.schedules.set(entry.schedule_id, cloneDeep(entry));
    }

    async getScheduleEntry(id: string): Promise<ScheduleEntry | null> {
        const item = this.schedules.get(id);
        return item ? deepFreeze(cloneDeep(item)) : null;
    }

    async listScheduleEntries(institutionId: string, filter?: {
        semester_id?: string;
        class_id?: string;
        teacher_id?: string;
        room_id?: string;
        course_id?: string;
        status?: ScheduleStatus;
    }): Promise<ScheduleEntry[]> {
        let list = Array.from(this.schedules.values())
            .filter(s => s.institution_id === institutionId);

        if (filter) {
            if (filter.semester_id) {
                list = list.filter(s => s.semester_id === filter.semester_id);
            }
            if (filter.class_id) {
                list = list.filter(s => s.class_id === filter.class_id);
            }
            if (filter.teacher_id) {
                list = list.filter(s => s.teacher_id === filter.teacher_id);
            }
            if (filter.room_id) {
                list = list.filter(s => s.room_id === filter.room_id);
            }
            if (filter.course_id) {
                list = list.filter(s => s.course_id === filter.course_id);
            }
            if (filter.status) {
                list = list.filter(s => s.status === filter.status);
            }
        }

        return deepFreeze(list.map(s => cloneDeep(s)));
    }

    async saveScheduleHistory(entry: ScheduleHistoryEntry): Promise<void> {
        const list = this.histories.get(entry.schedule_id) || [];
        list.push(cloneDeep(entry));
        this.histories.set(entry.schedule_id, list);
    }

    async getScheduleHistory(scheduleId: string): Promise<ScheduleHistoryEntry[]> {
        const list = this.histories.get(scheduleId) || [];
        return deepFreeze(list.map(h => cloneDeep(h)));
    }

    async saveScheduleConflict(conflict: ScheduleConflict): Promise<void> {
        this.conflicts.push(cloneDeep(conflict));
    }

    async getScheduleConflicts(institutionId: string, semesterId?: string): Promise<ScheduleConflict[]> {
        let list = this.conflicts.filter(c => c.institution_id === institutionId);
        if (semesterId) {
            list = list.filter(c => c.semester_id === semesterId);
        }
        return deepFreeze(list.map(c => cloneDeep(c)));
    }

    async clearScheduleConflicts(institutionId: string, semesterId?: string): Promise<void> {
        this.conflicts = this.conflicts.filter(c => {
            if (c.institution_id !== institutionId) return true;
            if (semesterId && c.semester_id !== semesterId) return true;
            return false;
        });
    }

    async saveAuditEvent(event: ScheduleAuditEvent): Promise<void> {
        this.auditEvents.push(cloneDeep(event));
    }

    async listAuditEvents(institutionId: string, entityId?: string): Promise<ScheduleAuditEvent[]> {
        let list = this.auditEvents.filter(a => a.institution_id === institutionId);
        if (entityId) {
            list = list.filter(a => a.entity_id === entityId);
        }
        return deepFreeze(list.map(a => cloneDeep(a)));
    }

    async clear(): Promise<void> {
        this.timeSlots.clear();
        this.rooms.clear();
        this.schedules.clear();
        this.histories.clear();
        this.conflicts = [];
        this.auditEvents = [];
    }
}

export const schedulingStorage = new InMemorySchedulingStorageProvider();
