import React, { useState, useEffect, useCallback } from 'react';
import { 
    NotificationCategory, 
    NotificationChannel, 
    NotificationPreference 
} from '../types/curriculum';
import { notificationEngine } from '../services/notificationEngine';

interface NotificationPreferencesProps {
    actorId: string;
    actorRole: string;
}

const ALL_CATEGORIES: NotificationCategory[] = [
    'ACADEMIC', 'ASSIGNMENT', 'ASSESSMENT', 'ATTENDANCE', 
    'REPORT_CARD', 'TRANSCRIPT', 'BEHAVIOR', 'GUIDANCE', 
    'COURSE', 'CALENDAR', 'SYSTEM', 'COMMUNICATION'
];

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
    actorId,
    actorRole
}) => {
    const [preferences, setPreferences] = useState<Map<NotificationCategory, NotificationPreference>>(new Map());
    const [quietHoursEnabled, setQuietHoursEnabled] = useState<boolean>(false);
    const [startTime, setStartTime] = useState<string>('21:00');
    const [endTime, setEndTime] = useState<string>('06:00');
    const [loading, setLoading] = useState<boolean>(true);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadPreferences = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await notificationEngine.getPreferences(actorId);
            const prefMap = new Map<NotificationCategory, NotificationPreference>();
            for (const p of list) {
                prefMap.set(p.category, p);
            }
            setPreferences(prefMap);

            if (list.length > 0 && list[0].quiet_hours) {
                setQuietHoursEnabled(list[0].quiet_hours.enabled);
                setStartTime(list[0].quiet_hours.start_time);
                setEndTime(list[0].quiet_hours.end_time);
            }
        } catch (err: unknown) {
            setError((err as Error).message || 'Gagal memuat preferensi');
        } finally {
            setLoading(false);
        }
    }, [actorId]);

    useEffect(() => {
        loadPreferences();
    }, [loadPreferences]);

    const handleToggleCategory = async (category: NotificationCategory, currentEnabled: boolean) => {
        setError(null);
        setSuccessMessage(null);
        try {
            await notificationEngine.updatePreferences({
                actor_id: actorId,
                actor_role: actorRole,
                category,
                enabled: !currentEnabled,
                quiet_hours: {
                    enabled: quietHoursEnabled,
                    start_time: startTime,
                    end_time: endTime
                }
            });
            setSuccessMessage(`Preferensi kategori ${category} diperbarui.`);
            loadPreferences();
        } catch (err: unknown) {
            setError((err as Error).message || 'Gagal menyimpan preferensi');
        }
    };

    const handleChannelChange = async (category: NotificationCategory, channel: NotificationChannel) => {
        setError(null);
        setSuccessMessage(null);
        try {
            const currentPref = preferences.get(category);
            await notificationEngine.updatePreferences({
                actor_id: actorId,
                actor_role: actorRole,
                category,
                channel,
                enabled: currentPref ? currentPref.enabled : true,
                quiet_hours: {
                    enabled: quietHoursEnabled,
                    start_time: startTime,
                    end_time: endTime
                }
            });
            setSuccessMessage(`Saluran untuk ${category} diubah ke ${channel}.`);
            loadPreferences();
        } catch (err: unknown) {
            setError((err as Error).message || 'Gagal mengubah saluran');
        }
    };

    const handleSaveQuietHours = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        try {
            for (const category of ALL_CATEGORIES) {
                const currentPref = preferences.get(category);
                await notificationEngine.updatePreferences({
                    actor_id: actorId,
                    actor_role: actorRole,
                    category,
                    channel: currentPref?.channel || 'IN_APP',
                    enabled: currentPref !== undefined ? currentPref.enabled : true,
                    quiet_hours: {
                        enabled: quietHoursEnabled,
                        start_time: startTime,
                        end_time: endTime
                    }
                });
            }
            setSuccessMessage('Jam hening (Quiet Hours) berhasil disimpan.');
            loadPreferences();
        } catch (err: unknown) {
            setError((err as Error).message || 'Gagal menyimpan jam hening');
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100 max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div>
                    <h3 className="text-xl font-bold text-white">Pengaturan & Preferensi Notifikasi</h3>
                    <p className="text-xs text-slate-400 mt-1">
                        Atur saluran penerimaan, kategori yang diinginkan, dan jam hening ({actorRole}: {actorId})
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-xs">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-emerald-300 text-xs">
                    {successMessage}
                </div>
            )}

            {/* Quiet Hours Form */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-400">
                    1. Pengaturan Jam Hening (Quiet Hours)
                </h4>
                <form onSubmit={handleSaveQuietHours} className="space-y-4 text-xs">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="quiet-enable"
                            checked={quietHoursEnabled}
                            onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                            className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                        />
                        <label htmlFor="quiet-enable" className="text-slate-300 font-medium">
                            Aktifkan Jam Hening (Hanya notifikasi URGENT yang memicu peringatan tinggi)
                        </label>
                    </div>

                    {quietHoursEnabled && (
                        <div className="grid grid-cols-2 gap-4 max-w-sm">
                            <div>
                                <label htmlFor="start-time-input" className="block text-slate-400 mb-1">Mulai Jam:</label>
                                <input
                                    id="start-time-input"
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                                />
                            </div>
                            <div>
                                <label htmlFor="end-time-input" className="block text-slate-400 mb-1">Selesai Jam:</label>
                                <input
                                    id="end-time-input"
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium"
                    >
                        Simpan Jam Hening
                    </button>
                </form>
            </div>

            {/* Category Preferences List */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-cyan-400">
                    2. Preferensi Kategori Notifikasi
                </h4>
                {loading ? (
                    <div className="p-4 text-center text-slate-500 text-xs">Memuat preferensi...</div>
                ) : (
                    <div className="divide-y divide-slate-800">
                        {ALL_CATEGORIES.map(category => {
                            const pref = preferences.get(category);
                            const isEnabled = pref ? pref.enabled : true;
                            const currentChannel = pref?.channel || 'IN_APP';

                            return (
                                <div key={category} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-semibold text-white">{category}</div>
                                        <div className="text-[10px] text-slate-400">
                                            Notifikasi terkait {category.toLowerCase().replace('_', ' ')}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <select
                                            value={currentChannel}
                                            disabled={!isEnabled}
                                            onChange={(e) => handleChannelChange(category, e.target.value as NotificationChannel)}
                                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 disabled:opacity-40"
                                        >
                                            <option value="IN_APP">Dalam Aplikasi (IN_APP)</option>
                                            <option value="EMAIL">Email (EMAIL)</option>
                                            <option value="SMS">SMS (SMS)</option>
                                            <option value="PUSH">Push (PUSH)</option>
                                        </select>

                                        <button
                                            onClick={() => handleToggleCategory(category, isEnabled)}
                                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                                isEnabled 
                                                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' 
                                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                            }`}
                                        >
                                            {isEnabled ? 'Aktif' : 'Nonaktif'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
