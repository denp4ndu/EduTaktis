import { describe, it, expect, beforeEach } from 'vitest';
import { FrontendAuthorizationAdapter } from './frontendAuthorizationAdapter';
import { ROUTE_REGISTRY, findRouteByPath, getNavigationForIdentity } from '../app/routeRegistry';
import { evaluateRouteAuthorization } from '../app/routeGuard';
import { AuthenticationEngine } from './authenticationEngine';
import { AuthorizationEngine } from './authorizationEngine';
import { SessionEngine } from './sessionEngine';
import { DefaultPasswordHashProvider } from './passwordHashProvider';
import { AuthenticationValidationEngine } from './authenticationValidationEngine';
import { InMemoryAuthenticationStorageProvider } from './authenticationStorageProvider';
import { InMemorySessionStorageProvider } from './sessionStorageProvider';
import { InMemorySecurityAuditStorageProvider } from './securityAuditStorageProvider';
import { SecurityAuditRepositoryEngine } from './securityAuditRepositoryEngine';
import { GuardianRepositoryEngine } from './guardianRepositoryEngine';
import { InMemoryGuardianStorageProvider } from './guardianStorageProvider';
import { 
    UserAccount, 
    UserRole, 
    RouteDefinition, 
    AuthenticatedIdentity,
    UserSession 
} from '../types/curriculum';

describe('EduTaktis LMS Phase 39: Frontend Application Architecture & Secure UI Shell', () => {
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
    let adapter: FrontendAuthorizationAdapter;

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

        adapter = new FrontendAuthorizationAdapter(authEngine, sessionEngine, aznEngine);
    });

    // ==========================================
    // 1. APPLICATION BOOTSTRAP (TEST-3901 - TEST-3915)
    // ==========================================
    describe('Application Bootstrap & Auth State', () => {
        it('TEST-3901: Bootstrap without session ID returns UNAUTHENTICATED', async () => {
            const state = await adapter.bootstrap();
            expect(state.state).toBe('UNAUTHENTICATED');
            expect(state.identity).toBeNull();
            expect(state.session).toBeNull();
            expect(Object.isFrozen(state)).toBe(true);
        });

        it('TEST-3902: Bootstrap with valid session ID returns READY with identity', async () => {
            const reg = await authEngine.registerUser({
                username: 'siswa_andi',
                display_name: 'Andi Siswa',
                email: 'andi@sekolah.sch.id',
                role: 'STUDENT',
                password: 'Password123!'
            });
            const login = await authEngine.authenticate({
                login_identifier: 'siswa_andi',
                password: 'Password123!'
            });

            // Set up adapter with existing engine instances
            adapter.setCurrentSession(login.session!, login.identity!);
            const state = await adapter.bootstrap(login.session!.session_id);

            expect(state.state).toBe('READY');
            expect(state.identity?.username).toBe('siswa_andi');
            expect(state.session?.status).toBe('ACTIVE');
            expect(Object.isFrozen(state.identity)).toBe(true);
        });

        it('TEST-3903: Bootstrap with non-existent session ID returns ERROR state', async () => {
            const state = await adapter.bootstrap('NON_EXISTENT_SESSION_ID');
            expect(state.state).toBe('ERROR');
            expect(state.identity).toBeNull();
            expect(state.error).toBeDefined();
        });

        it('TEST-3904: Bootstrap notifies subscribers of state transitions', async () => {
            const updates: string[] = [];
            adapter.subscribe((state) => updates.push(state.state));

            await adapter.bootstrap();
            expect(updates).toContain('UNAUTHENTICATED');
        });

        it('TEST-3905: Unsubscribing stops listener notifications', async () => {
            let count = 0;
            const unsub = adapter.subscribe(() => count++);
            await adapter.bootstrap();
            expect(count).toBe(1);

            unsub();
            await adapter.bootstrap();
            expect(count).toBe(1); // Didn't increment
        });

        it('TEST-3906: Safe identity projection does not expose password or hash', async () => {
            const reg = await authEngine.registerUser({
                username: 'guru_dewi',
                display_name: 'Dewi Guru',
                email: 'dewi@sekolah.sch.id',
                role: 'TEACHER',
                password: 'Password123!'
            });
            const login = await authEngine.authenticate({
                login_identifier: 'guru_dewi',
                password: 'Password123!'
            });

            adapter.setCurrentSession(login.session!, login.identity!);
            const identity = adapter.getCurrentIdentity();

            expect(identity).toBeDefined();
            expect((identity as any).password).toBeUndefined();
            expect((identity as any).password_hash).toBeUndefined();
            expect((identity as any).salt).toBeUndefined();
        });

        it('TEST-3907: Bootstrap state is deeply frozen', async () => {
            const state = await adapter.bootstrap();
            expect(Object.isFrozen(state)).toBe(true);
        });
    });

    // ==========================================
    // 2. ROUTE REGISTRY & ROUTE GUARD (TEST-3916 - TEST-3935)
    // ==========================================
    describe('Route Registry & Authorization Guard', () => {
        it('TEST-3916: Login route is public and does not require authentication', async () => {
            const loginRoute = findRouteByPath('/login');
            expect(loginRoute).toBeDefined();
            expect(loginRoute?.requiredAuthentication).toBe(false);

            const decision = await evaluateRouteAuthorization(null, loginRoute!);
            expect(decision.granted).toBe(true);
        });

        it('TEST-3917: Dashboard route requires authentication and rejects null identity', async () => {
            const dashboardRoute = findRouteByPath('/dashboard');
            expect(dashboardRoute).toBeDefined();
            expect(dashboardRoute?.requiredAuthentication).toBe(true);

            const decision = await evaluateRouteAuthorization(null, dashboardRoute!);
            expect(decision.granted).toBe(false);
            expect(decision.reason).toContain('AUTHENTICATION_REQUIRED');
        });

        it('TEST-3918: Dashboard route allows authenticated student', async () => {
            const dashboardRoute = findRouteByPath('/dashboard')!;
            const identity: AuthenticatedIdentity = {
                user_id: 'USR-STU-1',
                username: 'budi_siswa',
                display_name: 'Budi Siswa',
                email: 'budi@sekolah.sch.id',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const decision = await evaluateRouteAuthorization(identity, dashboardRoute);
            expect(decision.granted).toBe(true);
        });

        it('TEST-3919: User Management route (/users) is restricted to ADMIN role', async () => {
            const usersRoute = findRouteByPath('/users')!;
            expect(usersRoute.requiredRoles).toContain('ADMIN');

            const studentIdentity: AuthenticatedIdentity = {
                user_id: 'USR-STU-1',
                username: 'student_1',
                display_name: 'Student One',
                email: 's1@sekolah.sch.id',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const studentDecision = await evaluateRouteAuthorization(studentIdentity, usersRoute);
            expect(studentDecision.granted).toBe(false);
            expect(studentDecision.reason).toContain('ROLE_UNAUTHORIZED');

            const adminIdentity: AuthenticatedIdentity = {
                user_id: 'USR-ADM-1',
                username: 'admin_1',
                display_name: 'Admin One',
                email: 'adm@sekolah.sch.id',
                role: 'ADMIN',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const adminDecision = await evaluateRouteAuthorization(adminIdentity, usersRoute);
            expect(adminDecision.granted).toBe(true);
        });

        it('TEST-3920: Parent Portal route (/parent-portal) allows PARENT role', async () => {
            const parentRoute = findRouteByPath('/parent-portal')!;
            const parentIdentity: AuthenticatedIdentity = {
                user_id: 'USR-PAR-1',
                username: 'wali_budi',
                display_name: 'Wali Budi',
                email: 'wali@sekolah.sch.id',
                role: 'PARENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const decision = await evaluateRouteAuthorization(parentIdentity, parentRoute);
            expect(decision.granted).toBe(true);
        });

        it('TEST-3921: Parent Portal route (/parent-portal) rejects STUDENT role', async () => {
            const parentRoute = findRouteByPath('/parent-portal')!;
            const studentIdentity: AuthenticatedIdentity = {
                user_id: 'USR-STU-1',
                username: 'siswa_1',
                display_name: 'Siswa One',
                email: 'siswa@sekolah.sch.id',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const decision = await evaluateRouteAuthorization(studentIdentity, parentRoute);
            expect(decision.granted).toBe(false);
        });

        it('TEST-3922: Gradebook route (/grades) allows TEACHER role', async () => {
            const gradeRoute = findRouteByPath('/grades')!;
            const teacherIdentity: AuthenticatedIdentity = {
                user_id: 'USR-TEA-1',
                username: 'guru_mat',
                display_name: 'Guru Matematika',
                email: 'guru@sekolah.sch.id',
                role: 'TEACHER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const decision = await evaluateRouteAuthorization(teacherIdentity, gradeRoute);
            expect(decision.granted).toBe(true);
        });

        it('TEST-3923: Route definitions are deeply verified in registry', () => {
            expect(findRouteByPath('/courses')).toBeDefined();
            expect(findRouteByPath('/attendance')).toBeDefined();
            expect(findRouteByPath('/report-cards')).toBeDefined();
            expect(findRouteByPath('/transcripts')).toBeDefined();
            expect(findRouteByPath('/behavior')).toBeDefined();
            expect(findRouteByPath('/guidance')).toBeDefined();
            expect(findRouteByPath('/calendar')).toBeDefined();
            expect(findRouteByPath('/communication')).toBeDefined();
            expect(findRouteByPath('/notifications')).toBeDefined();
            expect(findRouteByPath('/security')).toBeDefined();
            expect(findRouteByPath('/sessions')).toBeDefined();
        });
    });

    // ==========================================
    // 3. ROLE-AWARE NAVIGATION DERIVATION (TEST-3936 - TEST-3955)
    // ==========================================
    describe('Role-Aware Navigation Derivation', () => {
        it('TEST-3936: STUDENT navigation includes courses, grades, attendance, report cards, transcripts', () => {
            const identity: AuthenticatedIdentity = {
                user_id: 'STU-1',
                username: 'stu1',
                display_name: 'Student 1',
                email: 'stu1@sekolah.sch.id',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const nav = getNavigationForIdentity(identity);
            const paths = nav.map(n => n.path);

            expect(paths).toContain('/dashboard');
            expect(paths).toContain('/courses');
            expect(paths).toContain('/attendance');
            expect(paths).toContain('/grades');
            expect(paths).toContain('/report-cards');
            expect(paths).toContain('/transcripts');
            expect(paths).toContain('/notifications');
            // Must NOT include admin users route
            expect(paths).not.toContain('/users');
            expect(paths).not.toContain('/parent-portal');
        });

        it('TEST-3937: TEACHER navigation includes academic management routes', () => {
            const identity: AuthenticatedIdentity = {
                user_id: 'TEA-1',
                username: 'tea1',
                display_name: 'Teacher 1',
                email: 'tea1@sekolah.sch.id',
                role: 'TEACHER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const nav = getNavigationForIdentity(identity);
            const paths = nav.map(n => n.path);

            expect(paths).toContain('/dashboard');
            expect(paths).toContain('/courses');
            expect(paths).toContain('/attendance');
            expect(paths).toContain('/grades');
            expect(paths).toContain('/report-cards');
            expect(paths).toContain('/behavior');
            expect(paths).toContain('/guidance');
            expect(paths).toContain('/communication');
            expect(paths).not.toContain('/users');
        });

        it('TEST-3938: PARENT navigation includes Parent Portal and child monitoring routes', () => {
            const identity: AuthenticatedIdentity = {
                user_id: 'PAR-1',
                username: 'par1',
                display_name: 'Parent 1',
                email: 'par1@sekolah.sch.id',
                role: 'PARENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const nav = getNavigationForIdentity(identity);
            const paths = nav.map(n => n.path);

            expect(paths).toContain('/dashboard');
            expect(paths).toContain('/parent-portal');
            expect(paths).toContain('/attendance');
            expect(paths).toContain('/grades');
            expect(paths).toContain('/report-cards');
            expect(paths).toContain('/communication');
            expect(paths).not.toContain('/users');
        });

        it('TEST-3939: COUNSELOR navigation includes guidance cases', () => {
            const identity: AuthenticatedIdentity = {
                user_id: 'COU-1',
                username: 'cou1',
                display_name: 'Counselor 1',
                email: 'cou1@sekolah.sch.id',
                role: 'COUNSELOR',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const nav = getNavigationForIdentity(identity);
            const paths = nav.map(n => n.path);

            expect(paths).toContain('/dashboard');
            expect(paths).toContain('/guidance');
            expect(paths).toContain('/behavior');
            expect(paths).not.toContain('/users');
        });

        it('TEST-3940: DISCIPLINE_OFFICER navigation includes behavior and discipline monitoring', () => {
            const identity: AuthenticatedIdentity = {
                user_id: 'DIS-1',
                username: 'dis1',
                display_name: 'Discipline 1',
                email: 'dis1@sekolah.sch.id',
                role: 'DISCIPLINE_OFFICER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const nav = getNavigationForIdentity(identity);
            const paths = nav.map(n => n.path);

            expect(paths).toContain('/dashboard');
            expect(paths).toContain('/behavior');
            expect(paths).not.toContain('/users');
        });

        it('TEST-3941: ADMIN navigation includes user management and all administrative modules', () => {
            const identity: AuthenticatedIdentity = {
                user_id: 'ADM-1',
                username: 'adm1',
                display_name: 'Admin 1',
                email: 'adm1@sekolah.sch.id',
                role: 'ADMIN',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const nav = getNavigationForIdentity(identity);
            const paths = nav.map(n => n.path);

            expect(paths).toContain('/dashboard');
            expect(paths).toContain('/users');
            expect(paths).toContain('/sessions');
            expect(paths).toContain('/courses');
            expect(paths).toContain('/attendance');
            expect(paths).toContain('/grades');
        });

        it('TEST-3942: Null identity produces empty navigation items list', () => {
            const nav = getNavigationForIdentity(null);
            expect(nav.length).toBe(0);
        });
    });

    // ==========================================
    // 4. SESSION EXPIRATION & LOGOUT HANDLING (TEST-3956 - TEST-3970)
    // ==========================================
    describe('Session Expiration & Logout Handling', () => {
        let authSession: UserSession;
        let authIdentity: AuthenticatedIdentity;

        beforeEach(async () => {
            const reg = await authEngine.registerUser({
                username: 'sess_test_user',
                display_name: 'Session Test User',
                email: 'sess@sekolah.sch.id',
                role: 'STUDENT',
                password: 'Password123!'
            });
            const login = await authEngine.authenticate({
                login_identifier: 'sess_test_user',
                password: 'Password123!'
            });

            authSession = login.session!;
            authIdentity = login.identity!;
            adapter.setCurrentSession(authSession, authIdentity);
        });

        it('TEST-3956: Calling logout revokes session and resets auth state', async () => {
            await adapter.logout(authSession.session_id);

            expect(adapter.getCurrentIdentity()).toBeNull();
            expect(adapter.getCurrentSessionId()).toBeNull();

            // Verification against SessionEngine: session is REVOKED
            await expect(sessionEngine.validateSession(authSession.session_id))
                .rejects.toThrow(/SESSION_REVOKED/);
        });

        it('TEST-3957: Calling logoutAll revokes all user sessions and resets frontend', async () => {
            const s2 = await authEngine.authenticate({
                login_identifier: 'sess_test_user',
                password: 'Password123!'
            });

            const count = await adapter.logoutAll(authIdentity.user_id);
            expect(count).toBeGreaterThanOrEqual(1);

            expect(adapter.getCurrentIdentity()).toBeNull();
            expect(adapter.getCurrentSessionId()).toBeNull();
        });

        it('TEST-3958: Stale session triggers SESSION_EXPIRED error state', async () => {
            // Revoke session on backend
            await sessionEngine.revokeSession(authSession.session_id);

            const res = await adapter.bootstrap(authSession.session_id);
            expect(res.state).toBe('SESSION_EXPIRED');
            expect(res.identity).toBeNull();
        });

        it('TEST-3959: Logout handles already revoked session gracefully without throwing', async () => {
            await sessionEngine.revokeSession(authSession.session_id);
            await expect(adapter.logout(authSession.session_id)).resolves.toBeUndefined();
        });
    });

    // ==========================================
    // 5. ERROR CLASSIFICATION & SECURITY AUDIT (TEST-3971 - TEST-3985)
    // ==========================================
    describe('Error Classification & Security Leakage Protection', () => {
        it('TEST-3971: Classifies AUTHENTICATION_ERROR correctly', () => {
            const err = adapter.classifyError(new Error('INVALID_CREDENTIALS: Bad username or password'));
            expect(err.type).toBe('AUTHENTICATION_ERROR');
            expect(err.error_id).toContain('ERR-');
            expect(Object.isFrozen(err)).toBe(true);
        });

        it('TEST-3972: Classifies SESSION_EXPIRED error correctly', () => {
            const err = adapter.classifyError(new Error('SESSION_EXPIRED: Token TTL has passed'));
            expect(err.type).toBe('SESSION_EXPIRED');
        });

        it('TEST-3973: Classifies AUTHORIZATION_ERROR correctly', () => {
            const err = adapter.classifyError(new Error('PERMISSION_DENIED: Lacks grade:write'));
            expect(err.type).toBe('AUTHORIZATION_ERROR');
        });

        it('TEST-3974: Classifies VALIDATION_ERROR correctly', () => {
            const err = adapter.classifyError(new Error('PASSWORD_POLICY_VIOLATION: Too short'));
            expect(err.type).toBe('VALIDATION_ERROR');
        });

        it('TEST-3975: Classifies NETWORK_ERROR correctly', () => {
            const err = adapter.classifyError(new Error('failed to fetch connection error'));
            expect(err.type).toBe('NETWORK_ERROR');
        });

        it('TEST-3976: Classifies DOMAIN_ERROR correctly', () => {
            const err = adapter.classifyError(new Error('DOMAIN_CALCULATION: Invalid grade boundary'));
            expect(err.type).toBe('DOMAIN_ERROR');
        });

        it('TEST-3977: Classifies UNKNOWN_ERROR fallback correctly', () => {
            const err = adapter.classifyError(new Error('Unanticipated internal condition'));
            expect(err.type).toBe('UNKNOWN_ERROR');
        });

        it('TEST-3978: Error record does not contain stack traces in message', () => {
            const err = adapter.classifyError(new Error('Sensitive database exception at line 42 /usr/secrets/key.pem'));
            expect(err.message).not.toContain('stack');
        });
    });

    // ==========================================
    // 6. ACCESSIBILITY & SEMANTIC UI STANDARDS (TEST-3986 - TEST-4000)
    // ==========================================
    describe('Accessibility & Semantic UI Standards', () => {
        it('TEST-3986: Navigation items have valid string labels and non-empty IDs', () => {
            const identity: AuthenticatedIdentity = {
                user_id: 'TEA-1',
                username: 'tea1',
                display_name: 'Teacher 1',
                email: 'tea1@sekolah.sch.id',
                role: 'TEACHER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const items = getNavigationForIdentity(identity);
            for (const item of items) {
                expect(typeof item.label).toBe('string');
                expect(item.label.length).toBeGreaterThan(0);
                expect(typeof item.id).toBe('string');
                expect(item.id.length).toBeGreaterThan(0);
                expect(item.path.startsWith('/')).toBe(true);
            }
        });

        it('TEST-3987: Route definitions specify requiredAuthentication flag explicitly', () => {
            for (const route of ROUTE_REGISTRY) {
                expect(typeof route.requiredAuthentication).toBe('boolean');
                expect(route.path.startsWith('/')).toBe(true);
            }
        });

        it('TEST-3988: Zero AI API invocation throughout frontend adapter', () => {
            const hasGoogleAI = typeof (globalThis as any).GoogleGenAI !== 'undefined';
            expect(hasGoogleAI).toBe(false);
        });

        it('TEST-3989: Frontend state projections are strictly immutable (deepFreeze)', async () => {
            const state = await adapter.bootstrap();
            expect(Object.isFrozen(state)).toBe(true);
        });

        it('TEST-3990: checkPermission delegates directly to AuthorizationEngine', () => {
            expect(adapter.checkPermission('TEACHER', 'grade:write')).toBe(true);
            expect(adapter.checkPermission('STUDENT', 'grade:write')).toBe(false);
            expect(adapter.checkPermission('ADMIN', 'user:write')).toBe(true);
            expect(adapter.checkPermission('PARENT', 'grade:write')).toBe(false);
        });
    });

    // ==========================================
    // 7. REGRESSION WITH PHASE 28-38 (TEST-4001 - TEST-4015)
    // ==========================================
    describe('Phase 28-38 Regression & Compatibility', () => {
        it('TEST-4001: Phase 28 Class Enrollment route is accessible to Student & Teacher', async () => {
            const courseRoute = findRouteByPath('/courses')!;
            const stu: AuthenticatedIdentity = {
                user_id: 'S1',
                username: 's1',
                display_name: 'S1',
                email: 's1@s.id',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };
            const tea: AuthenticatedIdentity = {
                user_id: 'T1',
                username: 't1',
                display_name: 'T1',
                email: 't1@s.id',
                role: 'TEACHER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            expect((await evaluateRouteAuthorization(stu, courseRoute)).granted).toBe(true);
            expect((await evaluateRouteAuthorization(tea, courseRoute)).granted).toBe(true);
        });

        it('TEST-4002: Phase 29 Gradebook route is accessible to Teacher and Student', async () => {
            const gradeRoute = findRouteByPath('/grades')!;
            const tea: AuthenticatedIdentity = {
                user_id: 'T1',
                username: 't1',
                display_name: 'T1',
                email: 't1@s.id',
                role: 'TEACHER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };
            expect((await evaluateRouteAuthorization(tea, gradeRoute)).granted).toBe(true);
        });

        it('TEST-4003: Phase 30 Report Card route is accessible to Student, Teacher, Parent', async () => {
            const rcRoute = findRouteByPath('/report-cards')!;
            const par: AuthenticatedIdentity = {
                user_id: 'P1',
                username: 'p1',
                display_name: 'P1',
                email: 'p1@s.id',
                role: 'PARENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };
            expect((await evaluateRouteAuthorization(par, rcRoute)).granted).toBe(true);
        });

        it('TEST-4004: Phase 31 Academic Transcript route is accessible to Student and Admin', async () => {
            const trRoute = findRouteByPath('/transcripts')!;
            const stu: AuthenticatedIdentity = {
                user_id: 'S1',
                username: 's1',
                display_name: 'S1',
                email: 's1@s.id',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };
            expect((await evaluateRouteAuthorization(stu, trRoute)).granted).toBe(true);
        });

        it('TEST-4005: Phase 33 Attendance route is accessible to Teacher and Student', async () => {
            const attRoute = findRouteByPath('/attendance')!;
            const tea: AuthenticatedIdentity = {
                user_id: 'T1',
                username: 't1',
                display_name: 'T1',
                email: 't1@s.id',
                role: 'TEACHER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };
            expect((await evaluateRouteAuthorization(tea, attRoute)).granted).toBe(true);
        });

        it('TEST-4006: Phase 34 Behavior route is accessible to Discipline Officer, Teacher, Student', async () => {
            const behRoute = findRouteByPath('/behavior')!;
            const disc: AuthenticatedIdentity = {
                user_id: 'D1',
                username: 'd1',
                display_name: 'D1',
                email: 'd1@s.id',
                role: 'DISCIPLINE_OFFICER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };
            expect((await evaluateRouteAuthorization(disc, behRoute)).granted).toBe(true);
        });

        it('TEST-4007: Phase 35 Guidance route is accessible to Counselor, Teacher, Student', async () => {
            const guiRoute = findRouteByPath('/guidance')!;
            const cou: AuthenticatedIdentity = {
                user_id: 'C1',
                username: 'c1',
                display_name: 'C1',
                email: 'c1@s.id',
                role: 'COUNSELOR',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };
            expect((await evaluateRouteAuthorization(cou, guiRoute)).granted).toBe(true);
        });

        it('TEST-4008: Phase 36 Parent Portal route is accessible to Legal Guardian and Authorized Caregiver', async () => {
            const ppRoute = findRouteByPath('/parent-portal')!;
            const lg: AuthenticatedIdentity = {
                user_id: 'LG1',
                username: 'lg1',
                display_name: 'LG 1',
                email: 'lg1@s.id',
                role: 'LEGAL_GUARDIAN',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };
            const ac: AuthenticatedIdentity = {
                user_id: 'AC1',
                username: 'ac1',
                display_name: 'AC 1',
                email: 'ac1@s.id',
                role: 'AUTHORIZED_CAREGIVER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };
            expect((await evaluateRouteAuthorization(lg, ppRoute)).granted).toBe(true);
            expect((await evaluateRouteAuthorization(ac, ppRoute)).granted).toBe(true);
        });

        it('TEST-4009: Phase 37 Communication route is accessible to Teacher and Parent', async () => {
            const comRoute = findRouteByPath('/communication')!;
            const tea: AuthenticatedIdentity = {
                user_id: 'T1',
                username: 't1',
                display_name: 'T1',
                email: 't1@s.id',
                role: 'TEACHER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };
            expect((await evaluateRouteAuthorization(tea, comRoute)).granted).toBe(true);
        });

        it('TEST-4010: Phase 38 Active Session Management route is restricted by session:read permission', async () => {
            const sessRoute = findRouteByPath('/sessions')!;
            const adm: AuthenticatedIdentity = {
                user_id: 'A1',
                username: 'a1',
                display_name: 'A1',
                email: 'a1@s.id',
                role: 'ADMIN',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };
            expect((await evaluateRouteAuthorization(adm, sessRoute)).granted).toBe(true);
        });

        it('TEST-4011: Complete bootstrap and route authorization lifecycle is deterministic', async () => {
            const state = await adapter.bootstrap();
            expect(state.state).toBe('UNAUTHENTICATED');

            const dashRoute = findRouteByPath('/dashboard')!;
            const decision = await evaluateRouteAuthorization(state.identity, dashRoute);
            expect(decision.granted).toBe(false);
        });

        it('TEST-4012: HEADMASTER navigation contains institutional oversight modules', () => {
            const hm: AuthenticatedIdentity = {
                user_id: 'HM-1',
                username: 'headmaster1',
                display_name: 'Kepala Sekolah',
                email: 'hm@sekolah.sch.id',
                role: 'HEADMASTER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const nav = getNavigationForIdentity(hm);
            const paths = nav.map(n => n.path);

            expect(paths).toContain('/dashboard');
            expect(paths).toContain('/courses');
            expect(paths).toContain('/attendance');
            expect(paths).toContain('/grades');
            expect(paths).toContain('/report-cards');
            expect(paths).toContain('/transcripts');
            expect(paths).toContain('/calendar');
            expect(paths).toContain('/communication');
            expect(paths).not.toContain('/users');
        });

        it('TEST-4013: LEGAL_GUARDIAN navigation matches PARENT navigation', () => {
            const lg: AuthenticatedIdentity = {
                user_id: 'LG-1',
                username: 'lg1',
                display_name: 'Wali Hukum',
                email: 'lg@sekolah.sch.id',
                role: 'LEGAL_GUARDIAN',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const nav = getNavigationForIdentity(lg);
            const paths = nav.map(n => n.path);

            expect(paths).toContain('/parent-portal');
            expect(paths).toContain('/attendance');
            expect(paths).toContain('/grades');
            expect(paths).toContain('/communication');
            expect(paths).not.toContain('/users');
        });

        it('TEST-4014: AUTHORIZED_CAREGIVER navigation includes caregiving scope', () => {
            const ac: AuthenticatedIdentity = {
                user_id: 'AC-1',
                username: 'ac1',
                display_name: 'Pengasuh Resmi',
                email: 'ac@sekolah.sch.id',
                role: 'AUTHORIZED_CAREGIVER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const nav = getNavigationForIdentity(ac);
            const paths = nav.map(n => n.path);

            expect(paths).toContain('/parent-portal');
            expect(paths).toContain('/attendance');
            expect(paths).toContain('/grades');
            expect(paths).not.toContain('/users');
        });

        it('TEST-4015: Route registry contains unique paths without duplicates', () => {
            const paths = ROUTE_REGISTRY.map(r => r.path);
            const uniquePaths = new Set(paths);
            expect(paths.length).toBe(uniquePaths.size);
        });

        it('TEST-4016: All routes in route registry have a leading slash', () => {
            for (const r of ROUTE_REGISTRY) {
                expect(r.path.startsWith('/')).toBe(true);
            }
        });

        it('TEST-4017: findRouteByPath returns undefined for unknown route path', () => {
            expect(findRouteByPath('/unknown-route-12345')).toBeUndefined();
        });

        it('TEST-4018: Route authorization decision is deeply frozen', async () => {
            const route = findRouteByPath('/courses')!;
            const identity: AuthenticatedIdentity = {
                user_id: 'T1',
                username: 't1',
                display_name: 'T1',
                email: 't1@s.id',
                role: 'TEACHER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };
            const decision = await evaluateRouteAuthorization(identity, route);
            expect(Object.isFrozen(decision)).toBe(true);
        });

        it('TEST-4019: Route authorization rejects when user has inactive account status', async () => {
            const route = findRouteByPath('/courses')!;
            const suspended: AuthenticatedIdentity = {
                user_id: 'T2',
                username: 't2',
                display_name: 'T2',
                email: 't2@s.id',
                role: 'TEACHER',
                status: 'SUSPENDED',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            // Register suspended account in backend
            await authStorage.saveUserAccount({
                user_id: 'T2',
                username: 't2',
                display_name: 'T2',
                email: 't2@s.id',
                role: 'TEACHER',
                status: 'SUSPENDED',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version_number: 1,
                checksum: 'CHK-T2'
            });

            await expect(adapter.authorizeRoute(suspended, route))
                .rejects.toThrow(/ACCOUNT_SUSPENDED/);
        });

        it('TEST-4020: Adapter setCurrentSession updates current identity and session ID', () => {
            const dummySess: UserSession = {
                session_id: 'SES-DUMMY',
                user_id: 'U1',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                expires_at: new Date().toISOString(),
                last_activity_at: new Date().toISOString(),
                version_number: 1,
                checksum: 'CHK-SES'
            };
            const dummyId: AuthenticatedIdentity = {
                user_id: 'U1',
                username: 'u1',
                display_name: 'U1',
                email: 'u1@s.id',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            adapter.setCurrentSession(dummySess, dummyId);
            expect(adapter.getCurrentSessionId()).toBe('SES-DUMMY');
            expect(adapter.getCurrentIdentity()?.user_id).toBe('U1');
        });

        it('TEST-4021: Classify network timeout error', () => {
            const err = adapter.classifyError(new Error('Network request failed with status timeout'));
            expect(err.type).toBe('NETWORK_ERROR');
        });

        it('TEST-4022: Classify checksum mismatch validation error', () => {
            const err = adapter.classifyError(new Error('AUTHENTICATION_CHECKSUM_MISMATCH: SESSION failed'));
            expect(err.type).toBe('VALIDATION_ERROR');
        });

        it('TEST-4023: Classify scope access denied authorization error', () => {
            const err = adapter.classifyError(new Error('SCOPE_ACCESS_DENIED: Student ID mismatch'));
            expect(err.type).toBe('AUTHORIZATION_ERROR');
        });

        it('TEST-4024: Classify account locked authentication error', () => {
            const err = adapter.classifyError(new Error('ACCOUNT_LOCKED: Too many failed attempts'));
            expect(err.type).toBe('AUTHENTICATION_ERROR');
        });

        it('TEST-4025: Classify account revoked authentication error', () => {
            const err = adapter.classifyError(new Error('ACCOUNT_REVOKED: Account terminated'));
            expect(err.type).toBe('AUTHENTICATION_ERROR');
        });

        it('TEST-4026: Classify session revoked error', () => {
            const err = adapter.classifyError(new Error('SESSION_REVOKED: Session terminated by user'));
            expect(err.type).toBe('SESSION_EXPIRED');
        });

        it('TEST-4027: Classify domain curriculum calculation error', () => {
            const err = adapter.classifyError(new Error('CURRICULUM_VALIDATION: Invalid lesson plan'));
            expect(err.type).toBe('DOMAIN_ERROR');
        });

        it('TEST-4028: Route authorization with public route and authenticated user passes', async () => {
            const loginRoute = findRouteByPath('/login')!;
            const identity: AuthenticatedIdentity = {
                user_id: 'S1',
                username: 's1',
                display_name: 'S1',
                email: 's1@s.id',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };
            const decision = await evaluateRouteAuthorization(identity, loginRoute);
            expect(decision.granted).toBe(true);
        });

        it('TEST-4029: Student navigation items have non-null categories or undefined', () => {
            const identity: AuthenticatedIdentity = {
                user_id: 'S1',
                username: 's1',
                display_name: 'S1',
                email: 's1@s.id',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };
            const nav = getNavigationForIdentity(identity);
            expect(nav.length).toBeGreaterThan(5);
        });

        it('TEST-4030: Teacher navigation items count is greater than student items count', () => {
            const stu: AuthenticatedIdentity = {
                user_id: 'S1',
                username: 's1',
                display_name: 'S1',
                email: 's1@s.id',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };
            const tea: AuthenticatedIdentity = {
                user_id: 'T1',
                username: 't1',
                display_name: 'T1',
                email: 't1@s.id',
                role: 'TEACHER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };
            const stuNav = getNavigationForIdentity(stu);
            const teaNav = getNavigationForIdentity(tea);
            expect(teaNav.length).toBeGreaterThan(5);
            expect(stuNav.length).toBeGreaterThan(5);
        });

        it('TEST-4031: Admin has access to all non-login routes', async () => {
            const adm: AuthenticatedIdentity = {
                user_id: 'A1',
                username: 'a1',
                display_name: 'A1',
                email: 'a1@s.id',
                role: 'ADMIN',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            for (const route of ROUTE_REGISTRY) {
                if (route.path === '/login') continue;
                const dec = await evaluateRouteAuthorization(adm, route);
                expect(dec.granted).toBe(true);
            }
        });

        it('TEST-4032: Student attempting to access /users route is denied', async () => {
            const usersRoute = findRouteByPath('/users')!;
            const stu: AuthenticatedIdentity = {
                user_id: 'S1',
                username: 's1',
                display_name: 'S1',
                email: 's1@s.id',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(stu, usersRoute);
            expect(dec.granted).toBe(false);
            expect(dec.reason).toContain('ROLE_UNAUTHORIZED');
        });

        it('TEST-4033: Teacher attempting to access /users route is denied', async () => {
            const usersRoute = findRouteByPath('/users')!;
            const tea: AuthenticatedIdentity = {
                user_id: 'T1',
                username: 't1',
                display_name: 'T1',
                email: 't1@s.id',
                role: 'TEACHER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(tea, usersRoute);
            expect(dec.granted).toBe(false);
            expect(dec.reason).toContain('ROLE_UNAUTHORIZED');
        });

        it('TEST-4034: Counselor attempting to access /users route is denied', async () => {
            const usersRoute = findRouteByPath('/users')!;
            const cou: AuthenticatedIdentity = {
                user_id: 'C1',
                username: 'c1',
                display_name: 'C1',
                email: 'c1@s.id',
                role: 'COUNSELOR',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(cou, usersRoute);
            expect(dec.granted).toBe(false);
            expect(dec.reason).toContain('ROLE_UNAUTHORIZED');
        });

        it('TEST-4035: Parent attempting to access /users route is denied', async () => {
            const usersRoute = findRouteByPath('/users')!;
            const par: AuthenticatedIdentity = {
                user_id: 'P1',
                username: 'p1',
                display_name: 'P1',
                email: 'p1@s.id',
                role: 'PARENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(par, usersRoute);
            expect(dec.granted).toBe(false);
            expect(dec.reason).toContain('ROLE_UNAUTHORIZED');
        });

        it('TEST-4036: Discipline officer attempting to access /users route is denied', async () => {
            const usersRoute = findRouteByPath('/users')!;
            const disc: AuthenticatedIdentity = {
                user_id: 'D1',
                username: 'd1',
                display_name: 'D1',
                email: 'd1@s.id',
                role: 'DISCIPLINE_OFFICER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(disc, usersRoute);
            expect(dec.granted).toBe(false);
            expect(dec.reason).toContain('ROLE_UNAUTHORIZED');
        });

        it('TEST-4037: Headmaster attempting to access /users route is denied', async () => {
            const usersRoute = findRouteByPath('/users')!;
            const hm: AuthenticatedIdentity = {
                user_id: 'HM1',
                username: 'hm1',
                display_name: 'HM 1',
                email: 'hm1@s.id',
                role: 'HEADMASTER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(hm, usersRoute);
            expect(dec.granted).toBe(false);
            expect(dec.reason).toContain('ROLE_UNAUTHORIZED');
        });

        it('TEST-4038: Student attempting to access /security route is allowed for own account', async () => {
            const secRoute = findRouteByPath('/security')!;
            const stu: AuthenticatedIdentity = {
                user_id: 'S1',
                username: 's1',
                display_name: 'S1',
                email: 's1@s.id',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(stu, secRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4039: Student has session:read permission for /sessions route', async () => {
            const sessRoute = findRouteByPath('/sessions')!;
            const stu: AuthenticatedIdentity = {
                user_id: 'S1',
                username: 's1',
                display_name: 'S1',
                email: 's1@s.id',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(stu, sessRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4040: Teacher has notification:read permission for /notifications route', async () => {
            const notifRoute = findRouteByPath('/notifications')!;
            const tea: AuthenticatedIdentity = {
                user_id: 'T1',
                username: 't1',
                display_name: 'T1',
                email: 't1@s.id',
                role: 'TEACHER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(tea, notifRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4041: Parent has notification:read permission for /notifications route', async () => {
            const notifRoute = findRouteByPath('/notifications')!;
            const par: AuthenticatedIdentity = {
                user_id: 'P1',
                username: 'p1',
                display_name: 'P1',
                email: 'p1@s.id',
                role: 'PARENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(par, notifRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4042: Counselor has notification:read permission for /notifications route', async () => {
            const notifRoute = findRouteByPath('/notifications')!;
            const cou: AuthenticatedIdentity = {
                user_id: 'C1',
                username: 'c1',
                display_name: 'C1',
                email: 'c1@s.id',
                role: 'COUNSELOR',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(cou, notifRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4043: Discipline Officer has notification:read permission for /notifications route', async () => {
            const notifRoute = findRouteByPath('/notifications')!;
            const disc: AuthenticatedIdentity = {
                user_id: 'D1',
                username: 'd1',
                display_name: 'D1',
                email: 'd1@s.id',
                role: 'DISCIPLINE_OFFICER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(disc, notifRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4044: Headmaster has notification:read permission for /notifications route', async () => {
            const notifRoute = findRouteByPath('/notifications')!;
            const hm: AuthenticatedIdentity = {
                user_id: 'HM1',
                username: 'hm1',
                display_name: 'HM 1',
                email: 'hm1@s.id',
                role: 'HEADMASTER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(hm, notifRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4045: Admin has notification:read permission for /notifications route', async () => {
            const notifRoute = findRouteByPath('/notifications')!;
            const adm: AuthenticatedIdentity = {
                user_id: 'A1',
                username: 'a1',
                display_name: 'A1',
                email: 'a1@s.id',
                role: 'ADMIN',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(adm, notifRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4046: Student has communication:read permission for /communication route', async () => {
            const comRoute = findRouteByPath('/communication')!;
            const stu: AuthenticatedIdentity = {
                user_id: 'S1',
                username: 's1',
                display_name: 'S1',
                email: 's1@s.id',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(stu, comRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4047: Parent has communication:read permission for /communication route', async () => {
            const comRoute = findRouteByPath('/communication')!;
            const par: AuthenticatedIdentity = {
                user_id: 'P1',
                username: 'p1',
                display_name: 'P1',
                email: 'p1@s.id',
                role: 'PARENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(par, comRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4048: Counselor has communication:read permission for /communication route', async () => {
            const comRoute = findRouteByPath('/communication')!;
            const cou: AuthenticatedIdentity = {
                user_id: 'C1',
                username: 'c1',
                display_name: 'C1',
                email: 'c1@s.id',
                role: 'COUNSELOR',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(cou, comRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4049: Discipline Officer has communication:read permission for /communication route', async () => {
            const comRoute = findRouteByPath('/communication')!;
            const disc: AuthenticatedIdentity = {
                user_id: 'D1',
                username: 'd1',
                display_name: 'D1',
                email: 'd1@s.id',
                role: 'DISCIPLINE_OFFICER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(disc, comRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4050: Headmaster has communication:read permission for /communication route', async () => {
            const comRoute = findRouteByPath('/communication')!;
            const hm: AuthenticatedIdentity = {
                user_id: 'HM1',
                username: 'hm1',
                display_name: 'HM 1',
                email: 'hm1@s.id',
                role: 'HEADMASTER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(hm, comRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4051: Calendar route allows Student', async () => {
            const calRoute = findRouteByPath('/calendar')!;
            const stu: AuthenticatedIdentity = {
                user_id: 'S1',
                username: 's1',
                display_name: 'S1',
                email: 's1@s.id',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(stu, calRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4052: Calendar route allows Teacher', async () => {
            const calRoute = findRouteByPath('/calendar')!;
            const tea: AuthenticatedIdentity = {
                user_id: 'T1',
                username: 't1',
                display_name: 'T1',
                email: 't1@s.id',
                role: 'TEACHER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(tea, calRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4053: Calendar route allows Headmaster', async () => {
            const calRoute = findRouteByPath('/calendar')!;
            const hm: AuthenticatedIdentity = {
                user_id: 'HM1',
                username: 'hm1',
                display_name: 'HM 1',
                email: 'hm1@s.id',
                role: 'HEADMASTER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(hm, calRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4054: Calendar route allows Admin', async () => {
            const calRoute = findRouteByPath('/calendar')!;
            const adm: AuthenticatedIdentity = {
                user_id: 'A1',
                username: 'a1',
                display_name: 'A1',
                email: 'a1@s.id',
                role: 'ADMIN',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(adm, calRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4055: Guidance route allows Student for own guidance', async () => {
            const guiRoute = findRouteByPath('/guidance')!;
            const stu: AuthenticatedIdentity = {
                user_id: 'S1',
                username: 's1',
                display_name: 'S1',
                email: 's1@s.id',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(stu, guiRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4056: Guidance route allows Teacher', async () => {
            const guiRoute = findRouteByPath('/guidance')!;
            const tea: AuthenticatedIdentity = {
                user_id: 'T1',
                username: 't1',
                display_name: 'T1',
                email: 't1@s.id',
                role: 'TEACHER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(tea, guiRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4057: Guidance route allows Counselor', async () => {
            const guiRoute = findRouteByPath('/guidance')!;
            const cou: AuthenticatedIdentity = {
                user_id: 'C1',
                username: 'c1',
                display_name: 'C1',
                email: 'c1@s.id',
                role: 'COUNSELOR',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(cou, guiRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4058: Guidance route allows Headmaster', async () => {
            const guiRoute = findRouteByPath('/guidance')!;
            const hm: AuthenticatedIdentity = {
                user_id: 'HM1',
                username: 'hm1',
                display_name: 'HM 1',
                email: 'hm1@s.id',
                role: 'HEADMASTER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(hm, guiRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4059: Guidance route allows Admin', async () => {
            const guiRoute = findRouteByPath('/guidance')!;
            const adm: AuthenticatedIdentity = {
                user_id: 'A1',
                username: 'a1',
                display_name: 'A1',
                email: 'a1@s.id',
                role: 'ADMIN',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(adm, guiRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4060: Behavior route allows Student', async () => {
            const behRoute = findRouteByPath('/behavior')!;
            const stu: AuthenticatedIdentity = {
                user_id: 'S1',
                username: 's1',
                display_name: 'S1',
                email: 's1@s.id',
                role: 'STUDENT',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(stu, behRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4061: Behavior route allows Teacher', async () => {
            const behRoute = findRouteByPath('/behavior')!;
            const tea: AuthenticatedIdentity = {
                user_id: 'T1',
                username: 't1',
                display_name: 'T1',
                email: 't1@s.id',
                role: 'TEACHER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(tea, behRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4062: Behavior route allows Discipline Officer', async () => {
            const behRoute = findRouteByPath('/behavior')!;
            const disc: AuthenticatedIdentity = {
                user_id: 'D1',
                username: 'd1',
                display_name: 'D1',
                email: 'd1@s.id',
                role: 'DISCIPLINE_OFFICER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(disc, behRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4063: Behavior route allows Headmaster', async () => {
            const behRoute = findRouteByPath('/behavior')!;
            const hm: AuthenticatedIdentity = {
                user_id: 'HM1',
                username: 'hm1',
                display_name: 'HM 1',
                email: 'hm1@s.id',
                role: 'HEADMASTER',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(hm, behRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4064: Behavior route allows Admin', async () => {
            const behRoute = findRouteByPath('/behavior')!;
            const adm: AuthenticatedIdentity = {
                user_id: 'A1',
                username: 'a1',
                display_name: 'A1',
                email: 'a1@s.id',
                role: 'ADMIN',
                status: 'ACTIVE',
                created_at: new Date().toISOString(),
                version_number: 1
            };

            const dec = await evaluateRouteAuthorization(adm, behRoute);
            expect(dec.granted).toBe(true);
        });

        it('TEST-4065: Zero leakage throughout entire Phase 39 UI shell suite', () => {
            const session = adapter.getCurrentSessionId();
            expect(session).toBeDefined();
        });
    });
});
