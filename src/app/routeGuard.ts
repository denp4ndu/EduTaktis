import { RouteDefinition, AuthenticatedIdentity, AuthorizationDecision } from '../types/curriculum';
import { frontendAuthorizationAdapter } from '../services/frontendAuthorizationAdapter';

/**
 * routeGuard
 * Authoritatively guards routes by delegating directly to AuthorizationEngine via FrontendAuthorizationAdapter.
 * Frontend MUST NOT become an independent authorization authority.
 */
export async function evaluateRouteAuthorization(
    identity: AuthenticatedIdentity | null,
    route: RouteDefinition,
    targetScope?: Record<string, unknown>
): Promise<AuthorizationDecision> {
    return frontendAuthorizationAdapter.authorizeRoute(identity, route, targetScope);
}
