import React, { useState } from 'react';
import { Sidebar } from '../components/navigation/Sidebar';
import { TopNavigation } from '../components/navigation/TopNavigation';
import { MobileNavigation } from '../components/navigation/MobileNavigation';
import { Breadcrumbs, BreadcrumbItem } from '../components/navigation/Breadcrumbs';
import { ApplicationErrorBoundary } from './applicationErrorBoundary';
import { getNavigationForIdentity } from './routeRegistry';
import { useAuth } from './AppBootstrap';

interface AppShellProps {
    children: React.ReactNode;
    currentPath: string;
    onNavigate: (path: string) => void;
    breadcrumbs?: BreadcrumbItem[];
}

export const AppShell: React.FC<AppShellProps> = ({
    children,
    currentPath,
    onNavigate,
    breadcrumbs = []
}) => {
    const { identity, logout } = useAuth();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navigationItems = getNavigationForIdentity(identity);

    return (
        <ApplicationErrorBoundary>
            <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans antialiased">
                {/* Desktop & Tablet Sidebar */}
                <Sidebar
                    items={navigationItems}
                    currentPath={currentPath}
                    onNavigate={onNavigate}
                    identity={identity}
                    isCollapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                />

                {/* Mobile Navigation Drawer */}
                <MobileNavigation
                    isOpen={mobileMenuOpen}
                    onClose={() => setMobileMenuOpen(false)}
                    items={navigationItems}
                    currentPath={currentPath}
                    onNavigate={onNavigate}
                    identity={identity}
                    onLogout={logout}
                />

                {/* Main Content Column */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Top Navigation Bar */}
                    <TopNavigation
                        identity={identity}
                        onOpenMobileMenu={() => setMobileMenuOpen(true)}
                        onLogout={logout}
                        onNavigate={onNavigate}
                    />

                    {/* Content Wrapper */}
                    <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto" id="main-content">
                        {breadcrumbs.length > 0 && (
                            <div className="mb-4">
                                <Breadcrumbs items={breadcrumbs} onNavigate={onNavigate} />
                            </div>
                        )}

                        <div className="w-full">
                            {children}
                        </div>
                    </main>

                    {/* Minimal accessible footer */}
                    <footer className="py-4 px-6 border-t border-slate-200 text-center text-xs text-slate-400 bg-white">
                        <span>EduTaktis LMS © {new Date().getFullYear()} · Sistem Terotentikasi & Otorisasi Mandiri</span>
                    </footer>
                </div>
            </div>
        </ApplicationErrorBoundary>
    );
};
