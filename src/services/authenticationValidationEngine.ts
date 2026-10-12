import { 
    UserAccount, 
    UserSession, 
    UserAccountStatus, 
    UserSessionStatus,
    UserRole
} from '../types/curriculum';

export class AuthenticationValidationEngine {
    private static readonly LEAKAGE_PATTERNS = [
        /AIzaSy[0-9A-Za-z_-]{33}/,
        /sk-[0-9A-Za-z_-]{20,}/,
        /Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/,
        /generateContent/,
        /system\s*prompt/i,
        /GoogleGenAI/i,
        /@google\/genai/i
    ];

    validateLoginIdentifier(identifier: string): void {
        if (!identifier || typeof identifier !== 'string') {
            throw new Error('INVALID_CREDENTIALS: Login identifier is required');
        }
        const trimmed = identifier.trim();
        if (trimmed.length < 3 || trimmed.length > 100) {
            throw new Error('INVALID_CREDENTIALS: Login identifier must be between 3 and 100 characters');
        }
    }

    validatePasswordPolicy(password: string): void {
        if (!password || typeof password !== 'string') {
            throw new Error('PASSWORD_POLICY_VIOLATION: Password is required');
        }
        if (password.length < 8) {
            throw new Error('PASSWORD_POLICY_VIOLATION: Password must be at least 8 characters long');
        }
        if (!/[A-Z]/.test(password)) {
            throw new Error('PASSWORD_POLICY_VIOLATION: Password must contain at least one uppercase letter');
        }
        if (!/[a-z]/.test(password)) {
            throw new Error('PASSWORD_POLICY_VIOLATION: Password must contain at least one lowercase letter');
        }
        if (!/[0-9]/.test(password)) {
            throw new Error('PASSWORD_POLICY_VIOLATION: Password must contain at least one number');
        }
        if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
            throw new Error('PASSWORD_POLICY_VIOLATION: Password must contain at least one special character');
        }
    }

    validateAccountStatus(account: UserAccount): void {
        switch (account.status) {
            case 'ACTIVE':
                return;
            case 'PENDING':
                throw new Error('ACCOUNT_NOT_ACTIVE: Account registration is pending approval');
            case 'SUSPENDED':
                throw new Error('ACCOUNT_SUSPENDED: Account is suspended');
            case 'LOCKED':
                throw new Error('ACCOUNT_LOCKED: Account is locked due to security policy');
            case 'REVOKED':
                throw new Error('ACCOUNT_REVOKED: Account has been revoked');
            case 'ARCHIVED':
                throw new Error('ACCOUNT_ARCHIVED: Account is archived and cannot authenticate');
            default:
                throw new Error(`ACCOUNT_NOT_ACTIVE: Unrecognized account status ${(account as any).status}`);
        }
    }

    validateSessionState(session: UserSession): void {
        if (session.status === 'REVOKED') {
            throw new Error('SESSION_REVOKED: Session has been explicitly revoked');
        }
        if (session.status === 'TERMINATED') {
            throw new Error('INVALID_SESSION: Session has been terminated');
        }
        if (session.status === 'EXPIRED') {
            throw new Error('SESSION_EXPIRED: Session has expired');
        }

        const now = new Date();
        const expiresAt = new Date(session.expires_at);
        if (now > expiresAt) {
            throw new Error('SESSION_EXPIRED: Session has expired');
        }

        if (session.status !== 'ACTIVE') {
            throw new Error(`INVALID_SESSION: Invalid session status ${session.status}`);
        }
    }

    validateAccountStatusTransition(currentStatus: UserAccountStatus, nextStatus: UserAccountStatus): void {
        if (currentStatus === nextStatus) {
            return;
        }
        if (currentStatus === 'ARCHIVED') {
            throw new Error('INVALID_LIFECYCLE_TRANSITION: Archived account cannot be modified or reactivated');
        }
        if (currentStatus === 'REVOKED' && nextStatus === 'ACTIVE') {
            throw new Error('INVALID_LIFECYCLE_TRANSITION: Revoked account cannot be directly restored to ACTIVE');
        }
    }

    validateSessionStatusTransition(currentStatus: UserSessionStatus, nextStatus: UserSessionStatus): void {
        if (currentStatus === nextStatus) {
            return;
        }
        if (currentStatus === 'REVOKED' || currentStatus === 'TERMINATED' || currentStatus === 'EXPIRED') {
            if (nextStatus === 'ACTIVE') {
                throw new Error('INVALID_LIFECYCLE_TRANSITION: Inactive/Revoked/Terminated session cannot be reactivated');
            }
        }
    }

    validateRole(role: string): asserts role is UserRole {
        const validRoles: UserRole[] = [
            'STUDENT',
            'TEACHER',
            'PARENT',
            'LEGAL_GUARDIAN',
            'AUTHORIZED_CAREGIVER',
            'COUNSELOR',
            'DISCIPLINE_OFFICER',
            'HEADMASTER',
            'ADMIN'
        ];
        if (!validRoles.includes(role as UserRole)) {
            throw new Error(`INVALID_ROLE: Role "${role}" is not a recognized system role`);
        }
    }

    validateChecksum(expected: string, actual: string, entityType: string): void {
        if (!actual || expected !== actual) {
            throw new Error(`AUTHENTICATION_CHECKSUM_MISMATCH: ${entityType} checksum verification failed`);
        }
    }

    validateSecurityLeakage(payload: unknown): void {
        if (!payload) return;
        const stringified = typeof payload === 'string' ? payload : JSON.stringify(payload);
        for (const pattern of AuthenticationValidationEngine.LEAKAGE_PATTERNS) {
            if (pattern.test(stringified)) {
                throw new Error(`SECURITY_LEAKAGE_DETECTED: Request payload contains forbidden credentials or tokens matching ${pattern}`);
            }
        }
    }
}

export const authenticationValidationEngine = new AuthenticationValidationEngine();
