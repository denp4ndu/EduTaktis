import React from 'react';
import { 
    LayoutDashboard, 
    BookOpen, 
    Calendar, 
    ClipboardCheck, 
    FileText, 
    Award, 
    ShieldAlert, 
    HeartHandshake, 
    Bell, 
    MessageSquare, 
    Users, 
    Settings, 
    ChevronLeft, 
    ChevronRight,
    GraduationCap
} from 'lucide-react';
import { NavigationItem, AuthenticatedIdentity } from '../../types/curriculum';

interface SidebarProps {
    items: NavigationItem[];
    currentPath: string;
    onNavigate: (path: string) => void;
    identity: AuthenticatedIdentity | null;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    dashboard: LayoutDashboard,
    courses: BookOpen,
    calendar: Calendar,
    attendance: ClipboardCheck,
    grades: FileText,
    report_cards: Award,
    transcripts: GraduationCap,
    behavior: ShieldAlert,
    guidance: HeartHandshake,
    notifications: Bell,
    communication: MessageSquare,
    users: Users,
    settings: Settings
};

export const Sidebar: React.FC<SidebarProps> = ({
    items,
    currentPath,
    onNavigate,
    identity,
    isCollapsed,
    onToggleCollapse
}) => {
    return (
        <aside 
            className={`hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 h-screen sticky top-0 ${
                isCollapsed ? 'w-20' : 'w-64'
            }`}
            aria-label="Navigasi Utama"
        >
            {/* Header Brand */}
            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100">
                {!isCollapsed && (
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                            E
                        </div>
                        <div className="leading-tight truncate">
                            <span className="font-heading font-black text-slate-900 text-sm tracking-tight block truncate">
                                EduTaktis LMS
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold block tracking-wider uppercase truncate">
                                {identity?.role || 'Portal Terpadu'}
                            </span>
                        </div>
                    </div>
                )}

                {isCollapsed && (
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm mx-auto shadow-xs">
                        E
                    </div>
                )}

                <button
                    type="button"
                    onClick={onToggleCollapse}
                    aria-label={isCollapsed ? 'Perluas Menu' : 'Perkecil Menu'}
                    className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${
                        isCollapsed ? 'hidden' : 'block'
                    }`}
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Menu Aplikasi">
                {items.map((item) => {
                    const IconComponent = ICON_MAP[item.icon] || LayoutDashboard;
                    const isActive = currentPath === item.path || (item.path !== '/dashboard' && currentPath.startsWith(item.path));

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onNavigate(item.path)}
                            title={isCollapsed ? item.label : undefined}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-colors text-left focus-visible:outline-2 focus-visible:outline-blue-600 ${
                                isActive
                                    ? 'bg-blue-50 text-blue-700 font-extrabold shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                        >
                            <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                            
                            {!isCollapsed && (
                                <span className="truncate flex-1">{item.label}</span>
                            )}

                            {!isCollapsed && item.badge !== undefined && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Footer / Toggle for collapsed state */}
            {isCollapsed && (
                <div className="p-3 border-t border-slate-100 flex justify-center">
                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        aria-label="Perluas Menu"
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </aside>
    );
};
