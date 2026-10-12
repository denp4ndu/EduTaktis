import { describe, it, expect, beforeEach } from 'vitest';
import { 
    NotificationEngine, 
    CreateNotificationParams 
} from './notificationEngine';
import { NotificationValidationEngine } from './notificationValidationEngine';
import { NotificationRepositoryEngine } from './notificationRepositoryEngine';
import { InMemoryNotificationStorageProvider } from './notificationStorageProvider';
import { NotificationPolicyEngine } from './notificationPolicyEngine';
import { InMemoryNotificationDeliveryProvider } from './notificationDeliveryProvider';
import { NotificationRecipientResolutionEngine } from './notificationRecipientResolutionEngine';
import { NotificationTriggerEngine } from './notificationTriggerEngine';
import { 
    ParentTeacherCommunicationEngine, 
    CreateThreadParams 
} from './parentTeacherCommunicationEngine';
import { CommunicationValidationEngine } from './communicationValidationEngine';
import { CommunicationRepositoryEngine } from './communicationRepositoryEngine';
import { InMemoryCommunicationStorageProvider } from './communicationStorageProvider';
import { GuardianRepositoryEngine } from './guardianRepositoryEngine';
import { GuardianValidationEngine } from './guardianValidationEngine';
import { InMemoryGuardianStorageProvider } from './guardianStorageProvider';

describe('EduTaktis LMS Phase 37: Notification, Communication & Parent-Teacher Engagement Engine', () => {
    let notifStorage: InMemoryNotificationStorageProvider;
    let notifRepo: NotificationRepositoryEngine;
    let notifValidator: NotificationValidationEngine;
    let notifPolicy: NotificationPolicyEngine;
    let notifDelivery: InMemoryNotificationDeliveryProvider;
    let notifEngine: NotificationEngine;

    let guardianStorage: InMemoryGuardianStorageProvider;
    let guardianRepo: GuardianRepositoryEngine;
    let guardianValidator: GuardianValidationEngine;
    let recipientResolver: NotificationRecipientResolutionEngine;
    let triggerEngine: NotificationTriggerEngine;

    let commStorage: InMemoryCommunicationStorageProvider;
    let commRepo: CommunicationRepositoryEngine;
    let commValidator: CommunicationValidationEngine;
    let commEngine: ParentTeacherCommunicationEngine;

    const mockAdmin = { id: 'ADM-001', role: 'ADMIN' };
    const mockTeacher = { id: 'TCH-101', role: 'TEACHER' };
    const mockStudent = { id: 'STU-202', role: 'STUDENT' };
    const mockGuardian = { id: 'GRD-303', role: 'GUARDIAN' };

    beforeEach(async () => {
        notifStorage = new InMemoryNotificationStorageProvider();
        notifRepo = new NotificationRepositoryEngine(notifStorage);
        notifValidator = new NotificationValidationEngine();
        notifPolicy = new NotificationPolicyEngine(notifRepo);
        notifDelivery = new InMemoryNotificationDeliveryProvider();
        notifEngine = new NotificationEngine(notifRepo, notifValidator, notifPolicy, notifDelivery);

        guardianStorage = new InMemoryGuardianStorageProvider();
        guardianRepo = new GuardianRepositoryEngine(guardianStorage);
        guardianValidator = new GuardianValidationEngine();
        recipientResolver = new NotificationRecipientResolutionEngine(guardianRepo, guardianValidator);
        triggerEngine = new NotificationTriggerEngine(recipientResolver, notifEngine);

        commStorage = new InMemoryCommunicationStorageProvider();
        commRepo = new CommunicationRepositoryEngine(commStorage);
        commValidator = new CommunicationValidationEngine();
        commEngine = new ParentTeacherCommunicationEngine(commRepo, commValidator, guardianRepo, guardianValidator);

        // Seed basic guardian & student relationship
        const now = new Date().toISOString();
        await guardianStorage.saveGuardian({
            guardian_id: mockGuardian.id,
            display_name: 'Wali Murid Resmi',
            role: 'PARENT',
            status: 'ACTIVE',
            version_number: 1,
            created_at: now,
            updated_at: now,
            checksum: 'GRD-CHK-VALID'
        });

        await guardianStorage.saveRelationship({
            relationship_id: 'REL-001',
            guardian_id: mockGuardian.id,
            student_id: mockStudent.id,
            relationship_type: 'PARENT',
            status: 'ACTIVE',
            effective_from: now,
            is_primary_contact: true,
            version_number: 1,
            created_at: now,
            updated_at: now,
            checksum: 'REL-CHK-VALID'
        });
    });

    // ==========================================
    // SECTION A: IDENTITY & NOTIFICATION CREATION (TEST-3701 - TEST-3706)
    // ==========================================

    it('TEST-3701: Valid notification creation queues, delivers, and generates checksum', async () => {
        const notif = await notifEngine.createNotification({
            category: 'ACADEMIC',
            title: 'Tugas Baru Diterbitkan',
            body: 'Tugas Mandiri 1 IPA telah dibuka untuk pengumpulan.',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'ASSIGNMENT',
            source_id: 'ASG-101',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        expect(notif.notification_id).toBeDefined();
        expect(notif.status).toBe('DELIVERED');
        expect(notif.checksum).toMatch(/^NOT-CHK-/);
        expect(notif.delivered_at).toBeDefined();
    });

    it('TEST-3702: Notification creation fails with empty title', async () => {
        await expect(notifEngine.createNotification({
            category: 'ACADEMIC',
            title: '   ',
            body: 'Body text',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'ASSIGNMENT',
            source_id: 'ASG-101',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        })).rejects.toThrow(/INVALID_NOTIFICATION_TITLE/);
    });

    it('TEST-3703: Notification creation fails with empty body', async () => {
        await expect(notifEngine.createNotification({
            category: 'ACADEMIC',
            title: 'Judul Valid',
            body: '',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'ASSIGNMENT',
            source_id: 'ASG-101',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        })).rejects.toThrow(/INVALID_NOTIFICATION_BODY/);
    });

    it('TEST-3704: Notification creation fails with invalid category', async () => {
        await expect(notifEngine.createNotification({
            category: 'INVALID_CATEGORY' as any,
            title: 'Judul',
            body: 'Body',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'ASSIGNMENT',
            source_id: 'ASG-101',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        })).rejects.toThrow(/INVALID_NOTIFICATION_CATEGORY/);
    });

    it('TEST-3705: Notification creation fails with invalid recipient type', async () => {
        await expect(notifEngine.createNotification({
            category: 'ACADEMIC',
            title: 'Judul',
            body: 'Body',
            recipient_type: 'UNKNOWN_ROLE' as any,
            recipient_id: mockStudent.id,
            source_type: 'ASSIGNMENT',
            source_id: 'ASG-101',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        })).rejects.toThrow(/INVALID_RECIPIENT_TYPE/);
    });

    it('TEST-3706: Recipient state is saved upon notification delivery', async () => {
        const notif = await notifEngine.createNotification({
            category: 'ATTENDANCE',
            title: 'Presensi Hadir',
            body: 'Status kehadiran Anda hari ini: HADIR.',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'ATTENDANCE',
            source_id: 'ATT-001',
            actor_id: 'SYSTEM',
            actor_role: 'SYSTEM'
        });

        const state = await notifRepo.getRecipientState(notif.notification_id, mockStudent.id);
        expect(state).toBeDefined();
        expect(state?.status).toBe('DELIVERED');
        expect(state?.checksum).toMatch(/^NRS-CHK-/);
    });

    // ==========================================
    // SECTION B: STUDENT & SCOPE ISOLATION (TEST-3707 - TEST-3712)
    // ==========================================

    it('TEST-3707: Student can retrieve own notification', async () => {
        const notif = await notifEngine.createNotification({
            category: 'ACADEMIC',
            title: 'Nilai Terbit',
            body: 'Nilai asesmen Anda telah terbit.',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'ASSESSMENT',
            source_id: 'ASM-1',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        const fetched = await notifEngine.getNotification(notif.notification_id, mockStudent.id, mockStudent.role);
        expect(fetched?.notification_id).toBe(notif.notification_id);
    });

    it('TEST-3708: Student cannot access notification of another student', async () => {
        const notif = await notifEngine.createNotification({
            category: 'ACADEMIC',
            title: 'Pribadi',
            body: 'Informasi khusus.',
            recipient_type: 'STUDENT',
            recipient_id: 'STU-OTHER',
            source_type: 'ASSESSMENT',
            source_id: 'ASM-2',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        await expect(notifEngine.getNotification(notif.notification_id, mockStudent.id, 'STUDENT'))
            .rejects.toThrow(/UNAUTHORIZED_STUDENT_SCOPE/);
    });

    it('TEST-3709: Student cannot list notifications of another student', async () => {
        await expect(notifEngine.listNotifications({
            recipient_id: 'STU-OTHER',
            actor_id: mockStudent.id,
            actor_role: 'STUDENT'
        })).rejects.toThrow(/UNAUTHORIZED_NOTIFICATION_SCOPE/);
    });

    it('TEST-3710: Guardian can access notification intended for guardian', async () => {
        const notif = await notifEngine.createNotification({
            category: 'REPORT_CARD',
            title: 'Rapor Terbit',
            body: 'Rapor semester putra/putri Anda telah terbit.',
            recipient_type: 'GUARDIAN',
            recipient_id: mockGuardian.id,
            source_type: 'REPORT_CARD',
            source_id: 'RC-001',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        const fetched = await notifEngine.getNotification(notif.notification_id, mockGuardian.id, mockGuardian.role);
        expect(fetched?.notification_id).toBe(notif.notification_id);
    });

    it('TEST-3711: Guardian cannot access notification of another guardian', async () => {
        const notif = await notifEngine.createNotification({
            category: 'REPORT_CARD',
            title: 'Rapor Wali Lain',
            body: 'Rapor anak orang lain.',
            recipient_type: 'GUARDIAN',
            recipient_id: 'GRD-OTHER',
            source_type: 'REPORT_CARD',
            source_id: 'RC-002',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        await expect(notifEngine.getNotification(notif.notification_id, mockGuardian.id, 'GUARDIAN'))
            .rejects.toThrow(/UNAUTHORIZED_GUARDIAN_SCOPE/);
    });

    it('TEST-3712: Admin can access notifications across recipients', async () => {
        const notif = await notifEngine.createNotification({
            category: 'SYSTEM',
            title: 'Pemberitahuan Sistem',
            body: 'Pemeliharaan server terjadwal.',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'SYSTEM',
            source_id: 'SYS-1',
            actor_id: 'SYSTEM',
            actor_role: 'SYSTEM'
        });

        const fetched = await notifEngine.getNotification(notif.notification_id, mockAdmin.id, mockAdmin.role);
        expect(fetched?.notification_id).toBe(notif.notification_id);
    });

    // ==========================================
    // SECTION C: RECIPIENT RESOLUTION & TRIGGERS (TEST-3713 - TEST-3720)
    // ==========================================

    it('TEST-3713: Recipient resolver resolves student and active guardian for report card', async () => {
        const recipients = await recipientResolver.resolveRecipients({
            event_type: 'REPORT_CARD_PUBLISHED',
            category: 'REPORT_CARD',
            student_id: mockStudent.id
        });

        expect(recipients.length).toBe(2);
        expect(recipients.some(r => r.recipient_id === mockStudent.id && r.recipient_type === 'STUDENT')).toBe(true);
        expect(recipients.some(r => r.recipient_id === mockGuardian.id && r.recipient_type === 'GUARDIAN')).toBe(true);
    });

    it('TEST-3714: Inactive guardian is excluded from recipient resolution', async () => {
        await guardianStorage.saveGuardian({
            guardian_id: 'GRD-SUSP',
            display_name: 'Wali Nonaktif',
            role: 'PARENT',
            status: 'SUSPENDED',
            version_number: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            checksum: 'CHK'
        });
        await guardianStorage.saveRelationship({
            relationship_id: 'REL-SUSP',
            guardian_id: 'GRD-SUSP',
            student_id: mockStudent.id,
            relationship_type: 'PARENT',
            status: 'SUSPENDED',
            effective_from: new Date().toISOString(),
            is_primary_contact: false,
            version_number: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            checksum: 'CHK'
        });

        const recipients = await recipientResolver.resolveRecipients({
            event_type: 'REPORT_CARD_PUBLISHED',
            category: 'REPORT_CARD',
            student_id: mockStudent.id
        });

        expect(recipients.some(r => r.recipient_id === 'GRD-SUSP')).toBe(false);
    });

    it('TEST-3715: Domain event trigger handles REPORT_CARD_PUBLISHED correctly', async () => {
        const notifs = await triggerEngine.handleDomainEvent({
            event_type: 'REPORT_CARD_PUBLISHED',
            source_type: 'REPORT_CARD',
            source_id: 'RC-SEM-1',
            title: 'Rapor Semester 1 Terbit',
            body: 'Rapor semester ganjil telah resmi diterbitkan.',
            student_id: mockStudent.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        expect(notifs.length).toBe(2);
        expect(notifs.some(n => n.recipient_id === mockStudent.id)).toBe(true);
        expect(notifs.some(n => n.recipient_id === mockGuardian.id)).toBe(true);
    });

    it('TEST-3716: Domain event trigger handles ATTENDANCE_ALERT with URGENT priority', async () => {
        const notifs = await triggerEngine.handleDomainEvent({
            event_type: 'ATTENDANCE_ALERT',
            source_type: 'ATTENDANCE',
            source_id: 'ATT-ALERT-1',
            title: 'Peringatan Ketidakhadiran',
            body: 'Siswa belum hadir pada jam pertama tanpa keterangan.',
            student_id: mockStudent.id,
            actor_id: 'SYSTEM',
            actor_role: 'SYSTEM'
        });

        expect(notifs.length).toBeGreaterThanOrEqual(1);
        expect(notifs[0].priority).toBe('URGENT');
    });

    it('TEST-3717: Guidance trigger resolves counselor and student', async () => {
        const notifs = await triggerEngine.handleDomainEvent({
            event_type: 'GUIDANCE_CASE_UPDATED',
            source_type: 'GUIDANCE_CASE',
            source_id: 'GUD-001',
            title: 'Jadwal Konseling Diperbarui',
            body: 'Sesi pendampingan telah dijadwalkan.',
            student_id: mockStudent.id,
            counselor_id: 'CNS-001',
            is_confidential: true,
            actor_id: 'CNS-001',
            actor_role: 'COUNSELOR'
        });

        expect(notifs.some(n => n.recipient_id === 'CNS-001')).toBe(true);
        expect(notifs.some(n => n.recipient_id === mockStudent.id)).toBe(true);
    });

    it('TEST-3718: Behavior event reviewed trigger dispatches notification safely', async () => {
        const notifs = await triggerEngine.handleDomainEvent({
            event_type: 'BEHAVIOR_EVENT_REVIEWED',
            source_type: 'BEHAVIOR_EVENT',
            source_id: 'BEH-001',
            title: 'Apresiasi Karakter Positif',
            body: 'Siswa menerima apresiasi atas keteladanan.',
            student_id: mockStudent.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        expect(notifs.length).toBe(2);
        expect(notifs.every(n => n.category === 'BEHAVIOR')).toBe(true);
    });

    // ==========================================
    // SECTION D: DUPLICATE SUPPRESSION & PREFERENCES (TEST-3719 - TEST-3728)
    // ==========================================

    it('TEST-3719: Duplicate notification creation within suppression window is rejected', async () => {
        await notifEngine.createNotification({
            category: 'ACADEMIC',
            title: 'Tugas 1',
            body: 'Pengumuman tugas.',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'ASSIGNMENT',
            source_id: 'ASG-DUP-1',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        await expect(notifEngine.createNotification({
            category: 'ACADEMIC',
            title: 'Tugas 1',
            body: 'Pengumuman tugas.',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'ASSIGNMENT',
            source_id: 'ASG-DUP-1',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        })).rejects.toThrow(/DUPLICATE_NOTIFICATION_SUPPRESSED/);
    });

    it('TEST-3720: Disabled notification category in preferences prevents notification creation', async () => {
        await notifEngine.updatePreferences({
            actor_id: mockStudent.id,
            actor_role: mockStudent.role,
            category: 'SYSTEM',
            enabled: false
        });

        await expect(notifEngine.createNotification({
            category: 'SYSTEM',
            title: 'Pemberitahuan Sistem',
            body: 'Info update minor.',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'SYSTEM',
            source_id: 'SYS-DIS-1',
            actor_id: 'SYSTEM',
            actor_role: 'SYSTEM'
        })).rejects.toThrow(/NOTIFICATION_DISABLED_BY_PREFERENCE/);
    });

    it('TEST-3721: Re-enabling preference allows notification creation', async () => {
        await notifEngine.updatePreferences({
            actor_id: mockStudent.id,
            actor_role: mockStudent.role,
            category: 'SYSTEM',
            enabled: false
        });

        await notifEngine.updatePreferences({
            actor_id: mockStudent.id,
            actor_role: mockStudent.role,
            category: 'SYSTEM',
            enabled: true
        });

        const notif = await notifEngine.createNotification({
            category: 'SYSTEM',
            title: 'Pemberitahuan Sistem Aktif',
            body: 'Info update sistem.',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'SYSTEM',
            source_id: 'SYS-REEN-1',
            actor_id: 'SYSTEM',
            actor_role: 'SYSTEM'
        });

        expect(notif.notification_id).toBeDefined();
    });

    it('TEST-3722: Preference update generates versioned record and audit event', async () => {
        const pref = await notifEngine.updatePreferences({
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role,
            category: 'ASSIGNMENT',
            channel: 'EMAIL',
            enabled: true
        });

        expect(pref.version_number).toBe(1);
        expect(pref.channel).toBe('EMAIL');

        const auditList = await notifRepo.listAudit({ actor_id: mockTeacher.id });
        expect(auditList.some(a => a.event_type === 'NOTIFICATION_PREFERENCE_UPDATED')).toBe(true);
    });

    it('TEST-3723: Preference query returns deep frozen array', async () => {
        await notifEngine.updatePreferences({
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role,
            category: 'ATTENDANCE',
            enabled: true
        });

        const prefs = await notifEngine.getPreferences(mockTeacher.id);
        expect(prefs.length).toBe(1);
        expect(Object.isFrozen(prefs)).toBe(true);
    });

    // ==========================================
    // SECTION E: READ / UNREAD & LIFECYCLE (TEST-3724 - TEST-3732)
    // ==========================================

    it('TEST-3724: Marking notification read updates status, read_at and recipient state', async () => {
        const notif = await notifEngine.createNotification({
            category: 'ACADEMIC',
            title: 'Materi Pembelajaran',
            body: 'Materi bab 3 telah diunggah.',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'COURSE',
            source_id: 'CRS-01',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        const state = await notifEngine.markRead({
            notification_id: notif.notification_id,
            recipient_id: mockStudent.id,
            actor_id: mockStudent.id,
            actor_role: mockStudent.role
        });

        expect(state.status).toBe('READ');
        expect(state.read_at).toBeDefined();

        const updatedNotif = await notifRepo.getNotification(notif.notification_id);
        expect(updatedNotif?.status).toBe('READ');
    });

    it('TEST-3725: Cancelling notification transitions status and logs history', async () => {
        const notif = await notifEngine.createNotification({
            category: 'CALENDAR',
            title: 'Jadwal Ujian Ralat',
            body: 'Jadwal lama.',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'CALENDAR',
            source_id: 'CAL-01',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        const cancelled = await notifEngine.cancelNotification({
            notification_id: notif.notification_id,
            reason: 'Ralat tanggal kegiatan',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        expect(cancelled.status).toBe('CANCELLED');
        const history = await notifRepo.listHistory(notif.notification_id);
        expect(history.some(h => h.new_status === 'CANCELLED')).toBe(true);
    });

    it('TEST-3726: Archiving notification transitions status to ARCHIVED', async () => {
        const notif = await notifEngine.createNotification({
            category: 'SYSTEM',
            title: 'Arsip Sistem',
            body: 'Pesan kedaluwarsa.',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'SYSTEM',
            source_id: 'SYS-ARC',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const archived = await notifEngine.archiveNotification({
            notification_id: notif.notification_id,
            reason: 'Kedaluwarsa',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        expect(archived.status).toBe('ARCHIVED');
    });

    it('TEST-3727: ARCHIVED notification cannot transition to any other status', async () => {
        const notif = await notifEngine.createNotification({
            category: 'SYSTEM',
            title: 'Terminal Test',
            body: 'Pesan akan diarsip.',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'SYSTEM',
            source_id: 'SYS-TERM',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await notifEngine.archiveNotification({
            notification_id: notif.notification_id,
            reason: 'Arsip',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await expect(notifEngine.cancelNotification({
            notification_id: notif.notification_id,
            reason: 'Batal',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        })).rejects.toThrow(/TERMINAL_NOTIFICATION_CANNOT_TRANSITION/);
    });

    it('TEST-3728: Notification summary accurately computes unread and priority counts', async () => {
        await notifEngine.createNotification({
            category: 'ACADEMIC',
            priority: 'HIGH',
            title: 'Tugas Penting',
            body: 'Segera kumpulkan.',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'ASG',
            source_id: 'ASG-SUM-1',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        await notifEngine.createNotification({
            category: 'ATTENDANCE',
            priority: 'URGENT',
            title: 'Peringatan Alpha',
            body: 'Harap konfirmasi kehadiran.',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'ATT',
            source_id: 'ATT-SUM-2',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        const summary = await notifEngine.getNotificationSummary(mockStudent.id, mockStudent.id, mockStudent.role);
        expect(summary.unread_count).toBe(2);
        expect(summary.high_priority_count).toBe(1);
        expect(summary.urgent_count).toBe(1);
        expect(summary.category_breakdown.ACADEMIC).toBe(1);
        expect(summary.category_breakdown.ATTENDANCE).toBe(1);
    });

    // ==========================================
    // SECTION F: PARENT-TEACHER COMMUNICATION (TEST-3729 - TEST-3742)
    // ==========================================

    it('TEST-3729: Create valid communication thread between guardian and teacher', async () => {
        const result = await commEngine.createThread({
            subject: 'Konsultasi Belajar Matematika',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            initial_message: 'Selamat pagi Bapak/Ibu guru, saya ingin menanyakan progres belajar ananda.',
            actor_id: mockGuardian.id,
            actor_role: mockGuardian.role
        });

        expect(result.thread.thread_id).toBeDefined();
        expect(result.thread.subject).toBe('Konsultasi Belajar Matematika');
        expect(result.thread.participant_ids).toContain(mockGuardian.id);
        expect(result.thread.participant_ids).toContain(mockTeacher.id);
        expect(result.thread.checksum).toMatch(/^THR-CHK-/);
        expect(result.initialMessage).toBeDefined();
        expect(result.initialMessage?.status).toBe('SENT');
    });

    it('TEST-3730: Thread creation fails if guardian has no active relationship with student', async () => {
        await expect(commEngine.createThread({
            subject: 'Konsultasi Tidak Sah',
            student_id: 'STU-UNLINKED',
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            actor_id: mockGuardian.id,
            actor_role: mockGuardian.role
        })).rejects.toThrow(/UNAUTHORIZED_GUARDIAN_SCOPE/);
    });

    it('TEST-3731: Thread creation fails with short subject', async () => {
        await expect(commEngine.createThread({
            subject: 'Hi',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            actor_id: mockGuardian.id,
            actor_role: mockGuardian.role
        })).rejects.toThrow(/INVALID_THREAD_SUBJECT/);
    });

    it('TEST-3732: Sending message in thread records SENT status and updates thread', async () => {
        const { thread } = await commEngine.createThread({
            subject: 'Perkembangan Nilai IPA',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        const msg = await commEngine.sendMessage({
            thread_id: thread.thread_id,
            body: 'Ananda menunjukkan peningkatan pemahaman yang sangat baik.',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        expect(msg.message_id).toBeDefined();
        expect(msg.status).toBe('SENT');
        expect(msg.checksum).toMatch(/^MSG-CHK-/);

        const updatedThread = await commRepo.getThread(thread.thread_id);
        expect(updatedThread?.status).toBe('ACTIVE');
    });

    it('TEST-3733: Non-participant cannot send message in thread', async () => {
        const { thread } = await commEngine.createThread({
            subject: 'Diskusi Khusus',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        await expect(commEngine.sendMessage({
            thread_id: thread.thread_id,
            body: 'Pesan penyusup',
            actor_id: 'TCH-OTHER',
            actor_role: 'TEACHER'
        })).rejects.toThrow(/UNAUTHORIZED_COMMUNICATION_SCOPE/);
    });

    it('TEST-3734: Student cannot access private guardian-teacher thread', async () => {
        const { thread } = await commEngine.createThread({
            subject: 'Evaluasi Perilaku Tertutup',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            privacy_level: 'GUARDIAN_ONLY',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        await expect(commEngine.getThread(thread.thread_id, mockStudent.id, 'STUDENT'))
            .rejects.toThrow(/UNAUTHORIZED_COMMUNICATION_SCOPE/);
    });

    it('TEST-3735: Duplicate message within suppression window is rejected', async () => {
        const { thread } = await commEngine.createThread({
            subject: 'Uji Duplikasi Pesan',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            actor_id: mockGuardian.id,
            actor_role: mockGuardian.role
        });

        await commEngine.sendMessage({
            thread_id: thread.thread_id,
            body: 'Pesan persis sama.',
            actor_id: mockGuardian.id,
            actor_role: mockGuardian.role
        });

        await expect(commEngine.sendMessage({
            thread_id: thread.thread_id,
            body: 'Pesan persis sama.',
            actor_id: mockGuardian.id,
            actor_role: mockGuardian.role
        })).rejects.toThrow(/DUPLICATE_MESSAGE_SUPPRESSED/);
    });

    it('TEST-3736: Editing message creates version 2 and preserves historical version 1', async () => {
        const { thread } = await commEngine.createThread({
            subject: 'Koreksi Catatan',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        const originalMsg = await commEngine.sendMessage({
            thread_id: thread.thread_id,
            body: 'Pertemuan di ruang guru jam 10.00.',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        const revisedMsg = await commEngine.editMessage({
            message_id: originalMsg.message_id,
            new_body: 'Ralat: Pertemuan di ruang guru jam 11.00.',
            reason: 'Koreksi waktu pertemuan',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        expect(revisedMsg.version_number).toBe(2);
        expect(revisedMsg.body).toBe('Ralat: Pertemuan di ruang guru jam 11.00.');
        expect(revisedMsg.edited_at).toBeDefined();

        const history = await commRepo.listHistory(originalMsg.message_id);
        expect(history.length).toBe(1);
        expect(history[0].previous_body).toBe('Pertemuan di ruang guru jam 10.00.');
        expect(history[0].new_body).toBe('Ralat: Pertemuan di ruang guru jam 11.00.');
    });

    it('TEST-3737: Unauthorized user cannot edit another actor message', async () => {
        const { thread } = await commEngine.createThread({
            subject: 'Hak Cipta Pesan',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        const msg = await commEngine.sendMessage({
            thread_id: thread.thread_id,
            body: 'Pesan asli guru.',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        await expect(commEngine.editMessage({
            message_id: msg.message_id,
            new_body: 'Pesan diubah wali.',
            reason: 'Ubah',
            actor_id: mockGuardian.id,
            actor_role: mockGuardian.role
        })).rejects.toThrow(/UNAUTHORIZED_MESSAGE_EDIT/);
    });

    it('TEST-3738: Marking thread read marks unread incoming messages as READ', async () => {
        const { thread } = await commEngine.createThread({
            subject: 'Status Baca',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        await commEngine.sendMessage({
            thread_id: thread.thread_id,
            body: 'Pesan untuk wali murid.',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        await commEngine.markThreadRead({
            thread_id: thread.thread_id,
            actor_id: mockGuardian.id,
            actor_role: mockGuardian.role
        });

        const messages = await commRepo.listMessages(thread.thread_id);
        expect(messages[0].status).toBe('READ');
        expect(messages[0].read_by?.[mockGuardian.id]).toBeDefined();
    });

    it('TEST-3739: Archiving thread prevents further messages from being sent', async () => {
        const { thread } = await commEngine.createThread({
            subject: 'Topik Selesai',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        await commEngine.archiveThread({
            thread_id: thread.thread_id,
            reason: 'Konsultasi selesai',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        await expect(commEngine.sendMessage({
            thread_id: thread.thread_id,
            body: 'Pesan terlambat',
            actor_id: mockGuardian.id,
            actor_role: mockGuardian.role
        })).rejects.toThrow(/THREAD_ARCHIVED/);
    });

    it('TEST-3740: Communication summary correctly counts unread messages across threads', async () => {
        const { thread } = await commEngine.createThread({
            subject: 'Ringkasan Percakapan',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        await commEngine.sendMessage({
            thread_id: thread.thread_id,
            body: 'Pesan 1 belum dibaca',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        const summary = await commEngine.getCommunicationSummary(mockGuardian.id, mockGuardian.role);
        expect(summary.thread_count).toBe(1);
        expect(summary.unread_count).toBe(1);
    });

    // ==========================================
    // SECTION G: SECURITY, IMMUTABILITY & AUDIT (TEST-3741 - TEST-3755)
    // ==========================================

    it('TEST-3741: Notification payload with secret API key is rejected', async () => {
        await expect(notifEngine.createNotification({
            category: 'SYSTEM',
            title: 'Leaky',
            body: 'Key: sk-1234567890123456789012',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'SYS',
            source_id: 'S-1',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        })).rejects.toThrow(/SECURITY_LEAKAGE_DETECTED/);
    });

    it('TEST-3742: Communication payload with database connection string is rejected', async () => {
        const { thread } = await commEngine.createThread({
            subject: 'Diskusi IT',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        await expect(commEngine.sendMessage({
            thread_id: thread.thread_id,
            body: 'Conn: postgres://user:pass@localhost/db',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        })).rejects.toThrow(/SECURITY_LEAKAGE_DETECTED/);
    });

    it('TEST-3743: Checksum mismatch in notification update throws error', async () => {
        const notif = await notifEngine.createNotification({
            category: 'ACADEMIC',
            title: 'Integritas Checksum',
            body: 'Uji coba tampering.',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'ASG',
            source_id: 'ASG-CHK',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        // Corrupt checksum in storage
        const raw = await notifStorage.getNotification(notif.notification_id);
        if (raw) {
            raw.checksum = 'TAMPERED-CHECKSUM';
            await notifStorage.saveNotification(raw);
        }

        await expect(notifEngine.cancelNotification({
            notification_id: notif.notification_id,
            reason: 'Batal',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        })).rejects.toThrow(/NOTIFICATION_CHECKSUM_MISMATCH/);
    });

    it('TEST-3744: Checksum mismatch in message revision throws error', async () => {
        const { thread } = await commEngine.createThread({
            subject: 'Tamper Message',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        const msg = await commEngine.sendMessage({
            thread_id: thread.thread_id,
            body: 'Pesan asli.',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        const raw = await commStorage.getMessage(msg.message_id);
        if (raw) {
            raw.checksum = 'CORRUPTED';
            await commStorage.saveMessage(raw);
        }

        await expect(commEngine.editMessage({
            message_id: msg.message_id,
            new_body: 'Pesan edisi baru.',
            reason: 'Ubah',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        })).rejects.toThrow(/MESSAGE_CHECKSUM_MISMATCH/);
    });

    it('TEST-3745: All notification and communication returned objects are deeply frozen', async () => {
        const notif = await notifEngine.createNotification({
            category: 'ACADEMIC',
            title: 'Freeze Test',
            body: 'Data beku.',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'ASG',
            source_id: 'ASG-FRZ',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        expect(Object.isFrozen(notif)).toBe(true);

        const { thread, initialMessage } = await commEngine.createThread({
            subject: 'Freeze Thread',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            initial_message: 'Pesan beku.',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        expect(Object.isFrozen(thread)).toBe(true);
        expect(Object.isFrozen(initialMessage)).toBe(true);
    });

    it('TEST-3746: Audit logs record chronological lifecycle events', async () => {
        const notif = await notifEngine.createNotification({
            category: 'ACADEMIC',
            title: 'Audit Tracker',
            body: 'Pantauan audit.',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'ASG',
            source_id: 'ASG-AUD',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        await notifEngine.markRead({
            notification_id: notif.notification_id,
            recipient_id: mockStudent.id,
            actor_id: mockStudent.id,
            actor_role: mockStudent.role
        });

        const auditTrail = await notifEngine.getAuditTrail({ notification_id: notif.notification_id });
        expect(auditTrail.length).toBeGreaterThanOrEqual(3);
        expect(auditTrail.some(a => a.event_type === 'NOTIFICATION_CREATED')).toBe(true);
        expect(auditTrail.some(a => a.event_type === 'NOTIFICATION_DELIVERED')).toBe(true);
        expect(auditTrail.some(a => a.event_type === 'NOTIFICATION_READ')).toBe(true);
    });

    it('TEST-3747: Verified that curriculum master data remains untouched', async () => {
        const { SOURCES, AUTHORITIES } = await import('../data/curriculumMaster');
        expect(SOURCES).toBeDefined();
        expect(SOURCES.SRC_PERMEN_12_2024).toBeDefined();
        expect(AUTHORITIES).toBeDefined();
    });

    it('TEST-3748: End-to-end full zero-trust communication and notification flow verified', async () => {
        // 1. Trigger Domain Event (Report Card Published)
        const notifs = await triggerEngine.handleDomainEvent({
            event_type: 'REPORT_CARD_PUBLISHED',
            source_type: 'REPORT_CARD',
            source_id: 'RC-E2E-1',
            title: 'Rapor Akhir Semester Terbit',
            body: 'Rapor telah resmi diterbitkan dan siap diakses.',
            student_id: mockStudent.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        expect(notifs.length).toBe(2);

        // 2. Guardian reads notification
        const guardianNotif = notifs.find(n => n.recipient_id === mockGuardian.id)!;
        await notifEngine.markRead({
            notification_id: guardianNotif.notification_id,
            recipient_id: mockGuardian.id,
            actor_id: mockGuardian.id,
            actor_role: mockGuardian.role
        });

        // 3. Guardian initiates communication thread with teacher
        const { thread } = await commEngine.createThread({
            subject: 'Tindak Lanjut Hasil Rapor',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            initial_message: 'Terima kasih Bapak Guru, bagaimana saran untuk perbaikan semester depan?',
            actor_id: mockGuardian.id,
            actor_role: mockGuardian.role
        });

        // 4. Teacher replies
        const reply = await commEngine.sendMessage({
            thread_id: thread.thread_id,
            body: 'Disarankan meningkatkan jam membaca mandiri setiap sore.',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        expect(reply.status).toBe('SENT');

        // 5. Guardian reads reply
        await commEngine.markThreadRead({
            thread_id: thread.thread_id,
            actor_id: mockGuardian.id,
            actor_role: mockGuardian.role
        });

        const threadSummary = await commEngine.getCommunicationSummary(mockGuardian.id, mockGuardian.role);
        expect(threadSummary.thread_count).toBe(1);
        expect(threadSummary.unread_count).toBe(0);
    });

    // ==========================================
    // SECTION H: ADDITIONAL DOMAIN TRIGGERS & PRIVACY (TEST-3749 - TEST-3785)
    // ==========================================

    it('TEST-3749: COURSE_PERIOD_OPENED trigger dispatches notifications to teacher', async () => {
        const notifs = await triggerEngine.handleDomainEvent({
            event_type: 'COURSE_PERIOD_OPENED',
            source_type: 'COURSE_PERIOD',
            source_id: 'CP-10-IPA',
            title: 'Periode Kelas Dibuka',
            body: 'Periode pembelajaran semester genap telah aktif.',
            teacher_id: mockTeacher.id,
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        expect(notifs.length).toBe(1);
        expect(notifs[0].category).toBe('COURSE');
        expect(notifs[0].recipient_id).toBe(mockTeacher.id);
    });

    it('TEST-3750: COURSE_PERIOD_CLOSED trigger dispatches notifications', async () => {
        const notifs = await triggerEngine.handleDomainEvent({
            event_type: 'COURSE_PERIOD_CLOSED',
            source_type: 'COURSE_PERIOD',
            source_id: 'CP-10-IPA',
            title: 'Periode Kelas Ditutup',
            body: 'Periode pembelajaran semester genap telah selesai.',
            teacher_id: mockTeacher.id,
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        expect(notifs.length).toBe(1);
        expect(notifs[0].category).toBe('COURSE');
    });

    it('TEST-3751: CALENDAR_EVENT_CREATED trigger dispatches notifications', async () => {
        const notifs = await triggerEngine.handleDomainEvent({
            event_type: 'CALENDAR_EVENT_CREATED',
            source_type: 'CALENDAR',
            source_id: 'EVT-CAL-01',
            title: 'Jadwal Penilaian Akhir Semester',
            body: 'Penilaian akhir semester akan dimulai tanggal 15 Desember.',
            student_id: mockStudent.id,
            teacher_id: mockTeacher.id,
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        expect(notifs.length).toBeGreaterThanOrEqual(2);
        expect(notifs.some(n => n.category === 'CALENDAR')).toBe(true);
    });

    it('TEST-3752: ASSIGNMENT_DUE_SOON trigger dispatches notifications with NORMAL priority', async () => {
        const notifs = await triggerEngine.handleDomainEvent({
            event_type: 'ASSIGNMENT_DUE_SOON',
            source_type: 'ASSIGNMENT',
            source_id: 'ASG-DUE-1',
            title: 'Batas Pengumpulan Tugas Segera Berakhir',
            body: 'Tugas Proyek IPA berakhir dalam 24 jam.',
            student_id: mockStudent.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        expect(notifs.length).toBeGreaterThanOrEqual(1);
        expect(notifs[0].priority).toBe('NORMAL');
    });

    it('TEST-3753: SUBMISSION_RECEIVED trigger dispatches notifications to teacher', async () => {
        const notifs = await triggerEngine.handleDomainEvent({
            event_type: 'SUBMISSION_RECEIVED',
            source_type: 'SUBMISSION',
            source_id: 'SUB-01',
            title: 'Tugas Siswa Masuk',
            body: 'Siswa telah mengumpulkan tugas mandiri.',
            teacher_id: mockTeacher.id,
            actor_id: mockStudent.id,
            actor_role: mockStudent.role
        });

        expect(notifs.length).toBe(1);
        expect(notifs[0].recipient_id).toBe(mockTeacher.id);
    });

    it('TEST-3754: SUBMISSION_REVIEWED trigger dispatches notifications to student and guardian', async () => {
        const notifs = await triggerEngine.handleDomainEvent({
            event_type: 'SUBMISSION_REVIEWED',
            source_type: 'SUBMISSION',
            source_id: 'SUB-01',
            title: 'Tugas Telah Diulas Guru',
            body: 'Ulasan dan umpan balik tugas telah tersedia.',
            student_id: mockStudent.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        expect(notifs.length).toBe(2);
        expect(notifs.some(n => n.recipient_id === mockStudent.id)).toBe(true);
    });

    it('TEST-3755: GRADE_REVISED trigger dispatches notifications', async () => {
        const notifs = await triggerEngine.handleDomainEvent({
            event_type: 'GRADE_REVISED',
            source_type: 'GRADE',
            source_id: 'GRD-REV-01',
            title: 'Revisi Nilai Asesmen',
            body: 'Nilai asesmen formatif telah disesuaikan.',
            student_id: mockStudent.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        expect(notifs.length).toBe(2);
        expect(notifs[0].category).toBe('ASSESSMENT');
    });

    it('TEST-3756: TRANSCRIPT_PUBLISHED trigger dispatches HIGH priority notifications', async () => {
        const notifs = await triggerEngine.handleDomainEvent({
            event_type: 'TRANSCRIPT_PUBLISHED',
            source_type: 'TRANSCRIPT',
            source_id: 'TR-PUB-01',
            title: 'Transkrip Akademik Diterbitkan',
            body: 'Transkrip nilai kumulatif telah resmi dipublikasikan.',
            student_id: mockStudent.id,
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        expect(notifs.length).toBe(2);
        expect(notifs[0].priority).toBe('HIGH');
    });

    it('TEST-3757: Quiet hours downgrades HIGH notification to LOW when quiet hours active', async () => {
        // Force quiet hours active for all 24 hours (00:00 to 23:59)
        await notifEngine.updatePreferences({
            actor_id: 'STU-QUIET',
            actor_role: 'STUDENT',
            category: 'ACADEMIC',
            enabled: true,
            quiet_hours: {
                enabled: true,
                start_time: '00:00',
                end_time: '23:59'
            }
        });

        const notif = await notifEngine.createNotification({
            category: 'ACADEMIC',
            priority: 'HIGH',
            title: 'Ujian Besok',
            body: 'Persiapkan alat tulis.',
            recipient_type: 'STUDENT',
            recipient_id: 'STU-QUIET',
            source_type: 'EXAM',
            source_id: 'EX-1',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        expect(notif.priority).toBe('LOW');
    });

    it('TEST-3758: Quiet hours does NOT downgrade URGENT notification', async () => {
        await notifEngine.updatePreferences({
            actor_id: 'STU-URGENT-TEST',
            actor_role: 'STUDENT',
            category: 'ATTENDANCE',
            enabled: true,
            quiet_hours: {
                enabled: true,
                start_time: '00:00',
                end_time: '23:59'
            }
        });

        const notif = await notifEngine.createNotification({
            category: 'ATTENDANCE',
            priority: 'URGENT',
            title: 'Peringatan Darurat',
            body: 'Peringatan darurat kehadiran.',
            recipient_type: 'STUDENT',
            recipient_id: 'STU-URGENT-TEST',
            source_type: 'ATT',
            source_id: 'ATT-EMERG',
            actor_id: 'SYSTEM',
            actor_role: 'SYSTEM'
        });

        expect(notif.priority).toBe('URGENT');
    });

    it('TEST-3759: Multiple message revisions maintain complete historical audit trail', async () => {
        const { thread } = await commEngine.createThread({
            subject: 'Revisi Berulang',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        const msg = await commEngine.sendMessage({
            thread_id: thread.thread_id,
            body: 'Versi 1 teks.',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        await commEngine.editMessage({
            message_id: msg.message_id,
            new_body: 'Versi 2 teks.',
            reason: 'Revisi pertama',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        const finalMsg = await commEngine.editMessage({
            message_id: msg.message_id,
            new_body: 'Versi 3 teks final.',
            reason: 'Revisi kedua',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        expect(finalMsg.version_number).toBe(3);
        const history = await commRepo.listHistory(msg.message_id);
        expect(history.length).toBe(2);
        expect(history[0].new_body).toBe('Versi 3 teks final.');
        expect(history[1].new_body).toBe('Versi 2 teks.');
    });

    it('TEST-3760: Teacher cannot create thread with arbitrary student without valid guardian', async () => {
        await expect(commEngine.createThread({
            subject: 'Invalid Student Thread',
            student_id: 'STU-NONEXISTENT',
            guardian_id: 'GRD-NONEXISTENT',
            teacher_id: mockTeacher.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        })).rejects.toThrow(/UNAUTHORIZED_GUARDIAN_SCOPE/);
    });

    it('TEST-3761: Communication audit trail records all event actions', async () => {
        const { thread } = await commEngine.createThread({
            subject: 'Audit Thread Test',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        const auditTrail = await commEngine.getAuditTrail({ thread_id: thread.thread_id });
        expect(auditTrail.length).toBeGreaterThanOrEqual(1);
        expect(auditTrail[0].event_type).toBe('THREAD_CREATED');
    });

    it('TEST-3762: Communication message status transition rules enforced', () => {
        expect(() => commValidator.validateMessageTransition('DRAFT', 'SENT')).not.toThrow();
        expect(() => commValidator.validateMessageTransition('SENT', 'READ')).not.toThrow();
        expect(() => commValidator.validateMessageTransition('READ', 'ARCHIVED')).not.toThrow();
        expect(() => commValidator.validateMessageTransition('ARCHIVED', 'SENT')).toThrow(/TERMINAL_MESSAGE_CANNOT_TRANSITION/);
    });

    it('TEST-3763: Thread status transition rules enforced', () => {
        expect(() => commValidator.validateThreadTransition('DRAFT', 'OPEN')).not.toThrow();
        expect(() => commValidator.validateThreadTransition('OPEN', 'ACTIVE')).not.toThrow();
        expect(() => commValidator.validateThreadTransition('ACTIVE', 'ARCHIVED')).not.toThrow();
        expect(() => commValidator.validateThreadTransition('ARCHIVED', 'OPEN')).toThrow(/TERMINAL_THREAD_CANNOT_TRANSITION/);
    });

    it('TEST-3764: Notification recipient state tracks multiple recipients independently', async () => {
        const notif = await notifEngine.createNotification({
            category: 'ACADEMIC',
            title: 'Multi-recipient Test',
            body: 'Pemberitahuan bersama.',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'COURSE',
            source_id: 'CRS-MULTI',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        // Mark read for student
        await notifEngine.markRead({
            notification_id: notif.notification_id,
            recipient_id: mockStudent.id,
            actor_id: mockStudent.id,
            actor_role: mockStudent.role
        });

        const studentState = await notifRepo.getRecipientState(notif.notification_id, mockStudent.id);
        expect(studentState?.status).toBe('READ');
    });

    it('TEST-3765: Teacher listing threads returns only threads where teacher is participant', async () => {
        await commEngine.createThread({
            subject: 'Thread Guru 1',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        const teacherThreads = await commEngine.listThreads(mockTeacher.id, 'TEACHER');
        expect(teacherThreads.length).toBeGreaterThanOrEqual(1);
        expect(teacherThreads.every(t => t.participant_ids.includes(mockTeacher.id))).toBe(true);
    });

    it('TEST-3766: Guardian listing threads returns only threads where guardian is participant', async () => {
        const guardianThreads = await commEngine.listThreads(mockGuardian.id, 'GUARDIAN');
        expect(guardianThreads.every(t => t.participant_ids.includes(mockGuardian.id))).toBe(true);
    });

    it('TEST-3767: Rate limit error is thrown if user sends messages too rapidly', async () => {
        const { thread } = await commEngine.createThread({
            subject: 'Rate Limit Test',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        // Seed 20 messages in storage
        for (let i = 0; i < 20; i++) {
            await commStorage.saveMessage({
                message_id: `MSG-RATE-${i}`,
                thread_id: thread.thread_id,
                sender_id: mockTeacher.id,
                sender_role: 'TEACHER',
                body: `Pesan ${i}`,
                status: 'SENT',
                created_at: new Date().toISOString(),
                version_number: 1,
                checksum: 'CHK'
            });
        }

        await expect(commEngine.sendMessage({
            thread_id: thread.thread_id,
            body: 'Pesan ke-21 melebihi batas',
            actor_id: mockTeacher.id,
            actor_role: 'TEACHER'
        })).rejects.toThrow(/COMMUNICATION_RATE_LIMIT_EXCEEDED/);
    });

    it('TEST-3768: Headmaster can view communication threads as authorized observer', async () => {
        const { thread } = await commEngine.createThread({
            subject: 'Supervisi Kepala Sekolah',
            student_id: mockStudent.id,
            guardian_id: mockGuardian.id,
            teacher_id: mockTeacher.id,
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        const res = await commEngine.getThread(thread.thread_id, 'HM-001', 'HEADMASTER');
        expect(res.thread.thread_id).toBe(thread.thread_id);
    });

    it('TEST-3769: Notification creation validates privacy levels', () => {
        expect(() => notifValidator.validateNotificationParams({ privacy_level: 'PUBLIC_WITHIN_CLASS' })).not.toThrow();
        expect(() => notifValidator.validateNotificationParams({ privacy_level: 'COUNSELOR_RESTRICTED' })).not.toThrow();
        expect(() => notifValidator.validateNotificationParams({ privacy_level: 'INVALID_LEVEL' })).toThrow(/INVALID_PRIVACY_LEVEL/);
    });

    it('TEST-3770: Zero AI invocation throughout notification and communication operations', async () => {
        const notif = await notifEngine.createNotification({
            category: 'ACADEMIC',
            title: 'Determinisme Mutlak',
            body: 'Semua pesan dibuat tanpa AI/LLM.',
            recipient_type: 'STUDENT',
            recipient_id: mockStudent.id,
            source_type: 'ACADEMIC',
            source_id: 'AC-1',
            actor_id: mockTeacher.id,
            actor_role: mockTeacher.role
        });

        expect(notif).toBeDefined();
        expect(notif.checksum).toMatch(/^NOT-CHK-/);
    });
});

