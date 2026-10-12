import React, { useState, useEffect, useCallback } from 'react';
import { 
    Notification, 
    NotificationCategory, 
    NotificationPriority, 
    NotificationSummary 
} from '../types/curriculum';
import { notificationEngine } from '../services/notificationEngine';

interface NotificationCenterProps {
    actorId?: string;
    actorRole?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
    actorId = 'STU-001',
    actorRole = 'STUDENT'
}) => {
    const [currentActorId, setCurrentActorId] = useState<string>(actorId);
    const [currentRole, setCurrentRole] = useState<string>(actorRole);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [summary, setSummary] = useState<NotificationSummary | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'ALL'>('ALL');
    const [selectedPriority, setSelectedPriority] = useState<NotificationPriority | 'ALL'>('ALL');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const loadNotifications = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await notificationEngine.listNotifications({
                recipient_id: currentActorId,
                actor_id: currentActorId,
                actor_role: currentRole,
                category: selectedCategory === 'ALL' ? undefined : selectedCategory
            });
            setNotifications(list);

            const sum = await notificationEngine.getNotificationSummary(
                currentActorId,
                currentActorId,
                currentRole
            );
            setSummary(sum);
        } catch (err: unknown) {
            setError((err as Error).message || 'Gagal memuat notifikasi');
        } finally {
            setLoading(false);
        }
    }, [currentActorId, currentRole, selectedCategory]);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const handleMarkRead = async (notifId: string) => {
        try {
            await notificationEngine.markRead({
                notification_id: notifId,
                recipient_id: currentActorId,
                actor_id: currentActorId,
                actor_role: currentRole
            });
            loadNotifications();
        } catch (err: unknown) {
            setError((err as Error).message || 'Gagal menandai notifikasi');
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (selectedPriority !== 'ALL' && n.priority !== selectedPriority) return false;
        return true;
    });

    const getPriorityBadgeClass = (priority: NotificationPriority) => {
        switch (priority) {
            case 'URGENT':
                return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
            case 'HIGH':
                return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
            case 'NORMAL':
                return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
            case 'LOW':
            default:
                return 'bg-slate-700/40 text-slate-300 border-slate-600';
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-800 gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-xs font-semibold mb-2">
                        Pusat Notifikasi Terintegrasi
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">
                        Notifikasi & Peringatan Sistem
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Penerimaan pesan dan peringatan akademik, kehadiran, perilaku & bimbingan berbasis Zero-Trust.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                        <label htmlFor="user-id-input" className="block text-slate-400">ID Pengguna:</label>
                        <input
                            id="user-id-input"
                            type="text"
                            value={currentActorId}
                            onChange={(e) => setCurrentActorId(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono w-28 text-right"
                        />
                    </div>
                    <div>
                        <label htmlFor="role-select" className="block text-slate-400 text-xs">Peran:</label>
                        <select
                            id="role-select"
                            value={currentRole}
                            onChange={(e) => setCurrentRole(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        >
                            <option value="STUDENT">Siswa (STUDENT)</option>
                            <option value="GUARDIAN">Wali (GUARDIAN)</option>
                            <option value="TEACHER">Guru (TEACHER)</option>
                            <option value="COUNSELOR">BK (COUNSELOR)</option>
                            <option value="ADMIN">Admin (ADMIN)</option>
                        </select>
                    </div>
                    <button
                        onClick={loadNotifications}
                        className="mt-4 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium"
                    >
                        Muat
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-xs">
                    {error}
                </div>
            )}

            {/* Summary KPI Badges */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-lg text-center">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Belum Dibaca</div>
                        <div className="text-2xl font-bold text-indigo-400 mt-1">{summary.unread_count}</div>
                    </div>
                    <div className="p-3 bg-slate-800/40 border border-rose-900/40 rounded-lg text-center">
                        <div className="text-[10px] text-rose-400 uppercase font-semibold">Mendesak (Urgent)</div>
                        <div className="text-2xl font-bold text-rose-400 mt-1">{summary.urgent_count}</div>
                    </div>
                    <div className="p-3 bg-slate-800/40 border border-amber-900/40 rounded-lg text-center">
                        <div className="text-[10px] text-amber-400 uppercase font-semibold">Prioritas Tinggi</div>
                        <div className="text-2xl font-bold text-amber-400 mt-1">{summary.high_priority_count}</div>
                    </div>
                    <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-lg text-center">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Aktif</div>
                        <div className="text-2xl font-bold text-white mt-1">{notifications.length}</div>
                    </div>
                </div>
            )}

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-800/30 border border-slate-700/60 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                    <label htmlFor="category-select" className="text-slate-400">Kategori:</label>
                    <select
                        id="category-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value as NotificationCategory | 'ALL')}
                        className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
                    >
                        <option value="ALL">Semua Kategori</option>
                        <option value="ACADEMIC">Akademik</option>
                        <option value="ASSIGNMENT">Tugas</option>
                        <option value="ASSESSMENT">Asesmen</option>
                        <option value="ATTENDANCE">Presensi</option>
                        <option value="REPORT_CARD">Rapor</option>
                        <option value="TRANSCRIPT">Transkrip</option>
                        <option value="BEHAVIOR">Perilaku</option>
                        <option value="GUIDANCE">Bimbingan (BK)</option>
                        <option value="CALENDAR">Kalender</option>
                        <option value="SYSTEM">Sistem</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <label htmlFor="priority-select" className="text-slate-400">Prioritas:</label>
                    <select
                        id="priority-select"
                        value={selectedPriority}
                        onChange={(e) => setSelectedPriority(e.target.value as NotificationPriority | 'ALL')}
                        className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
                    >
                        <option value="ALL">Semua Prioritas</option>
                        <option value="URGENT">Mendesak (URGENT)</option>
                        <option value="HIGH">Tinggi (HIGH)</option>
                        <option value="NORMAL">Normal (NORMAL)</option>
                        <option value="LOW">Rendah (LOW)</option>
                    </select>
                </div>
            </div>

            {/* Notification List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Memuat notifikasi...</div>
                ) : filteredNotifications.length > 0 ? (
                    filteredNotifications.map(notif => (
                        <div 
                            key={notif.notification_id}
                            className={`p-4 rounded-xl border transition-all ${
                                notif.status === 'DELIVERED'
                                    ? 'bg-slate-800/80 border-indigo-500/50 shadow-sm'
                                    : 'bg-slate-900/60 border-slate-800'
                            }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityBadgeClass(notif.priority)}`}>
                                        {notif.priority}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                                        {notif.category}
                                    </span>
                                    <h4 className="text-sm font-bold text-white">{notif.title}</h4>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                    <span>{new Date(notif.created_at).toLocaleString('id-ID')}</span>
                                    {notif.status === 'DELIVERED' && (
                                        <button
                                            onClick={() => handleMarkRead(notif.notification_id)}
                                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-sans font-medium transition-colors"
                                        >
                                            Tandai Dibaca
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed pl-1">{notif.body}</p>
                            <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
                                <span>Saluran: {notif.channel} | Status: {notif.status}</span>
                                <span>Checksum: {notif.checksum}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-8 text-center text-slate-500 italic">
                        Tidak ada notifikasi yang sesuai filter.
                    </div>
                )}
            </div>
        </div>
    );
};
