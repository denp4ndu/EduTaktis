import React, { useState, useEffect } from 'react';
import { ROUTE_REGISTRY, findRouteByPath } from './routeRegistry';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { AppShell } from './AppShell';
import { useAuth } from './AppBootstrap';
import { BreadcrumbItem } from '../components/navigation/Breadcrumbs';
import { Login } from '../components/Login';
import { frontendAuthorizationAdapter } from '../services/frontendAuthorizationAdapter';

export const AppRouter: React.FC = () => {
    const { identity } = useAuth();
    const [currentPath, setCurrentPath] = useState<string>('/dashboard');

    // Handle initial route from window.location.pathname or hash
    useEffect(() => {
        const path = window.location.hash ? window.location.hash.replace('#', '') : window.location.pathname;
        if (path && path !== '/') {
            setCurrentPath(path);
        } else {
            setCurrentPath(identity ? '/dashboard' : '/login');
        }

        const handlePopState = () => {
            const nextPath = window.location.hash ? window.location.hash.replace('#', '') : window.location.pathname;
            setCurrentPath(nextPath || '/dashboard');
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [identity]);

    const navigate = (path: string) => {
        setCurrentPath(path);
        if (window.history.pushState) {
            window.history.pushState(null, '', path);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const route = findRouteByPath(currentPath) || findRouteByPath('/dashboard');

    // Breadcrumb generator
    const breadcrumbs: BreadcrumbItem[] = [
        { label: route?.label || 'Halaman', path: currentPath, isCurrent: true }
    ];

    // Handle Login route specifically if unauthenticated
    if (currentPath === '/login' || (!identity && route?.requiredAuthentication)) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Login 
                    onLoginSuccess={(result) => {
                        if (result.session && result.identity) {
                            frontendAuthorizationAdapter.setCurrentSession(result.session, result.identity);
                            navigate('/dashboard');
                        }
                    }} 
                />
            </div>
        );
    }

    if (!route) {
        return (
            <AppShell currentPath={currentPath} onNavigate={navigate} breadcrumbs={breadcrumbs}>
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
                    <h2 className="text-xl font-black text-slate-900 mb-2">Halaman Tidak Ditemukan</h2>
                    <p className="text-xs text-slate-500 mb-4">Rute "{currentPath}" tidak terdaftar dalam sistem LMS.</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl"
                    >
                        Kembali ke Dashboard
                    </button>
                </div>
            </AppShell>
        );
    }

    const Component = route.component || (() => <div>Halaman Kosong</div>);

    return (
        <AppShell currentPath={currentPath} onNavigate={navigate} breadcrumbs={breadcrumbs}>
            <ProtectedRoute
                route={route}
                identity={identity}
                onGoHome={() => navigate('/dashboard')}
                onLoginClick={() => navigate('/login')}
            >
                <Component 
                    identity={identity} 
                    currentPath={currentPath} 
                    onNavigate={navigate} 
                    adminActorId={identity?.user_id || 'ADM-001'}
                    userId={identity?.user_id || 'USR-001'}
                    currentSessionId={frontendAuthorizationAdapter.getCurrentSessionId() || 'SES-CURRENT'}
                />
            </ProtectedRoute>
        </AppShell>
    );
};
