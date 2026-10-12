import React, { useEffect } from 'react';
import { X, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { NavigationItem, AuthenticatedIdentity } from '../../types/curriculum';

interface MobileNavigationProps {
    isOpen: boolean;
    onClose: () => void;
    items: NavigationItem[];
    currentPath: string;
    onNavigate: (path: string) => void;
    identity: AuthenticatedIdentity | null;
    onLogout: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
    isOpen,
    onClose,
    items,
    currentPath,
    onNavigate,
    identity,
    onLogout
}) => {
    // Close on escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true" aria-label="Menu Navigasi Mobile">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer */}
            <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
                <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                            E
                        </div>
                        <span className="font-heading font-black text-slate-900 text-sm">
                            EduTaktis LMS
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup Menu"
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-lg focus-visible:outline-2 focus-visible:outline-blue-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Identity banner */}
                {identity && (
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                            {identity.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="leading-tight overflow-hidden">
                            <span className="block font-bold text-slate-900 text-xs truncate">
                                {identity.display_name}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">
                                {identity.role}
                            </span>
                        </div>
                    </div>
                )}

                {/* Navigation Links */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Navigasi Mobile">
                    {items.map((item) => {
                        const isActive = currentPath === item.path;

                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    onNavigate(item.path);
                                    onClose();
                                }}
                                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-colors text-left focus-visible:outline-2 focus-visible:outline-blue-600 ${
                                    isActive
                                        ? 'bg-blue-50 text-blue-700 font-extrabold'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <span className="truncate">{item.label}</span>
                                {item.badge !== undefined && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                                        {item.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Logout Footer */}
                {identity && (
                    <div className="p-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onLogout();
                            }}
                            className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-red-600"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Keluar Sesi Aman</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
