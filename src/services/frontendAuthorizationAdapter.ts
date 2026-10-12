import { 
    AuthenticatedIdentity, 
    UserSession, 
    UserRole, 
    Permission, 
    AuthorizationContext, 
    AuthorizationDecision, 
    RouteDefinition, 
    FrontendAuthState,
    ApplicationErrorRecord,
    ApplicationErrorType
} from '../types/curriculum';
import { authenticationEngine, AuthenticationEngine } from './authenticationEngine';
import { authorizationEngine, AuthorizationEngine } from './authorizationEngine';
import { sessionEngine, SessionEngine } from './sessionEngine';

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

export class FrontendAuthorizationAdapter {
    private currentSessionId: string | null = null;
    private currentIdentity: AuthenticatedIdentity | null = null;
    private listeners: Array<(state: FrontendAuthState) => void> = [];
    private auth: AuthenticationEngine;
    private sessionMgr: SessionEngine;
    private azn: AuthorizationEngine;

    constructor(
        auth: AuthenticationEngine = authenticationEngine,
        sessionMgr: SessionEngine = sessionEngine,
        azn: AuthorizationEngine = authorizationEngine
    ) {
        this.auth = auth;
        this.sessionMgr = sessionMgr;
        this.azn = azn;
    }

    /**
     * Subscribe to auth state updates across the application shell
     */
    subscribe(listener: (state: FrontendAuthState) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify(state: FrontendAuthState): void {
        const frozen = deepFreeze({ ...state });
        for (const listener of this.listeners) {
            listener(frozen);
        }
    }

    /**
     * Authoritative bootstrap process validating session without client assumptions
     */
    async bootstrap(sessionId?: string): Promise<FrontendAuthState> {
        const targetSessionId = sessionId || this.currentSessionId;
        
        if (!targetSessionId) {
            const unauthState: FrontendAuthState = {
                state: 'UNAUTHENTICATED',
                identity: null,
                session: null,
                error: null
            };
            this.notify(unauthState);
            return deepFreeze(unauthState);
        }

        try {
            // Validate session through SessionEngine
            const session = await this.sessionMgr.validateSession(targetSessionId);
            
            // Retrieve identity through AuthenticationEngine
            const identity = await this.auth.getAuthenticatedIdentity(session.session_id);
            
            this.currentSessionId = session.session_id;
            this.currentIdentity = identity;

            const authState: FrontendAuthState = {
                state: 'READY',
                identity,
                session,
                error: null
            };

            this.notify(authState);
            return deepFreeze(authState);
        } catch (err: any) {
            this.currentSessionId = null;
            this.currentIdentity = null;

            const isExpired = err?.message?.includes('SESSION_EXPIRED');
            const isRevoked = err?.message?.includes('SESSION_REVOKED');
            
            const errorState: FrontendAuthState = {
                state: isExpired || isRevoked ? 'SESSION_EXPIRED' : 'ERROR',
                identity: null,
                session: null,
                error: err?.message || 'Authentication session verification failed'
            };

            this.notify(errorState);
            return deepFreeze(errorState);
        }
    }

    /**
     * Route Authorization delegating completely to AuthorizationEngine
     */
    async authorizeRoute(
        identity: AuthenticatedIdentity | null,
        route: RouteDefinition,
        targetScope?: Record<string, unknown>
    ): Promise<AuthorizationDecision> {
        const now = new Date().toISOString();

        // 1. If route does not require authentication (public route)
        if (!route.requiredAuthentication) {
            const publicDecision: AuthorizationDecision = {
                granted: true,
                user_id: identity?.user_id || 'ANONYMOUS',
                role: identity?.role || ('STUDENT' as UserRole),
                resource: route.path,
                action: 'read',
                timestamp: now,
                checksum: `AZN-PUB-${Date.now()}`
            };
            return deepFreeze(publicDecision);
        }

        // 2. Unauthenticated user accessing protected route
        if (!identity) {
            const deniedDecision: AuthorizationDecision = {
                granted: false,
                reason: 'AUTHENTICATION_REQUIRED: User must be authenticated to access this route',
                user_id: 'ANONYMOUS',
                role: 'STUDENT' as UserRole,
                resource: route.path,
                action: 'read',
                timestamp: now,
                checksum: `AZN-DEN-${Date.now()}`
            };
            return deepFreeze(deniedDecision);
        }

        // 3. Role authorization check
        if (route.requiredRoles && route.requiredRoles.length > 0) {
            if (!route.requiredRoles.includes(identity.role)) {
                const deniedDecision: AuthorizationDecision = {
                    granted: false,
                    reason: `ROLE_UNAUTHORIZED: Role ${identity.role} is not permitted to access ${route.path}`,
                    user_id: identity.user_id,
                    role: identity.role,
                    resource: route.path,
                    action: 'read',
                    timestamp: now,
                    checksum: `AZN-ROLE-DEN-${Date.now()}`
                };
                return deepFreeze(deniedDecision);
            }
        }

        // 4. Permission authorization check delegating to AuthorizationEngine
        if (route.requiredPermissions && route.requiredPermissions.length > 0) {
            for (const perm of route.requiredPermissions) {
                const [target_resource, action] = perm.split(':');
                const context: AuthorizationContext = {
                    user_id: identity.user_id,
                    role: identity.role,
                    actor_id: identity.actor_id,
                    target_resource: target_resource || route.path,
                    action: action || 'read',
                    target_scope: targetScope
                };

                const decision = await this.azn.authorize(context);
                if (!decision.granted) {
                    return decision;
                }
            }
        }

        // 5. Default grant if all configured route criteria pass
        const allowedDecision: AuthorizationDecision = {
            granted: true,
            user_id: identity.user_id,
            role: identity.role,
            resource: route.path,
            action: 'read',
            timestamp: now,
            checksum: `AZN-OK-${Date.now()}`
        };
        return deepFreeze(allowedDecision);
    }

    /**
     * Synchronous check whether role has permission (UI display convenience only)
     */
    checkPermission(role: UserRole, permission: Permission): boolean {
        return this.azn.hasPermission(role, permission);
    }

    /**
     * Authoritative logout calling AuthenticationEngine
     */
    async logout(sessionId?: string, actorId?: string): Promise<void> {
        const targetSessionId = sessionId || this.currentSessionId;
        if (targetSessionId) {
            await this.auth.logout(targetSessionId, actorId);
        }
        this.currentSessionId = null;
        this.currentIdentity = null;

        const unauthState: FrontendAuthState = {
            state: 'UNAUTHENTICATED',
            identity: null,
            session: null,
            error: null
        };
        this.notify(unauthState);
    }

    /**
     * Authoritative logout all calling AuthenticationEngine
     */
    async logoutAll(userId: string, actorId?: string): Promise<number> {
        const count = await this.auth.logoutAllSessions(userId, actorId);
        this.currentSessionId = null;
        this.currentIdentity = null;

        const unauthState: FrontendAuthState = {
            state: 'UNAUTHENTICATED',
            identity: null,
            session: null,
            error: null
        };
        this.notify(unauthState);
        return count;
    }

    /**
     * Classifies unexpected frontend errors without leaking internal stack traces or secrets
     */
    classifyError(error: unknown): ApplicationErrorRecord {
        const errMessage = error instanceof Error ? error.message : String(error);
        const errId = `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const timestamp = new Date().toISOString();
        const lower = errMessage.toLowerCase();

        let type: ApplicationErrorType = 'UNKNOWN_ERROR';
        if (lower.includes('invalid_credentials') || lower.includes('account_')) {
            type = 'AUTHENTICATION_ERROR';
        } else if (lower.includes('session_expired') || lower.includes('session_revoked')) {
            type = 'SESSION_EXPIRED';
        } else if (lower.includes('permission_denied') || lower.includes('role_unauthorized') || lower.includes('scope_access_denied')) {
            type = 'AUTHORIZATION_ERROR';
        } else if (lower.includes('curriculum') || lower.includes('domain')) {
            type = 'DOMAIN_ERROR';
        } else if (lower.includes('validation') || lower.includes('policy_violation') || lower.includes('checksum_mismatch')) {
            type = 'VALIDATION_ERROR';
        } else if (lower.includes('network') || lower.includes('fetch') || lower.includes('timeout')) {
            type = 'NETWORK_ERROR';
        }

        return deepFreeze({
            error_id: errId,
            type,
            message: errMessage,
            timestamp
        });
    }

    getCurrentIdentity(): AuthenticatedIdentity | null {
        return this.currentIdentity ? deepFreeze({ ...this.currentIdentity }) : null;
    }

    getCurrentSessionId(): string | null {
        return this.currentSessionId;
    }

    setCurrentSession(session: UserSession, identity: AuthenticatedIdentity): void {
        this.currentSessionId = session.session_id;
        this.currentIdentity = identity;
        const state: FrontendAuthState = {
            state: 'READY',
            identity,
            session,
            error: null
        };
        this.notify(state);
    }
}

export const frontendAuthorizationAdapter = new FrontendAuthorizationAdapter();
