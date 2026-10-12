import React, { useState } from 'react';
import { Menu, Bell, LogOut, ShieldCheck, User } from 'lucide-react';
import { AuthenticatedIdentity } from '../../types/curriculum';

interface TopNavigationProps {
    identity: AuthenticatedIdentity | null;
    onOpenMobileMenu: () => void;
    onLogout: () => void;
    onNavigate: (path: string) => void;
    unreadNotificationCount?: number;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
    identity,
    onOpenMobileMenu,
    onLogout,
    onNavigate,
    unreadNotificationCount = 0
}) => {
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    return (
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onOpenMobileMenu}
                    aria-label="Buka Menu Navigasi"
                    className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                    <Menu className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Sesi Terenkripsi Zero-Trust</span>
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Notifications Link */}
                <button
                    type="button"
                    onClick={() => onNavigate('/notifications')}
                    aria-label="Pusat Notifikasi"
                    className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                    <Bell className="w-5 h-5" />
                    {unreadNotificationCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                </button>

                {/* User Profile Dropdown */}
                {identity ? (
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            aria-expanded={userMenuOpen}
                            aria-haspopup="true"
                            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 text-left"
                        >
                            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                                {identity.display_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="hidden lg:block leading-tight">
                                <span className="block font-bold text-slate-900 text-xs truncate max-w-[120px]">
                                    {identity.display_name}
                                </span>
                                <span className="block text-[10px] text-slate-400 font-semibold uppercase">
                                    {identity.role}
                                </span>
                            </div>
                        </button>

                        {userMenuOpen && (
                            <div 
                                className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-lg p-2 z-50 animate-in fade-in zoom-in-95"
                                role="menu"
                            >
                                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                                    <p className="text-xs font-bold text-slate-900 truncate">{identity.display_name}</p>
                                    <p className="text-[11px] text-slate-400 truncate">{identity.email}</p>
                                </div>

                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        setUserMenuOpen(false);
                                        onNavigate('/security');
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors text-left"
                                >
                                    <User className="w-4 h-4 text-slate-400" />
                                    <span>Keamanan Akun</span>
                                </button>

                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        setUserMenuOpen(false);
                                        onLogout();
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors text-left mt-1 border-t border-slate-100"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Keluar Sesi Aman</span>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => onNavigate('/login')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                    >
                        Masuk
                    </button>
                )}
            </div>
        </header>
    );
};
