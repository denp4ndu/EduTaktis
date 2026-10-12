import React, { useState, useEffect, createContext, useContext } from 'react';
import { FrontendAuthState, AuthenticatedIdentity, UserSession } from '../types/curriculum';
import { frontendAuthorizationAdapter } from '../services/frontendAuthorizationAdapter';
import { AuthenticationLoading } from '../components/auth/AuthenticationLoading';
import { SessionExpired } from '../components/auth/SessionExpired';

interface AuthContextValue {
    authState: FrontendAuthState;
    identity: AuthenticatedIdentity | null;
    session: UserSession | null;
    logout: () => Promise<void>;
    refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AppBootstrap provider');
    }
    return context;
};

interface AppBootstrapProps {
    children: React.ReactNode;
    initialSessionId?: string;
}

export const AppBootstrap: React.FC<AppBootstrapProps> = ({ children, initialSessionId }) => {
    const [authState, setAuthState] = useState<FrontendAuthState>({
        state: 'INITIALIZING',
        identity: null,
        session: null,
        error: null
    });

    useEffect(() => {
        // Subscribe to auth state changes from adapter
        const unsubscribe = frontendAuthorizationAdapter.subscribe((updated) => {
            setAuthState(updated);
        });

        // Trigger bootstrap
        frontendAuthorizationAdapter.bootstrap(initialSessionId);

        return () => {
            unsubscribe();
        };
    }, [initialSessionId]);

    const handleLogout = async () => {
        await frontendAuthorizationAdapter.logout();
    };

    const handleRefresh = async () => {
        await frontendAuthorizationAdapter.bootstrap();
    };

    if (authState.state === 'INITIALIZING' || authState.state === 'AUTHENTICATING') {
        return <AuthenticationLoading message="Memulai antarmuka aplikasi & validasi sesi aman..." />;
    }

    if (authState.state === 'SESSION_EXPIRED') {
        return (
            <SessionExpired 
                onLoginClick={() => {
                    frontendAuthorizationAdapter.logout();
                }}
            />
        );
    }

    const contextValue: AuthContextValue = {
        authState,
        identity: authState.identity,
        session: authState.session,
        logout: handleLogout,
        refreshAuth: handleRefresh
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
