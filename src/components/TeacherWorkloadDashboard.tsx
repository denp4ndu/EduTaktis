import React, { useState, useEffect } from 'react';
import { Briefcase, AlertCircle, Clock, BookOpen, Layers } from 'lucide-react';
import { TeacherWorkloadSummary, UserRole } from '../types/curriculum';
import { schedulingAnalyticsEngine } from '../services/schedulingAnalyticsEngine';

interface TeacherWorkloadDashboardProps {
    identity?: {
        user_id?: string;
        actor_id?: string;
        role: UserRole;
    };
    institutionId?: string;
    semesterId?: string;
    initialTeacherId?: string;
}

export const TeacherWorkloadDashboard: React.FC<TeacherWorkloadDashboardProps> = ({
    identity,
    institutionId = 'INST-DEFAULT',
    semesterId = 'SEM-DEFAULT',
    initialTeacherId = 'TEA-001'
}) => {
    const [teacherId, setTeacherId] = useState(
        identity?.role === 'TEACHER' ? (identity.actor_id || identity.user_id || initialTeacherId) : initialTeacherId
    );
    const [workload, setWorkload] = useState<TeacherWorkloadSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (teacherId) {
            loadWorkload();
        }
    }, [teacherId, institutionId, semesterId]);

    const loadWorkload = async () => {
        try {
            setLoading(true);
            setError(null);
            const summary = await schedulingAnalyticsEngine.getTeacherWorkload(teacherId, institutionId, semesterId);
            setWorkload(summary);
        } catch (err: any) {
            setError(err.message || 'Gagal memuat rekap beban ajar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <header className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-indigo-600" />
                        Dashboard Beban Kerja Guru (Teacher Workload)
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Perhitungan deterministik akumulasi jam mengajar, periode ajar, dan jumlah rombel
                    </p>
                </div>
                {identity?.role !== 'TEACHER' && (
                    <div className="flex items-center gap-2">
                        <label htmlFor="teacher-id-input" className="text-xs font-semibold text-slate-600">ID Guru:</label>
                        <input
                            id="teacher-id-input"
                            type="text"
                            value={teacherId}
                            onChange={(e) => setTeacherId(e.target.value)}
                            placeholder="Contoh: TEA-001"
                            className="px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                        />
                        <button
                            onClick={loadWorkload}
                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                        >
                            Cari
                        </button>
                    </div>
                )}
            </header>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {loading ? (
                <div className="p-8 text-center text-slate-500">Menghitung rekapitulasi beban mengajar...</div>
            ) : workload ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-indigo-500" />
                                Total Jam Ajar
                            </span>
                            <div className="mt-3 flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-slate-900">{workload.scheduled_hours}</span>
                                <span className="text-sm text-slate-500">Jam / Pekan</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Setara {workload.scheduled_minutes} Menit aktif</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-emerald-500" />
                                Alokasi Sesi Ajar
                            </span>
                            <div className="mt-3 flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-emerald-600">{workload.scheduled_period_count}</span>
                                <span className="text-sm text-slate-500">Sesi Terjadwal</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Berdasarkan jadwal aktif semester</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4 text-indigo-500" />
                                Variasi Mata Pelajaran
                            </span>
                            <div className="mt-3 flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-slate-900">{workload.course_count}</span>
                                <span className="text-sm text-slate-500">Mapel</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Mata pelajaran berbeda</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Briefcase className="w-4 h-4 text-indigo-500" />
                                Jumlah Rombel (Kelas)
                            </span>
                            <div className="mt-3 flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-slate-900">{workload.class_count}</span>
                                <span className="text-sm text-slate-500">Kelas</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Rombel bimbingan aktif</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-base font-semibold text-slate-900 mb-2">Status Beban Mengajar Resmi</h2>
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                                {workload.workload_status}
                            </span>
                            <span className="text-xs text-slate-500">
                                Diperhitungkan secara deterministik tanpa deviasi pembobotan manual.
                            </span>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};
