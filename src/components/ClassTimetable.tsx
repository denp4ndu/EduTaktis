import React, { useState, useEffect } from 'react';
import { Calendar, Users, AlertCircle } from 'lucide-react';
import { ScheduleEntry, ClassScheduleSummary, UserRole } from '../types/curriculum';
import { schedulingEngine } from '../services/schedulingEngine';
import { schedulingAnalyticsEngine } from '../services/schedulingAnalyticsEngine';

interface ClassTimetableProps {
    identity?: {
        user_id?: string;
        actor_id?: string;
        role: UserRole;
    };
    institutionId?: string;
    semesterId?: string;
    initialClassId?: string;
}

export const ClassTimetable: React.FC<ClassTimetableProps> = ({
    identity,
    institutionId = 'INST-DEFAULT',
    semesterId = 'SEM-DEFAULT',
    initialClassId = 'CLS-10A'
}) => {
    const [classId, setClassId] = useState(initialClassId);
    const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
    const [summary, setSummary] = useState<ClassScheduleSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (classId) {
            loadClassSchedule();
        }
    }, [classId, institutionId, semesterId]);

    const loadClassSchedule = async () => {
        try {
            setLoading(true);
            setError(null);

            const entries = await schedulingEngine.getClassTimetable({
                class_id: classId,
                institution_id: institutionId,
                semester_id: semesterId,
                actor_id: identity?.actor_id || identity?.user_id || 'ADM-DEFAULT',
                actor_role: identity?.role || 'ADMIN'
            });
            setSchedules(entries);

            const summ = await schedulingAnalyticsEngine.getClassScheduleSummary(classId, institutionId, semesterId);
            setSummary(summ);
        } catch (err: any) {
            setError(err.message || 'Gagal memuat jadwal kelas');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <header className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-6 h-6 text-indigo-600" />
                        Jadwal Pelajaran Rombongan Belajar (Kelas)
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Pemeriksaan jadwal terpadu rombel dan alokasi jam mengajar
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor="class-input" className="text-xs font-semibold text-slate-600">ID Rombel:</label>
                    <input
                        id="class-input"
                        type="text"
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        placeholder="Contoh: CLS-10A"
                        className="px-3 py-1.5 text-sm border border-slate-300 rounded-md shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                        onClick={loadClassSchedule}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                    >
                        Tampilkan
                    </button>
                </div>
            </header>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Jam Rombel</span>
                        <div className="mt-2 text-2xl font-bold text-slate-900">
                            {(summary.total_minutes / 60).toFixed(1)} <span className="text-xs text-slate-500 font-normal">Jam ({summary.total_minutes} Menit)</span>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Alokasi Sesi</span>
                        <div className="mt-2 text-2xl font-bold text-indigo-600">
                            {summary.total_periods} <span className="text-xs text-slate-500 font-normal">Sesi</span>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mata Pelajaran Aktif</span>
                        <div className="mt-2 text-2xl font-bold text-slate-900">
                            {summary.unique_courses}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Guru Terlibat</span>
                        <div className="mt-2 text-2xl font-bold text-slate-900">
                            {summary.unique_teachers}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        Sesi Jadwal Terdaftar untuk Kelas {classId}
                    </h2>
                    <span className="text-xs font-medium bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-full">
                        {schedules.length} Sesi
                    </span>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500">Memuat jadwal kelas...</div>
                ) : schedules.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        Tidak ada jadwal aktif untuk kelas {classId} pada semester ini.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-700">
                            <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">ID Jadwal</th>
                                    <th className="px-6 py-3">Mata Pelajaran</th>
                                    <th className="px-6 py-3">Guru</th>
                                    <th className="px-6 py-3">Time Slot</th>
                                    <th className="px-6 py-3">Ruangan</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {schedules.map((s) => (
                                    <tr key={s.schedule_id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 font-mono text-xs font-medium text-slate-900">
                                            {s.schedule_id}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-indigo-600">
                                            {s.course_id}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-700">
                                            {s.teacher_id}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-600">
                                            {s.time_slot_id}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-600">
                                            {s.room_id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                {s.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
