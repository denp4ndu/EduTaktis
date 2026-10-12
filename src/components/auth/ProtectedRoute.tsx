import React, { useState, useEffect } from 'react';
import { RouteDefinition, AuthenticatedIdentity } from '../../types/curriculum';
import { frontendAuthorizationAdapter } from '../../services/frontendAuthorizationAdapter';
import { AuthenticationLoading } from './AuthenticationLoading';
import { AccessDenied } from './AccessDenied';
import { SessionExpired } from './SessionExpired';

interface ProtectedRouteProps {
    route: RouteDefinition;
    identity: AuthenticatedIdentity | null;
    children: React.ReactNode;
    onGoHome?: () => void;
    onLoginClick?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    route,
    identity,
    children,
    onGoHome,
    onLoginClick
}) => {
    const [isVerifying, setIsVerifying] = useState(true);
    const [isAllowed, setIsAllowed] = useState(false);
    const [denialReason, setDenialReason] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        setIsVerifying(true);

        frontendAuthorizationAdapter
            .authorizeRoute(identity, route)
            .then((decision) => {
                if (!isMounted) return;
                setIsAllowed(decision.granted);
                setDenialReason(decision.reason || null);
            })
            .catch((err) => {
                if (!isMounted) return;
                setIsAllowed(false);
                setDenialReason(err?.message || 'Akses ditolak oleh kebijakan keamanan.');
            })
            .finally(() => {
                if (isMounted) setIsVerifying(false);
            });

        return () => {
            isMounted = false;
        };
    }, [identity, route]);

    if (isVerifying) {
        return <AuthenticationLoading message="Memverifikasi izin akses modul..." />;
    }

    if (!isAllowed) {
        // If unauthenticated and trying to access protected route
        if (route.requiredAuthentication && !identity) {
            return (
                <SessionExpired 
                    onLoginClick={onLoginClick || (() => {})} 
                    reason="Halaman ini membutuhkan autentikasi pengguna. Silakan masuk terlebih dahulu."
                />
            );
        }

        return (
            <AccessDenied
                title="Akses Halaman Ditolak"
                message="Peran atau izin akun Anda tidak memenuhi kriteria untuk mengakses rute ini."
                onGoHome={onGoHome}
                onReAuthenticate={onLoginClick}
            />
        );
    }

    return <>{children}</>;
};
