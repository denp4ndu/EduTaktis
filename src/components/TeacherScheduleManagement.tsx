import React, { useState, useEffect } from 'react';
import { Calendar, Clock, BookOpen, User, CheckCircle, AlertCircle } from 'lucide-react';
import { TeacherTimetableEntry, TeacherWorkloadSummary, UserRole } from '../types/curriculum';
import { schedulingEngine } from '../services/schedulingEngine';
import { schedulingAnalyticsEngine } from '../services/schedulingAnalyticsEngine';

interface TeacherScheduleManagementProps {
    identity?: {
        user_id?: string;
        actor_id?: string;
        role: UserRole;
    };
    institutionId?: string;
    semesterId?: string;
}

export const TeacherScheduleManagement: React.FC<TeacherScheduleManagementProps> = ({
    identity,
    institutionId = 'INST-DEFAULT',
    semesterId = 'SEM-DEFAULT'
}) => {
    const teacherId = identity?.actor_id || identity?.user_id || 'TEA-DEFAULT';
    const [timetable, setTimetable] = useState<TeacherTimetableEntry[]>([]);
    const [workload, setWorkload] = useState<TeacherWorkloadSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [teacherId, institutionId, semesterId]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const entries = await schedulingEngine.getTeacherTimetable({
                teacher_id: teacherId,
                institution_id: institutionId,
                semester_id: semesterId,
                caller_id: teacherId,
                caller_role: identity?.role || 'TEACHER'
            });
            setTimetable(entries);

            const wl = await schedulingAnalyticsEngine.getTeacherWorkload(teacherId, institutionId, semesterId);
            setWorkload(wl);
        } catch (err: any) {
            setError(err.message || 'Gagal memuat jadwal mengajar');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-slate-600">Memuat jadwal dan beban ajar guru...</span>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-indigo-600" />
                        Jadwal Mengajar Guru
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        ID Guru: <span className="font-mono font-medium text-slate-700">{teacherId}</span> • Institusi: {institutionId}
                    </p>
                </div>
            </header>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Workload Metric Summary */}
            {workload && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Jam Ajar</span>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900">{workload.scheduled_hours}</span>
                            <span className="text-xs text-slate-500">Jam ({workload.scheduled_minutes} Menit)</span>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Jumlah Sesi / Periode</span>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-indigo-600">{workload.scheduled_period_count}</span>
                            <span className="text-xs text-slate-500">Sesi Terjadwal</span>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mata Pelajaran Diampu</span>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900">{workload.course_count}</span>
                            <span className="text-xs text-slate-500">Mata Pelajaran</span>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rombel / Kelas Diampu</span>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900">{workload.class_count}</span>
                            <span className="text-xs text-slate-500">Kelas</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Timetable Listing */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        Daftar Jadwal Mengajar Terstruktur
                    </h2>
                    <span className="text-xs font-medium bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                        {timetable.length} Sesi Aktif
                    </span>
                </div>

                {timetable.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        Belum ada jadwal mengajar yang aktif untuk periode ini.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-700">
                            <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">Hari</th>
                                    <th className="px-6 py-3">Waktu</th>
                                    <th className="px-6 py-3">Mata Pelajaran</th>
                                    <th className="px-6 py-3">Kelas</th>
                                    <th className="px-6 py-3">Ruangan</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {timetable.map((item) => (
                                    <tr key={item.schedule_id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 font-semibold text-slate-900">
                                            {item.day_of_week || '-'}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-600">
                                            {item.start_time} - {item.end_time}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-indigo-600">
                                            {item.course_id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-slate-100 px-2.5 py-1 rounded text-xs font-medium text-slate-700">
                                                {item.class_id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                                            {item.room_id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                {item.status || 'ACTIVE'}
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
