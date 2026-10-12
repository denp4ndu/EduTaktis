import { 
    UserAccount, 
    UserAccountStatus, 
    UserRole, 
    PasswordCredential, 
    AccountSecurityState, 
    AuthenticatedIdentity, 
    AuthenticationResult, 
    UserSession 
} from '../types/curriculum';
import { 
    authenticationStorageProvider, 
    AuthenticationStorageProvider 
} from './authenticationStorageProvider';
import { 
    passwordHashProvider, 
    PasswordHashProvider 
} from './passwordHashProvider';
import { 
    sessionEngine, 
    SessionEngine 
} from './sessionEngine';
import { 
    securityAuditRepositoryEngine, 
    SecurityAuditRepositoryEngine 
} from './securityAuditRepositoryEngine';
import { 
    authenticationValidationEngine, 
    AuthenticationValidationEngine 
} from './authenticationValidationEngine';

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

export interface RegisterUserParams {
    username: string;
    display_name: string;
    email: string;
    role: UserRole;
    password: string;
    actor_id?: string;
    status?: UserAccountStatus;
    admin_actor_id?: string;
}

export interface AuthenticateParams {
    login_identifier: string; // username or email
    password: string;
    ip_address?: string;
    user_agent?: string;
}

export interface ChangePasswordParams {
    user_id: string;
    current_password: string;
    new_password: string;
    revoke_other_sessions?: boolean;
}

export interface RequestPasswordResetParams {
    login_identifier: string;
    requested_by_actor_id?: string;
}

export interface CompletePasswordResetParams {
    user_id: string;
    reset_token: string;
    new_password: string;
    admin_actor_id?: string;
}

export class AuthenticationEngine {
    private storage: AuthenticationStorageProvider;
    private hasher: PasswordHashProvider;
    private sessionMgr: SessionEngine;
    private audit: SecurityAuditRepositoryEngine;
    private validator: AuthenticationValidationEngine;

    public static readonly MAX_FAILED_ATTEMPTS = 5;
    public static readonly LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

    constructor(
        storage: AuthenticationStorageProvider = authenticationStorageProvider,
        hasher: PasswordHashProvider = passwordHashProvider,
        sessionMgr: SessionEngine = sessionEngine,
        audit: SecurityAuditRepositoryEngine = securityAuditRepositoryEngine,
        validator: AuthenticationValidationEngine = authenticationValidationEngine
    ) {
        this.storage = storage;
        this.hasher = hasher;
        this.sessionMgr = sessionMgr;
        this.audit = audit;
        this.validator = validator;
    }

    private generateChecksum(data: unknown, prefix = 'AUTH-CHK-'): string {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `${prefix}${Math.abs(hash).toString(16).padStart(8, '0')}`;
    }

    async registerUser(params: RegisterUserParams): Promise<{ account: UserAccount }> {
        this.validator.validateSecurityLeakage(params);
        this.validator.validateLoginIdentifier(params.username);
        this.validator.validatePasswordPolicy(params.password);
        this.validator.validateRole(params.role);

        // Check uniqueness
        const existingUsername = await this.storage.getUserAccountByUsername(params.username);
        if (existingUsername) {
            throw new Error(`USER_ALREADY_EXISTS: Username "${params.username}" is already registered`);
        }

        const existingEmail = await this.storage.getUserAccountByEmail(params.email);
        if (existingEmail) {
            throw new Error(`EMAIL_ALREADY_EXISTS: Email "${params.email}" is already registered`);
        }
        const userId = params.actor_id || `USR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const baseAccount: Omit<UserAccount, 'checksum'> = {
            user_id: userId,
            username: params.username.trim().toLowerCase(),
            display_name: params.display_name.trim(),
            email: params.email.trim().toLowerCase(),
            role: params.role,
            status: params.status || 'ACTIVE',
            actor_id: params.actor_id,
            created_at: now,
            updated_at: now,
            version_number: 1
        };

        const checksum = this.generateChecksum(baseAccount, 'ACC-CHK-');
        const fullAccount: UserAccount = { ...baseAccount, checksum };

        await this.storage.saveUserAccount(fullAccount);

        // Hash credential
        const hashRes = await this.hasher.hashPassword(params.password);
        const baseCred: Omit<PasswordCredential, 'checksum'> = {
            credential_id: `CRD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            user_id: userId,
            password_hash: hashRes.hash,
            salt: hashRes.salt,
            algorithm: hashRes.algorithm,
            created_at: now,
            version_number: 1,
            is_revoked: false
        };
        const credChecksum = this.generateChecksum(baseCred, 'CRD-CHK-');
        await this.storage.saveCredential({ ...baseCred, checksum: credChecksum });

        // Initialize security state
        const baseSecState: Omit<AccountSecurityState, 'checksum'> = {
            user_id: userId,
            failed_attempt_count: 0,
            version_number: 1
        };
        const secChecksum = this.generateChecksum(baseSecState, 'SEC-CHK-');
        await this.storage.saveSecurityState({ ...baseSecState, checksum: secChecksum });

        // Audit
        await this.audit.saveEvent({
            event_id: `AUD-SEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            event_type: 'AUTHENTICATION_SUCCESS',
            actor_id: params.admin_actor_id || userId,
            actor_role: params.role,
            target_user_id: userId,
            details: { action: 'USER_REGISTERED', username: params.username },
            timestamp: now,
            checksum: this.generateChecksum({ id: userId, act: 'REGISTER' }, 'AUD-CHK-')
        });

        return { account: deepFreeze(fullAccount) };
    }

    async authenticate(params: AuthenticateParams): Promise<AuthenticationResult> {
        this.validator.validateSecurityLeakage(params);
        this.validator.validateLoginIdentifier(params.login_identifier);

        const identifier = params.login_identifier.trim().toLowerCase();
        let account = await this.storage.getUserAccountByUsername(identifier);
        if (!account) {
            account = await this.storage.getUserAccountByEmail(identifier);
        }

        const now = new Date();
        const nowIso = now.toISOString();

        // 1. Anti-Enumeration Dummy Delay & Generic Rejection
        if (!account) {
            // Perform dummy constant-time operation to normalize execution time
            await this.hasher.hashPassword(params.password, 'dummy_salt_to_prevent_timing_attacks_32_chars');
            await this.audit.saveEvent({
                event_id: `AUD-SEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                event_type: 'AUTHENTICATION_FAILURE',
                actor_id: 'ANONYMOUS',
                actor_role: 'UNKNOWN',
                ip_address: params.ip_address,
                details: { reason: 'USER_NOT_FOUND', identifier },
                timestamp: nowIso,
                checksum: this.generateChecksum({ id: identifier, ev: 'FAIL_NOT_FOUND' }, 'AUD-CHK-')
            });

            throw new Error('INVALID_CREDENTIALS: Invalid username or password');
        }

        // 2. Validate Account Integrity
        const { checksum: accChecksum, ...cleanAccount } = account;
        const expectedAccChecksum = this.generateChecksum(cleanAccount, 'ACC-CHK-');
        this.validator.validateChecksum(expectedAccChecksum, accChecksum, 'USER_ACCOUNT');

        // 3. Security State & Lockout Check
        let secState = await this.storage.getSecurityState(account.user_id);
        if (!secState) {
            secState = {
                user_id: account.user_id,
                failed_attempt_count: 0,
                version_number: 1,
                checksum: ''
            };
        }

        if (account.status === 'LOCKED' || secState.locked_at) {
            await this.audit.saveEvent({
                event_id: `AUD-SEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                event_type: 'AUTHENTICATION_FAILURE',
                actor_id: account.user_id,
                actor_role: account.role,
                target_user_id: account.user_id,
                ip_address: params.ip_address,
                details: { reason: 'ACCOUNT_LOCKED', failed_attempts: secState.failed_attempt_count },
                timestamp: nowIso,
                checksum: this.generateChecksum({ id: account.user_id, ev: 'LOCKED' }, 'AUD-CHK-')
            });

            throw new Error('ACCOUNT_LOCKED: Account is locked due to multiple failed login attempts');
        }

        // 4. Validate Account Status (Active vs Suspended/Revoked/Archived)
        this.validator.validateAccountStatus(account);

        // 5. Credential Verification
        const credential = await this.storage.getCredential(account.user_id);
        if (!credential || credential.is_revoked) {
            throw new Error('INVALID_CREDENTIALS: Valid credentials not found');
        }

        const isMatch = await this.hasher.verifyPassword(
            params.password,
            credential.password_hash,
            credential.salt,
            credential.algorithm
        );

        if (!isMatch) {
            const nextFailed = secState.failed_attempt_count + 1;
            const isLocking = nextFailed >= AuthenticationEngine.MAX_FAILED_ATTEMPTS;

            const { checksum: _oldSecChecksum, ...cleanSecState } = secState;
            const updatedSecStateBase: Omit<AccountSecurityState, 'checksum'> = {
                ...cleanSecState,
                failed_attempt_count: nextFailed,
                last_failed_at: nowIso,
                locked_at: isLocking ? nowIso : undefined,
                lock_reason: isLocking ? 'EXCESSIVE_FAILED_LOGINS' : undefined,
                version_number: secState.version_number + 1
            };
            const updatedSecChecksum = this.generateChecksum(updatedSecStateBase, 'SEC-CHK-');
            await this.storage.saveSecurityState({ ...updatedSecStateBase, checksum: updatedSecChecksum });

            if (isLocking) {
                const { checksum: _oldAccChecksum, ...cleanAccount } = account;
                const lockedAccountBase: Omit<UserAccount, 'checksum'> = {
                    ...cleanAccount,
                    status: 'LOCKED',
                    updated_at: nowIso,
                    version_number: account.version_number + 1
                };
                const lockAccChecksum = this.generateChecksum(lockedAccountBase, 'ACC-CHK-');
                await this.storage.saveUserAccount({ ...lockedAccountBase, checksum: lockAccChecksum });

                await this.audit.saveEvent({
                    event_id: `AUD-SEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    event_type: 'ACCOUNT_LOCKED',
                    actor_id: account.user_id,
                    actor_role: account.role,
                    target_user_id: account.user_id,
                    ip_address: params.ip_address,
                    details: { reason: 'MAX_ATTEMPTS_EXCEEDED', attempts: nextFailed },
                    timestamp: nowIso,
                    checksum: this.generateChecksum({ id: account.user_id, ev: 'LOCK_TRIGGERED' }, 'AUD-CHK-')
                });
            }

            await this.audit.saveEvent({
                event_id: `AUD-SEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                event_type: 'AUTHENTICATION_FAILURE',
                actor_id: account.user_id,
                actor_role: account.role,
                target_user_id: account.user_id,
                ip_address: params.ip_address,
                details: { reason: 'PASSWORD_MISMATCH', failed_count: nextFailed },
                timestamp: nowIso,
                checksum: this.generateChecksum({ id: account.user_id, ev: 'FAIL_PASS' }, 'AUD-CHK-')
            });

            throw new Error('INVALID_CREDENTIALS: Invalid username or password');
        }

        // 6. Successful Authentication - Reset Failures
        const { checksum: _oldSecChecksum, ...cleanSecState } = secState;
        const successSecBase: Omit<AccountSecurityState, 'checksum'> = {
            ...cleanSecState,
            failed_attempt_count: 0,
            last_successful_login_at: nowIso,
            version_number: secState.version_number + 1
        };
        const successSecChecksum = this.generateChecksum(successSecBase, 'SEC-CHK-');
        await this.storage.saveSecurityState({ ...successSecBase, checksum: successSecChecksum });

        // 7. Create Session
        const session = await this.sessionMgr.createSession({
            user_id: account.user_id,
            role: account.role,
            actor_id: account.actor_id,
            ip_address: params.ip_address,
            user_agent: params.user_agent
        });

        // 8. Construct Safe Identity Projection (Zero sensitive fields)
        const identity: AuthenticatedIdentity = {
            user_id: account.user_id,
            username: account.username,
            display_name: account.display_name,
            email: account.email,
            role: account.role,
            status: account.status,
            actor_id: account.actor_id,
            created_at: account.created_at,
            version_number: account.version_number
        };

        await this.audit.saveEvent({
            event_id: `AUD-SEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            event_type: 'AUTHENTICATION_SUCCESS',
            actor_id: account.user_id,
            actor_role: account.role,
            target_user_id: account.user_id,
            ip_address: params.ip_address,
            details: { session_id: session.session_id },
            timestamp: nowIso,
            checksum: this.generateChecksum({ id: account.user_id, ev: 'SUCCESS' }, 'AUD-CHK-')
        });

        return {
            success: true,
            identity: deepFreeze(identity),
            session: deepFreeze(session)
        };
    }

    async logout(sessionId: string, actorId?: string): Promise<void> {
        const session = await this.sessionMgr.validateSession(sessionId).catch(() => null);
        await this.sessionMgr.revokeSession(sessionId, 'USER_LOGOUT', actorId);

        if (session) {
            await this.audit.saveEvent({
                event_id: `AUD-SEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                event_type: 'LOGOUT',
                actor_id: actorId || session.user_id,
                actor_role: session.role,
                target_user_id: session.user_id,
                details: { session_id: sessionId },
                timestamp: new Date().toISOString(),
                checksum: this.generateChecksum({ id: sessionId, ev: 'LOGOUT' }, 'AUD-CHK-')
            });
        }
    }

    async logoutAllSessions(userId: string, actorId?: string): Promise<number> {
        const account = await this.storage.getUserAccount(userId);
        const count = await this.sessionMgr.revokeAllUserSessions(userId, 'LOGOUT_ALL', actorId);

        if (account) {
            await this.audit.saveEvent({
                event_id: `AUD-SEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                event_type: 'SESSION_REVOKED',
                actor_id: actorId || userId,
                actor_role: account.role,
                target_user_id: userId,
                details: { action: 'LOGOUT_ALL_SESSIONS', count },
                timestamp: new Date().toISOString(),
                checksum: this.generateChecksum({ id: userId, ev: 'LOGOUT_ALL' }, 'AUD-CHK-')
            });
        }

        return count;
    }

    async refreshSession(sessionId: string): Promise<AuthenticationResult> {
        const refreshedSession = await this.sessionMgr.refreshSession(sessionId);
        const account = await this.storage.getUserAccount(refreshedSession.user_id);
        if (!account) {
            throw new Error('INVALID_SESSION: Associated user account does not exist');
        }
        this.validator.validateAccountStatus(account);

        const identity: AuthenticatedIdentity = {
            user_id: account.user_id,
            username: account.username,
            display_name: account.display_name,
            email: account.email,
            role: account.role,
            status: account.status,
            actor_id: account.actor_id,
            created_at: account.created_at,
            version_number: account.version_number
        };

        return {
            success: true,
            identity: deepFreeze(identity),
            session: deepFreeze(refreshedSession)
        };
    }

    async changePassword(params: ChangePasswordParams): Promise<void> {
        this.validator.validateSecurityLeakage(params);
        this.validator.validatePasswordPolicy(params.new_password);

        const account = await this.storage.getUserAccount(params.user_id);
        if (!account) {
            throw new Error('INVALID_CREDENTIALS: User does not exist');
        }
        this.validator.validateAccountStatus(account);

        const credential = await this.storage.getCredential(params.user_id);
        if (!credential || credential.is_revoked) {
            throw new Error('INVALID_CREDENTIALS: Valid credentials not found');
        }

        const isCurrentValid = await this.hasher.verifyPassword(
            params.current_password,
            credential.password_hash,
            credential.salt,
            credential.algorithm
        );

        if (!isCurrentValid) {
            throw new Error('INVALID_CREDENTIALS: Current password does not match');
        }

        // Check password reuse rejection
        const isSamePassword = await this.hasher.verifyPassword(
            params.new_password,
            credential.password_hash,
            credential.salt,
            credential.algorithm
        );
        if (isSamePassword) {
            throw new Error('PASSWORD_REUSE_REJECTED: New password cannot be the same as the previous password');
        }

        const now = new Date().toISOString();
        const newHashRes = await this.hasher.hashPassword(params.new_password);

        const { checksum: _oldCredChecksum, ...cleanCred } = credential;
        const updatedCredBase: Omit<PasswordCredential, 'checksum'> = {
            ...cleanCred,
            password_hash: newHashRes.hash,
            salt: newHashRes.salt,
            algorithm: newHashRes.algorithm,
            created_at: now,
            version_number: credential.version_number + 1
        };
        const credChecksum = this.generateChecksum(updatedCredBase, 'CRD-CHK-');
        await this.storage.saveCredential({ ...updatedCredBase, checksum: credChecksum });

        // Update security state
        let secState = await this.storage.getSecurityState(params.user_id);
        if (secState) {
            const { checksum: _oldSecChecksum, ...cleanSecState } = secState;
            const updatedSecBase: Omit<AccountSecurityState, 'checksum'> = {
                ...cleanSecState,
                password_changed_at: now,
                version_number: secState.version_number + 1
            };
            const secChecksum = this.generateChecksum(updatedSecBase, 'SEC-CHK-');
            await this.storage.saveSecurityState({ ...updatedSecBase, checksum: secChecksum });
        }

        if (params.revoke_other_sessions) {
            await this.sessionMgr.revokeAllUserSessions(params.user_id, 'PASSWORD_CHANGE');
        }

        await this.audit.saveEvent({
            event_id: `AUD-SEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            event_type: 'PASSWORD_CHANGED',
            actor_id: params.user_id,
            actor_role: account.role,
            target_user_id: params.user_id,
            timestamp: now,
            checksum: this.generateChecksum({ id: params.user_id, ev: 'PASS_CHANGED' }, 'AUD-CHK-')
        });
    }

    async unlockAccount(userId: string, adminActorId: string): Promise<void> {
        const account = await this.storage.getUserAccount(userId);
        if (!account) {
            throw new Error('USER_NOT_FOUND: User account does not exist');
        }

        const now = new Date().toISOString();
        const { checksum: _oldAccChecksum, ...cleanAccount } = account;
        const updatedAccountBase: Omit<UserAccount, 'checksum'> = {
            ...cleanAccount,
            status: 'ACTIVE',
            updated_at: now,
            version_number: account.version_number + 1
        };
        const accChecksum = this.generateChecksum(updatedAccountBase, 'ACC-CHK-');
        await this.storage.saveUserAccount({ ...updatedAccountBase, checksum: accChecksum });

        let secState = await this.storage.getSecurityState(userId);
        if (secState) {
            const { checksum: _oldSecChecksum, ...cleanSecState } = secState;
            const updatedSecBase: Omit<AccountSecurityState, 'checksum'> = {
                ...cleanSecState,
                failed_attempt_count: 0,
                locked_at: undefined,
                lock_reason: undefined,
                version_number: secState.version_number + 1
            };
            const secChecksum = this.generateChecksum(updatedSecBase, 'SEC-CHK-');
            await this.storage.saveSecurityState({ ...updatedSecBase, checksum: secChecksum });
        }

        await this.audit.saveEvent({
            event_id: `AUD-SEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            event_type: 'ACCOUNT_UNLOCKED',
            actor_id: adminActorId,
            actor_role: 'ADMIN',
            target_user_id: userId,
            timestamp: now,
            checksum: this.generateChecksum({ id: userId, ev: 'UNLOCKED' }, 'AUD-CHK-')
        });
    }

    async updateAccountStatus(userId: string, newStatus: UserAccountStatus, adminActorId: string): Promise<UserAccount> {
        const account = await this.storage.getUserAccount(userId);
        if (!account) {
            throw new Error('USER_NOT_FOUND: User account does not exist');
        }

        this.validator.validateAccountStatusTransition(account.status, newStatus);

        const now = new Date().toISOString();
        const { checksum: _oldAccChecksum, ...cleanAccount } = account;
        const updatedAccountBase: Omit<UserAccount, 'checksum'> = {
            ...cleanAccount,
            status: newStatus,
            updated_at: now,
            version_number: account.version_number + 1
        };
        const accChecksum = this.generateChecksum(updatedAccountBase, 'ACC-CHK-');
        const updatedAccount: UserAccount = { ...updatedAccountBase, checksum: accChecksum };

        await this.storage.saveUserAccount(updatedAccount);

        if (newStatus === 'REVOKED' || newStatus === 'SUSPENDED' || newStatus === 'ARCHIVED') {
            await this.sessionMgr.revokeAllUserSessions(userId, `ACCOUNT_STATUS_${newStatus}`, adminActorId);
        }

        await this.audit.saveEvent({
            event_id: `AUD-SEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            event_type: 'SECURITY_POLICY_VIOLATION',
            actor_id: adminActorId,
            actor_role: 'ADMIN',
            target_user_id: userId,
            details: { previous_status: account.status, new_status: newStatus },
            timestamp: now,
            checksum: this.generateChecksum({ id: userId, ev: `STATUS_${newStatus}` }, 'AUD-CHK-')
        });

        return deepFreeze(updatedAccount);
    }

    async getUserAccount(userId: string): Promise<UserAccount | null> {
        const account = await this.storage.getUserAccount(userId);
        return account ? deepFreeze(account) : null;
    }

    async getAuthenticatedIdentity(sessionId: string): Promise<AuthenticatedIdentity> {
        const session = await this.sessionMgr.validateSession(sessionId);
        const account = await this.storage.getUserAccount(session.user_id);
        if (!account) {
            throw new Error('USER_NOT_FOUND: User account does not exist');
        }
        this.validator.validateAccountStatus(account);

        const identity: AuthenticatedIdentity = {
            user_id: account.user_id,
            username: account.username,
            display_name: account.display_name,
            email: account.email,
            role: account.role,
            status: account.status,
            actor_id: account.actor_id,
            created_at: account.created_at,
            version_number: account.version_number
        };

        return deepFreeze(identity);
    }
}

export const authenticationEngine = new AuthenticationEngine();
