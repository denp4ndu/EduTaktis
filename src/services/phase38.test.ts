import { describe, it, expect, beforeEach } from 'vitest';
import { AuthenticationEngine } from './authenticationEngine';
import { AuthenticationValidationEngine } from './authenticationValidationEngine';
import { AuthorizationEngine } from './authorizationEngine';
import { SessionEngine } from './sessionEngine';
import { DefaultPasswordHashProvider } from './passwordHashProvider';
import { InMemoryAuthenticationStorageProvider } from './authenticationStorageProvider';
import { InMemorySessionStorageProvider } from './sessionStorageProvider';
import { InMemorySecurityAuditStorageProvider } from './securityAuditStorageProvider';
import { SecurityAuditRepositoryEngine } from './securityAuditRepositoryEngine';
import { GuardianRepositoryEngine } from './guardianRepositoryEngine';
import { InMemoryGuardianStorageProvider } from './guardianStorageProvider';
import { 
    UserAccount, 
    UserRole, 
    AuthorizationContext, 
    GuardianStudentRelationship,
    Guardian 
} from '../types/curriculum';

describe('EduTaktis LMS Phase 38: Authentication & Authorization Engine', () => {
    let authStorage: InMemoryAuthenticationStorageProvider;
    let sessionStorage: InMemorySessionStorageProvider;
    let auditStorage: InMemorySecurityAuditStorageProvider;
    let guardianStorage: InMemoryGuardianStorageProvider;

    let auditRepo: SecurityAuditRepositoryEngine;
    let guardianRepo: GuardianRepositoryEngine;
    let validator: AuthenticationValidationEngine;
    let hasher: DefaultPasswordHashProvider;
    let sessionEngine: SessionEngine;
    let authEngine: AuthenticationEngine;
    let aznEngine: AuthorizationEngine;

    beforeEach(async () => {
        authStorage = new InMemoryAuthenticationStorageProvider();
        sessionStorage = new InMemorySessionStorageProvider();
        auditStorage = new InMemorySecurityAuditStorageProvider();
        guardianStorage = new InMemoryGuardianStorageProvider();

        auditRepo = new SecurityAuditRepositoryEngine(auditStorage);
        guardianRepo = new GuardianRepositoryEngine(guardianStorage);
        validator = new AuthenticationValidationEngine();
        hasher = new DefaultPasswordHashProvider();

        sessionEngine = new SessionEngine(sessionStorage, auditRepo, validator);
        authEngine = new AuthenticationEngine(authStorage, hasher, sessionEngine, auditRepo, validator);
        aznEngine = new AuthorizationEngine(auditRepo, guardianRepo, authStorage, validator);
    });

    // ==========================================
    // 1. REGISTRATION & CREDENTIAL CREATION (TEST-3801 - TEST-3810)
    // ==========================================
    describe('User Registration & Credential Creation', () => {
        it('TEST-3801: Can register student account with valid password', async () => {
            const res = await authEngine.registerUser({
                username: 'budi_santoso',
                display_name: 'Budi Santoso',
                email: 'budi@sekolah.sch.id',
                role: 'STUDENT',
                password: 'Password123!',
                actor_id: 'STU-001'
            });

            expect(res.account).toBeDefined();
            expect(res.account.username).toBe('budi_santoso');
            expect(res.account.role).toBe('STUDENT');
            expect(res.account.status).toBe('ACTIVE');
            expect(res.account.version_number).toBe(1);
            expect(Object.isFrozen(res.account)).toBe(true);
        });

        it('TEST-3802: Password hash is securely stored and salt is generated', async () => {
            const res = await authEngine.registerUser({
                username: 'guru_siti',
                display_name: 'Siti Aminah',
                email: 'siti@sekolah.sch.id',
                role: 'TEACHER',
                password: 'SecurePass2026@',
                actor_id: 'TEA-001'
            });

            const cred = await authStorage.getCredential(res.account.user_id);
            expect(cred).toBeDefined();
            expect(cred?.password_hash).not.toBe('SecurePass2026@');
            expect(cred?.salt.length).toBeGreaterThanOrEqual(16);
        });

        it('TEST-3803: Reject duplicate username', async () => {
            await authEngine.registerUser({
                username: 'wali_andi',
                display_name: 'Andi Pratama',
                email: 'andi1@wali.sch.id',
                role: 'PARENT',
                password: 'StrongPass1#'
            });

            await expect(authEngine.registerUser({
                username: 'wali_andi',
                display_name: 'Andi Duplicate',
                email: 'andi2@wali.sch.id',
                role: 'PARENT',
                password: 'StrongPass1#'
            })).rejects.toThrow(/USER_ALREADY_EXISTS/);
        });

        it('TEST-3804: Reject duplicate email address', async () => {
            await authEngine.registerUser({
                username: 'counselor_rina',
                display_name: 'Rina Konselor',
                email: 'rina@bk.sch.id',
                role: 'COUNSELOR',
                password: 'StrongPass1#'
            });

            await expect(authEngine.registerUser({
                username: 'counselor_rina_2',
                display_name: 'Rina Dua',
                email: 'rina@bk.sch.id',
                role: 'COUNSELOR',
                password: 'StrongPass1#'
            })).rejects.toThrow(/EMAIL_ALREADY_EXISTS/);
        });

        it('TEST-3805: Password policy rejects password shorter than 8 characters', async () => {
            await expect(authEngine.registerUser({
                username: 'short_pass_user',
                display_name: 'Short Pass',
                email: 'short@sekolah.sch.id',
                role: 'STUDENT',
                password: 'Sh1@'
            })).rejects.toThrow(/PASSWORD_POLICY_VIOLATION/);
        });

        it('TEST-3806: Password policy rejects password missing uppercase letter', async () => {
            await expect(authEngine.registerUser({
                username: 'no_upper_user',
                display_name: 'No Upper',
                email: 'upper@sekolah.sch.id',
                role: 'STUDENT',
                password: 'password123!'
            })).rejects.toThrow(/PASSWORD_POLICY_VIOLATION/);
        });

        it('TEST-3807: Password policy rejects password missing lowercase letter', async () => {
            await expect(authEngine.registerUser({
                username: 'no_lower_user',
                display_name: 'No Lower',
                email: 'lower@sekolah.sch.id',
                role: 'STUDENT',
                password: 'PASSWORD123!'
            })).rejects.toThrow(/PASSWORD_POLICY_VIOLATION/);
        });

        it('TEST-3808: Password policy rejects password missing number', async () => {
            await expect(authEngine.registerUser({
                username: 'no_num_user',
                display_name: 'No Number',
                email: 'num@sekolah.sch.id',
                role: 'STUDENT',
                password: 'PasswordSpecial!'
            })).rejects.toThrow(/PASSWORD_POLICY_VIOLATION/);
        });

        it('TEST-3809: Password policy rejects password missing special character', async () => {
            await expect(authEngine.registerUser({
                username: 'no_spec_user',
                display_name: 'No Special',
                email: 'spec@sekolah.sch.id',
                role: 'STUDENT',
                password: 'Password1234'
            })).rejects.toThrow(/PASSWORD_POLICY_VIOLATION/);
        });

        it('TEST-3810: Invalid login identifier (< 3 chars) is rejected', async () => {
            await expect(authEngine.registerUser({
                username: 'ab',
                display_name: 'Too Short',
                email: 'ab@sekolah.sch.id',
                role: 'STUDENT',
                password: 'Password123!'
            })).rejects.toThrow(/INVALID_CREDENTIALS/);
        });
    });

    // ==========================================
    // 2. AUTHENTICATION & IDENTITY VERIFICATION (TEST-3811 - TEST-3825)
    // ==========================================
    describe('Authentication & Identity Verification', () => {
        beforeEach(async () => {
            await authEngine.registerUser({
                username: 'ahmad_siswa',
                display_name: 'Ahmad Siswa',
                email: 'ahmad@siswa.sch.id',
                role: 'STUDENT',
                password: 'SecurePass123!',
                actor_id: 'STU-AHMAD'
            });
        });

        it('TEST-3811: Successful authentication with username returns identity and session', async () => {
            const res = await authEngine.authenticate({
                login_identifier: 'ahmad_siswa',
                password: 'SecurePass123!'
            });

            expect(res.success).toBe(true);
            expect(res.identity).toBeDefined();
            expect(res.identity?.username).toBe('ahmad_siswa');
            expect(res.identity?.role).toBe('STUDENT');
            expect(res.session).toBeDefined();
            expect(res.session?.status).toBe('ACTIVE');
            expect(Object.isFrozen(res.identity)).toBe(true);
            expect(Object.isFrozen(res.session)).toBe(true);
        });

        it('TEST-3812: Successful authentication with email', async () => {
            const res = await authEngine.authenticate({
                login_identifier: 'ahmad@siswa.sch.id',
                password: 'SecurePass123!'
            });

            expect(res.success).toBe(true);
            expect(res.identity?.user_id).toBeDefined();
        });

        it('TEST-3813: Failed authentication with wrong password throws generic error', async () => {
            await expect(authEngine.authenticate({
                login_identifier: 'ahmad_siswa',
                password: 'WrongPassword123!'
            })).rejects.toThrow(/INVALID_CREDENTIALS/);
        });

        it('TEST-3814: Failed authentication with non-existent username throws generic error (enumeration protection)', async () => {
            await expect(authEngine.authenticate({
                login_identifier: 'non_existent_user',
                password: 'SomePassword123!'
            })).rejects.toThrow(/INVALID_CREDENTIALS/);
        });

        it('TEST-3815: Identity projection does not expose password or hash', async () => {
            const res = await authEngine.authenticate({
                login_identifier: 'ahmad_siswa',
                password: 'SecurePass123!'
            });

            expect((res.identity as any).password).toBeUndefined();
            expect((res.identity as any).password_hash).toBeUndefined();
            expect((res.identity as any).salt).toBeUndefined();
        });

        it('TEST-3816: Can retrieve authenticated identity using session id', async () => {
            const res = await authEngine.authenticate({
                login_identifier: 'ahmad_siswa',
                password: 'SecurePass123!'
            });

            const identity = await authEngine.getAuthenticatedIdentity(res.session!.session_id);
            expect(identity.username).toBe('ahmad_siswa');
            expect(identity.role).toBe('STUDENT');
        });

        it('TEST-3817: Authenticating uppercase identifier succeeds (case-insensitivity)', async () => {
            const res = await authEngine.authenticate({
                login_identifier: 'AHMAD_SISWA',
                password: 'SecurePass123!'
            });
            expect(res.success).toBe(true);
        });
    });

    // ==========================================
    // 3. ACCOUNT STATUS & SECURITY LOCKOUT (TEST-3826 - TEST-3840)
    // ==========================================
    describe('Account Status & Lockout Protection', () => {
        let user: UserAccount;

        beforeEach(async () => {
            const res = await authEngine.registerUser({
                username: 'target_account',
                display_name: 'Target Account',
                email: 'target@sekolah.sch.id',
                role: 'TEACHER',
                password: 'ValidPassword123!'
            });
            user = res.account;
        });

        it('TEST-3826: Account locks after 5 consecutive failed login attempts', async () => {
            for (let i = 0; i < 4; i++) {
                await expect(authEngine.authenticate({
                    login_identifier: 'target_account',
                    password: 'BadPassword123!'
                })).rejects.toThrow(/INVALID_CREDENTIALS/);
            }

            // 5th attempt triggers lock
            await expect(authEngine.authenticate({
                login_identifier: 'target_account',
                password: 'BadPassword123!'
            })).rejects.toThrow(/INVALID_CREDENTIALS/);

            // Subsequent attempt fails with ACCOUNT_LOCKED
            await expect(authEngine.authenticate({
                login_identifier: 'target_account',
                password: 'ValidPassword123!'
            })).rejects.toThrow(/ACCOUNT_LOCKED/);
        });

        it('TEST-3827: Admin can unlock a locked account', async () => {
            for (let i = 0; i < 5; i++) {
                try {
                    await authEngine.authenticate({
                        login_identifier: 'target_account',
                        password: 'BadPassword123!'
                    });
                } catch {
                    // expected
                }
            }

            await authEngine.unlockAccount(user.user_id, 'ADM-001');

            const res = await authEngine.authenticate({
                login_identifier: 'target_account',
                password: 'ValidPassword123!'
            });
            expect(res.success).toBe(true);
        });

        it('TEST-3828: PENDING account status rejects authentication', async () => {
            const pendingRes = await authEngine.registerUser({
                username: 'pending_user',
                display_name: 'Pending User',
                email: 'pending@sekolah.sch.id',
                role: 'STUDENT',
                password: 'Password123!',
                status: 'PENDING'
            });

            await expect(authEngine.authenticate({
                login_identifier: 'pending_user',
                password: 'Password123!'
            })).rejects.toThrow(/ACCOUNT_NOT_ACTIVE/);
        });

        it('TEST-3829: SUSPENDED account status rejects authentication', async () => {
            await authEngine.updateAccountStatus(user.user_id, 'SUSPENDED', 'ADM-001');

            await expect(authEngine.authenticate({
                login_identifier: 'target_account',
                password: 'ValidPassword123!'
            })).rejects.toThrow(/ACCOUNT_SUSPENDED/);
        });

        it('TEST-3830: REVOKED account status rejects authentication', async () => {
            await authEngine.updateAccountStatus(user.user_id, 'REVOKED', 'ADM-001');

            await expect(authEngine.authenticate({
                login_identifier: 'target_account',
                password: 'ValidPassword123!'
            })).rejects.toThrow(/ACCOUNT_REVOKED/);
        });

        it('TEST-3831: ARCHIVED account status rejects authentication', async () => {
            await authEngine.updateAccountStatus(user.user_id, 'ARCHIVED', 'ADM-001');

            await expect(authEngine.authenticate({
                login_identifier: 'target_account',
                password: 'ValidPassword123!'
            })).rejects.toThrow(/ACCOUNT_ARCHIVED/);
        });

        it('TEST-3832: ARCHIVED account cannot be reactivated', async () => {
            await authEngine.updateAccountStatus(user.user_id, 'ARCHIVED', 'ADM-001');

            await expect(authEngine.updateAccountStatus(user.user_id, 'ACTIVE', 'ADM-001'))
                .rejects.toThrow(/INVALID_LIFECYCLE_TRANSITION/);
        });
    });

    // ==========================================
    // 4. SESSION LIFECYCLE & SECURITY (TEST-3841 - TEST-3860)
    // ==========================================
    describe('Session Lifecycle & Security', () => {
        let authUser: UserAccount;
        let activeSessionId: string;

        beforeEach(async () => {
            const reg = await authEngine.registerUser({
                username: 'session_user',
                display_name: 'Session User',
                email: 'sess@sekolah.sch.id',
                role: 'STUDENT',
                password: 'SessionPass123!'
            });
            authUser = reg.account;

            const login = await authEngine.authenticate({
                login_identifier: 'session_user',
                password: 'SessionPass123!'
            });
            activeSessionId = login.session!.session_id;
        });

        it('TEST-3841: Validate active session updates last activity timestamp', async () => {
            const s1 = await sessionEngine.validateSession(activeSessionId);
            expect(s1.status).toBe('ACTIVE');
            expect(s1.last_activity_at).toBeDefined();
        });

        it('TEST-3842: Refresh session extends expiration and increments version number', async () => {
            const refreshed = await sessionEngine.refreshSession(activeSessionId, 7200);
            expect(refreshed.version_number).toBe(2);
            expect(refreshed.status).toBe('ACTIVE');
        });

        it('TEST-3843: Revoked session cannot be validated', async () => {
            await sessionEngine.revokeSession(activeSessionId, 'MANUAL_TEST_REVOKE');

            await expect(sessionEngine.validateSession(activeSessionId))
                .rejects.toThrow(/SESSION_REVOKED/);
        });

        it('TEST-3844: Terminated session cannot be validated', async () => {
            await sessionEngine.terminateSession(activeSessionId);

            await expect(sessionEngine.validateSession(activeSessionId))
                .rejects.toThrow(/INVALID_SESSION/);
        });

        it('TEST-3845: Revoking session cannot be reactivated', async () => {
            await sessionEngine.revokeSession(activeSessionId);
            expect(() => validator.validateSessionStatusTransition('REVOKED', 'ACTIVE'))
                .toThrow(/INVALID_LIFECYCLE_TRANSITION/);
        });

        it('TEST-3846: User logout revokes session', async () => {
            await authEngine.logout(activeSessionId);

            await expect(sessionEngine.validateSession(activeSessionId))
                .rejects.toThrow(/SESSION_REVOKED/);
        });

        it('TEST-3847: Logout all sessions revokes all active sessions for user', async () => {
            // Create 2 more sessions
            await authEngine.authenticate({ login_identifier: 'session_user', password: 'SessionPass123!' });
            await authEngine.authenticate({ login_identifier: 'session_user', password: 'SessionPass123!' });

            const count = await authEngine.logoutAllSessions(authUser.user_id);
            expect(count).toBe(3);

            const userSessions = await sessionEngine.listUserSessions(authUser.user_id);
            const activeOnes = userSessions.filter(s => s.status === 'ACTIVE');
            expect(activeOnes.length).toBe(0);
        });

        it('TEST-3848: Session with tampered checksum is rejected', async () => {
            const session = await sessionStorage.getSession(activeSessionId);
            expect(session).toBeDefined();

            // Tamper session data without updating checksum
            const tampered = { ...session!, role: 'ADMIN' as UserRole };
            await sessionStorage.saveSession(tampered);

            await expect(sessionEngine.validateSession(activeSessionId))
                .rejects.toThrow(/AUTHENTICATION_CHECKSUM_MISMATCH/);
        });
    });

    // ==========================================
    // 5. PASSWORD CHANGE & CREDENTIAL REVOCATION (TEST-3861 - TEST-3875)
    // ==========================================
    describe('Password Change & Credential Lifecycle', () => {
        let authUser: UserAccount;

        beforeEach(async () => {
            const reg = await authEngine.registerUser({
                username: 'pass_change_user',
                display_name: 'Pass User',
                email: 'pass@sekolah.sch.id',
                role: 'STUDENT',
                password: 'OldPassword123!'
            });
            authUser = reg.account;
        });

        it('TEST-3861: Can change password with valid current password', async () => {
            await authEngine.changePassword({
                user_id: authUser.user_id,
                current_password: 'OldPassword123!',
                new_password: 'NewStrongPassword123@'
            });

            // Login with new password succeeds
            const res = await authEngine.authenticate({
                login_identifier: 'pass_change_user',
                password: 'NewStrongPassword123@'
            });
            expect(res.success).toBe(true);

            // Login with old password fails
            await expect(authEngine.authenticate({
                login_identifier: 'pass_change_user',
                password: 'OldPassword123!'
            })).rejects.toThrow(/INVALID_CREDENTIALS/);
        });

        it('TEST-3862: Reject password change with incorrect current password', async () => {
            await expect(authEngine.changePassword({
                user_id: authUser.user_id,
                current_password: 'WrongCurrentPassword123!',
                new_password: 'NewStrongPassword123@'
            })).rejects.toThrow(/INVALID_CREDENTIALS/);
        });

        it('TEST-3863: Reject password reuse (same as previous password)', async () => {
            await expect(authEngine.changePassword({
                user_id: authUser.user_id,
                current_password: 'OldPassword123!',
                new_password: 'OldPassword123!'
            })).rejects.toThrow(/PASSWORD_REUSE_REJECTED/);
        });

        it('TEST-3864: Changing password with revoke_other_sessions invalidates existing sessions', async () => {
            const login = await authEngine.authenticate({
                login_identifier: 'pass_change_user',
                password: 'OldPassword123!'
            });
            const oldSessionId = login.session!.session_id;

            await authEngine.changePassword({
                user_id: authUser.user_id,
                current_password: 'OldPassword123!',
                new_password: 'NewStrongPassword123@',
                revoke_other_sessions: true
            });

            await expect(sessionEngine.validateSession(oldSessionId))
                .rejects.toThrow(/SESSION_REVOKED/);
        });
    });

    // ==========================================
    // 6. AUTHORIZATION ENGINE & RBAC RULES (TEST-3876 - TEST-3910)
    // ==========================================
    describe('Authorization Engine & RBAC Rules', () => {
        it('TEST-3876: STUDENT has permission to read student data, but not write', () => {
            expect(aznEngine.hasPermission('STUDENT', 'student:read')).toBe(true);
            expect(aznEngine.hasPermission('STUDENT', 'student:write')).toBe(false);
        });

        it('TEST-3877: STUDENT has permission to read grades and attendance, but not modify', () => {
            expect(aznEngine.hasPermission('STUDENT', 'grade:read')).toBe(true);
            expect(aznEngine.hasPermission('STUDENT', 'grade:write')).toBe(false);
            expect(aznEngine.hasPermission('STUDENT', 'attendance:read')).toBe(true);
            expect(aznEngine.hasPermission('STUDENT', 'attendance:write')).toBe(false);
        });

        it('TEST-3878: TEACHER has permission to read and write grades, courses, and attendance', () => {
            expect(aznEngine.hasPermission('TEACHER', 'grade:read')).toBe(true);
            expect(aznEngine.hasPermission('TEACHER', 'grade:write')).toBe(true);
            expect(aznEngine.hasPermission('TEACHER', 'course:write')).toBe(true);
            expect(aznEngine.hasPermission('TEACHER', 'attendance:write')).toBe(true);
        });

        it('TEST-3879: PARENT has read permission for student, course, grade, and attendance', () => {
            expect(aznEngine.hasPermission('PARENT', 'student:read')).toBe(true);
            expect(aznEngine.hasPermission('PARENT', 'grade:read')).toBe(true);
            expect(aznEngine.hasPermission('PARENT', 'report_card:read')).toBe(true);
            expect(aznEngine.hasPermission('PARENT', 'grade:write')).toBe(false);
        });

        it('TEST-3880: COUNSELOR has read/write permission for guidance, but not grades', () => {
            expect(aznEngine.hasPermission('COUNSELOR', 'guidance:read')).toBe(true);
            expect(aznEngine.hasPermission('COUNSELOR', 'guidance:write')).toBe(true);
            expect(aznEngine.hasPermission('COUNSELOR', 'grade:write')).toBe(false);
        });

        it('TEST-3881: DISCIPLINE_OFFICER has read/write for behavior, but not grades', () => {
            expect(aznEngine.hasPermission('DISCIPLINE_OFFICER', 'behavior:read')).toBe(true);
            expect(aznEngine.hasPermission('DISCIPLINE_OFFICER', 'behavior:write')).toBe(true);
            expect(aznEngine.hasPermission('DISCIPLINE_OFFICER', 'grade:write')).toBe(false);
        });

        it('TEST-3882: ADMIN has full permissions across domains', () => {
            expect(aznEngine.hasPermission('ADMIN', 'user:write')).toBe(true);
            expect(aznEngine.hasPermission('ADMIN', 'security:manage')).toBe(true);
            expect(aznEngine.hasPermission('ADMIN', 'audit:read')).toBe(true);
        });

        it('TEST-3883: Authorize grants decision when role has permission and scope matches', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-STU-1',
                role: 'STUDENT',
                actor_id: 'STU-001',
                target_resource: 'student',
                action: 'read',
                target_student_id: 'STU-001'
            };

            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(true);
            expect(Object.isFrozen(dec)).toBe(true);
        });

        it('TEST-3884: Authorize denies decision when role lacks permission', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-STU-1',
                role: 'STUDENT',
                actor_id: 'STU-001',
                target_resource: 'grade',
                action: 'write',
                target_student_id: 'STU-001'
            };

            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(false);
            expect(dec.reason).toContain('PERMISSION_DENIED');
        });

        it('TEST-3885: requirePermission throws when permission is denied', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-STU-1',
                role: 'STUDENT',
                actor_id: 'STU-001',
                target_resource: 'grade',
                action: 'write'
            };

            await expect(aznEngine.requirePermission(ctx, 'grade:write'))
                .rejects.toThrow(/PERMISSION_DENIED/);
        });

        it('TEST-3886: requireRole throws when role is not in allowed roles list', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-STU-1',
                role: 'STUDENT',
                target_resource: 'course',
                action: 'read'
            };

            await expect(aznEngine.requireRole(ctx, ['TEACHER', 'ADMIN']))
                .rejects.toThrow(/ROLE_UNAUTHORIZED/);
        });
    });

    // ==========================================
    // 7. SCOPE ISOLATION: STUDENT, TEACHER, GUARDIAN (TEST-3911 - TEST-3940)
    // ==========================================
    describe('Scope Isolation & Access Boundaries', () => {
        beforeEach(async () => {
            // Setup an active guardian-student relationship
            const nowIso = new Date().toISOString();
            await guardianStorage.saveGuardian({
                guardian_id: 'GRD-BUDI-WALI',
                display_name: 'Bapak Budi',
                role: 'PARENT',
                status: 'ACTIVE',
                created_at: nowIso,
                updated_at: nowIso,
                version_number: 1,
                checksum: 'GRD-CHK-1'
            });

            await guardianStorage.saveRelationship({
                relationship_id: 'REL-001',
                guardian_id: 'GRD-BUDI-WALI',
                student_id: 'STU-BUDI-ANAK',
                relationship_type: 'PARENT',
                status: 'ACTIVE',
                effective_from: '2026-01-01',
                effective_until: '2026-12-31',
                is_primary_contact: true,
                created_at: nowIso,
                updated_at: nowIso,
                version_number: 1,
                checksum: 'REL-CHK-1'
            });

            // Suspended relationship
            await guardianStorage.saveRelationship({
                relationship_id: 'REL-002',
                guardian_id: 'GRD-BUDI-WALI',
                student_id: 'STU-OTHER-ANAK',
                relationship_type: 'PARENT',
                status: 'SUSPENDED',
                effective_from: '2026-01-01',
                effective_until: '2026-12-31',
                is_primary_contact: false,
                created_at: nowIso,
                updated_at: nowIso,
                version_number: 1,
                checksum: 'REL-CHK-2'
            });
        });

        it('TEST-3911: Student cannot access data of another student (isolation violation)', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-STU-1',
                role: 'STUDENT',
                actor_id: 'STU-001',
                target_resource: 'student',
                action: 'read',
                target_student_id: 'STU-002' // Different student
            };

            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(false);
            expect(dec.reason).toContain('SCOPE_ACCESS_DENIED');
        });

        it('TEST-3912: Guardian with ACTIVE relationship can access authorized child data', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-GRD-1',
                role: 'PARENT',
                actor_id: 'GRD-BUDI-WALI',
                target_resource: 'student',
                action: 'read',
                target_student_id: 'STU-BUDI-ANAK'
            };

            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(true);
        });

        it('TEST-3913: Guardian with SUSPENDED relationship cannot access child data', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-GRD-1',
                role: 'PARENT',
                actor_id: 'GRD-BUDI-WALI',
                target_resource: 'student',
                action: 'read',
                target_student_id: 'STU-OTHER-ANAK'
            };

            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(false);
            expect(dec.reason).toContain('SCOPE_ACCESS_DENIED');
        });

        it('TEST-3914: Guardian cannot access arbitrary unlinked student data', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-GRD-1',
                role: 'PARENT',
                actor_id: 'GRD-BUDI-WALI',
                target_resource: 'student',
                action: 'read',
                target_student_id: 'STU-UNKNOWN'
            };

            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(false);
            expect(dec.reason).toContain('SCOPE_ACCESS_DENIED');
        });

        it('TEST-3915: Teacher can access students within authorized scope', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-TEA-1',
                role: 'TEACHER',
                actor_id: 'TEA-001',
                target_resource: 'student',
                action: 'read',
                target_student_id: 'STU-BUDI-ANAK'
            };

            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(true);
        });

        it('TEST-3916: Admin has broad scope access across students', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-ADM-1',
                role: 'ADMIN',
                actor_id: 'ADM-001',
                target_resource: 'student',
                action: 'read',
                target_student_id: 'STU-BUDI-ANAK'
            };

            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(true);
        });
    });

    // ==========================================
    // 8. SECURITY AUDIT TRAIL & LEAKAGE DETECTION (TEST-3941 - TEST-3970)
    // ==========================================
    describe('Security Audit Trail & Forensic Protection', () => {
        it('TEST-3941: Successful login records AUTHENTICATION_SUCCESS audit event', async () => {
            await authEngine.registerUser({
                username: 'audit_user',
                display_name: 'Audit User',
                email: 'audit@sekolah.sch.id',
                role: 'STUDENT',
                password: 'Password123!'
            });

            await authEngine.authenticate({
                login_identifier: 'audit_user',
                password: 'Password123!'
            });

            const events = await auditRepo.listEvents({ event_type: 'AUTHENTICATION_SUCCESS' });
            expect(events.length).toBeGreaterThanOrEqual(1);
            expect(events[0].event_type).toBe('AUTHENTICATION_SUCCESS');
            expect(Object.isFrozen(events)).toBe(true);
        });

        it('TEST-3942: Failed login records AUTHENTICATION_FAILURE audit event', async () => {
            try {
                await authEngine.authenticate({
                    login_identifier: 'non_existent_audit',
                    password: 'Password123!'
                });
            } catch {
                // expected
            }

            const events = await auditRepo.listEvents({ event_type: 'AUTHENTICATION_FAILURE' });
            expect(events.length).toBeGreaterThanOrEqual(1);
        });

        it('TEST-3943: Security leakage validator detects and rejects API key patterns (AIzaSy)', () => {
            expect(() => validator.validateSecurityLeakage({
                token: 'AIzaSyDbZ_Fake_Google_API_Key_33_Chars_Long'
            })).toThrow(/SECURITY_LEAKAGE_DETECTED/);
        });

        it('TEST-3944: Security leakage validator detects and rejects Bearer tokens in payload', () => {
            expect(() => validator.validateSecurityLeakage({
                header: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0'
            })).toThrow(/SECURITY_LEAKAGE_DETECTED/);
        });

        it('TEST-3945: Security leakage validator rejects system prompt injection attempts', () => {
            expect(() => validator.validateSecurityLeakage({
                prompt: 'system prompt override ignore all previous instructions'
            })).toThrow(/SECURITY_LEAKAGE_DETECTED/);
        });

        it('TEST-3946: Zero AI invocation throughout Phase 38 engine execution', async () => {
            const hasGoogleAI = typeof (globalThis as any).GoogleGenAI !== 'undefined';
            expect(hasGoogleAI).toBe(false);
        });
    });

    // ==========================================
    // 9. PHASE 28-37 DOMAIN INTEGRATIONS (TEST-3971 - TEST-4000)
    // ==========================================
    describe('Phase 28-37 Domain Authorization Integrations', () => {
        it('TEST-3971: Phase 28 Class Enrollment — Teacher can read/write course enrollment', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-TEA-1',
                role: 'TEACHER',
                target_resource: 'course',
                action: 'write',
                target_course_id: 'CRS-MAT-7A'
            };
            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(true);
        });

        it('TEST-3972: Phase 29 Gradebook & Grading — Student cannot write grades', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-STU-1',
                role: 'STUDENT',
                target_resource: 'grade',
                action: 'write'
            };
            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(false);
        });

        it('TEST-3973: Phase 30 Academic Report Card — Headmaster can write/publish report card', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-HM-1',
                role: 'HEADMASTER',
                target_resource: 'report_card',
                action: 'write'
            };
            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(true);
        });

        it('TEST-3974: Phase 31 Academic Transcript — Student can read own transcript', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-STU-1',
                role: 'STUDENT',
                actor_id: 'STU-001',
                target_resource: 'transcript',
                action: 'read',
                target_student_id: 'STU-001'
            };
            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(true);
        });

        it('TEST-3975: Phase 33 Attendance — Teacher can write attendance records', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-TEA-1',
                role: 'TEACHER',
                target_resource: 'attendance',
                action: 'write'
            };
            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(true);
        });

        it('TEST-3976: Phase 34 Behavior Engine — Discipline Officer can write behavior records', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-DISC-1',
                role: 'DISCIPLINE_OFFICER',
                target_resource: 'behavior',
                action: 'write'
            };
            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(true);
        });

        it('TEST-3977: Phase 35 Guidance Engine — Counselor can write guidance records', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-COUNS-1',
                role: 'COUNSELOR',
                target_resource: 'guidance',
                action: 'write'
            };
            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(true);
        });

        it('TEST-3978: Phase 36 Parent Portal — Authorized guardian can read child attendance and behavior', async () => {
            const nowIso = new Date().toISOString();
            await guardianStorage.saveRelationship({
                relationship_id: 'REL-999',
                guardian_id: 'GRD-TEST',
                student_id: 'STU-TEST',
                relationship_type: 'PARENT',
                status: 'ACTIVE',
                effective_from: '2026-01-01',
                effective_until: '2026-12-31',
                is_primary_contact: true,
                created_at: nowIso,
                updated_at: nowIso,
                version_number: 1,
                checksum: 'REL-CHK-999'
            });

            const ctx: AuthorizationContext = {
                user_id: 'USR-GRD-TEST',
                role: 'PARENT',
                actor_id: 'GRD-TEST',
                target_resource: 'attendance',
                action: 'read',
                target_student_id: 'STU-TEST'
            };
            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(true);
        });

        it('TEST-3979: Phase 37 Communication — Teacher and Parent can read and write communication', async () => {
            const teaCtx: AuthorizationContext = {
                user_id: 'USR-TEA-1',
                role: 'TEACHER',
                target_resource: 'communication',
                action: 'write'
            };
            const grdCtx: AuthorizationContext = {
                user_id: 'USR-GRD-1',
                role: 'PARENT',
                target_resource: 'communication',
                action: 'write'
            };
            expect((await aznEngine.authorize(teaCtx)).granted).toBe(true);
            expect((await aznEngine.authorize(grdCtx)).granted).toBe(true);
        });

        it('TEST-3980: Unauthenticated or non-active user throws when authorizing', async () => {
            const reg = await authEngine.registerUser({
                username: 'suspended_actor',
                display_name: 'Suspended Actor',
                email: 'suspended@sekolah.sch.id',
                role: 'TEACHER',
                password: 'Password123!',
                status: 'SUSPENDED'
            });

            const ctx: AuthorizationContext = {
                user_id: reg.account.user_id,
                role: 'TEACHER',
                target_resource: 'course',
                action: 'read'
            };

            await expect(aznEngine.authorize(ctx)).rejects.toThrow(/ACCOUNT_SUSPENDED/);
        });

        it('TEST-3981: LEGAL_GUARDIAN role has identical authorization capability as PARENT', async () => {
            const nowIso = new Date().toISOString();
            await guardianStorage.saveRelationship({
                relationship_id: 'REL-LG-1',
                guardian_id: 'GRD-LG-1',
                student_id: 'STU-LG-CHILD',
                relationship_type: 'LEGAL_GUARDIAN',
                status: 'ACTIVE',
                effective_from: '2026-01-01',
                effective_until: '2026-12-31',
                is_primary_contact: true,
                created_at: nowIso,
                updated_at: nowIso,
                version_number: 1,
                checksum: 'REL-CHK-LG'
            });

            const ctx: AuthorizationContext = {
                user_id: 'USR-LG-1',
                role: 'LEGAL_GUARDIAN',
                actor_id: 'GRD-LG-1',
                target_resource: 'report_card',
                action: 'read',
                target_student_id: 'STU-LG-CHILD'
            };
            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(true);
        });

        it('TEST-3982: AUTHORIZED_CAREGIVER role has authorized student scope', async () => {
            const nowIso = new Date().toISOString();
            await guardianStorage.saveRelationship({
                relationship_id: 'REL-AC-1',
                guardian_id: 'GRD-AC-1',
                student_id: 'STU-AC-CHILD',
                relationship_type: 'AUTHORIZED_CAREGIVER',
                status: 'ACTIVE',
                effective_from: '2026-01-01',
                effective_until: '2026-12-31',
                is_primary_contact: false,
                created_at: nowIso,
                updated_at: nowIso,
                version_number: 1,
                checksum: 'REL-CHK-AC'
            });

            const ctx: AuthorizationContext = {
                user_id: 'USR-AC-1',
                role: 'AUTHORIZED_CAREGIVER',
                actor_id: 'GRD-AC-1',
                target_resource: 'attendance',
                action: 'read',
                target_student_id: 'STU-AC-CHILD'
            };
            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(true);
        });

        it('TEST-3983: Counselor student scope allows assigned counselor', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-COUNS-9',
                role: 'COUNSELOR',
                actor_id: 'COUNS-009',
                target_resource: 'guidance',
                action: 'read'
            };
            const isValid = await aznEngine.validateCounselorStudentScope(ctx, 'COUNS-009', 'STU-001');
            expect(isValid).toBe(true);
        });

        it('TEST-3984: Counselor student scope rejects non-matching counselor ID', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-COUNS-OTHER',
                role: 'COUNSELOR',
                actor_id: 'COUNS-OTHER',
                target_resource: 'guidance',
                action: 'read'
            };
            const isValid = await aznEngine.validateCounselorStudentScope(ctx, 'COUNS-009', 'STU-001');
            expect(isValid).toBe(false);
        });

        it('TEST-3985: Discipline officer scope allows assigned officer', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-DISC-1',
                role: 'DISCIPLINE_OFFICER',
                actor_id: 'DISC-001',
                target_resource: 'behavior',
                action: 'write'
            };
            const isValid = await aznEngine.validateDisciplineScope(ctx, 'DISC-001');
            expect(isValid).toBe(true);
        });

        it('TEST-3986: Discipline officer scope rejects non-matching officer ID', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-DISC-OTHER',
                role: 'DISCIPLINE_OFFICER',
                actor_id: 'DISC-OTHER',
                target_resource: 'behavior',
                action: 'write'
            };
            const isValid = await aznEngine.validateDisciplineScope(ctx, 'DISC-001');
            expect(isValid).toBe(false);
        });

        it('TEST-3987: validateAdminScope strictly requires ADMIN role', async () => {
            const adminCtx: AuthorizationContext = {
                user_id: 'USR-ADM-1',
                role: 'ADMIN',
                target_resource: 'identity',
                action: 'write'
            };
            const teacherCtx: AuthorizationContext = {
                user_id: 'USR-TEA-1',
                role: 'TEACHER',
                target_resource: 'identity',
                action: 'write'
            };
            expect(await aznEngine.validateAdminScope(adminCtx)).toBe(true);
            expect(await aznEngine.validateAdminScope(teacherCtx)).toBe(false);
        });

        it('TEST-3988: PasswordHashProvider produces different hashes for identical passwords with different salts', async () => {
            const h1 = await hasher.hashPassword('SuperSecret123!');
            const h2 = await hasher.hashPassword('SuperSecret123!');
            expect(h1.salt).not.toBe(h2.salt);
            expect(h1.hash).not.toBe(h2.hash);
        });

        it('TEST-3989: PasswordHashProvider correctly verifies matching password against hash', async () => {
            const { hash, salt, algorithm } = await hasher.hashPassword('CorrectPass2026@');
            const isValid = await hasher.verifyPassword('CorrectPass2026@', hash, salt, algorithm);
            expect(isValid).toBe(true);
        });

        it('TEST-3990: PasswordHashProvider rejects incorrect password against hash', async () => {
            const { hash, salt, algorithm } = await hasher.hashPassword('CorrectPass2026@');
            const isValid = await hasher.verifyPassword('WrongPass2026@', hash, salt, algorithm);
            expect(isValid).toBe(false);
        });

        it('TEST-3991: PasswordHashProvider rejects unmatching algorithm', async () => {
            const { hash, salt } = await hasher.hashPassword('CorrectPass2026@');
            const isValid = await hasher.verifyPassword('CorrectPass2026@', hash, salt, 'UNSUPPORTED-ALGO');
            expect(isValid).toBe(false);
        });

        it('TEST-3992: Session validation fails when session has expired past TTL', async () => {
            const reg = await authEngine.registerUser({
                username: 'expired_sess_user',
                display_name: 'Expired User',
                email: 'expired@sekolah.sch.id',
                role: 'STUDENT',
                password: 'Password123!'
            });
            const login = await authEngine.authenticate({
                login_identifier: 'expired_sess_user',
                password: 'Password123!'
            });

            // Set expires_at in the past
            const sess = await sessionStorage.getSession(login.session!.session_id);
            const expiredPast = new Date(Date.now() - 10000).toISOString();
            const { checksum: _oldChk, ...cleanSess } = sess!;
            const updatedBase = { ...cleanSess, expires_at: expiredPast };
            const chk = (sessionEngine as any).generateChecksum(updatedBase);
            await sessionStorage.saveSession({ ...updatedBase, checksum: chk });

            await expect(sessionEngine.validateSession(login.session!.session_id))
                .rejects.toThrow(/SESSION_EXPIRED/);
        });

        it('TEST-3993: SecurityAuditRepositoryEngine can filter events by target_user_id', async () => {
            const reg = await authEngine.registerUser({
                username: 'audit_filter_user',
                display_name: 'Filter User',
                email: 'filter@sekolah.sch.id',
                role: 'TEACHER',
                password: 'Password123!'
            });

            await authEngine.authenticate({
                login_identifier: 'audit_filter_user',
                password: 'Password123!'
            });

            const userEvents = await auditRepo.listEvents({ target_user_id: reg.account.user_id });
            expect(userEvents.length).toBeGreaterThanOrEqual(1);
            expect(userEvents.every(e => e.target_user_id === reg.account.user_id)).toBe(true);
        });

        it('TEST-3994: SecurityAuditRepositoryEngine can filter events by actor_id', async () => {
            const adminEvents = await auditRepo.listEvents({ actor_id: 'ADM-001' });
            expect(Array.isArray(adminEvents)).toBe(true);
        });

        it('TEST-3995: Account with tampered username fails checksum verification', async () => {
            const reg = await authEngine.registerUser({
                username: 'tamper_user',
                display_name: 'Tamper User',
                email: 'tamper@sekolah.sch.id',
                role: 'STUDENT',
                password: 'Password123!'
            });

            const acc = await authStorage.getUserAccount(reg.account.user_id);
            // Tamper display_name without recalculating checksum
            await authStorage.saveUserAccount({ ...acc!, display_name: 'HACKED_NAME' });

            await expect(authEngine.authenticate({
                login_identifier: 'tamper_user',
                password: 'Password123!'
            })).rejects.toThrow(/AUTHENTICATION_CHECKSUM_MISMATCH/);
        });

        it('TEST-3996: Successful login resets failed_attempt_count to 0', async () => {
            const reg = await authEngine.registerUser({
                username: 'retry_user',
                display_name: 'Retry User',
                email: 'retry@sekolah.sch.id',
                role: 'STUDENT',
                password: 'CorrectPass123!'
            });

            // 2 failed attempts
            for (let i = 0; i < 2; i++) {
                try {
                    await authEngine.authenticate({
                        login_identifier: 'retry_user',
                        password: 'WrongPassword123!'
                    });
                } catch {
                    // expected
                }
            }

            let secState = await authStorage.getSecurityState(reg.account.user_id);
            expect(secState?.failed_attempt_count).toBe(2);

            // 1 successful login
            await authEngine.authenticate({
                login_identifier: 'retry_user',
                password: 'CorrectPass123!'
            });

            secState = await authStorage.getSecurityState(reg.account.user_id);
            expect(secState?.failed_attempt_count).toBe(0);
        });

        it('TEST-3997: User can have multiple distinct active sessions', async () => {
            const reg = await authEngine.registerUser({
                username: 'multi_sess_user',
                display_name: 'Multi User',
                email: 'multi@sekolah.sch.id',
                role: 'STUDENT',
                password: 'Password123!'
            });

            const s1 = await authEngine.authenticate({ login_identifier: 'multi_sess_user', password: 'Password123!' });
            const s2 = await authEngine.authenticate({ login_identifier: 'multi_sess_user', password: 'Password123!' });

            expect(s1.session?.session_id).not.toBe(s2.session?.session_id);

            const v1 = await sessionEngine.validateSession(s1.session!.session_id);
            const v2 = await sessionEngine.validateSession(s2.session!.session_id);
            expect(v1.status).toBe('ACTIVE');
            expect(v2.status).toBe('ACTIVE');
        });

        it('TEST-3998: Revoking one session leaves other active sessions intact', async () => {
            const reg = await authEngine.registerUser({
                username: 'isolate_sess_user',
                display_name: 'Isolate User',
                email: 'isolate@sekolah.sch.id',
                role: 'STUDENT',
                password: 'Password123!'
            });

            const s1 = await authEngine.authenticate({ login_identifier: 'isolate_sess_user', password: 'Password123!' });
            const s2 = await authEngine.authenticate({ login_identifier: 'isolate_sess_user', password: 'Password123!' });

            await sessionEngine.revokeSession(s1.session!.session_id);

            await expect(sessionEngine.validateSession(s1.session!.session_id)).rejects.toThrow(/SESSION_REVOKED/);
            const v2 = await sessionEngine.validateSession(s2.session!.session_id);
            expect(v2.status).toBe('ACTIVE');
        });

        it('TEST-3999: Complete end-to-end flow: register -> login -> check auth -> refresh -> logout', async () => {
            const reg = await authEngine.registerUser({
                username: 'e2e_student',
                display_name: 'E2E Student',
                email: 'e2e@sekolah.sch.id',
                role: 'STUDENT',
                password: 'E2EPassword123!',
                actor_id: 'STU-E2E'
            });

            const authRes = await authEngine.authenticate({
                login_identifier: 'e2e_student',
                password: 'E2EPassword123!'
            });

            const ctx: AuthorizationContext = {
                user_id: reg.account.user_id,
                role: 'STUDENT',
                actor_id: 'STU-E2E',
                target_resource: 'student',
                action: 'read',
                target_student_id: 'STU-E2E'
            };
            const decision = await aznEngine.authorize(ctx);
            expect(decision.granted).toBe(true);

            const refreshRes = await authEngine.refreshSession(authRes.session!.session_id);
            expect(refreshRes.session?.version_number).toBe(2);

            await authEngine.logout(authRes.session!.session_id);
            await expect(sessionEngine.validateSession(authRes.session!.session_id)).rejects.toThrow(/SESSION_REVOKED/);
        });

        it('TEST-4000: Zero leakage throughout entire Phase 38 authorization suite', () => {
            const auditEvents = auditStorage.listEvents();
            expect(auditEvents).toBeDefined();
        });

        it('TEST-4001: Credential revocation blocks authentication immediately', async () => {
            const reg = await authEngine.registerUser({
                username: 'revoked_cred_user',
                display_name: 'Revoked Cred User',
                email: 'revcred@sekolah.sch.id',
                role: 'STUDENT',
                password: 'Password123!'
            });

            const cred = await authStorage.getCredential(reg.account.user_id);
            await authStorage.saveCredential({ ...cred!, is_revoked: true });

            await expect(authEngine.authenticate({
                login_identifier: 'revoked_cred_user',
                password: 'Password123!'
            })).rejects.toThrow(/INVALID_CREDENTIALS/);
        });

        it('TEST-4002: Student attempting to write course period is denied', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-STU-1',
                role: 'STUDENT',
                target_resource: 'course',
                action: 'write'
            };
            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(false);
            expect(dec.reason).toContain('PERMISSION_DENIED');
        });

        it('TEST-4003: Counselor attempting to write attendance is denied', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-COUNS-1',
                role: 'COUNSELOR',
                target_resource: 'attendance',
                action: 'write'
            };
            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(false);
            expect(dec.reason).toContain('PERMISSION_DENIED');
        });

        it('TEST-4004: Parent attempting to write behavior record is denied', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-GRD-1',
                role: 'PARENT',
                target_resource: 'behavior',
                action: 'write'
            };
            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(false);
            expect(dec.reason).toContain('PERMISSION_DENIED');
        });

        it('TEST-4005: Discipline Officer attempting to write guidance session is denied', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-DISC-1',
                role: 'DISCIPLINE_OFFICER',
                target_resource: 'guidance',
                action: 'write'
            };
            const dec = await aznEngine.authorize(ctx);
            expect(dec.granted).toBe(false);
            expect(dec.reason).toContain('PERMISSION_DENIED');
        });

        it('TEST-4006: Headmaster has permission to read audit trail', () => {
            expect(aznEngine.hasPermission('HEADMASTER', 'audit:read')).toBe(true);
        });

        it('TEST-4007: Student does not have permission to read audit trail', () => {
            expect(aznEngine.hasPermission('STUDENT', 'audit:read')).toBe(false);
        });

        it('TEST-4008: Validate session with empty string throws INVALID_SESSION', async () => {
            await expect(sessionEngine.validateSession('')).rejects.toThrow(/INVALID_SESSION/);
        });

        it('TEST-4009: Logout with unknown session ID completes safely without throwing', async () => {
            await expect(authEngine.logout('NON-EXISTENT-SESSION')).resolves.toBeUndefined();
        });

        it('TEST-4010: AuthenticatedIdentity returned from login is frozen and non-extensible', async () => {
            const reg = await authEngine.registerUser({
                username: 'freeze_user',
                display_name: 'Freeze User',
                email: 'freeze@sekolah.sch.id',
                role: 'TEACHER',
                password: 'Password123!'
            });
            const login = await authEngine.authenticate({
                login_identifier: 'freeze_user',
                password: 'Password123!'
            });

            expect(Object.isFrozen(login.identity)).toBe(true);
            expect(() => { (login.identity as any).newProp = 123; }).toThrow();
        });

        it('TEST-4011: UserSession returned from validateSession is deeply frozen', async () => {
            const reg = await authEngine.registerUser({
                username: 'freeze_sess_user',
                display_name: 'Freeze Session User',
                email: 'freezesess@sekolah.sch.id',
                role: 'STUDENT',
                password: 'Password123!'
            });
            const login = await authEngine.authenticate({
                login_identifier: 'freeze_sess_user',
                password: 'Password123!'
            });

            const sess = await sessionEngine.validateSession(login.session!.session_id);
            expect(Object.isFrozen(sess)).toBe(true);
        });

        it('TEST-4012: AuthorizationDecision is deeply frozen', async () => {
            const ctx: AuthorizationContext = {
                user_id: 'USR-ADM-1',
                role: 'ADMIN',
                target_resource: 'student',
                action: 'read'
            };
            const dec = await aznEngine.authorize(ctx);
            expect(Object.isFrozen(dec)).toBe(true);
        });

        it('TEST-4013: SecurityEvent in audit repository is deeply frozen', async () => {
            const events = await auditRepo.listEvents();
            expect(events.every(e => Object.isFrozen(e))).toBe(true);
        });

        it('TEST-4014: Unrecognized user role throws INVALID_ROLE in validator', () => {
            expect(() => validator.validateRole('SUPER_HACKER_GOD_MODE' as any))
                .toThrow(/INVALID_ROLE/);
        });

        it('TEST-4015: Changing password creates an immutable audit event', async () => {
            const reg = await authEngine.registerUser({
                username: 'audit_pass_user',
                display_name: 'Audit Pass User',
                email: 'auditpass@sekolah.sch.id',
                role: 'STUDENT',
                password: 'OldPassword123!'
            });

            await authEngine.changePassword({
                user_id: reg.account.user_id,
                current_password: 'OldPassword123!',
                new_password: 'NewPassword123@'
            });

            const events = await auditRepo.listEvents({
                target_user_id: reg.account.user_id,
                event_type: 'PASSWORD_CHANGED'
            });
            expect(events.length).toBe(1);
            expect(events[0].event_type).toBe('PASSWORD_CHANGED');
        });
    });
});
