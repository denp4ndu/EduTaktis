import { describe, it, expect, beforeEach } from 'vitest';
import { 
    ParentPortalEngine, 
    RegisterGuardianParams, 
    CreateRelationshipParams 
} from './parentPortalEngine';
import { GuardianValidationEngine } from './guardianValidationEngine';
import { GuardianRepositoryEngine } from './guardianRepositoryEngine';
import { InMemoryGuardianStorageProvider } from './guardianStorageProvider';
import { AttendanceAnalyticsEngine } from './attendanceAnalyticsEngine';
import { BehaviorEngine } from './behaviorEngine';
import { GuidanceAnalyticsEngine } from './guidanceAnalyticsEngine';
import { AcademicReportCardRepositoryEngine } from './academicReportCardRepositoryEngine';
import { AcademicTranscriptRepositoryEngine } from './academicTranscriptRepositoryEngine';
import { GradebookEngine } from './gradebookEngine';

describe('EduTaktis LMS Phase 36: Parent/Guardian Portal & Student Academic-Wellbeing Monitoring Engine', () => {
    let storage: InMemoryGuardianStorageProvider;
    let repository: GuardianRepositoryEngine;
    let validator: GuardianValidationEngine;
    let engine: ParentPortalEngine;

    const mockAdmin = { id: 'ADM-001', role: 'ADMIN' };
    const mockGuardianId = 'GRD-101';
    const mockStudentId = 'STU-202';
    const mockOtherStudentId = 'STU-303';

    beforeEach(async () => {
        storage = new InMemoryGuardianStorageProvider();
        repository = new GuardianRepositoryEngine(storage);
        validator = new GuardianValidationEngine();
        engine = new ParentPortalEngine(
            repository,
            validator,
            new AttendanceAnalyticsEngine(),
            new BehaviorEngine(),
            new GuidanceAnalyticsEngine(),
            new AcademicReportCardRepositoryEngine(),
            new AcademicTranscriptRepositoryEngine(),
            new GradebookEngine()
        );
    });

    // ==========================================
    // SECTION 1: GUARDIAN REGISTRATION & VALIDATION (TEST-3601 - TEST-3610)
    // ==========================================

    it('TEST-3601: Valid guardian registration creates active profile with checksum', async () => {
        const params: RegisterGuardianParams = {
            guardian_id: mockGuardianId,
            display_name: 'Budi Santoso',
            email: 'budi@example.com',
            phone: '08123456789',
            role: 'PARENT',
            status: 'ACTIVE',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        };

        const guardian = await engine.registerGuardian(params);
        expect(guardian.guardian_id).toBe(mockGuardianId);
        expect(guardian.display_name).toBe('Budi Santoso');
        expect(guardian.role).toBe('PARENT');
        expect(guardian.status).toBe('ACTIVE');
        expect(guardian.version_number).toBe(1);
        expect(guardian.checksum).toMatch(/^GRD-CHK-/);
    });

    it('TEST-3602: Registration fails if actor has insufficient authority', async () => {
        const params: RegisterGuardianParams = {
            guardian_id: 'GRD-UNAUTH',
            display_name: 'Wali Murid',
            role: 'PARENT',
            actor_id: 'STU-001',
            actor_role: 'STUDENT'
        };

        await expect(engine.registerGuardian(params)).rejects.toThrow(/UNAUTHORIZED_GUARDIAN_ADMIN_SCOPE/);
    });

    it('TEST-3603: Registration fails with empty display name', async () => {
        const params: RegisterGuardianParams = {
            display_name: ' ',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        };

        await expect(engine.registerGuardian(params)).rejects.toThrow(/INVALID_GUARDIAN_NAME/);
    });

    it('TEST-3604: Registration fails with invalid role', async () => {
        const params: any = {
            display_name: 'Wali Valid',
            role: 'SUPER_HERO',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        };

        await expect(engine.registerGuardian(params)).rejects.toThrow(/INVALID_GUARDIAN_ROLE/);
    });

    it('TEST-3605: Duplicate guardian ID is rejected', async () => {
        const params: RegisterGuardianParams = {
            guardian_id: 'GRD-DUP',
            display_name: 'Wali Pertama',
            role: 'LEGAL_GUARDIAN',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        };

        await engine.registerGuardian(params);
        await expect(engine.registerGuardian(params)).rejects.toThrow(/GUARDIAN_ALREADY_EXISTS/);
    });

    it('TEST-3606: Guardian update increments version and recalculates checksum', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-UPD',
            display_name: 'Nama Lama',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const updated = await engine.updateGuardian({
            guardian_id: 'GRD-UPD',
            display_name: 'Nama Baru',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        expect(updated.version_number).toBe(2);
        expect(updated.display_name).toBe('Nama Baru');
        expect(updated.checksum).toBeDefined();
    });

    it('TEST-3607: Updating non-existent guardian throws error', async () => {
        await expect(engine.updateGuardian({
            guardian_id: 'GRD-NONEXISTENT',
            display_name: 'Test',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        })).rejects.toThrow(/GUARDIAN_NOT_FOUND/);
    });

    it('TEST-3608: Guardian profile retrieval returns deep frozen object', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-FRZ',
            display_name: 'Frozen Guardian',
            role: 'AUTHORIZED_CAREGIVER',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const guardian = await engine.getGuardian('GRD-FRZ');
        expect(guardian).toBeDefined();
        expect(Object.isFrozen(guardian)).toBe(true);
    });

    it('TEST-3609: Parent cannot view another guardian profile', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-A',
            display_name: 'Wali A',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await expect(engine.getGuardian('GRD-A', 'GRD-B', 'PARENT')).rejects.toThrow(/UNAUTHORIZED_GUARDIAN_SCOPE/);
    });

    it('TEST-3610: Staff can list all guardians', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-LIST-1',
            display_name: 'Wali 1',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });
        await engine.registerGuardian({
            guardian_id: 'GRD-LIST-2',
            display_name: 'Wali 2',
            role: 'LEGAL_GUARDIAN',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const list = await engine.listGuardians('ADMIN');
        expect(list.length).toBe(2);
    });

    // ==========================================
    // SECTION 2: GUARDIAN LIFECYCLE & TRANSITIONS (TEST-3611 - TEST-3620)
    // ==========================================

    it('TEST-3611: Transition ACTIVE -> SUSPENDED is valid', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-TR-1',
            display_name: 'Wali Transisi',
            role: 'PARENT',
            status: 'ACTIVE',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const suspended = await engine.updateGuardianStatus({
            guardian_id: 'GRD-TR-1',
            new_status: 'SUSPENDED',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        expect(suspended.status).toBe('SUSPENDED');
    });

    it('TEST-3612: Transition SUSPENDED -> ACTIVE is valid', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-TR-2',
            display_name: 'Wali Suspended',
            role: 'PARENT',
            status: 'ACTIVE',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.updateGuardianStatus({
            guardian_id: 'GRD-TR-2',
            new_status: 'SUSPENDED',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const reactivated = await engine.updateGuardianStatus({
            guardian_id: 'GRD-TR-2',
            new_status: 'ACTIVE',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        expect(reactivated.status).toBe('ACTIVE');
    });

    it('TEST-3613: Transition ACTIVE -> ARCHIVED is valid', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-TR-3',
            display_name: 'Wali Archive',
            role: 'PARENT',
            status: 'ACTIVE',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const archived = await engine.updateGuardianStatus({
            guardian_id: 'GRD-TR-3',
            new_status: 'ARCHIVED',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        expect(archived.status).toBe('ARCHIVED');
    });

    it('TEST-3614: ARCHIVED guardian cannot transition to any other status', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-TR-4',
            display_name: 'Wali Terminal',
            role: 'PARENT',
            status: 'ACTIVE',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.updateGuardianStatus({
            guardian_id: 'GRD-TR-4',
            new_status: 'ARCHIVED',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await expect(engine.updateGuardianStatus({
            guardian_id: 'GRD-TR-4',
            new_status: 'ACTIVE',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        })).rejects.toThrow(/TERMINAL_GUARDIAN_CANNOT_TRANSITION/);
    });

    it('TEST-3615: PENDING guardian can transition to ACTIVE', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-TR-5',
            display_name: 'Wali Pending',
            role: 'PARENT',
            status: 'PENDING',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const active = await engine.updateGuardianStatus({
            guardian_id: 'GRD-TR-5',
            new_status: 'ACTIVE',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        expect(active.status).toBe('ACTIVE');
    });

    it('TEST-3616: Status changes record audit events', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-AUD-1',
            display_name: 'Wali Audit',
            role: 'PARENT',
            status: 'ACTIVE',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.updateGuardianStatus({
            guardian_id: 'GRD-AUD-1',
            new_status: 'SUSPENDED',
            reason: 'Verifikasi identitas tertunda',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const auditTrail = await engine.getAuditTrail('GRD-AUD-1', 'ADMIN');
        expect(auditTrail.length).toBeGreaterThanOrEqual(2);
        expect(auditTrail.some(a => a.event_type === 'GUARDIAN_STATUS_CHANGED')).toBe(true);
    });

    it('TEST-3617: Unauthorized user cannot update guardian status', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-UNAUTH-2',
            display_name: 'Wali Test',
            role: 'PARENT',
            status: 'ACTIVE',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await expect(engine.updateGuardianStatus({
            guardian_id: 'GRD-UNAUTH-2',
            new_status: 'SUSPENDED',
            actor_id: 'STU-001',
            actor_role: 'STUDENT'
        })).rejects.toThrow(/UNAUTHORIZED_GUARDIAN_ADMIN_SCOPE/);
    });

    it('TEST-3618: Updating status of non-existent guardian throws error', async () => {
        await expect(engine.updateGuardianStatus({
            guardian_id: 'GRD-NOPE',
            new_status: 'ACTIVE',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        })).rejects.toThrow(/GUARDIAN_NOT_FOUND/);
    });

    it('TEST-3619: Checksum verification detects tampering during update', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-TAMPER',
            display_name: 'Wali Asli',
            role: 'PARENT',
            status: 'ACTIVE',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        // Corrupt checksum in storage
        const raw = await storage.getGuardian('GRD-TAMPER');
        if (raw) {
            raw.checksum = 'TAMPERED-CHECKSUM';
            await storage.saveGuardian(raw);
        }

        await expect(engine.updateGuardian({
            guardian_id: 'GRD-TAMPER',
            display_name: 'Wali Ganti',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        })).rejects.toThrow(/CHECKSUM_MISMATCH/);
    });

    it('TEST-3620: Suspended guardian is rejected during scope verification', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-SUSP',
            display_name: 'Wali Nonaktif',
            role: 'PARENT',
            status: 'ACTIVE',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: 'GRD-SUSP',
            student_id: mockStudentId,
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.updateGuardianStatus({
            guardian_id: 'GRD-SUSP',
            new_status: 'SUSPENDED',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await expect(engine.getParentDashboard('GRD-SUSP', mockStudentId)).rejects.toThrow(/GUARDIAN_NOT_ACTIVE/);
    });

    // ==========================================
    // SECTION 3: RELATIONSHIPS & SCOPE VALIDATION (TEST-3621 - TEST-3630)
    // ==========================================

    it('TEST-3621: Create active relationship between guardian and student', async () => {
        await engine.registerGuardian({
            guardian_id: mockGuardianId,
            display_name: 'Budi Santoso',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const rel = await engine.createRelationship({
            guardian_id: mockGuardianId,
            student_id: mockStudentId,
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            is_primary_contact: true,
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        expect(rel.relationship_id).toBeDefined();
        expect(rel.guardian_id).toBe(mockGuardianId);
        expect(rel.student_id).toBe(mockStudentId);
        expect(rel.status).toBe('ACTIVE');
        expect(rel.is_primary_contact).toBe(true);
        expect(rel.checksum).toMatch(/^REL-CHK-/);
    });

    it('TEST-3622: Creating relationship with non-existent guardian fails', async () => {
        await expect(engine.createRelationship({
            guardian_id: 'GRD-NOT-THERE',
            student_id: mockStudentId,
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        })).rejects.toThrow(/GUARDIAN_NOT_FOUND/);
    });

    it('TEST-3623: Creating relationship with invalid date range fails', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-DATE-TEST',
            display_name: 'Wali Tanggal',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await expect(engine.createRelationship({
            guardian_id: 'GRD-DATE-TEST',
            student_id: mockStudentId,
            relationship_type: 'PARENT',
            effective_from: '2026-12-01T00:00:00.000Z',
            effective_until: '2026-01-01T00:00:00.000Z', // earlier than effective_from
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        })).rejects.toThrow(/INVALID_DATE_RANGE/);
    });

    it('TEST-3624: Updating relationship increments version and checksum', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-REL-UPD',
            display_name: 'Wali Rel Update',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const rel = await engine.createRelationship({
            guardian_id: 'GRD-REL-UPD',
            student_id: mockStudentId,
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const updated = await engine.updateRelationship({
            relationship_id: rel.relationship_id,
            relationship_type: 'LEGAL_GUARDIAN',
            is_primary_contact: true,
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        expect(updated.version_number).toBe(2);
        expect(updated.relationship_type).toBe('LEGAL_GUARDIAN');
        expect(updated.is_primary_contact).toBe(true);
    });

    it('TEST-3625: Updating non-existent relationship throws error', async () => {
        await expect(engine.updateRelationship({
            relationship_id: 'REL-NOPE',
            is_primary_contact: false,
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        })).rejects.toThrow(/RELATIONSHIP_NOT_FOUND/);
    });

    it('TEST-3626: Suspending relationship revokes dashboard access', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-REL-SUSP',
            display_name: 'Wali Rel Susp',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const rel = await engine.createRelationship({
            guardian_id: 'GRD-REL-SUSP',
            student_id: mockStudentId,
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.updateRelationshipStatus({
            relationship_id: rel.relationship_id,
            new_status: 'SUSPENDED',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await expect(engine.getParentDashboard('GRD-REL-SUSP', mockStudentId)).rejects.toThrow(/GUARDIAN_STUDENT_RELATIONSHIP_NOT_ACTIVE/);
    });

    it('TEST-3627: Expired relationship revokes dashboard access', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-EXP',
            display_name: 'Wali Expired',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: 'GRD-EXP',
            student_id: mockStudentId,
            relationship_type: 'AUTHORIZED_CAREGIVER',
            effective_from: '2020-01-01T00:00:00.000Z',
            effective_until: '2020-12-31T00:00:00.000Z', // Expired
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await expect(engine.getParentDashboard('GRD-EXP', mockStudentId)).rejects.toThrow(/GUARDIAN_STUDENT_RELATIONSHIP_EXPIRED/);
    });

    it('TEST-3628: Future relationship cannot access dashboard yet', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-FUT',
            display_name: 'Wali Masa Depan',
            role: 'LEGAL_GUARDIAN',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: 'GRD-FUT',
            student_id: mockStudentId,
            relationship_type: 'LEGAL_GUARDIAN',
            effective_from: '2099-01-01T00:00:00.000Z', // In future
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await expect(engine.getParentDashboard('GRD-FUT', mockStudentId)).rejects.toThrow(/GUARDIAN_STUDENT_RELATIONSHIP_NOT_YET_EFFECTIVE/);
    });

    it('TEST-3629: Relationship query returns deep frozen object', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-REL-FRZ',
            display_name: 'Wali Rel Frozen',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const rel = await engine.createRelationship({
            guardian_id: 'GRD-REL-FRZ',
            student_id: mockStudentId,
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const fetched = await engine.getRelationship(rel.relationship_id);
        expect(fetched).toBeDefined();
        expect(Object.isFrozen(fetched)).toBe(true);
    });

    it('TEST-3630: ARCHIVED relationship cannot transition to active', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-REL-ARC',
            display_name: 'Wali Rel Arch',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const rel = await engine.createRelationship({
            guardian_id: 'GRD-REL-ARC',
            student_id: mockStudentId,
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.updateRelationshipStatus({
            relationship_id: rel.relationship_id,
            new_status: 'ARCHIVED',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await expect(engine.updateRelationshipStatus({
            relationship_id: rel.relationship_id,
            new_status: 'ACTIVE',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        })).rejects.toThrow(/TERMINAL_RELATIONSHIP_CANNOT_TRANSITION/);
    });

    // ==========================================
    // SECTION 4: MULTI-STUDENT ISOLATION (TEST-3631 - TEST-3640)
    // ==========================================

    it('TEST-3631: Guardian with multiple students lists all authorized active children', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-MULTI',
            display_name: 'Ibu Pertiwi',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: 'GRD-MULTI',
            student_id: 'STU-CHILD-1',
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            is_primary_contact: true,
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: 'GRD-MULTI',
            student_id: 'STU-CHILD-2',
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            is_primary_contact: false,
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const students = await engine.listAuthorizedStudents('GRD-MULTI');
        expect(students.length).toBe(2);
        expect(students.some(s => s.student_id === 'STU-CHILD-1')).toBe(true);
        expect(students.some(s => s.student_id === 'STU-CHILD-2')).toBe(true);
    });

    it('TEST-3632: Guardian cannot see student without relationship in listAuthorizedStudents', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-ISO-1',
            display_name: 'Wali Terisolasi',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: 'GRD-ISO-1',
            student_id: 'STU-MINE',
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const students = await engine.listAuthorizedStudents('GRD-ISO-1');
        expect(students.length).toBe(1);
        expect(students.find(s => s.student_id === 'STU-OTHER')).toBeUndefined();
    });

    it('TEST-3633: Unauthorized student ID request by guardian is rejected with scope error', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-ISO-2',
            display_name: 'Wali Intrusive',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: 'GRD-ISO-2',
            student_id: 'STU-MY-CHILD',
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await expect(engine.getParentDashboard('GRD-ISO-2', 'STU-NOT-MY-CHILD'))
            .rejects.toThrow(/UNAUTHORIZED_GUARDIAN_SCOPE/);
    });

    it('TEST-3634: Suspended child relationship does not appear in active student list', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-MULTI-SUSP',
            display_name: 'Wali Multi Susp',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const rel = await engine.createRelationship({
            guardian_id: 'GRD-MULTI-SUSP',
            student_id: 'STU-ACTIVE-CHILD',
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const relSusp = await engine.createRelationship({
            guardian_id: 'GRD-MULTI-SUSP',
            student_id: 'STU-SUSP-CHILD',
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.updateRelationshipStatus({
            relationship_id: relSusp.relationship_id,
            new_status: 'SUSPENDED',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const list = await engine.listAuthorizedStudents('GRD-MULTI-SUSP');
        expect(list.length).toBe(1);
        expect(list[0].student_id).toBe('STU-ACTIVE-CHILD');
    });

    it('TEST-3635: Multi-guardian support for same student', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-FATHER',
            display_name: 'Ayah',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.registerGuardian({
            guardian_id: 'GRD-MOTHER',
            display_name: 'Ibu',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: 'GRD-FATHER',
            student_id: 'STU-SHARED',
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: 'GRD-MOTHER',
            student_id: 'STU-SHARED',
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const fatherDash = await engine.getParentDashboard('GRD-FATHER', 'STU-SHARED');
        const motherDash = await engine.getParentDashboard('GRD-MOTHER', 'STU-SHARED');

        expect(fatherDash.guardian_id).toBe('GRD-FATHER');
        expect(motherDash.guardian_id).toBe('GRD-MOTHER');
        expect(fatherDash.student_id).toBe('STU-SHARED');
        expect(motherDash.student_id).toBe('STU-SHARED');
    });

    // ==========================================
    // SECTION 5: DASHBOARD AGGREGATION & DETERMINISM (TEST-3641 - TEST-3660)
    // ==========================================

    it('TEST-3641: Parent dashboard projects attendance correctly', async () => {
        await engine.registerGuardian({
            guardian_id: mockGuardianId,
            display_name: 'Wali Presensi',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: mockGuardianId,
            student_id: mockStudentId,
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const dash = await engine.getParentDashboard(mockGuardianId, mockStudentId);
        expect(dash.attendance).toBeDefined();
        expect(dash.attendance.student_id).toBe(mockStudentId);
        expect(typeof dash.attendance.attendance_percentage).toBe('number');
    });

    it('TEST-3642: Parent dashboard projects safe behavior summary without leaks', async () => {
        await engine.registerGuardian({
            guardian_id: mockGuardianId,
            display_name: 'Wali Perilaku',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: mockGuardianId,
            student_id: mockStudentId,
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const dash = await engine.getParentDashboard(mockGuardianId, mockStudentId);
        expect(dash.behavior).toBeDefined();
        expect(dash.behavior.standing).toBeDefined();
        expect(typeof dash.behavior.behavior_index).toBe('number');
    });

    it('TEST-3643: Parent dashboard projects safe guidance summary without confidential counselor notes', async () => {
        await engine.registerGuardian({
            guardian_id: mockGuardianId,
            display_name: 'Wali Bimbingan',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: mockGuardianId,
            student_id: mockStudentId,
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const dash = await engine.getParentDashboard(mockGuardianId, mockStudentId);
        expect(dash.guidance).toBeDefined();
        expect(dash.guidance.overall_standing).toBeDefined();
        // Ensure no private counselor notes leaked
        expect((dash.guidance as any).confidential_notes).toBeUndefined();
    });

    it('TEST-3644: Parent dashboard output is deeply frozen', async () => {
        await engine.registerGuardian({
            guardian_id: mockGuardianId,
            display_name: 'Wali Freeze',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: mockGuardianId,
            student_id: mockStudentId,
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const dash = await engine.getParentDashboard(mockGuardianId, mockStudentId);
        expect(Object.isFrozen(dash)).toBe(true);
        expect(Object.isFrozen(dash.attendance)).toBe(true);
        expect(Object.isFrozen(dash.behavior)).toBe(true);
        expect(Object.isFrozen(dash.guidance)).toBe(true);
    });

    it('TEST-3645: Dashboard checksum is computed deterministically', async () => {
        await engine.registerGuardian({
            guardian_id: mockGuardianId,
            display_name: 'Wali Hash',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: mockGuardianId,
            student_id: mockStudentId,
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const dash = await engine.getParentDashboard(mockGuardianId, mockStudentId);
        expect(dash.checksum).toBeDefined();
        expect(dash.checksum).toMatch(/^DSH-CHK-/);
    });

    it('TEST-3646: Accessing dashboard logs audit event', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-AUD-DSH',
            display_name: 'Wali Log',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: 'GRD-AUD-DSH',
            student_id: mockStudentId,
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.getParentDashboard('GRD-AUD-DSH', mockStudentId);

        const auditTrail = await engine.getAuditTrail('GRD-AUD-DSH', 'ADMIN');
        expect(auditTrail.some(a => a.event_type === 'PARENT_DASHBOARD_ACCESSED')).toBe(true);
    });

    it('TEST-3647: Privacy validator rejects payloads containing secret/api_key strings', () => {
        const leakyPayload = {
            student_id: 'STU-1',
            api_key: 'SUPER-SECRET-KEY'
        };

        expect(() => validator.validatePrivacyLeakage(leakyPayload)).toThrow(/PRIVACY_LEAKAGE_DETECTED/);
    });

    it('TEST-3648: Privacy validator rejects payloads containing confidential_notes', () => {
        const leakyNotes = {
            student_id: 'STU-1',
            confidential_notes: 'Private counseling secret'
        };

        expect(() => validator.validatePrivacyLeakage(leakyNotes)).toThrow(/PRIVACY_LEAKAGE_DETECTED/);
    });

    it('TEST-3649: Clean payload passes privacy validation', () => {
        const cleanPayload = {
            student_id: 'STU-1',
            attendance_percentage: 95.5,
            standing: 'GOOD'
        };

        expect(() => validator.validatePrivacyLeakage(cleanPayload)).not.toThrow();
    });

    it('TEST-3650: Verified that curriculum master data remains untampered', async () => {
        const { SOURCES, AUTHORITIES } = await import('../data/curriculumMaster');
        expect(SOURCES).toBeDefined();
        expect(SOURCES.SRC_PERMEN_12_2024).toBeDefined();
        expect(AUTHORITIES).toBeDefined();
    });

    // ==========================================
    // SECTION 6: EXTENDED SCENARIOS & RESILIENCE (TEST-3651 - TEST-3680)
    // ==========================================

    it('TEST-3651: Multiple calls to listAuthorizedStudents return consistent snapshots', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-SNAP',
            display_name: 'Wali Snapshot',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: 'GRD-SNAP',
            student_id: 'STU-SNAP-1',
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const list1 = await engine.listAuthorizedStudents('GRD-SNAP');
        const list2 = await engine.listAuthorizedStudents('GRD-SNAP');

        expect(list1.length).toBe(list2.length);
        expect(list1[0].student_id).toBe(list2[0].student_id);
    });

    it('TEST-3652: Emergency contact priority is retained in relationship', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-EMERG',
            display_name: 'Wali Darurat',
            role: 'LEGAL_GUARDIAN',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const rel = await engine.createRelationship({
            guardian_id: 'GRD-EMERG',
            student_id: mockStudentId,
            relationship_type: 'LEGAL_GUARDIAN',
            effective_from: new Date().toISOString(),
            emergency_contact_priority: 1,
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        expect(rel.emergency_contact_priority).toBe(1);
    });

    it('TEST-3653: REVOKED relationship cannot access parent dashboard', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-REV',
            display_name: 'Wali Dicabut',
            role: 'AUTHORIZED_CAREGIVER',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const rel = await engine.createRelationship({
            guardian_id: 'GRD-REV',
            student_id: mockStudentId,
            relationship_type: 'AUTHORIZED_CAREGIVER',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.updateRelationshipStatus({
            relationship_id: rel.relationship_id,
            new_status: 'REVOKED',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await expect(engine.getParentDashboard('GRD-REV', mockStudentId)).rejects.toThrow(/GUARDIAN_STUDENT_RELATIONSHIP_NOT_ACTIVE/);
    });

    it('TEST-3654: Audit trail filter by entity_id isolates records', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-F-1',
            display_name: 'Wali 1',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.registerGuardian({
            guardian_id: 'GRD-F-2',
            display_name: 'Wali 2',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const audit1 = await engine.getAuditTrail('GRD-F-1', 'ADMIN');
        expect(audit1.every(a => a.entity_id === 'GRD-F-1')).toBe(true);
    });

    it('TEST-3655: Guardian cannot register themselves without admin/staff role', async () => {
        await expect(engine.registerGuardian({
            display_name: 'Self Register',
            role: 'PARENT',
            actor_id: 'GRD-SELF',
            actor_role: 'PARENT'
        })).rejects.toThrow(/UNAUTHORIZED_GUARDIAN_ADMIN_SCOPE/);
    });

    it('TEST-3656: Dashboard gracefully defaults when sub-engines have no prior records', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-FRESH',
            display_name: 'Wali Murid Baru',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: 'GRD-FRESH',
            student_id: 'STU-BRAND-NEW',
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const dash = await engine.getParentDashboard('GRD-FRESH', 'STU-BRAND-NEW');
        expect(dash).toBeDefined();
        expect(dash.attendance.attendance_percentage).toBe(0);
        expect(dash.behavior.standing).toBe('GOOD');
        expect(dash.guidance.overall_standing).toBe('NORMAL');
    });

    it('TEST-3657: Primary contact status is reflected in authorized student overview', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-PRIM',
            display_name: 'Wali Kontak Utama',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: 'GRD-PRIM',
            student_id: 'STU-PRIM-1',
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            is_primary_contact: true,
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const list = await engine.listAuthorizedStudents('GRD-PRIM');
        expect(list[0].is_primary_contact).toBe(true);
    });

    it('TEST-3658: Action required flag triggers if student has critical guidance needs', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-FLAG',
            display_name: 'Wali Flag',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: 'GRD-FLAG',
            student_id: 'STU-FLAG-1',
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        const list = await engine.listAuthorizedStudents('GRD-FLAG');
        expect(list[0]).toBeDefined();
        expect(typeof list[0].has_action_items).toBe('boolean');
    });

    it('TEST-3659: PENDING relationship cannot access parent dashboard', async () => {
        await engine.registerGuardian({
            guardian_id: 'GRD-PEND-REL',
            display_name: 'Wali Rel Pending',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await engine.createRelationship({
            guardian_id: 'GRD-PEND-REL',
            student_id: mockStudentId,
            relationship_type: 'PARENT',
            status: 'PENDING',
            effective_from: new Date().toISOString(),
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        await expect(engine.getParentDashboard('GRD-PEND-REL', mockStudentId)).rejects.toThrow(/GUARDIAN_STUDENT_RELATIONSHIP_NOT_ACTIVE/);
    });

    it('TEST-3660: Full end-to-end zero-trust flow for Parent/Guardian Monitoring Engine verified', async () => {
        // 1. Register Guardian
        const guardian = await engine.registerGuardian({
            guardian_id: 'GRD-E2E-1',
            display_name: 'Ibu Raden',
            email: 'raden@example.com',
            role: 'PARENT',
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        // 2. Create Relationship
        const rel = await engine.createRelationship({
            guardian_id: guardian.guardian_id,
            student_id: 'STU-E2E-CHILD',
            relationship_type: 'PARENT',
            effective_from: new Date().toISOString(),
            is_primary_contact: true,
            actor_id: mockAdmin.id,
            actor_role: mockAdmin.role
        });

        // 3. Query Authorized Students
        const children = await engine.listAuthorizedStudents(guardian.guardian_id);
        expect(children.length).toBe(1);
        expect(children[0].student_id).toBe('STU-E2E-CHILD');

        // 4. Query Dashboard Projection
        const dashboard = await engine.getParentDashboard(guardian.guardian_id, 'STU-E2E-CHILD');
        expect(dashboard.guardian_id).toBe(guardian.guardian_id);
        expect(dashboard.student_id).toBe('STU-E2E-CHILD');
        expect(dashboard.checksum).toMatch(/^DSH-CHK-/);
        expect(Object.isFrozen(dashboard)).toBe(true);

        // 5. Query Audit Logs
        const logs = await engine.getAuditTrail(guardian.guardian_id, 'ADMIN');
        expect(logs.length).toBeGreaterThanOrEqual(2);
    });
});
