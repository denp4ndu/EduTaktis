import React from 'react';
import { Permission, UserRole } from '../../types/curriculum';
import { frontendAuthorizationAdapter } from '../../services/frontendAuthorizationAdapter';

interface PermissionGuardProps {
    permission: Permission;
    role?: UserRole;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

/**
 * PermissionGuard
 * Note: PermissionGuard is a UI rendering convenience, NOT a security boundary.
 * Authoritative security is enforced at the domain engine boundary via AuthorizationEngine.
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
    permission,
    role,
    children,
    fallback = null
}) => {
    const effectiveRole = role || frontendAuthorizationAdapter.getCurrentIdentity()?.role;

    if (!effectiveRole) {
        return <>{fallback}</>;
    }

    const hasAccess = frontendAuthorizationAdapter.checkPermission(effectiveRole, permission);

    if (!hasAccess) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};
