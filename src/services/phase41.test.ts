import { describe, it, expect, beforeEach } from 'vitest';
import { 
    TimeSlot, 
    LearningRoom, 
    ScheduleEntry, 
    Institution, 
    AcademicYear, 
    Semester, 
    CoursePeriod, 
    SchoolClass,
    StudentPlacement,
    ClassEnrollment,
    UserRole
} from '../types/curriculum';
import { 
    InMemorySchedulingStorageProvider, 
    SchedulingStorageProvider 
} from './schedulingStorageProvider';
import { 
    SchedulingValidationEngine, 
    schedulingValidationEngine 
} from './schedulingValidationEngine';
import { 
    SchedulingRepositoryEngine 
} from './schedulingRepositoryEngine';
import { 
    SchedulingEngine 
} from './schedulingEngine';
import { 
    TeacherWorkloadEngine 
} from './teacherWorkloadEngine';
import { 
    SchedulingAnalyticsEngine 
} from './schedulingAnalyticsEngine';
import { 
    InMemorySchoolAdministrationStorageProvider 
} from './schoolAdministrationStorageProvider';
import { 
    SchoolAdministrationValidationEngine 
} from './schoolAdministrationValidationEngine';
import { 
    SchoolAdministrationRepositoryEngine 
} from './schoolAdministrationRepositoryEngine';
import { 
    MemoryAcademicCalendarStorageProvider 
} from './academicCalendarStorageProvider';
import { 
    AcademicCalendarRepositoryEngine 
} from './academicCalendarRepositoryEngine';
import { 
    InMemoryClassEnrollmentStorage 
} from './classEnrollmentStorageProvider';
import { 
    authorizationEngine 
} from './authorizationEngine';

describe('EduTaktis LMS Phase 41: Academic Scheduling, Timetable & Teacher Workload Engine', () => {
    let storage: SchedulingStorageProvider;
    let validator: SchedulingValidationEngine;
    let repo: SchedulingRepositoryEngine;
    let engine: SchedulingEngine;
    let workloadEngine: TeacherWorkloadEngine;
    let analyticsEngine: SchedulingAnalyticsEngine;

    let schoolStorage: InMemorySchoolAdministrationStorageProvider;
    let schoolValidator: SchoolAdministrationValidationEngine;
    let schoolRepo: SchoolAdministrationRepositoryEngine;

    let calendarStorage: MemoryAcademicCalendarStorageProvider;
    let calendarRepo: AcademicCalendarRepositoryEngine;

    let enrollmentStorage: InMemoryClassEnrollmentStorage;

    const INST_ID = 'INST-TEST-1';
    const AY_ID = 'AY-2026';
    const SEM_ID = 'SEM-2026-1';
    const TEACHER_1 = 'TEA-MAT-01';
    const TEACHER_2 = 'TEA-ENG-02';
    const CLASS_1 = 'CLS-10-IPA-1';
    const CLASS_2 = 'CLS-10-IPA-2';
    const COURSE_1 = 'MAT-WAJIB-10';
    const COURSE_2 = 'ENG-WAJIB-10';
    const PERIOD_1 = 'CP-MAT-01';
    const PERIOD_2 = 'CP-ENG-02';

    beforeEach(async () => {
        storage = new InMemorySchedulingStorageProvider();
        validator = new SchedulingValidationEngine();
        repo = new SchedulingRepositoryEngine(storage, validator);
        workloadEngine = new TeacherWorkloadEngine(validator);

        schoolStorage = new InMemorySchoolAdministrationStorageProvider();
        schoolValidator = new SchoolAdministrationValidationEngine();
        schoolRepo = new SchoolAdministrationRepositoryEngine(schoolStorage, schoolValidator);

        calendarStorage = new MemoryAcademicCalendarStorageProvider();
        calendarRepo = new AcademicCalendarRepositoryEngine(calendarStorage);

        enrollmentStorage = new InMemoryClassEnrollmentStorage();

        engine = new SchedulingEngine(
            storage,
            repo,
            validator,
            schoolRepo,
            calendarRepo,
            enrollmentStorage,
            authorizationEngine
        );

        analyticsEngine = new SchedulingAnalyticsEngine(repo, engine, workloadEngine, validator);

        // Seed School Administration (Phase 40)
        const instPartial = {
            institution_id: INST_ID,
            institution_code: 'SMAT-01',
            institution_name: 'SMA EduTaktis',
            institution_type: 'SENIOR_HIGH' as const,
            legal_name: 'Yayasan EduTaktis',
            address: { street: 'Jl. Pendidikan 1', city: 'Jakarta', country: 'Indonesia' },
            contact_information: { email: 'admin@edutaktis.sch.id', phone: '021-123456' },
            timezone: 'Asia/Jakarta',
            locale: 'id-ID',
            status: 'ACTIVE' as const,
            version_number: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        const instChk = schoolValidator.computeInstitutionChecksum(instPartial);
        await schoolStorage.saveInstitution({ ...instPartial, checksum: instChk });

        const cls1Partial = {
            class_id: CLASS_1,
            institution_id: INST_ID,
            academic_year_id: AY_ID,
            semester_id: SEM_ID,
            class_code: '10-IPA-1',
            class_name: 'X IPA 1',
            grade_level: 10,
            homeroom_teacher_id: TEACHER_1,
            status: 'ACTIVE' as const,
            capacity: 32,
            version_number: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        const cls1Chk = schoolValidator.computeClassChecksum(cls1Partial);
        await schoolStorage.saveClass({ ...cls1Partial, checksum: cls1Chk });

        const cls2Partial = {
            class_id: CLASS_2,
            institution_id: INST_ID,
            academic_year_id: AY_ID,
            semester_id: SEM_ID,
            class_code: '10-IPA-2',
            class_name: 'X IPA 2',
            grade_level: 10,
            homeroom_teacher_id: TEACHER_2,
            status: 'ACTIVE' as const,
            capacity: 32,
            version_number: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        const cls2Chk = schoolValidator.computeClassChecksum(cls2Partial);
        await schoolStorage.saveClass({ ...cls2Partial, checksum: cls2Chk });

        // Seed Academic Year & Semester (Phase 32)
        await calendarStorage.saveAcademicYear({
            academic_year_id: AY_ID,
            code: '2026/2027',
            label: 'Tahun Ajaran 2026/2027',
            start_at: '2026-07-01T00:00:00.000Z',
            end_at: '2027-06-30T23:59:59.000Z',
            status: 'ACTIVE',
            version_number: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            checksum: 'AY-CHK-01'
        });

        await calendarStorage.saveSemester({
            semester_id: SEM_ID,
            academic_year_id: AY_ID,
            code: '2026-1',
            label: 'Semester Ganjil 2026',
            sequence: 1,
            start_at: '2026-07-15T00:00:00.000Z',
            end_at: '2026-12-20T23:59:59.000Z',
            status: 'ACTIVE',
            version_number: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            checksum: 'SEM-CHK-01'
        });

        // Seed CoursePeriods (Phase 32)
        await calendarStorage.saveCoursePeriod({
            course_period_id: PERIOD_1,
            course_id: COURSE_1,
            academic_year_id: AY_ID,
            semester_id: SEM_ID,
            teacher_id: TEACHER_1,
            start_at: '2026-07-15T00:00:00.000Z',
            end_at: '2026-12-20T23:59:59.000Z',
            status: 'ACTIVE',
            version_number: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            checksum: 'CP-CHK-01'
        });

        await calendarStorage.saveCoursePeriod({
            course_period_id: PERIOD_2,
            course_id: COURSE_2,
            academic_year_id: AY_ID,
            semester_id: SEM_ID,
            teacher_id: TEACHER_2,
            start_at: '2026-07-15T00:00:00.000Z',
            end_at: '2026-12-20T23:59:59.000Z',
            status: 'ACTIVE',
            version_number: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            checksum: 'CP-CHK-02'
        });
    });

    // ==========================================
    // 1. TIME SLOT TESTS (TEST-4301 - TEST-4315)
    // ==========================================
    describe('1. Time Slot Management & Invariants', () => {
        it('TEST-4301: Successfully creates a valid time slot', async () => {
            const slot = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '07:30',
                end_time: '08:15',
                sequence: 1,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            expect(slot.time_slot_id).toBeDefined();
            expect(slot.status).toBe('ACTIVE');
            expect(slot.sequence).toBe(1);
            expect(slot.checksum.startsWith('TS-CHK-')).toBe(true);
            expect(Object.isFrozen(slot)).toBe(true);
        });

        it('TEST-4302: Rejects time slot creation by unauthorized non-admin actor', async () => {
            await expect(engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '07:30',
                end_time: '08:15',
                sequence: 1,
                actor_id: 'STU-01',
                actor_role: 'STUDENT'
            })).rejects.toThrow(/UNAUTHORIZED_ADMIN_SCOPE/);
        });

        it('TEST-4303: Rejects time slot with start_time >= end_time', async () => {
            await expect(engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '09:00',
                end_time: '08:00',
                sequence: 1,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_TIME_RANGE/);
        });

        it('TEST-4304: Rejects time slot with equal start_time and end_time', async () => {
            await expect(engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '08:00',
                end_time: '08:00',
                sequence: 1,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_TIME_RANGE/);
        });

        it('TEST-4305: Rejects time slot with invalid time format string', async () => {
            await expect(engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: 'invalid',
                end_time: '08:15',
                sequence: 1,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_TIME_RANGE/);
        });

        it('TEST-4306: Rejects time slot with non-positive sequence', async () => {
            await expect(engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '07:30',
                end_time: '08:15',
                sequence: 0,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_TIME_SLOT/);
        });

        it('TEST-4307: Rejects duplicate sequence on the same day within institution', async () => {
            await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '07:30',
                end_time: '08:15',
                sequence: 1,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            await expect(engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '08:15',
                end_time: '09:00',
                sequence: 1,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/DUPLICATE_TIME_SLOT/);
        });

        it('TEST-4308: Allows same sequence on different days within institution', async () => {
            const slotMon = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '07:30',
                end_time: '08:15',
                sequence: 1,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const slotTue = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'TUESDAY',
                start_time: '07:30',
                end_time: '08:15',
                sequence: 1,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            expect(slotMon.sequence).toBe(slotTue.sequence);
            expect(slotMon.day_of_week).not.toBe(slotTue.day_of_week);
        });

        it('TEST-4309: Detects and rejects overlapping time slots on same day and institution', async () => {
            await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'WEDNESDAY',
                start_time: '08:00',
                end_time: '09:30',
                sequence: 1,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            await expect(engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'WEDNESDAY',
                start_time: '09:00',
                end_time: '10:00',
                sequence: 2,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/TIME_SLOT_OVERLAP/);
        });

        it('TEST-4310: Allows non-overlapping adjacent time slots on same day', async () => {
            const slot1 = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'THURSDAY',
                start_time: '07:30',
                end_time: '08:15',
                sequence: 1,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const slot2 = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'THURSDAY',
                start_time: '08:15',
                end_time: '09:00',
                sequence: 2,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            expect(slot1).toBeDefined();
            expect(slot2).toBeDefined();
        });

        it('TEST-4311: Successfully updates time slot with valid range', async () => {
            const slot = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'FRIDAY',
                start_time: '07:30',
                end_time: '08:15',
                sequence: 1,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const updated = await engine.updateTimeSlot({
                time_slot_id: slot.time_slot_id,
                end_time: '08:20',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN',
                reason: 'Perpanjangan sesi pagi'
            });

            expect(updated.version_number).toBe(2);
            expect(updated.end_time).toBe('08:20');
            expect(updated.checksum).not.toBe(slot.checksum);
        });

        it('TEST-4312: Rejects updating an ARCHIVED time slot', async () => {
            const slot = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'FRIDAY',
                start_time: '08:30',
                end_time: '09:15',
                sequence: 2,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            // Archive the slot
            await engine.updateTimeSlot({
                time_slot_id: slot.time_slot_id,
                status: 'ARCHIVED',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            await expect(engine.updateTimeSlot({
                time_slot_id: slot.time_slot_id,
                end_time: '09:30',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_TIME_SLOT/);
        });

        it('TEST-4313: TimeSlot checksum tampering is authoritatively rejected', async () => {
            const slot = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'SATURDAY',
                start_time: '08:00',
                end_time: '09:00',
                sequence: 1,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            // Tamper in storage
            const corrupted: TimeSlot = { ...slot, start_time: '07:00' };
            await storage.saveTimeSlot(corrupted);

            await expect(repo.getTimeSlot(slot.time_slot_id))
                .rejects.toThrow(/TIME_SLOT_CHECKSUM_MISMATCH/);
        });

        it('TEST-4314: listTimeSlots verifies checksums for all entries', async () => {
            const slot = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '10:00',
                end_time: '11:00',
                sequence: 3,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            // Tamper
            const corrupted = { ...slot, sequence: 99 };
            await storage.saveTimeSlot(corrupted);

            await expect(repo.listTimeSlots(INST_ID))
                .rejects.toThrow(/TIME_SLOT_CHECKSUM_MISMATCH/);
        });

        it('TEST-4315: TimeSlot object returned from engine is deeply frozen', async () => {
            const slot = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'TUESDAY',
                start_time: '10:00',
                end_time: '11:00',
                sequence: 3,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            expect(Object.isFrozen(slot)).toBe(true);
            expect(() => { (slot as any).sequence = 99; }).toThrow();
        });
    });

    // ==========================================
    // 2. LEARNING ROOM TESTS (TEST-4316 - TEST-4330)
    // ==========================================
    describe('2. Learning Room Management & Invariants', () => {
        it('TEST-4316: Successfully creates a valid learning room', async () => {
            const room = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-101',
                name: 'Ruang Teori 101',
                capacity: 36,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            expect(room.room_id).toBeDefined();
            expect(room.status).toBe('ACTIVE');
            expect(room.checksum.startsWith('ROOM-CHK-')).toBe(true);
            expect(Object.isFrozen(room)).toBe(true);
        });

        it('TEST-4317: Rejects learning room creation by unauthorized actor', async () => {
            await expect(engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-102',
                name: 'Ruang 102',
                capacity: 30,
                room_type: 'CLASSROOM',
                actor_id: 'TEA-01',
                actor_role: 'TEACHER'
            })).rejects.toThrow(/UNAUTHORIZED_ADMIN_SCOPE/);
        });

        it('TEST-4318: Rejects duplicate room code within same institution', async () => {
            await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'LAB-IPA',
                name: 'Lab IPA Dasar',
                capacity: 30,
                room_type: 'LABORATORY',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            await expect(engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'LAB-IPA',
                name: 'Lab IPA Lanjutan',
                capacity: 30,
                room_type: 'LABORATORY',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/DUPLICATE_ROOM_CODE/);
        });

        it('TEST-4319: Rejects duplicate room code with case-insensitive collision', async () => {
            await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'r-201',
                name: 'Ruang 201',
                capacity: 30,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            await expect(engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-201',
                name: 'Ruang 201 Duplikat',
                capacity: 30,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/DUPLICATE_ROOM_CODE/);
        });

        it('TEST-4320: Rejects non-positive room capacity', async () => {
            await expect(engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-ZERO',
                name: 'Ruang Nol',
                capacity: 0,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/ROOM_CAPACITY_EXCEEDED/);
        });

        it('TEST-4321: Rejects negative room capacity', async () => {
            await expect(engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-NEG',
                name: 'Ruang Negatif',
                capacity: -10,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/ROOM_CAPACITY_EXCEEDED/);
        });

        it('TEST-4322: Rejects empty room code or empty room name', async () => {
            await expect(engine.createLearningRoom({
                institution_id: INST_ID,
                code: '',
                name: 'Ruang Tanpa Kode',
                capacity: 30,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_ROOM/);
        });

        it('TEST-4323: Successfully updates room capacity and status', async () => {
            const room = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-UP',
                name: 'Ruang Update',
                capacity: 25,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const updated = await engine.updateLearningRoom({
                room_id: room.room_id,
                capacity: 35,
                status: 'MAINTENANCE',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN',
                reason: 'Renovasi meja dan penambahan kursi'
            });

            expect(updated.version_number).toBe(2);
            expect(updated.capacity).toBe(35);
            expect(updated.status).toBe('MAINTENANCE');
        });

        it('TEST-4324: Rejects updating an ARCHIVED learning room', async () => {
            const room = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-ARCH',
                name: 'Ruang Arsip',
                capacity: 25,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            await engine.updateLearningRoom({
                room_id: room.room_id,
                status: 'ARCHIVED',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            await expect(engine.updateLearningRoom({
                room_id: room.room_id,
                capacity: 40,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_ROOM/);
        });

        it('TEST-4325: LearningRoom checksum tampering is authoritatively rejected', async () => {
            const room = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-TAMPER',
                name: 'Ruang Tamper',
                capacity: 30,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            // Corrupt capacity in storage
            const corrupted: LearningRoom = { ...room, capacity: 999 };
            await storage.saveLearningRoom(corrupted);

            await expect(repo.getLearningRoom(room.room_id))
                .rejects.toThrow(/ROOM_CHECKSUM_MISMATCH/);
        });

        it('TEST-4326: listLearningRooms verifies checksum for each room', async () => {
            const room = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-LST',
                name: 'Ruang List',
                capacity: 30,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const corrupted: LearningRoom = { ...room, name: 'Nama Dimanipulasi' };
            await storage.saveLearningRoom(corrupted);

            await expect(repo.listLearningRooms(INST_ID))
                .rejects.toThrow(/ROOM_CHECKSUM_MISMATCH/);
        });

        it('TEST-4327: LearningRoom object is deeply frozen', async () => {
            const room = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-FRZ',
                name: 'Ruang Freeze',
                capacity: 30,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            expect(Object.isFrozen(room)).toBe(true);
            expect(() => { (room as any).capacity = 100; }).toThrow();
        });

        it('TEST-4328: Headmaster can create learning room in their institution', async () => {
            const room = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-HM',
                name: 'Ruang Dibuat Kepsek',
                capacity: 20,
                room_type: 'CLASSROOM',
                actor_id: 'USR-HM-01',
                actor_role: 'HEADMASTER'
            });

            expect(room.room_id).toBeDefined();
            expect(room.name).toBe('Ruang Dibuat Kepsek');
        });

        it('TEST-4329: Empty institution_id is rejected for learning room', async () => {
            await expect(engine.createLearningRoom({
                institution_id: '',
                code: 'R-EMPTY',
                name: 'Ruang Tanpa Institusi',
                capacity: 20,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_ROOM/);
        });

        it('TEST-4330: Room timetable returns empty for ARCHIVED room', async () => {
            const room = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-OFF',
                name: 'Ruang Nonaktif',
                capacity: 20,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            await engine.updateLearningRoom({
                room_id: room.room_id,
                status: 'ARCHIVED',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const tt = await engine.getRoomTimetable({
                room_id: room.room_id,
                institution_id: INST_ID,
                semester_id: SEM_ID,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            expect(tt).toEqual([]);
        });
    });

    // ==========================================
    // 3. SCHEDULE CREATION & PRECONDITIONS (TEST-4331 - TEST-4350)
    // ==========================================
    describe('3. Schedule Creation & Preconditions', () => {
        let slot1: TimeSlot;
        let room1: LearningRoom;

        beforeEach(async () => {
            slot1 = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '07:30',
                end_time: '08:15',
                sequence: 1,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            room1 = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-101',
                name: 'Ruang 101',
                capacity: 36,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });
        });

        it('TEST-4331: Creates schedule in status DRAFT when all preconditions are satisfied', async () => {
            const sched = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            expect(sched.schedule_id).toBeDefined();
            expect(sched.status).toBe('DRAFT');
            expect(sched.version_number).toBe(1);
            expect(sched.checksum.startsWith('SCH-CHK-')).toBe(true);
            expect(Object.isFrozen(sched)).toBe(true);
        });

        it('TEST-4332: Teacher can create schedule for their own course period', async () => {
            const sched = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: TEACHER_1,
                actor_role: 'TEACHER'
            });

            expect(sched.teacher_id).toBe(TEACHER_1);
        });

        it('TEST-4333: Teacher cannot create schedule for another teacher', async () => {
            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_2,
                course_id: COURSE_2,
                class_id: CLASS_2,
                teacher_id: TEACHER_2,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: TEACHER_1,
                actor_role: 'TEACHER'
            })).rejects.toThrow(/UNAUTHORIZED_TEACHER_SCHEDULE_SCOPE/);
        });

        it('TEST-4334: Student cannot create schedule', async () => {
            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'STU-01',
                actor_role: 'STUDENT'
            })).rejects.toThrow(/UNAUTHORIZED_ADMIN_SCOPE/);
        });

        it('TEST-4335: Rejects schedule for nonexistent institution', async () => {
            await expect(engine.createSchedule({
                institution_id: 'INST-UNKNOWN',
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_INSTITUTION_STATE/);
        });

        it('TEST-4336: Rejects schedule when institution is not ACTIVE', async () => {
            const instInactive = {
                institution_id: 'INST-DRAFT-X',
                institution_code: 'INACT',
                institution_name: 'SMA Draft',
                institution_type: 'SENIOR_HIGH' as const,
                legal_name: 'Yayasan Draft',
                address: { street: 'Jl. D', city: 'J', country: 'ID' },
                contact_information: { email: 'd@s.id', phone: '021' },
                timezone: 'Asia/Jakarta',
                locale: 'id-ID',
                status: 'DRAFT' as const,
                version_number: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            await schoolStorage.saveInstitution({
                ...instInactive,
                checksum: schoolValidator.computeInstitutionChecksum(instInactive)
            });

            await expect(engine.createSchedule({
                institution_id: 'INST-DRAFT-X',
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_INSTITUTION_STATE/);
        });

        it('TEST-4337: Rejects schedule when academic year is not ACTIVE', async () => {
            await calendarStorage.saveAcademicYear({
                academic_year_id: 'AY-CLOSED',
                code: '2025/2026',
                label: 'Tahun Lalu',
                start_at: '2025-07-01T00:00:00.000Z',
                end_at: '2026-06-30T23:59:59.000Z',
                status: 'CLOSED',
                version_number: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                checksum: 'AY-CHK-CLOSED'
            });

            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: 'AY-CLOSED',
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_ACADEMIC_YEAR_STATE/);
        });

        it('TEST-4338: Rejects schedule when semester is not ACTIVE', async () => {
            await calendarStorage.saveSemester({
                semester_id: 'SEM-CLOSED',
                academic_year_id: AY_ID,
                code: '2026-CLOSED',
                label: 'Semester Tertutup',
                sequence: 2,
                start_at: '2027-01-01T00:00:00.000Z',
                end_at: '2027-06-30T23:59:59.000Z',
                status: 'CLOSED',
                version_number: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                checksum: 'SEM-CHK-CLOSED'
            });

            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: 'SEM-CLOSED',
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_SEMESTER_STATE/);
        });

        it('TEST-4339: Rejects schedule with effective dates outside semester range', async () => {
            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-06-01T00:00:00.000Z', // Before semester start (July 15)
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/SEMESTER_SCHEDULE_CONFLICT/);
        });

        it('TEST-4340: Rejects schedule when course period is ARCHIVED', async () => {
            await calendarStorage.saveCoursePeriod({
                course_period_id: 'CP-ARCH',
                course_id: COURSE_1,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                teacher_id: TEACHER_1,
                start_at: '2026-07-15T00:00:00.000Z',
                end_at: '2026-12-20T23:59:59.000Z',
                status: 'ARCHIVED',
                version_number: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                checksum: 'CP-CHK-ARCH'
            });

            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: 'CP-ARCH',
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_COURSE_PERIOD_STATE/);
        });

        it('TEST-4341: Rejects schedule when teacher is not authorized for course period', async () => {
            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1, // Belongs to TEACHER_1
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_2,      // Mismatched teacher
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/UNAUTHORIZED_TEACHER_SCHEDULE_SCOPE/);
        });

        it('TEST-4342: Rejects schedule when course period course does not match parameter', async () => {
            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1, // COURSE_1
                course_id: COURSE_2,        // Mismatch
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/COURSE_PERIOD_SCHEDULE_CONFLICT/);
        });

        it('TEST-4343: Rejects schedule when class belongs to different institution', async () => {
            const clsOther = {
                class_id: 'CLS-OTHER',
                institution_id: 'INST-OTHER',
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                class_code: '10-OTH',
                class_name: 'X Lain',
                grade_level: 10,
                homeroom_teacher_id: TEACHER_1,
                status: 'ACTIVE' as const,
                capacity: 30,
                version_number: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            await schoolStorage.saveClass({
                ...clsOther,
                checksum: schoolValidator.computeClassChecksum(clsOther)
            });

            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: 'CLS-OTHER',
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/CROSS_INSTITUTION_SCHEDULE_ACCESS_DENIED/);
        });

        it('TEST-4344: Rejects schedule when class is not ACTIVE', async () => {
            const clsClosed = {
                class_id: 'CLS-CLOSED',
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                class_code: '10-CLS',
                class_name: 'X Tutup',
                grade_level: 10,
                homeroom_teacher_id: TEACHER_1,
                status: 'CLOSED' as const,
                capacity: 30,
                version_number: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            await schoolStorage.saveClass({
                ...clsClosed,
                checksum: schoolValidator.computeClassChecksum(clsClosed)
            });

            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: 'CLS-CLOSED',
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_CLASS_STATE/);
        });

        it('TEST-4345: Rejects schedule when time slot belongs to different institution', async () => {
            const slotOther = await engine.createTimeSlot({
                institution_id: 'INST-OTHER-9',
                day_of_week: 'MONDAY',
                start_time: '07:30',
                end_time: '08:15',
                sequence: 1,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slotOther.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/CROSS_INSTITUTION_SCHEDULE_ACCESS_DENIED/);
        });

        it('TEST-4346: Rejects schedule when time slot is INACTIVE', async () => {
            await engine.updateTimeSlot({
                time_slot_id: slot1.time_slot_id,
                status: 'INACTIVE',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_TIME_SLOT/);
        });

        it('TEST-4347: Rejects schedule when room belongs to different institution', async () => {
            const roomOther = await engine.createLearningRoom({
                institution_id: 'INST-OTHER-9',
                code: 'R-OTHER',
                name: 'Ruang Lain',
                capacity: 30,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: roomOther.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/CROSS_INSTITUTION_SCHEDULE_ACCESS_DENIED/);
        });

        it('TEST-4348: Rejects schedule when room is not ACTIVE', async () => {
            await engine.updateLearningRoom({
                room_id: room1.room_id,
                status: 'MAINTENANCE',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/ROOM_NOT_ACTIVE/);
        });

        it('TEST-4349: Schedule creation creates initial history snapshot version 1', async () => {
            const sched = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const history = await engine.getScheduleHistory(sched.schedule_id);
            expect(history.length).toBe(1);
            expect(history[0].version_number).toBe(1);
            expect(history[0].revision_reason).toBe('INITIAL_CREATION');
            expect(history[0].checksum.startsWith('HIST-SCH-CHK-')).toBe(true);
        });

        it('TEST-4350: Schedule creation records audit event SCHEDULE_CREATED', async () => {
            const sched = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const audits = await engine.getScheduleAudit(INST_ID, sched.schedule_id);
            expect(audits.some(a => a.event_type === 'SCHEDULE_CREATED')).toBe(true);
        });
    });

    // ==========================================
    // 4. CONFLICT DETECTION TESTS (TEST-4351 - TEST-4365)
    // ==========================================
    describe('4. Zero-Trust Schedule Conflict Detection', () => {
        let slot1: TimeSlot;
        let slot2: TimeSlot;
        let room1: LearningRoom;
        let room2: LearningRoom;

        beforeEach(async () => {
            slot1 = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '07:30',
                end_time: '08:15',
                sequence: 1,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            slot2 = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '08:15',
                end_time: '09:00',
                sequence: 2,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            room1 = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-101',
                name: 'Ruang 101',
                capacity: 36,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            room2 = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-102',
                name: 'Ruang 102',
                capacity: 36,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });
        });

        it('TEST-4351: Detects and rejects TEACHER conflict on simultaneous classes', async () => {
            // First schedule: TEACHER_1 in CLASS_1, slot1, room1
            const s1 = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });
            await engine.scheduleEntry({ schedule_id: s1.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            await engine.activateSchedule({ schedule_id: s1.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });

            // Attempt second schedule: SAME TEACHER_1 in CLASS_2, slot1, room2
            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_2,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room2.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/TEACHER_SCHEDULE_CONFLICT/);
        });

        it('TEST-4352: Detects and rejects CLASS conflict on simultaneous courses', async () => {
            // First schedule: CLASS_1 attending COURSE_1 with TEACHER_1 in slot1, room1
            const s1 = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });
            await engine.scheduleEntry({ schedule_id: s1.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            await engine.activateSchedule({ schedule_id: s1.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });

            // Attempt second schedule: SAME CLASS_1 attending COURSE_2 with TEACHER_2 in slot1, room2
            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_2,
                course_id: COURSE_2,
                class_id: CLASS_1,
                teacher_id: TEACHER_2,
                time_slot_id: slot1.time_slot_id,
                room_id: room2.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/CLASS_SCHEDULE_CONFLICT/);
        });

        it('TEST-4353: Detects and rejects ROOM conflict on double booking', async () => {
            // First schedule: room1 booked for CLASS_1 in slot1
            const s1 = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });
            await engine.scheduleEntry({ schedule_id: s1.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            await engine.activateSchedule({ schedule_id: s1.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });

            // Attempt second schedule: SAME room1 booked for CLASS_2 with TEACHER_2 in slot1
            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_2,
                course_id: COURSE_2,
                class_id: CLASS_2,
                teacher_id: TEACHER_2,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/ROOM_SCHEDULE_CONFLICT/);
        });

        it('TEST-4354: Allows different teachers, classes, and rooms in same time slot', async () => {
            const s1 = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const s2 = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_2,
                course_id: COURSE_2,
                class_id: CLASS_2,
                teacher_id: TEACHER_2,
                time_slot_id: slot1.time_slot_id,
                room_id: room2.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            expect(s1.schedule_id).toBeDefined();
            expect(s2.schedule_id).toBeDefined();
        });

        it('TEST-4355: Allows same teacher in different time slots', async () => {
            const s1 = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const s2 = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_2,
                teacher_id: TEACHER_1,
                time_slot_id: slot2.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            expect(s1.time_slot_id).not.toBe(s2.time_slot_id);
            expect(s1.teacher_id).toBe(s2.teacher_id);
        });

        it('TEST-4356: Archived or closed schedules do not cause conflict', async () => {
            const s1 = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            // Transition to SCHEDULED -> ACTIVE -> CLOSED
            await engine.scheduleEntry({ schedule_id: s1.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            await engine.activateSchedule({ schedule_id: s1.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            await engine.closeSchedule({ schedule_id: s1.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });

            // Now another schedule for same teacher and slot should succeed
            const s2 = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_2,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room2.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            expect(s2.schedule_id).toBeDefined();
        });

        it('TEST-4357: detectScheduleConflicts returns detected conflicts deterministically', async () => {
            // Inject two conflicting entries directly into storage to test offline scanner
            const s1: ScheduleEntry = {
                schedule_id: 'S-TEST-1',
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                status: 'ACTIVE',
                version_number: 1,
                checksum: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            s1.checksum = validator.computeScheduleChecksum(s1);

            const s2: ScheduleEntry = {
                schedule_id: 'S-TEST-2',
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_2,
                teacher_id: TEACHER_1, // Same teacher
                time_slot_id: slot1.time_slot_id,
                room_id: room2.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                status: 'ACTIVE',
                version_number: 1,
                checksum: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            s2.checksum = validator.computeScheduleChecksum(s2);

            await storage.saveScheduleEntry(s1);
            await storage.saveScheduleEntry(s2);

            const conflicts = await engine.detectScheduleConflicts(INST_ID, SEM_ID);
            expect(conflicts.length).toBeGreaterThan(0);
            expect(conflicts.some(c => c.conflict_type === 'TEACHER_SCHEDULE_CONFLICT')).toBe(true);
        });

        it('TEST-4358: detectScheduleConflicts returns empty when no conflicts exist', async () => {
            const conflicts = await engine.detectScheduleConflicts(INST_ID, SEM_ID);
            expect(conflicts).toEqual([]);
        });
    });

    // ==========================================
    // 5. LIFECYCLE TESTS (TEST-4359 - TEST-4375)
    // ==========================================
    describe('5. Schedule Lifecycle State Machine', () => {
        let schedule: ScheduleEntry;

        beforeEach(async () => {
            const slot = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '07:30',
                end_time: '08:15',
                sequence: 1,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const room = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-LC',
                name: 'Ruang Lifecycle',
                capacity: 30,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            schedule = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot.time_slot_id,
                room_id: room.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });
        });

        it('TEST-4359: Valid transition DRAFT -> SCHEDULED', async () => {
            const scheduled = await engine.scheduleEntry({
                schedule_id: schedule.schedule_id,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN',
                reason: 'Selesai penyusunan rancangan awal'
            });

            expect(scheduled.status).toBe('SCHEDULED');
            expect(scheduled.version_number).toBe(2);
        });

        it('TEST-4360: Valid transition SCHEDULED -> ACTIVE', async () => {
            await engine.scheduleEntry({ schedule_id: schedule.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            const active = await engine.activateSchedule({
                schedule_id: schedule.schedule_id,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN',
                reason: 'Semester dimulai secara resmi'
            });

            expect(active.status).toBe('ACTIVE');
            expect(active.version_number).toBe(3);
        });

        it('TEST-4361: Valid transition ACTIVE -> CLOSED', async () => {
            await engine.scheduleEntry({ schedule_id: schedule.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            await engine.activateSchedule({ schedule_id: schedule.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            const closed = await engine.closeSchedule({
                schedule_id: schedule.schedule_id,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN',
                reason: 'Semester berakhir'
            });

            expect(closed.status).toBe('CLOSED');
            expect(closed.version_number).toBe(4);
        });

        it('TEST-4362: Valid transition CLOSED -> ARCHIVED', async () => {
            await engine.scheduleEntry({ schedule_id: schedule.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            await engine.activateSchedule({ schedule_id: schedule.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            await engine.closeSchedule({ schedule_id: schedule.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            const archived = await engine.archiveSchedule({
                schedule_id: schedule.schedule_id,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN',
                reason: 'Pengarsipan tahunan'
            });

            expect(archived.status).toBe('ARCHIVED');
            expect(archived.version_number).toBe(5);
        });

        it('TEST-4363: ARCHIVED is terminal: cannot transition to any status', async () => {
            await engine.scheduleEntry({ schedule_id: schedule.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            await engine.activateSchedule({ schedule_id: schedule.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            await engine.closeSchedule({ schedule_id: schedule.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            await engine.archiveSchedule({ schedule_id: schedule.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });

            await expect(engine.transitionScheduleStatus({
                schedule_id: schedule.schedule_id,
                target_status: 'ACTIVE',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/TERMINAL_SCHEDULE_CANNOT_TRANSITION/);
        });

        it('TEST-4364: Rejects direct transition DRAFT -> ACTIVE', async () => {
            await expect(engine.transitionScheduleStatus({
                schedule_id: schedule.schedule_id,
                target_status: 'ACTIVE',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_SCHEDULE_TRANSITION/);
        });

        it('TEST-4365: Rejects direct transition DRAFT -> CLOSED', async () => {
            await expect(engine.transitionScheduleStatus({
                schedule_id: schedule.schedule_id,
                target_status: 'CLOSED',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_SCHEDULE_TRANSITION/);
        });

        it('TEST-4366: Rejects direct transition DRAFT -> ARCHIVED', async () => {
            await expect(engine.transitionScheduleStatus({
                schedule_id: schedule.schedule_id,
                target_status: 'ARCHIVED',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_SCHEDULE_TRANSITION/);
        });

        it('TEST-4367: Rejects transition ACTIVE -> DRAFT', async () => {
            await engine.scheduleEntry({ schedule_id: schedule.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            await engine.activateSchedule({ schedule_id: schedule.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });

            await expect(engine.transitionScheduleStatus({
                schedule_id: schedule.schedule_id,
                target_status: 'DRAFT',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_SCHEDULE_TRANSITION/);
        });
    });

    // ==========================================
    // 6. REVISION & VERSIONING TESTS (TEST-4368 - TEST-4380)
    // ==========================================
    describe('6. Schedule Revision & Versioning', () => {
        let schedule: ScheduleEntry;
        let slot2: TimeSlot;
        let room2: LearningRoom;

        beforeEach(async () => {
            const slot1 = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '07:30',
                end_time: '08:15',
                sequence: 1,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            slot2 = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '08:15',
                end_time: '09:00',
                sequence: 2,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const room1 = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-REV-1',
                name: 'Ruang Revisi 1',
                capacity: 30,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            room2 = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-REV-2',
                name: 'Ruang Revisi 2',
                capacity: 30,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            schedule = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });
        });

        it('TEST-4368: Successfully revises schedule and increments version number', async () => {
            const revised = await engine.reviseSchedule({
                schedule_id: schedule.schedule_id,
                time_slot_id: slot2.time_slot_id,
                room_id: room2.room_id,
                revision_reason: 'Perpindahan ruang dan jam ke sesi kedua',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            expect(revised.version_number).toBe(2);
            expect(revised.time_slot_id).toBe(slot2.time_slot_id);
            expect(revised.room_id).toBe(room2.room_id);
            expect(revised.checksum).not.toBe(schedule.checksum);
        });

        it('TEST-4369: Rejects schedule revision without mandatory revision reason', async () => {
            await expect(engine.reviseSchedule({
                schedule_id: schedule.schedule_id,
                time_slot_id: slot2.time_slot_id,
                revision_reason: '',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/SCHEDULE_REVISION_REASON_REQUIRED/);
        });

        it('TEST-4370: Preserves previous snapshot in ScheduleHistoryEntry on revision', async () => {
            await engine.reviseSchedule({
                schedule_id: schedule.schedule_id,
                room_id: room2.room_id,
                revision_reason: 'Pindah ke ruang 2',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const history = await engine.getScheduleHistory(schedule.schedule_id);
            expect(history.length).toBe(2);
            expect(history[1].version_number).toBe(2);
            expect(history[1].previous_snapshot?.room_id).toBe(schedule.room_id);
            expect(history[1].new_snapshot.room_id).toBe(room2.room_id);
            expect(history[1].revision_reason).toBe('Pindah ke ruang 2');
        });

        it('TEST-4371: Emits SCHEDULE_REVISED audit event on revision', async () => {
            await engine.reviseSchedule({
                schedule_id: schedule.schedule_id,
                room_id: room2.room_id,
                revision_reason: 'Pindah ke ruang 2',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const audits = await engine.getScheduleAudit(INST_ID, schedule.schedule_id);
            expect(audits.some(a => a.event_type === 'SCHEDULE_REVISED')).toBe(true);
        });

        it('TEST-4372: Rejects revision that introduces teacher conflict', async () => {
            // Create a second schedule for TEACHER_1 in slot2, room2
            const sched2 = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_2,
                teacher_id: TEACHER_1,
                time_slot_id: slot2.time_slot_id,
                room_id: room2.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            // Now try to revise `schedule` (which is in slot1) to slot2
            await expect(engine.reviseSchedule({
                schedule_id: schedule.schedule_id,
                time_slot_id: slot2.time_slot_id,
                revision_reason: 'Mencoba pindah ke slot yang sama',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/TEACHER_SCHEDULE_CONFLICT/);
        });

        it('TEST-4373: Rejects revision on ARCHIVED schedule', async () => {
            await engine.scheduleEntry({ schedule_id: schedule.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            await engine.activateSchedule({ schedule_id: schedule.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            await engine.closeSchedule({ schedule_id: schedule.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            await engine.archiveSchedule({ schedule_id: schedule.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });

            await expect(engine.reviseSchedule({
                schedule_id: schedule.schedule_id,
                room_id: room2.room_id,
                revision_reason: 'Revisi setelah diarsipkan',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/TERMINAL_SCHEDULE_CANNOT_TRANSITION/);
        });
    });

    // ==========================================
    // 7. TIMETABLES & WORKLOAD TESTS (TEST-4374 - TEST-4390)
    // ==========================================
    describe('7. Timetables & Teacher Workload', () => {
        let slot1: TimeSlot;
        let slot2: TimeSlot;
        let room1: LearningRoom;

        beforeEach(async () => {
            slot1 = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '07:30',
                end_time: '08:15',
                sequence: 1,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            slot2 = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '08:15',
                end_time: '09:00',
                sequence: 2,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            room1 = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-TT-1',
                name: 'Ruang Timetable',
                capacity: 30,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const s1 = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot1.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });
            await engine.scheduleEntry({ schedule_id: s1.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            await engine.activateSchedule({ schedule_id: s1.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });

            const s2 = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_2,
                course_id: COURSE_2,
                class_id: CLASS_1,
                teacher_id: TEACHER_2,
                time_slot_id: slot2.time_slot_id,
                room_id: room1.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });
            await engine.scheduleEntry({ schedule_id: s2.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
            await engine.activateSchedule({ schedule_id: s2.schedule_id, actor_id: 'ADM-01', actor_role: 'ADMIN' });
        });

        it('TEST-4374: Student can view their own timetable derived from course enrollment', async () => {
            // Enroll student STU-01 in COURSE_1
            await enrollmentStorage.saveEnrollment({
                enrollment_id: 'ENR-01',
                student_id: 'STU-01',
                course_id: COURSE_1,
                enrollment_status: 'ACTIVE',
                version_number: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            const tt = await engine.getStudentTimetable({
                student_id: 'STU-01',
                institution_id: INST_ID,
                semester_id: SEM_ID,
                caller_id: 'STU-01',
                caller_role: 'STUDENT'
            });

            expect(tt.length).toBe(1);
            expect(tt[0].course_id).toBe(COURSE_1);
            expect(tt[0].student_id).toBe('STU-01');
            expect(Object.isFrozen(tt)).toBe(true);
        });

        it('TEST-4375: Student can view timetable derived from class placement', async () => {
            // Place student STU-02 in CLASS_1
            const pl: StudentPlacement = {
                placement_id: 'PL-02',
                institution_id: INST_ID,
                student_id: 'STU-02',
                class_id: CLASS_1,
                academic_year_id: AY_ID,
                status: 'PLACED',
                version_number: 1,
                checksum: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            pl.checksum = schoolValidator.computePlacementChecksum(pl);
            await schoolStorage.saveStudentPlacement(pl);

            const tt = await engine.getStudentTimetable({
                student_id: 'STU-02',
                institution_id: INST_ID,
                semester_id: SEM_ID,
                caller_id: 'STU-02',
                caller_role: 'STUDENT'
            });

            // CLASS_1 has two active schedules (PERIOD_1 and PERIOD_2)
            expect(tt.length).toBe(2);
        });

        it('TEST-4376: Student cannot view another student timetable', async () => {
            await expect(engine.getStudentTimetable({
                student_id: 'STU-02',
                institution_id: INST_ID,
                semester_id: SEM_ID,
                caller_id: 'STU-01',
                caller_role: 'STUDENT'
            })).rejects.toThrow(/UNAUTHORIZED_STUDENT_SCHEDULE_SCOPE/);
        });

        it('TEST-4377: Teacher can view their own timetable', async () => {
            const tt = await engine.getTeacherTimetable({
                teacher_id: TEACHER_1,
                institution_id: INST_ID,
                semester_id: SEM_ID,
                caller_id: TEACHER_1,
                caller_role: 'TEACHER'
            });

            expect(tt.length).toBe(1);
            expect(tt[0].teacher_id).toBe(TEACHER_1);
            expect(tt[0].course_id).toBe(COURSE_1);
            expect(Object.isFrozen(tt)).toBe(true);
        });

        it('TEST-4378: Teacher cannot view another teacher timetable unless admin', async () => {
            await expect(engine.getTeacherTimetable({
                teacher_id: TEACHER_2,
                institution_id: INST_ID,
                semester_id: SEM_ID,
                caller_id: TEACHER_1,
                caller_role: 'TEACHER'
            })).rejects.toThrow(/UNAUTHORIZED_TEACHER_SCHEDULE_SCOPE/);
        });

        it('TEST-4379: Admin can view any teacher timetable', async () => {
            const tt = await engine.getTeacherTimetable({
                teacher_id: TEACHER_2,
                institution_id: INST_ID,
                semester_id: SEM_ID,
                caller_id: 'ADM-01',
                caller_role: 'ADMIN'
            });

            expect(tt.length).toBe(1);
            expect(tt[0].teacher_id).toBe(TEACHER_2);
        });

        it('TEST-4380: Class timetable returns schedules for specified class with isolation', async () => {
            const tt = await engine.getClassTimetable({
                class_id: CLASS_1,
                institution_id: INST_ID,
                semester_id: SEM_ID,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            expect(tt.length).toBe(2);
            expect(tt.every(s => s.class_id === CLASS_1)).toBe(true);
        });

        it('TEST-4381: Calculates teacher workload correctly: minutes, hours, and period counts', async () => {
            const wl = await analyticsEngine.getTeacherWorkload(TEACHER_1, INST_ID, SEM_ID);

            // Slot 1: 07:30 - 08:15 = 45 minutes
            expect(wl.teacher_id).toBe(TEACHER_1);
            expect(wl.scheduled_minutes).toBe(45);
            expect(wl.scheduled_hours).toBe(0.75);
            expect(wl.scheduled_period_count).toBe(1);
            expect(wl.course_count).toBe(1);
            expect(wl.class_count).toBe(1);
            expect(wl.workload_status).toBe('SCHEDULED_HOURS_ONLY');
            expect(Object.isFrozen(wl)).toBe(true);
        });

        it('TEST-4382: Class schedule summary aggregates correctly', async () => {
            const summary = await analyticsEngine.getClassScheduleSummary(CLASS_1, INST_ID, SEM_ID);

            // CLASS_1 has two slots: 45 min each = 90 min total
            expect(summary.class_id).toBe(CLASS_1);
            expect(summary.total_periods).toBe(2);
            expect(summary.total_minutes).toBe(90);
            expect(summary.unique_teachers).toBe(2);
            expect(summary.unique_courses).toBe(2);
        });

        it('TEST-4383: Room utilization summary calculates percentage correctly', async () => {
            const util = await analyticsEngine.getRoomUtilizationSummary(room1.room_id, INST_ID, SEM_ID);

            // 2 slots utilized out of 2 total slots created = 100%
            expect(util.room_id).toBe(room1.room_id);
            expect(util.utilized_periods).toBe(2);
            expect(util.utilized_minutes).toBe(90);
            expect(util.utilization_percentage).toBe(100);
        });

        it('TEST-4384: Institution schedule summary aggregates system metrics', async () => {
            const instSummary = await analyticsEngine.getInstitutionScheduleSummary(INST_ID, SEM_ID);

            expect(instSummary.institution_id).toBe(INST_ID);
            expect(instSummary.total_schedules).toBe(2);
            expect(instSummary.active_schedules).toBe(2);
            expect(instSummary.total_rooms).toBe(1);
            expect(instSummary.total_time_slots).toBe(2);
            expect(instSummary.total_conflicts).toBe(0);
        });

        it('TEST-4385: Timetable sorting is deterministic by day, sequence, and start_time', async () => {
            // Enroll student in both courses
            await enrollmentStorage.saveEnrollment({
                enrollment_id: 'ENR-01',
                student_id: 'STU-SORT',
                course_id: COURSE_1,
                enrollment_status: 'ACTIVE',
                version_number: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            await enrollmentStorage.saveEnrollment({
                enrollment_id: 'ENR-02',
                student_id: 'STU-SORT',
                course_id: COURSE_2,
                enrollment_status: 'ACTIVE',
                version_number: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            const tt = await engine.getStudentTimetable({
                student_id: 'STU-SORT',
                institution_id: INST_ID,
                semester_id: SEM_ID,
                caller_id: 'STU-SORT',
                caller_role: 'STUDENT'
            });

            expect(tt.length).toBe(2);
            expect(tt[0].sequence).toBe(1);
            expect(tt[1].sequence).toBe(2);
        });
    });

    // ==========================================
    // 8. SECURITY & LEAKAGE TESTS (TEST-4386 - TEST-4405)
    // ==========================================
    describe('8. Zero-Trust Security, Leakage Detection & Integrity', () => {
        it('TEST-4386: Rejects AIzaSy Google API token in time slot payload', async () => {
            await expect(engine.createTimeSlot({
                institution_id: 'AIzaSyBNM12345678901234567890123456789',
                day_of_week: 'MONDAY',
                start_time: '07:30',
                end_time: '08:15',
                sequence: 1,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/SECURITY_LEAKAGE_DETECTED/);
        });

        it('TEST-4387: Rejects sk- OpenAI token in room payload', async () => {
            await expect(engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-SK',
                name: 'Ruang sk-123456789012345678901234567890',
                capacity: 30,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/SECURITY_LEAKAGE_DETECTED/);
        });

        it('TEST-4388: Rejects Bearer auth token in schedule payload', async () => {
            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
                time_slot_id: 'TS-1',
                room_id: 'R-1',
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/SECURITY_LEAKAGE_DETECTED/);
        });

        it('TEST-4389: Rejects private key header in revision reason', () => {
            expect(() => validator.detectSecurityLeakage({
                reason: '-----BEGIN RSA PRIVATE KEY----- MIIE...'
            })).toThrow(/SECURITY_LEAKAGE_DETECTED/);
        });

        it('TEST-4390: Rejects password in payload', () => {
            expect(() => validator.detectSecurityLeakage({
                password: 'SecretPassword123!'
            })).toThrow(/SECURITY_LEAKAGE_DETECTED/);
        });

        it('TEST-4391: Rejects password_hash in payload', () => {
            expect(() => validator.detectSecurityLeakage({
                password_hash: '$argon2id$v=19$m=65536...'
            })).toThrow(/SECURITY_LEAKAGE_DETECTED/);
        });

        it('TEST-4392: Rejects generateContent prompt injection keyword in payload', () => {
            expect(() => validator.detectSecurityLeakage({
                cmd: 'please generateContent for this prompt'
            })).toThrow(/SECURITY_LEAKAGE_DETECTED/);
        });

        it('TEST-4393: Rejects GoogleGenAI reference in payload', () => {
            expect(() => validator.detectSecurityLeakage({
                sdk: 'GoogleGenAI.init()'
            })).toThrow(/SECURITY_LEAKAGE_DETECTED/);
        });

        it('TEST-4394: Rejects @google/genai package reference in payload', () => {
            expect(() => validator.detectSecurityLeakage({
                pkg: 'import from @google/genai'
            })).toThrow(/SECURITY_LEAKAGE_DETECTED/);
        });

        it('TEST-4395: Rejects system prompt keyword in payload', () => {
            expect(() => validator.detectSecurityLeakage({
                prompt: 'You are a system prompt override'
            })).toThrow(/SECURITY_LEAKAGE_DETECTED/);
        });

        it('TEST-4396: Schedule checksum tampering is authoritatively rejected by repository', async () => {
            const slot = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '11:00',
                end_time: '12:00',
                sequence: 4,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const room = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-CHK',
                name: 'Ruang Checksum',
                capacity: 30,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const sched = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot.time_slot_id,
                room_id: room.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            // Tamper schedule in storage
            const corrupted: ScheduleEntry = { ...sched, teacher_id: 'TEA-HACKER' };
            await storage.saveScheduleEntry(corrupted);

            await expect(repo.getScheduleEntry(sched.schedule_id))
                .rejects.toThrow(/SCHEDULE_CHECKSUM_MISMATCH/);
        });

        it('TEST-4397: listScheduleEntries validates checksums on all returned records', async () => {
            const slot = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '12:00',
                end_time: '13:00',
                sequence: 5,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const room = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-CHK-2',
                name: 'Ruang Checksum 2',
                capacity: 30,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const sched = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot.time_slot_id,
                room_id: room.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            // Tamper status directly
            const corrupted: ScheduleEntry = { ...sched, status: 'ARCHIVED' };
            await storage.saveScheduleEntry(corrupted);

            await expect(repo.listScheduleEntries(INST_ID, { semester_id: SEM_ID }))
                .rejects.toThrow(/SCHEDULE_CHECKSUM_MISMATCH/);
        });

        it('TEST-4398: Storage clear() resets all internal scheduling state deterministically', async () => {
            await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'MONDAY',
                start_time: '13:00',
                end_time: '14:00',
                sequence: 6,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            await storage.clear();
            const slots = await repo.listTimeSlots(INST_ID);
            expect(slots).toEqual([]);
        });

        it('TEST-4399: Teacher workload computation is deeply frozen', () => {
            const dummyWorkload = workloadEngine.calculateTeacherWorkload('TEA-1', 'INST-1', 'SEM-1', [], []);
            expect(Object.isFrozen(dummyWorkload)).toBe(true);
        });

        it('TEST-4400: ScheduleConflict records are deeply frozen', async () => {
            const conflicts = await engine.detectScheduleConflicts(INST_ID, SEM_ID);
            expect(Object.isFrozen(conflicts)).toBe(true);
        });

        it('TEST-4401: Audit log events have valid checksum and are deeply frozen', async () => {
            const slot = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'FRIDAY',
                start_time: '14:00',
                end_time: '15:00',
                sequence: 7,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const audits = await repo.listAuditEvents(INST_ID, slot.time_slot_id);
            expect(audits.length).toBeGreaterThan(0);
            expect(audits[0].checksum.startsWith('AUD-CHK-')).toBe(true);
            expect(Object.isFrozen(audits[0])).toBe(true);
        });

        it('TEST-4402: Headmaster can activate a schedule in their institution', async () => {
            const slot = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'WEDNESDAY',
                start_time: '10:00',
                end_time: '11:00',
                sequence: 4,
                actor_id: 'USR-HM-01',
                actor_role: 'HEADMASTER'
            });

            const room = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-HM-ACT',
                name: 'Ruang HM Act',
                capacity: 30,
                room_type: 'CLASSROOM',
                actor_id: 'USR-HM-01',
                actor_role: 'HEADMASTER'
            });

            const sched = await engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot.time_slot_id,
                room_id: room.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'USR-HM-01',
                actor_role: 'HEADMASTER'
            });

            const scheduled = await engine.scheduleEntry({
                schedule_id: sched.schedule_id,
                actor_id: 'USR-HM-01',
                actor_role: 'HEADMASTER'
            });
            expect(scheduled.status).toBe('SCHEDULED');

            const activated = await engine.activateSchedule({
                schedule_id: sched.schedule_id,
                actor_id: 'USR-HM-01',
                actor_role: 'HEADMASTER'
            });
            expect(activated.status).toBe('ACTIVE');
        });

        it('TEST-4403: Student timetable entries hide non-assigned courses', async () => {
            // Student STU-ISOLATED has no enrollment
            const tt = await engine.getStudentTimetable({
                student_id: 'STU-ISOLATED',
                institution_id: INST_ID,
                semester_id: SEM_ID,
                caller_id: 'STU-ISOLATED',
                caller_role: 'STUDENT'
            });

            expect(tt).toEqual([]);
        });

        it('TEST-4404: Rejects schedule when course period does not exist', async () => {
            const slot = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'TUESDAY',
                start_time: '13:00',
                end_time: '14:00',
                sequence: 5,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const room = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-NOCP',
                name: 'Ruang No CP',
                capacity: 30,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: 'CP-NONEXISTENT',
                course_id: COURSE_1,
                class_id: CLASS_1,
                teacher_id: TEACHER_1,
                time_slot_id: slot.time_slot_id,
                room_id: room.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_COURSE_PERIOD_STATE/);
        });

        it('TEST-4405: Rejects schedule when class does not exist', async () => {
            const slot = await engine.createTimeSlot({
                institution_id: INST_ID,
                day_of_week: 'TUESDAY',
                start_time: '14:00',
                end_time: '15:00',
                sequence: 6,
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            const room = await engine.createLearningRoom({
                institution_id: INST_ID,
                code: 'R-NOCLS',
                name: 'Ruang No Class',
                capacity: 30,
                room_type: 'CLASSROOM',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            });

            await expect(engine.createSchedule({
                institution_id: INST_ID,
                academic_year_id: AY_ID,
                semester_id: SEM_ID,
                course_period_id: PERIOD_1,
                course_id: COURSE_1,
                class_id: 'CLS-NONEXISTENT',
                teacher_id: TEACHER_1,
                time_slot_id: slot.time_slot_id,
                room_id: room.room_id,
                effective_from: '2026-07-15T00:00:00.000Z',
                effective_until: '2026-12-20T23:59:59.000Z',
                actor_id: 'ADM-01',
                actor_role: 'ADMIN'
            })).rejects.toThrow(/INVALID_CLASS_STATE/);
        });
    });
});
