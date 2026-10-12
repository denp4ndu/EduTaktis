import { 
    UserRole, 
    Permission, 
    AuthorizationContext, 
    AuthorizationDecision, 
    UserAccountStatus 
} from '../types/curriculum';
import { 
    securityAuditRepositoryEngine, 
    SecurityAuditRepositoryEngine 
} from './securityAuditRepositoryEngine';
import { 
    guardianRepositoryEngine, 
    GuardianRepositoryEngine 
} from './guardianRepositoryEngine';
import { 
    authenticationValidationEngine, 
    AuthenticationValidationEngine 
} from './authenticationValidationEngine';
import { 
    authenticationStorageProvider, 
    AuthenticationStorageProvider 
} from './authenticationStorageProvider';

function deepFreeze<T>(obj: T): T {
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

export class AuthorizationEngine {
    private audit: SecurityAuditRepositoryEngine;
    private guardianRepo: GuardianRepositoryEngine;
    private authStorage: AuthenticationStorageProvider;
    private validator: AuthenticationValidationEngine;

    private static readonly ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
        STUDENT: [
            'student:read',
            'course:read',
            'attendance:read',
            'assessment:read',
            'grade:read',
            'report_card:read',
            'transcript:read',
            'behavior:read',
            'guidance:read',
            'notification:read',
            'communication:read',
            'communication:write',
            'session:read'
        ],
        TEACHER: [
            'teacher:read',
            'student:read',
            'course:read',
            'course:write',
            'attendance:read',
            'attendance:write',
            'assessment:read',
            'assessment:write',
            'grade:read',
            'grade:write',
            'report_card:read',
            'behavior:read',
            'behavior:write',
            'guidance:read',
            'notification:read',
            'notification:write',
            'communication:read',
            'communication:write',
            'session:read'
        ],
        PARENT: [
            'guardian:read',
            'student:read',
            'course:read',
            'attendance:read',
            'assessment:read',
            'grade:read',
            'report_card:read',
            'transcript:read',
            'behavior:read',
            'guidance:read',
            'notification:read',
            'communication:read',
            'communication:write',
            'session:read'
        ],
        LEGAL_GUARDIAN: [
            'guardian:read',
            'student:read',
            'course:read',
            'attendance:read',
            'assessment:read',
            'grade:read',
            'report_card:read',
            'transcript:read',
            'behavior:read',
            'guidance:read',
            'notification:read',
            'communication:read',
            'communication:write',
            'session:read'
        ],
        AUTHORIZED_CAREGIVER: [
            'guardian:read',
            'student:read',
            'course:read',
            'attendance:read',
            'assessment:read',
            'grade:read',
            'report_card:read',
            'transcript:read',
            'behavior:read',
            'guidance:read',
            'notification:read',
            'communication:read',
            'communication:write',
            'session:read'
        ],
        COUNSELOR: [
            'guidance:read',
            'guidance:write',
            'student:read',
            'behavior:read',
            'attendance:read',
            'notification:read',
            'communication:read',
            'communication:write',
            'session:read'
        ],
        DISCIPLINE_OFFICER: [
            'behavior:read',
            'behavior:write',
            'student:read',
            'attendance:read',
            'notification:read',
            'communication:read',
            'communication:write',
            'session:read'
        ],
        HEADMASTER: [
            'student:read',
            'teacher:read',
            'guardian:read',
            'course:read',
            'attendance:read',
            'assessment:read',
            'grade:read',
            'report_card:read',
            'report_card:write',
            'transcript:read',
            'transcript:write',
            'behavior:read',
            'guidance:read',
            'notification:read',
            'notification:write',
            'communication:read',
            'audit:read',
            'session:read'
        ],
        ADMIN: [
            'identity:read',
            'identity:write',
            'user:read',
            'user:write',
            'session:read',
            'session:revoke',
            'student:read',
            'student:write',
            'teacher:read',
            'teacher:write',
            'guardian:read',
            'guardian:write',
            'course:read',
            'course:write',
            'attendance:read',
            'attendance:write',
            'assessment:read',
            'assessment:write',
            'grade:read',
            'grade:write',
            'report_card:read',
            'report_card:write',
            'transcript:read',
            'transcript:write',
            'behavior:read',
            'behavior:write',
            'guidance:read',
            'guidance:write',
            'notification:read',
            'notification:write',
            'communication:read',
            'communication:write',
            'audit:read',
            'security:manage'
        ]
    };

    constructor(
        audit: SecurityAuditRepositoryEngine = securityAuditRepositoryEngine,
        guardianRepo: GuardianRepositoryEngine = guardianRepositoryEngine,
        authStorage: AuthenticationStorageProvider = authenticationStorageProvider,
        validator: AuthenticationValidationEngine = authenticationValidationEngine
    ) {
        this.audit = audit;
        this.guardianRepo = guardianRepo;
        this.authStorage = authStorage;
        this.validator = validator;
    }

    private generateChecksum(data: unknown, prefix = 'AZN-CHK-'): string {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `${prefix}${Math.abs(hash).toString(16).padStart(8, '0')}`;
    }

    hasPermission(role: UserRole, permission: Permission): boolean {
        const perms = AuthorizationEngine.ROLE_PERMISSIONS[role] || [];
        return perms.includes(permission);
    }

    async validateStudentScope(context: AuthorizationContext, studentId: string): Promise<boolean> {
        this.validator.validateRole(context.role);

        // 1. Admin & Headmaster
        if (context.role === 'ADMIN' || context.role === 'HEADMASTER') {
            return true;
        }

        // 2. Student self-scope
        if (context.role === 'STUDENT') {
            const selfId = context.actor_id || context.user_id;
            return selfId === studentId;
        }

        // 3. Guardian scope (Must have ACTIVE relationship)
        if (context.role === 'PARENT' || context.role === 'LEGAL_GUARDIAN' || context.role === 'AUTHORIZED_CAREGIVER') {
            const guardianId = context.actor_id || context.user_id;
            const relationships = await this.guardianRepo.listRelationships({ guardian_id: guardianId });
            const activeRel = relationships.find(r => r.student_id === studentId && r.status === 'ACTIVE');
            return !!activeRel;
        }

        // 4. Teacher, Counselor, Discipline Officer
        if (context.role === 'TEACHER' || context.role === 'COUNSELOR' || context.role === 'DISCIPLINE_OFFICER') {
            return true;
        }

        return false;
    }

    async validateGuardianStudentScope(context: AuthorizationContext, guardianId: string, studentId: string): Promise<boolean> {
        if (context.role === 'ADMIN' || context.role === 'HEADMASTER') {
            return true;
        }

        const callerGuardianId = context.actor_id || context.user_id;
        if (callerGuardianId !== guardianId) {
            return false;
        }

        const relationships = await this.guardianRepo.listRelationships({ guardian_id: guardianId });
        const activeRel = relationships.find(r => r.student_id === studentId && r.status === 'ACTIVE');
        return !!activeRel;
    }

    async validateTeacherCourseScope(context: AuthorizationContext, courseId: string, teacherId?: string): Promise<boolean> {
        if (context.role === 'ADMIN' || context.role === 'HEADMASTER') {
            return true;
        }

        if (context.role === 'TEACHER') {
            if (teacherId) {
                const callerTeacherId = context.actor_id || context.user_id;
                return callerTeacherId === teacherId;
            }
            return true;
        }

        return false;
    }

    async validateCounselorStudentScope(context: AuthorizationContext, counselorId: string, studentId: string): Promise<boolean> {
        if (context.role === 'ADMIN' || context.role === 'HEADMASTER') {
            return true;
        }

        if (context.role === 'COUNSELOR') {
            const callerCounselorId = context.actor_id || context.user_id;
            return callerCounselorId === counselorId;
        }

        return false;
    }

    async validateDisciplineScope(context: AuthorizationContext, officerId: string): Promise<boolean> {
        if (context.role === 'ADMIN' || context.role === 'HEADMASTER') {
            return true;
        }

        if (context.role === 'DISCIPLINE_OFFICER') {
            const callerOfficerId = context.actor_id || context.user_id;
            return callerOfficerId === officerId;
        }

        return false;
    }

    async validateAdminScope(context: AuthorizationContext): Promise<boolean> {
        return context.role === 'ADMIN';
    }

    async authorize(context: AuthorizationContext): Promise<AuthorizationDecision> {
        this.validator.validateSecurityLeakage(context);
        this.validator.validateRole(context.role);

        const now = new Date().toISOString();
        const permission = `${context.target_resource}:${context.action}` as Permission;

        // 1. Validate Account Status if user_id is provided
        if (context.user_id) {
            const account = await this.authStorage.getUserAccount(context.user_id);
            if (account) {
                try {
                    this.validator.validateAccountStatus(account);
                } catch (err: any) {
                    await this.audit.saveEvent({
                        event_id: `AUD-SEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                        event_type: 'AUTHORIZATION_DENIED',
                        actor_id: context.user_id,
                        actor_role: context.role,
                        details: { resource: context.target_resource, action: context.action, reason: err.message },
                        timestamp: now,
                        checksum: this.generateChecksum({ id: context.user_id, res: context.target_resource, d: 'STATUS_DENIED' }, 'AUD-CHK-')
                    });

                    throw err;
                }
            }
        }

        // 2. Validate RBAC Permission
        const hasPerm = this.hasPermission(context.role, permission);
        if (!hasPerm) {
            const baseDecision: Omit<AuthorizationDecision, 'checksum'> = {
                granted: false,
                reason: `PERMISSION_DENIED: Role ${context.role} lacks permission ${permission}`,
                user_id: context.user_id,
                role: context.role,
                permission,
                resource: context.target_resource,
                action: context.action,
                timestamp: now
            };
            const checksum = this.generateChecksum(baseDecision);

            await this.audit.saveEvent({
                event_id: `AUD-SEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                event_type: 'AUTHORIZATION_DENIED',
                actor_id: context.user_id,
                actor_role: context.role,
                details: { permission, resource: context.target_resource, action: context.action },
                timestamp: now,
                checksum: this.generateChecksum({ id: context.user_id, p: permission, d: 'DENIED' }, 'AUD-CHK-')
            });

            return deepFreeze({ ...baseDecision, checksum });
        }

        // 3. Validate Scope if target student is specified
        if (context.target_student_id) {
            const isScopeValid = await this.validateStudentScope(context, context.target_student_id);
            if (!isScopeValid) {
                const baseDecision: Omit<AuthorizationDecision, 'checksum'> = {
                    granted: false,
                    reason: `SCOPE_ACCESS_DENIED: Actor is not authorized to access target student ${context.target_student_id}`,
                    user_id: context.user_id,
                    role: context.role,
                    permission,
                    resource: context.target_resource,
                    action: context.action,
                    timestamp: now
                };
                const checksum = this.generateChecksum(baseDecision);

                await this.audit.saveEvent({
                    event_id: `AUD-SEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    event_type: 'SCOPE_ACCESS_DENIED',
                    actor_id: context.user_id,
                    actor_role: context.role,
                    target_user_id: context.target_student_id,
                    details: { resource: context.target_resource, student_id: context.target_student_id },
                    timestamp: now,
                    checksum: this.generateChecksum({ id: context.user_id, s: context.target_student_id, d: 'SCOPE_DENIED' }, 'AUD-CHK-')
                });

                return deepFreeze({ ...baseDecision, checksum });
            }
        }

        // 4. Scope Authorization Passed
        const baseDecision: Omit<AuthorizationDecision, 'checksum'> = {
            granted: true,
            user_id: context.user_id,
            role: context.role,
            permission,
            resource: context.target_resource,
            action: context.action,
            timestamp: now
        };
        const checksum = this.generateChecksum(baseDecision);

        await this.audit.saveEvent({
            event_id: `AUD-SEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            event_type: 'AUTHORIZATION_GRANTED',
            actor_id: context.user_id,
            actor_role: context.role,
            details: { permission, resource: context.target_resource, action: context.action },
            timestamp: now,
            checksum: this.generateChecksum({ id: context.user_id, p: permission, d: 'GRANTED' }, 'AUD-CHK-')
        });

        return deepFreeze({ ...baseDecision, checksum });
    }

    async requirePermission(context: AuthorizationContext, permission: Permission): Promise<AuthorizationDecision> {
        const decision = await this.authorize(context);
        if (!decision.granted) {
            throw new Error(decision.reason || `PERMISSION_DENIED: Lacks ${permission}`);
        }
        return decision;
    }

    async requireRole(context: AuthorizationContext, allowedRoles: UserRole[]): Promise<AuthorizationDecision> {
        if (!allowedRoles.includes(context.role)) {
            const decision: AuthorizationDecision = {
                granted: false,
                reason: `ROLE_UNAUTHORIZED: Role ${context.role} is not in allowed roles: [${allowedRoles.join(', ')}]`,
                user_id: context.user_id,
                role: context.role,
                resource: context.target_resource,
                action: context.action,
                timestamp: new Date().toISOString(),
                checksum: this.generateChecksum({ id: context.user_id, r: context.role, d: 'ROLE_DENIED' })
            };
            throw new Error(decision.reason);
        }
        return this.authorize(context);
    }
}

export const authorizationEngine = new AuthorizationEngine();
