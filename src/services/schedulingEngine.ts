import { 
    TimeSlot, 
    TimeSlotStatus,
    DayOfWeek,
    LearningRoom, 
    RoomType,
    RoomStatus,
    ScheduleEntry, 
    ScheduleStatus, 
    ScheduleConflict, 
    ScheduleConflictType,
    ScheduleHistoryEntry, 
    ScheduleAuditEvent, 
    ScheduleAuditEventType,
    StudentTimetableEntry, 
    TeacherTimetableEntry, 
    UserRole 
} from '../types/curriculum';
import { 
    SchedulingStorageProvider, 
    schedulingStorage, 
    deepFreeze 
} from './schedulingStorageProvider';
import { 
    SchedulingRepositoryEngine, 
    schedulingRepositoryEngine 
} from './schedulingRepositoryEngine';
import { 
    SchedulingValidationEngine, 
    schedulingValidationEngine 
} from './schedulingValidationEngine';
import { 
    schoolAdministrationRepositoryEngine, 
    SchoolAdministrationRepositoryEngine 
} from './schoolAdministrationRepositoryEngine';
import { 
    academicCalendarRepositoryEngine, 
    AcademicCalendarRepositoryEngine 
} from './academicCalendarRepositoryEngine';
import { 
    classEnrollmentStorage, 
    ClassEnrollmentStorageProvider 
} from './classEnrollmentStorageProvider';
import { 
    authorizationEngine, 
    AuthorizationEngine 
} from './authorizationEngine';

const DAY_ORDER: Record<DayOfWeek, number> = {
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
    SUNDAY: 7
};

export class SchedulingEngine {
    constructor(
        private storage: SchedulingStorageProvider = schedulingStorage,
        private repo: SchedulingRepositoryEngine = schedulingRepositoryEngine,
        private validator: SchedulingValidationEngine = schedulingValidationEngine,
        private schoolRepo: SchoolAdministrationRepositoryEngine = schoolAdministrationRepositoryEngine,
        private calendarRepo: AcademicCalendarRepositoryEngine = academicCalendarRepositoryEngine,
        private enrollmentStore: ClassEnrollmentStorageProvider = classEnrollmentStorage,
        private authEngine: AuthorizationEngine = authorizationEngine
    ) {}

    private async recordAudit(
        institutionId: string,
        actorId: string,
        eventType: ScheduleAuditEventType,
        entityId: string,
        versionNumber: number,
        details?: Record<string, unknown>
    ): Promise<void> {
        const now = new Date().toISOString();
        const eventId = `AUD-SCH-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const partial: Omit<ScheduleAuditEvent, 'checksum'> = {
            event_id: eventId,
            event_type: eventType,
            actor_id: actorId,
            institution_id: institutionId,
            entity_id: entityId,
            timestamp: now,
            version_number: versionNumber,
            details
        };
        const checksum = this.validator.computeAuditChecksum(partial);
        await this.storage.saveAuditEvent(deepFreeze({ ...partial, checksum }));
    }

    // ==========================================
    // 1. TIME SLOT MANAGEMENT
    // ==========================================
    async createTimeSlot(params: {
        institution_id: string;
        day_of_week: DayOfWeek;
        start_time: string;
        end_time: string;
        sequence: number;
        actor_id: string;
        actor_role: UserRole;
    }): Promise<TimeSlot> {
        this.validator.detectSecurityLeakage(params);

        if (params.actor_role !== 'ADMIN' && params.actor_role !== 'HEADMASTER') {
            throw new Error(`UNAUTHORIZED_ADMIN_SCOPE: Role ${params.actor_role} cannot create time slots`);
        }

        const existingSlots = await this.repo.listTimeSlots(params.institution_id);
        const slotId = `TS-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const partial: Omit<TimeSlot, 'checksum'> = {
            time_slot_id: slotId,
            institution_id: params.institution_id,
            day_of_week: params.day_of_week,
            start_time: params.start_time,
            end_time: params.end_time,
            sequence: params.sequence,
            status: 'ACTIVE',
            version_number: 1,
            created_at: now,
            updated_at: now
        };

        this.validator.validateTimeSlot(partial, existingSlots);

        const checksum = this.validator.computeTimeSlotChecksum(partial);
        const timeSlot: TimeSlot = deepFreeze({ ...partial, checksum });

        await this.storage.saveTimeSlot(timeSlot);
        await this.recordAudit(params.institution_id, params.actor_id, 'TIME_SLOT_CREATED', slotId, 1);

        return timeSlot;
    }

    async updateTimeSlot(params: {
        time_slot_id: string;
        status?: TimeSlotStatus;
        start_time?: string;
        end_time?: string;
        actor_id: string;
        actor_role: UserRole;
        reason?: string;
    }): Promise<TimeSlot> {
        this.validator.detectSecurityLeakage(params);

        if (params.actor_role !== 'ADMIN' && params.actor_role !== 'HEADMASTER') {
            throw new Error(`UNAUTHORIZED_ADMIN_SCOPE: Role ${params.actor_role} cannot update time slots`);
        }

        const current = await this.repo.getTimeSlot(params.time_slot_id);
        if (!current) {
            throw new Error(`INVALID_TIME_SLOT: TimeSlot ${params.time_slot_id} not found`);
        }

        if (current.status === 'ARCHIVED') {
            throw new Error(`INVALID_TIME_SLOT: Cannot update ARCHIVED time slot`);
        }

        const existingSlots = await this.repo.listTimeSlots(current.institution_id);
        const now = new Date().toISOString();
        const nextVersion = current.version_number + 1;

        const partial: Omit<TimeSlot, 'checksum'> = {
            ...current,
            start_time: params.start_time || current.start_time,
            end_time: params.end_time || current.end_time,
            status: params.status || current.status,
            version_number: nextVersion,
            updated_at: now
        };

        this.validator.validateTimeSlot(partial, existingSlots);

        const checksum = this.validator.computeTimeSlotChecksum(partial);
        const updated: TimeSlot = deepFreeze({ ...partial, checksum });

        await this.storage.saveTimeSlot(updated);
        await this.recordAudit(current.institution_id, params.actor_id, 'TIME_SLOT_UPDATED', current.time_slot_id, nextVersion, { reason: params.reason });

        return updated;
    }

    async listTimeSlots(institutionId: string): Promise<TimeSlot[]> {
        return this.repo.listTimeSlots(institutionId);
    }

    // ==========================================
    // 2. LEARNING ROOM MANAGEMENT
    // ==========================================
    async createLearningRoom(params: {
        institution_id: string;
        organization_unit_id?: string;
        name: string;
        code: string;
        capacity: number;
        room_type: RoomType;
        actor_id: string;
        actor_role: UserRole;
    }): Promise<LearningRoom> {
        this.validator.detectSecurityLeakage(params);

        if (params.actor_role !== 'ADMIN' && params.actor_role !== 'HEADMASTER') {
            throw new Error(`UNAUTHORIZED_ADMIN_SCOPE: Role ${params.actor_role} cannot create learning rooms`);
        }

        const existingRooms = await this.repo.listLearningRooms(params.institution_id);
        const roomId = `ROOM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const partial: Omit<LearningRoom, 'checksum'> = {
            room_id: roomId,
            institution_id: params.institution_id,
            organization_unit_id: params.organization_unit_id,
            name: params.name,
            code: params.code,
            capacity: params.capacity,
            room_type: params.room_type,
            status: 'ACTIVE',
            version_number: 1,
            created_at: now,
            updated_at: now
        };

        this.validator.validateLearningRoom(partial, existingRooms);

        const checksum = this.validator.computeRoomChecksum(partial);
        const room: LearningRoom = deepFreeze({ ...partial, checksum });

        await this.storage.saveLearningRoom(room);
        await this.recordAudit(params.institution_id, params.actor_id, 'ROOM_CREATED', roomId, 1);

        return room;
    }

    async updateLearningRoom(params: {
        room_id: string;
        name?: string;
        capacity?: number;
        status?: RoomStatus;
        actor_id: string;
        actor_role: UserRole;
        reason?: string;
    }): Promise<LearningRoom> {
        this.validator.detectSecurityLeakage(params);

        if (params.actor_role !== 'ADMIN' && params.actor_role !== 'HEADMASTER') {
            throw new Error(`UNAUTHORIZED_ADMIN_SCOPE: Role ${params.actor_role} cannot update learning rooms`);
        }

        const current = await this.repo.getLearningRoom(params.room_id);
        if (!current) {
            throw new Error(`INVALID_ROOM: LearningRoom ${params.room_id} not found`);
        }

        if (current.status === 'ARCHIVED') {
            throw new Error(`INVALID_ROOM: Cannot update ARCHIVED learning room`);
        }

        const existingRooms = await this.repo.listLearningRooms(current.institution_id);
        const now = new Date().toISOString();
        const nextVersion = current.version_number + 1;

        const partial: Omit<LearningRoom, 'checksum'> = {
            ...current,
            name: params.name || current.name,
            capacity: params.capacity !== undefined ? params.capacity : current.capacity,
            status: params.status || current.status,
            version_number: nextVersion,
            updated_at: now
        };

        this.validator.validateLearningRoom(partial, existingRooms);

        const checksum = this.validator.computeRoomChecksum(partial);
        const updated: LearningRoom = deepFreeze({ ...partial, checksum });

        await this.storage.saveLearningRoom(updated);
        await this.recordAudit(current.institution_id, params.actor_id, 'ROOM_UPDATED', current.room_id, nextVersion, { reason: params.reason });

        return updated;
    }

    async listLearningRooms(institutionId: string): Promise<LearningRoom[]> {
        return this.repo.listLearningRooms(institutionId);
    }

    // ==========================================
    // 3. ZERO-TRUST CONFLICT DETECTION
    // ==========================================
    async detectScheduleConflicts(institutionId: string, semesterId: string): Promise<ScheduleConflict[]> {
        const schedules = await this.repo.listScheduleEntries(institutionId, { semester_id: semesterId });
        const conflicts: ScheduleConflict[] = [];
        const now = new Date().toISOString();

        // 1. Teacher conflicts
        const teacherSlotMap = new Map<string, ScheduleEntry[]>();
        for (const s of schedules) {
            if (s.status === 'ARCHIVED' || s.status === 'CLOSED') continue;
            const key = `${s.teacher_id}#${s.time_slot_id}`;
            const list = teacherSlotMap.get(key) || [];
            list.push(s);
            teacherSlotMap.set(key, list);
        }

        for (const [key, list] of teacherSlotMap.entries()) {
            if (list.length > 1) {
                const [teacherId, slotId] = key.split('#');
                for (const s of list) {
                    conflicts.push(deepFreeze({
                        conflict_id: `CONF-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                        institution_id: institutionId,
                        semester_id: semesterId,
                        schedule_id: s.schedule_id,
                        conflict_type: 'TEACHER_SCHEDULE_CONFLICT',
                        severity: 'CRITICAL',
                        entity_id: teacherId,
                        message: `Teacher ${teacherId} scheduled for multiple classes in time slot ${slotId}`,
                        detected_at: now
                    }));
                }
            }
        }

        // 2. Class conflicts
        const classSlotMap = new Map<string, ScheduleEntry[]>();
        for (const s of schedules) {
            if (s.status === 'ARCHIVED' || s.status === 'CLOSED') continue;
            const key = `${s.class_id}#${s.time_slot_id}`;
            const list = classSlotMap.get(key) || [];
            list.push(s);
            classSlotMap.set(key, list);
        }

        for (const [key, list] of classSlotMap.entries()) {
            if (list.length > 1) {
                const [classId, slotId] = key.split('#');
                for (const s of list) {
                    conflicts.push(deepFreeze({
                        conflict_id: `CONF-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                        institution_id: institutionId,
                        semester_id: semesterId,
                        schedule_id: s.schedule_id,
                        conflict_type: 'CLASS_SCHEDULE_CONFLICT',
                        severity: 'CRITICAL',
                        entity_id: classId,
                        message: `Class ${classId} scheduled for multiple courses in time slot ${slotId}`,
                        detected_at: now
                    }));
                }
            }
        }

        // 3. Room conflicts
        const roomSlotMap = new Map<string, ScheduleEntry[]>();
        for (const s of schedules) {
            if (s.status === 'ARCHIVED' || s.status === 'CLOSED') continue;
            const key = `${s.room_id}#${s.time_slot_id}`;
            const list = roomSlotMap.get(key) || [];
            list.push(s);
            roomSlotMap.set(key, list);
        }

        for (const [key, list] of roomSlotMap.entries()) {
            if (list.length > 1) {
                const [roomId, slotId] = key.split('#');
                for (const s of list) {
                    conflicts.push(deepFreeze({
                        conflict_id: `CONF-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                        institution_id: institutionId,
                        semester_id: semesterId,
                        schedule_id: s.schedule_id,
                        conflict_type: 'ROOM_SCHEDULE_CONFLICT',
                        severity: 'CRITICAL',
                        entity_id: roomId,
                        message: `Room ${roomId} scheduled for multiple classes in time slot ${slotId}`,
                        detected_at: now
                    }));
                }
            }
        }

        return deepFreeze(conflicts);
    }

    // ==========================================
    // 4. SCHEDULE CREATION & MODIFICATION
    // ==========================================
    async createSchedule(params: {
        institution_id: string;
        academic_year_id: string;
        semester_id: string;
        course_period_id: string;
        course_id: string;
        class_id: string;
        teacher_id: string;
        time_slot_id: string;
        room_id: string;
        effective_from: string;
        effective_until: string;
        actor_id: string;
        actor_role: UserRole;
    }): Promise<ScheduleEntry> {
        this.validator.detectSecurityLeakage(params);

        // 1. Actor scope check
        if (params.actor_role === 'TEACHER') {
            if (params.actor_id !== params.teacher_id) {
                throw new Error(`UNAUTHORIZED_TEACHER_SCHEDULE_SCOPE: Teacher ${params.actor_id} cannot create schedule for teacher ${params.teacher_id}`);
            }
        } else if (params.actor_role !== 'ADMIN' && params.actor_role !== 'HEADMASTER') {
            throw new Error(`UNAUTHORIZED_ADMIN_SCOPE: Role ${params.actor_role} cannot create schedules`);
        }

        // 2. Institution verification
        const institution = await this.schoolRepo.getInstitution(params.institution_id);
        if (!institution || institution.status !== 'ACTIVE') {
            throw new Error(`INVALID_INSTITUTION_STATE: Institution ${params.institution_id} does not exist or is not ACTIVE`);
        }

        // 3. Academic Year verification
        const academicYear = await this.calendarRepo.getAcademicYear(params.academic_year_id);
        if (!academicYear || academicYear.status !== 'ACTIVE') {
            throw new Error(`INVALID_ACADEMIC_YEAR_STATE: Academic Year ${params.academic_year_id} does not exist or is not ACTIVE`);
        }

        // 4. Semester verification
        const semester = await this.calendarRepo.getSemester(params.semester_id);
        if (!semester || semester.status !== 'ACTIVE' || semester.academic_year_id !== params.academic_year_id) {
            throw new Error(`INVALID_SEMESTER_STATE: Semester ${params.semester_id} is not ACTIVE or does not belong to Academic Year ${params.academic_year_id}`);
        }

        // Check semester boundaries
        if (new Date(params.effective_from) < new Date(semester.start_at) || new Date(params.effective_until) > new Date(semester.end_at)) {
            throw new Error(`SEMESTER_SCHEDULE_CONFLICT: Effective range (${params.effective_from} to ${params.effective_until}) must be within semester boundary (${semester.start_at} to ${semester.end_at})`);
        }

        // 5. Course Period verification
        const period = await this.calendarRepo.getCoursePeriod(params.course_period_id);
        if (!period) {
            throw new Error(`INVALID_COURSE_PERIOD_STATE: Course period ${params.course_period_id} does not exist`);
        }
        if (period.status === 'ARCHIVED') {
            throw new Error(`INVALID_COURSE_PERIOD_STATE: Course period ${params.course_period_id} is ARCHIVED`);
        }
        if (period.semester_id !== params.semester_id) {
            throw new Error(`COURSE_PERIOD_SCHEDULE_CONFLICT: Course period ${params.course_period_id} belongs to semester ${period.semester_id}, not ${params.semester_id}`);
        }
        if (period.course_id !== params.course_id) {
            throw new Error(`COURSE_PERIOD_SCHEDULE_CONFLICT: Course period ${params.course_period_id} is for course ${period.course_id}, not ${params.course_id}`);
        }
        if (period.teacher_id !== params.teacher_id) {
            throw new Error(`UNAUTHORIZED_TEACHER_SCHEDULE_SCOPE: Teacher ${params.teacher_id} is not authorized for course period ${params.course_period_id}`);
        }

        // 6. Class verification
        const schoolClass = await this.schoolRepo.getClass(params.class_id);
        if (!schoolClass) {
            throw new Error(`INVALID_CLASS_STATE: Class ${params.class_id} does not exist`);
        }
        if (schoolClass.institution_id !== params.institution_id) {
            throw new Error(`CROSS_INSTITUTION_SCHEDULE_ACCESS_DENIED: Class ${params.class_id} belongs to institution ${schoolClass.institution_id}, not ${params.institution_id}`);
        }
        if (schoolClass.status !== 'ACTIVE') {
            throw new Error(`INVALID_CLASS_STATE: Class ${params.class_id} is in status ${schoolClass.status}, expected ACTIVE`);
        }

        // 7. TimeSlot verification
        const timeSlot = await this.repo.getTimeSlot(params.time_slot_id);
        if (!timeSlot) {
            throw new Error(`INVALID_TIME_SLOT: Time slot ${params.time_slot_id} does not exist`);
        }
        if (timeSlot.institution_id !== params.institution_id) {
            throw new Error(`CROSS_INSTITUTION_SCHEDULE_ACCESS_DENIED: Time slot ${params.time_slot_id} does not belong to institution ${params.institution_id}`);
        }
        if (timeSlot.status !== 'ACTIVE') {
            throw new Error(`INVALID_TIME_SLOT: Time slot ${params.time_slot_id} is not ACTIVE`);
        }

        // 8. LearningRoom verification
        const room = await this.repo.getLearningRoom(params.room_id);
        if (!room) {
            throw new Error(`INVALID_ROOM: Room ${params.room_id} does not exist`);
        }
        if (room.institution_id !== params.institution_id) {
            throw new Error(`CROSS_INSTITUTION_SCHEDULE_ACCESS_DENIED: Room ${params.room_id} does not belong to institution ${params.institution_id}`);
        }
        if (room.status !== 'ACTIVE') {
            throw new Error(`ROOM_NOT_ACTIVE: Room ${params.room_id} is in status ${room.status}, expected ACTIVE`);
        }

        // 9. Existing active/scheduled schedules conflict check
        const existingSchedules = await this.repo.listScheduleEntries(params.institution_id, {
            semester_id: params.semester_id
        });

        for (const existing of existingSchedules) {
            if (existing.status === 'ARCHIVED' || existing.status === 'CLOSED') continue;
            if (existing.time_slot_id !== params.time_slot_id) continue;

            // Check date range overlap
            const overlap = (params.effective_from <= existing.effective_until) && (params.effective_until >= existing.effective_from);
            if (!overlap) continue;

            if (existing.teacher_id === params.teacher_id) {
                const conf: ScheduleConflict = {
                    conflict_id: `CONF-${Date.now()}`,
                    institution_id: params.institution_id,
                    semester_id: params.semester_id,
                    schedule_id: existing.schedule_id,
                    conflict_type: 'TEACHER_SCHEDULE_CONFLICT',
                    severity: 'CRITICAL',
                    entity_id: params.teacher_id,
                    message: `Teacher ${params.teacher_id} already has schedule in slot ${params.time_slot_id}`,
                    detected_at: new Date().toISOString()
                };
                await this.storage.saveScheduleConflict(conf);
                throw new Error(`TEACHER_SCHEDULE_CONFLICT: Teacher ${params.teacher_id} is already scheduled in time slot ${params.time_slot_id}`);
            }

            if (existing.class_id === params.class_id) {
                const conf: ScheduleConflict = {
                    conflict_id: `CONF-${Date.now()}`,
                    institution_id: params.institution_id,
                    semester_id: params.semester_id,
                    schedule_id: existing.schedule_id,
                    conflict_type: 'CLASS_SCHEDULE_CONFLICT',
                    severity: 'CRITICAL',
                    entity_id: params.class_id,
                    message: `Class ${params.class_id} already has schedule in slot ${params.time_slot_id}`,
                    detected_at: new Date().toISOString()
                };
                await this.storage.saveScheduleConflict(conf);
                throw new Error(`CLASS_SCHEDULE_CONFLICT: Class ${params.class_id} is already attending course in time slot ${params.time_slot_id}`);
            }

            if (existing.room_id === params.room_id) {
                const conf: ScheduleConflict = {
                    conflict_id: `CONF-${Date.now()}`,
                    institution_id: params.institution_id,
                    semester_id: params.semester_id,
                    schedule_id: existing.schedule_id,
                    conflict_type: 'ROOM_SCHEDULE_CONFLICT',
                    severity: 'CRITICAL',
                    entity_id: params.room_id,
                    message: `Room ${params.room_id} already occupied in slot ${params.time_slot_id}`,
                    detected_at: new Date().toISOString()
                };
                await this.storage.saveScheduleConflict(conf);
                throw new Error(`ROOM_SCHEDULE_CONFLICT: Room ${params.room_id} is already occupied in time slot ${params.time_slot_id}`);
            }
        }

        // Construct schedule entry
        const scheduleId = `SCH-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const partial: Omit<ScheduleEntry, 'checksum'> = {
            schedule_id: scheduleId,
            institution_id: params.institution_id,
            academic_year_id: params.academic_year_id,
            semester_id: params.semester_id,
            course_period_id: params.course_period_id,
            course_id: params.course_id,
            class_id: params.class_id,
            teacher_id: params.teacher_id,
            time_slot_id: params.time_slot_id,
            room_id: params.room_id,
            effective_from: params.effective_from,
            effective_until: params.effective_until,
            status: 'DRAFT',
            version_number: 1,
            created_at: now,
            updated_at: now
        };

        const checksum = this.validator.computeScheduleChecksum(partial);
        const schedule: ScheduleEntry = deepFreeze({ ...partial, checksum });

        await this.storage.saveScheduleEntry(schedule);
        const histPartial: Omit<ScheduleHistoryEntry, 'checksum'> = {
            history_id: `HIST-${Date.now()}`,
            schedule_id: scheduleId,
            version_number: 1,
            previous_snapshot: null,
            new_snapshot: schedule,
            revision_reason: 'INITIAL_CREATION',
            actor_id: params.actor_id,
            created_at: now
        };
        const histChecksum = this.validator.computeHistoryChecksum(histPartial);
        await this.storage.saveScheduleHistory(deepFreeze({ ...histPartial, checksum: histChecksum }));

        await this.recordAudit(params.institution_id, params.actor_id, 'SCHEDULE_CREATED', scheduleId, 1);

        return schedule;
    }

    // ==========================================
    // 5. LIFECYCLE TRANSITIONS
    // ==========================================
    async transitionScheduleStatus(params: {
        schedule_id: string;
        target_status: ScheduleStatus;
        actor_id: string;
        actor_role: UserRole;
        reason?: string;
    }): Promise<ScheduleEntry> {
        this.validator.detectSecurityLeakage(params);

        const current = await this.repo.getScheduleEntry(params.schedule_id);
        if (!current) {
            throw new Error(`SCHEDULE_NOT_FOUND: Schedule ${params.schedule_id} not found`);
        }

        // Scope check
        if (params.actor_role === 'TEACHER') {
            if (params.actor_id !== current.teacher_id) {
                throw new Error(`UNAUTHORIZED_TEACHER_SCHEDULE_SCOPE: Teacher ${params.actor_id} cannot transition schedule for teacher ${current.teacher_id}`);
            }
        } else if (params.actor_role !== 'ADMIN' && params.actor_role !== 'HEADMASTER') {
            throw new Error(`UNAUTHORIZED_ADMIN_SCOPE: Role ${params.actor_role} cannot transition schedule`);
        }

        this.validator.validateScheduleTransition(current.status, params.target_status);

        const now = new Date().toISOString();
        const nextVersion = current.version_number + 1;

        const partial: Omit<ScheduleEntry, 'checksum'> = {
            ...current,
            status: params.target_status,
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.validator.computeScheduleChecksum(partial);
        const updated: ScheduleEntry = deepFreeze({ ...partial, checksum });

        await this.storage.saveScheduleEntry(updated);
        const histPartial: Omit<ScheduleHistoryEntry, 'checksum'> = {
            history_id: `HIST-${Date.now()}`,
            schedule_id: current.schedule_id,
            version_number: nextVersion,
            previous_snapshot: current,
            new_snapshot: updated,
            revision_reason: params.reason || `STATUS_TRANSITION_TO_${params.target_status}`,
            actor_id: params.actor_id,
            created_at: now
        };
        const histChecksum = this.validator.computeHistoryChecksum(histPartial);
        await this.storage.saveScheduleHistory(deepFreeze({ ...histPartial, checksum: histChecksum }));

        const eventMap: Record<ScheduleStatus, ScheduleAuditEventType> = {
            DRAFT: 'SCHEDULE_UPDATED',
            SCHEDULED: 'SCHEDULE_SCHEDULED',
            ACTIVE: 'SCHEDULE_ACTIVATED',
            CLOSED: 'SCHEDULE_CLOSED',
            ARCHIVED: 'SCHEDULE_ARCHIVED'
        };

        await this.recordAudit(current.institution_id, params.actor_id, eventMap[params.target_status], current.schedule_id, nextVersion, { reason: params.reason });

        return updated;
    }

    async scheduleEntry(params: { schedule_id: string; actor_id: string; actor_role: UserRole; reason?: string; }): Promise<ScheduleEntry> {
        return this.transitionScheduleStatus({ ...params, target_status: 'SCHEDULED' });
    }

    async activateSchedule(params: { schedule_id: string; actor_id: string; actor_role: UserRole; reason?: string; }): Promise<ScheduleEntry> {
        return this.transitionScheduleStatus({ ...params, target_status: 'ACTIVE' });
    }

    async closeSchedule(params: { schedule_id: string; actor_id: string; actor_role: UserRole; reason?: string; }): Promise<ScheduleEntry> {
        return this.transitionScheduleStatus({ ...params, target_status: 'CLOSED' });
    }

    async archiveSchedule(params: { schedule_id: string; actor_id: string; actor_role: UserRole; reason?: string; }): Promise<ScheduleEntry> {
        return this.transitionScheduleStatus({ ...params, target_status: 'ARCHIVED' });
    }

    // ==========================================
    // 6. REVISION & VERSIONING
    // ==========================================
    async reviseSchedule(params: {
        schedule_id: string;
        time_slot_id?: string;
        room_id?: string;
        teacher_id?: string;
        effective_from?: string;
        effective_until?: string;
        revision_reason: string;
        actor_id: string;
        actor_role: UserRole;
    }): Promise<ScheduleEntry> {
        this.validator.detectSecurityLeakage(params);
        this.validator.validateRevisionReason(params.revision_reason);

        const current = await this.repo.getScheduleEntry(params.schedule_id);
        if (!current) {
            throw new Error(`SCHEDULE_NOT_FOUND: Schedule ${params.schedule_id} not found`);
        }

        if (current.status === 'ARCHIVED') {
            throw new Error(`TERMINAL_SCHEDULE_CANNOT_TRANSITION: Cannot revise ARCHIVED schedule`);
        }

        // Scope check
        if (params.actor_role === 'TEACHER') {
            if (params.actor_id !== current.teacher_id) {
                throw new Error(`UNAUTHORIZED_TEACHER_SCHEDULE_SCOPE: Teacher ${params.actor_id} cannot revise schedule of teacher ${current.teacher_id}`);
            }
        } else if (params.actor_role !== 'ADMIN' && params.actor_role !== 'HEADMASTER') {
            throw new Error(`UNAUTHORIZED_ADMIN_SCOPE: Role ${params.actor_role} cannot revise schedule`);
        }

        const newSlotId = params.time_slot_id || current.time_slot_id;
        const newRoomId = params.room_id || current.room_id;
        const newTeacherId = params.teacher_id || current.teacher_id;
        const newFrom = params.effective_from || current.effective_from;
        const newUntil = params.effective_until || current.effective_until;

        // Verify slot if changed
        if (params.time_slot_id) {
            const slot = await this.repo.getTimeSlot(params.time_slot_id);
            if (!slot || slot.status !== 'ACTIVE' || slot.institution_id !== current.institution_id) {
                throw new Error(`INVALID_TIME_SLOT: TimeSlot ${params.time_slot_id} invalid or not ACTIVE`);
            }
        }

        // Verify room if changed
        if (params.room_id) {
            const room = await this.repo.getLearningRoom(params.room_id);
            if (!room || room.status !== 'ACTIVE' || room.institution_id !== current.institution_id) {
                throw new Error(`ROOM_NOT_ACTIVE: Room ${params.room_id} invalid or not ACTIVE`);
            }
        }

        // Re-check conflicts against other schedules
        const existingSchedules = await this.repo.listScheduleEntries(current.institution_id, {
            semester_id: current.semester_id
        });

        for (const existing of existingSchedules) {
            if (existing.schedule_id === current.schedule_id) continue;
            if (existing.status === 'ARCHIVED' || existing.status === 'CLOSED') continue;
            if (existing.time_slot_id !== newSlotId) continue;

            const overlap = (newFrom <= existing.effective_until) && (newUntil >= existing.effective_from);
            if (!overlap) continue;

            if (existing.teacher_id === newTeacherId) {
                throw new Error(`TEACHER_SCHEDULE_CONFLICT: Teacher ${newTeacherId} already scheduled in time slot ${newSlotId}`);
            }
            if (existing.class_id === current.class_id) {
                throw new Error(`CLASS_SCHEDULE_CONFLICT: Class ${current.class_id} already scheduled in time slot ${newSlotId}`);
            }
            if (existing.room_id === newRoomId) {
                throw new Error(`ROOM_SCHEDULE_CONFLICT: Room ${newRoomId} already occupied in time slot ${newSlotId}`);
            }
        }

        const now = new Date().toISOString();
        const nextVersion = current.version_number + 1;

        const partial: Omit<ScheduleEntry, 'checksum'> = {
            ...current,
            time_slot_id: newSlotId,
            room_id: newRoomId,
            teacher_id: newTeacherId,
            effective_from: newFrom,
            effective_until: newUntil,
            version_number: nextVersion,
            updated_at: now
        };

        const checksum = this.validator.computeScheduleChecksum(partial);
        const updated: ScheduleEntry = deepFreeze({ ...partial, checksum });

        await this.storage.saveScheduleEntry(updated);
        const histPartial: Omit<ScheduleHistoryEntry, 'checksum'> = {
            history_id: `HIST-${Date.now()}`,
            schedule_id: current.schedule_id,
            version_number: nextVersion,
            previous_snapshot: current,
            new_snapshot: updated,
            revision_reason: params.revision_reason,
            actor_id: params.actor_id,
            created_at: now
        };
        const histChecksum = this.validator.computeHistoryChecksum(histPartial);
        await this.storage.saveScheduleHistory(deepFreeze({ ...histPartial, checksum: histChecksum }));

        await this.recordAudit(current.institution_id, params.actor_id, 'SCHEDULE_REVISED', current.schedule_id, nextVersion, { reason: params.revision_reason });

        return updated;
    }

    // ==========================================
    // 7. TIMETABLE PROJECTIONS
    // ==========================================
    async getStudentTimetable(params: {
        student_id: string;
        institution_id: string;
        semester_id: string;
        caller_id: string;
        caller_role: UserRole;
    }): Promise<StudentTimetableEntry[]> {
        this.validator.detectSecurityLeakage(params);

        if (params.caller_role === 'STUDENT') {
            if (params.caller_id !== params.student_id) {
                throw new Error(`UNAUTHORIZED_STUDENT_SCHEDULE_SCOPE: Student ${params.caller_id} cannot view timetable of student ${params.student_id}`);
            }
        }

        // Retrieve enrollments for student
        const enrollments = await this.enrollmentStore.listEnrollmentsByStudent(params.student_id);
        const activeCourseIds = new Set<string>();
        const activeClassIds = new Set<string>();

        for (const enr of enrollments) {
            if (enr.enrollment_status === 'ACTIVE') {
                activeCourseIds.add(enr.course_id);
                if (enr.class_id) activeClassIds.add(enr.class_id);
            }
        }

        // Also check student placement in class from Phase 40
        const placementList = await this.schoolRepo.listPlacementsByStudent(params.student_id);
        const placed = placementList.find(p => p.status === 'PLACED');
        if (placed) {
            activeClassIds.add(placed.class_id);
        }

        const allSchedules = await this.repo.listScheduleEntries(params.institution_id, {
            semester_id: params.semester_id
        });

        const timeSlots = await this.repo.listTimeSlots(params.institution_id);
        const slotMap = new Map<string, TimeSlot>();
        for (const slot of timeSlots) {
            slotMap.set(slot.time_slot_id, slot);
        }

        const filtered = allSchedules.filter(s => {
            if (s.status === 'ARCHIVED' || s.status === 'CLOSED') return false;
            // Matches enrolled class or course
            return activeClassIds.has(s.class_id) || activeCourseIds.has(s.course_id);
        });

        const entries: StudentTimetableEntry[] = filtered.map(s => {
            const slot = slotMap.get(s.time_slot_id);
            return {
                student_id: params.student_id,
                schedule_id: s.schedule_id,
                course_id: s.course_id,
                class_id: s.class_id,
                teacher_id: s.teacher_id,
                time_slot_id: s.time_slot_id,
                room_id: s.room_id,
                day_of_week: slot?.day_of_week,
                start_time: slot?.start_time,
                end_time: slot?.end_time,
                sequence: slot?.sequence,
                status: s.status
            };
        });

        // Deterministic sort: day_of_week -> sequence -> start_time -> course_id -> schedule_id
        entries.sort((a, b) => {
            const dayA = a.day_of_week ? DAY_ORDER[a.day_of_week] : 99;
            const dayB = b.day_of_week ? DAY_ORDER[b.day_of_week] : 99;
            if (dayA !== dayB) return dayA - dayB;

            const seqA = a.sequence || 0;
            const seqB = b.sequence || 0;
            if (seqA !== seqB) return seqA - seqB;

            const startA = a.start_time || '';
            const startB = b.start_time || '';
            if (startA !== startB) return startA.localeCompare(startB);

            if (a.course_id !== b.course_id) return a.course_id.localeCompare(b.course_id);
            return a.schedule_id.localeCompare(b.schedule_id);
        });

        await this.recordAudit(params.institution_id, params.caller_id, 'TIMETABLE_VIEWED', params.student_id, 1, { target: 'STUDENT_TIMETABLE' });

        return deepFreeze(entries);
    }

    async getTeacherTimetable(params: {
        teacher_id: string;
        institution_id: string;
        semester_id: string;
        caller_id: string;
        caller_role: UserRole;
    }): Promise<TeacherTimetableEntry[]> {
        this.validator.detectSecurityLeakage(params);

        if (params.caller_role === 'TEACHER') {
            if (params.caller_id !== params.teacher_id) {
                throw new Error(`UNAUTHORIZED_TEACHER_SCHEDULE_SCOPE: Teacher ${params.caller_id} cannot view timetable of teacher ${params.teacher_id}`);
            }
        }

        const allSchedules = await this.repo.listScheduleEntries(params.institution_id, {
            semester_id: params.semester_id,
            teacher_id: params.teacher_id
        });

        const timeSlots = await this.repo.listTimeSlots(params.institution_id);
        const slotMap = new Map<string, TimeSlot>();
        for (const slot of timeSlots) {
            slotMap.set(slot.time_slot_id, slot);
        }

        const filtered = allSchedules.filter(s => s.status !== 'ARCHIVED' && s.status !== 'CLOSED');

        const entries: TeacherTimetableEntry[] = filtered.map(s => {
            const slot = slotMap.get(s.time_slot_id);
            return {
                teacher_id: params.teacher_id,
                schedule_id: s.schedule_id,
                course_id: s.course_id,
                class_id: s.class_id,
                time_slot_id: s.time_slot_id,
                room_id: s.room_id,
                day_of_week: slot?.day_of_week,
                start_time: slot?.start_time,
                end_time: slot?.end_time,
                sequence: slot?.sequence,
                status: s.status
            };
        });

        // Deterministic sort: day_of_week -> sequence -> start_time -> course_id -> schedule_id
        entries.sort((a, b) => {
            const dayA = a.day_of_week ? DAY_ORDER[a.day_of_week] : 99;
            const dayB = b.day_of_week ? DAY_ORDER[b.day_of_week] : 99;
            if (dayA !== dayB) return dayA - dayB;

            const seqA = a.sequence || 0;
            const seqB = b.sequence || 0;
            if (seqA !== seqB) return seqA - seqB;

            const startA = a.start_time || '';
            const startB = b.start_time || '';
            if (startA !== startB) return startA.localeCompare(startB);

            if (a.course_id !== b.course_id) return a.course_id.localeCompare(b.course_id);
            return a.schedule_id.localeCompare(b.schedule_id);
        });

        await this.recordAudit(params.institution_id, params.caller_id, 'TIMETABLE_VIEWED', params.teacher_id, 1, { target: 'TEACHER_TIMETABLE' });

        return deepFreeze(entries);
    }

    async getClassTimetable(params: {
        class_id: string;
        institution_id: string;
        semester_id: string;
        actor_id: string;
        actor_role: UserRole;
    }): Promise<ScheduleEntry[]> {
        this.validator.detectSecurityLeakage(params);

        const schoolClass = await this.schoolRepo.getClass(params.class_id);
        if (!schoolClass) {
            throw new Error(`INVALID_CLASS_STATE: Class ${params.class_id} not found`);
        }
        if (schoolClass.institution_id !== params.institution_id) {
            throw new Error(`CROSS_INSTITUTION_SCHEDULE_ACCESS_DENIED: Class ${params.class_id} belongs to institution ${schoolClass.institution_id}`);
        }

        const schedules = await this.repo.listScheduleEntries(params.institution_id, {
            semester_id: params.semester_id,
            class_id: params.class_id
        });

        const activeSchedules = schedules.filter(s => s.status !== 'ARCHIVED');

        // Deterministic sort
        activeSchedules.sort((a, b) => a.schedule_id.localeCompare(b.schedule_id));

        await this.recordAudit(params.institution_id, params.actor_id, 'TIMETABLE_VIEWED', params.class_id, 1, { target: 'CLASS_TIMETABLE' });

        return deepFreeze(activeSchedules);
    }

    async getRoomTimetable(params: {
        room_id: string;
        institution_id: string;
        semester_id: string;
        actor_id: string;
        actor_role: UserRole;
    }): Promise<ScheduleEntry[]> {
        this.validator.detectSecurityLeakage(params);

        const room = await this.repo.getLearningRoom(params.room_id);
        if (!room) {
            throw new Error(`INVALID_ROOM: Room ${params.room_id} not found`);
        }
        if (room.institution_id !== params.institution_id) {
            throw new Error(`CROSS_INSTITUTION_SCHEDULE_ACCESS_DENIED: Room ${params.room_id} belongs to institution ${room.institution_id}`);
        }
        if (room.status === 'ARCHIVED' || room.status === 'MAINTENANCE') {
            return [];
        }

        const schedules = await this.repo.listScheduleEntries(params.institution_id, {
            semester_id: params.semester_id,
            room_id: params.room_id
        });

        const activeSchedules = schedules.filter(s => s.status !== 'ARCHIVED' && s.status !== 'CLOSED');

        // Deterministic sort
        activeSchedules.sort((a, b) => a.schedule_id.localeCompare(b.schedule_id));

        await this.recordAudit(params.institution_id, params.actor_id, 'TIMETABLE_VIEWED', params.room_id, 1, { target: 'ROOM_TIMETABLE' });

        return deepFreeze(activeSchedules);
    }

    // ==========================================
    // 8. AUDIT & HISTORY ACCESS
    // ==========================================
    async getScheduleHistory(scheduleId: string): Promise<ScheduleHistoryEntry[]> {
        return this.repo.getScheduleHistory(scheduleId);
    }

    async getScheduleAudit(institutionId: string, entityId?: string): Promise<ScheduleAuditEvent[]> {
        return this.repo.listAuditEvents(institutionId, entityId);
    }
}

export const schedulingEngine = new SchedulingEngine();
