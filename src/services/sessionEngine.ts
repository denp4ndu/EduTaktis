import { 
    UserSession, 
    UserSessionStatus, 
    UserRole 
} from '../types/curriculum';
import { 
    sessionStorageProvider, 
    SessionStorageProvider 
} from './sessionStorageProvider';
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

export interface CreateSessionParams {
    user_id: string;
    role: UserRole;
    actor_id?: string;
    ip_address?: string;
    user_agent?: string;
    ttl_seconds?: number;
}

export class SessionEngine {
    private storage: SessionStorageProvider;
    private audit: SecurityAuditRepositoryEngine;
    private validator: AuthenticationValidationEngine;

    public static readonly DEFAULT_TTL_SECONDS = 3600 * 8; // 8 hours
    public static readonly MAX_TTL_SECONDS = 3600 * 24; // 24 hours

    constructor(
        storage: SessionStorageProvider = sessionStorageProvider,
        audit: SecurityAuditRepositoryEngine = securityAuditRepositoryEngine,
        validator: AuthenticationValidationEngine = authenticationValidationEngine
    ) {
        this.storage = storage;
        this.audit = audit;
        this.validator = validator;
    }

    private generateChecksum(data: unknown, prefix = 'SES-CHK-'): string {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `${prefix}${Math.abs(hash).toString(16).padStart(8, '0')}`;
    }

    async createSession(params: CreateSessionParams): Promise<UserSession> {
        this.validator.validateSecurityLeakage(params);
        this.validator.validateRole(params.role);

        const sessionId = `SES-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const now = new Date();
        const ttl = Math.min(params.ttl_seconds || SessionEngine.DEFAULT_TTL_SECONDS, SessionEngine.MAX_TTL_SECONDS);
        const expiresAt = new Date(now.getTime() + ttl * 1000);

        const baseSession: Omit<UserSession, 'checksum'> = {
            session_id: sessionId,
            user_id: params.user_id,
            role: params.role,
            actor_id: params.actor_id,
            ip_address: params.ip_address,
            user_agent: params.user_agent,
            status: 'ACTIVE',
            created_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            last_activity_at: now.toISOString(),
            version_number: 1
        };

        const checksum = this.generateChecksum(baseSession);
        const fullSession: UserSession = { ...baseSession, checksum };

        await this.storage.saveSession(fullSession);

        await this.audit.saveEvent({
            event_id: `AUD-SEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            event_type: 'SESSION_CREATED',
            actor_id: params.user_id,
            actor_role: params.role,
            target_user_id: params.user_id,
            ip_address: params.ip_address,
            details: { session_id: sessionId, expires_at: expiresAt.toISOString() },
            timestamp: now.toISOString(),
            checksum: this.generateChecksum({ id: sessionId, ev: 'CREATED' }, 'AUD-CHK-')
        });

        return deepFreeze(fullSession);
    }

    async validateSession(sessionId: string): Promise<UserSession> {
        if (!sessionId) {
            throw new Error('INVALID_SESSION: Session ID is required');
        }

        const session = await this.storage.getSession(sessionId);
        if (!session) {
            throw new Error('INVALID_SESSION: Session does not exist');
        }

        const { checksum: currentChecksum, ...cleanSession } = session;
        const expectedChecksum = this.generateChecksum(cleanSession);
        this.validator.validateChecksum(expectedChecksum, currentChecksum, 'SESSION');

        this.validator.validateSessionState(session);

        // Update last activity
        const now = new Date().toISOString();
        const updatedBase: Omit<UserSession, 'checksum'> = {
            ...cleanSession,
            last_activity_at: now
        };
        const updatedChecksum = this.generateChecksum(updatedBase);
        const updatedSession: UserSession = { ...updatedBase, checksum: updatedChecksum };

        await this.storage.saveSession(updatedSession);
        return deepFreeze(updatedSession);
    }

    async refreshSession(sessionId: string, ttlSeconds?: number): Promise<UserSession> {
        const session = await this.validateSession(sessionId);

        const now = new Date();
        const ttl = Math.min(ttlSeconds || SessionEngine.DEFAULT_TTL_SECONDS, SessionEngine.MAX_TTL_SECONDS);
        const newExpiresAt = new Date(now.getTime() + ttl * 1000);

        const { checksum: _oldChecksum, ...cleanSession } = session;
        const updatedBase: Omit<UserSession, 'checksum'> = {
            ...cleanSession,
            expires_at: newExpiresAt.toISOString(),
            last_activity_at: now.toISOString(),
            version_number: session.version_number + 1
        };

        const checksum = this.generateChecksum(updatedBase);
        const refreshedSession: UserSession = { ...updatedBase, checksum };

        await this.storage.saveSession(refreshedSession);

        await this.audit.saveEvent({
            event_id: `AUD-SEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            event_type: 'SESSION_REFRESHED',
            actor_id: session.user_id,
            actor_role: session.role,
            target_user_id: session.user_id,
            details: { session_id: sessionId, new_expires_at: newExpiresAt.toISOString() },
            timestamp: now.toISOString(),
            checksum: this.generateChecksum({ id: sessionId, ev: 'REFRESHED' }, 'AUD-CHK-')
        });

        return deepFreeze(refreshedSession);
    }

    async revokeSession(sessionId: string, reason = 'USER_LOGOUT', actorId?: string): Promise<void> {
        const session = await this.storage.getSession(sessionId);
        if (!session) {
            return;
        }

        if (session.status === 'REVOKED') {
            return;
        }

        this.validator.validateSessionStatusTransition(session.status, 'REVOKED');

        const now = new Date().toISOString();
        const { checksum: _oldChecksum, ...cleanSession } = session;
        const updatedBase: Omit<UserSession, 'checksum'> = {
            ...cleanSession,
            status: 'REVOKED',
            last_activity_at: now,
            version_number: session.version_number + 1
        };

        const checksum = this.generateChecksum(updatedBase);
        const revokedSession: UserSession = { ...updatedBase, checksum };

        await this.storage.saveSession(revokedSession);

        await this.audit.saveEvent({
            event_id: `AUD-SEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            event_type: 'SESSION_REVOKED',
            actor_id: actorId || session.user_id,
            actor_role: session.role,
            target_user_id: session.user_id,
            details: { session_id: sessionId, reason },
            timestamp: now,
            checksum: this.generateChecksum({ id: sessionId, ev: 'REVOKED' }, 'AUD-CHK-')
        });
    }

    async revokeAllUserSessions(userId: string, reason = 'REVOKE_ALL_SESSIONS', actorId?: string): Promise<number> {
        const userSessions = await this.storage.listSessionsByUser(userId);
        let count = 0;

        for (const session of userSessions) {
            if (session.status === 'ACTIVE') {
                await this.revokeSession(session.session_id, reason, actorId);
                count++;
            }
        }

        return count;
    }

    async terminateSession(sessionId: string): Promise<void> {
        const session = await this.storage.getSession(sessionId);
        if (!session) return;

        const now = new Date().toISOString();
        const { checksum: _oldChecksum, ...cleanSession } = session;
        const updatedBase: Omit<UserSession, 'checksum'> = {
            ...cleanSession,
            status: 'TERMINATED',
            last_activity_at: now,
            version_number: session.version_number + 1
        };

        const checksum = this.generateChecksum(updatedBase);
        await this.storage.saveSession({ ...updatedBase, checksum });
    }

    async listUserSessions(userId: string): Promise<UserSession[]> {
        const sessions = await this.storage.listSessionsByUser(userId);
        return deepFreeze(sessions.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    }
}

export const sessionEngine = new SessionEngine();
