import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ScheduleConflict, ScheduleConflictSummary, UserRole } from '../types/curriculum';
import { schedulingAnalyticsEngine } from '../services/schedulingAnalyticsEngine';

interface ScheduleConflictMonitorProps {
    identity?: {
        user_id?: string;
        actor_id?: string;
        role: UserRole;
    };
    institutionId?: string;
    semesterId?: string;
}

export const ScheduleConflictMonitor: React.FC<ScheduleConflictMonitorProps> = ({
    institutionId = 'INST-DEFAULT',
    semesterId = 'SEM-DEFAULT'
}) => {
    const [summary, setSummary] = useState<ScheduleConflictSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadConflicts();
    }, [institutionId, semesterId]);

    const loadConflicts = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await schedulingAnalyticsEngine.getScheduleConflictSummary(institutionId, semesterId);
            setSummary(data);
        } catch (err: any) {
            setError(err.message || 'Gagal memindai konflik jadwal');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-slate-600">Memindai potensi tabrakan jadwal (conflict detection)...</span>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <header className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                        Monitor Tabrakan Jadwal (Schedule Conflict Monitor)
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Pemeriksaan deterministik tabrakan jam guru, bentrok kelas/rombel, dan okupansi ruangan ganda
                    </p>
                </div>
                <button
                    onClick={loadConflicts}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm"
                >
                    Pindai Ulang
                </button>
            </header>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                    {error}
                </div>
            )}

            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tabrakan Terdeteksi</span>
                        <div className="mt-2 text-2xl font-bold text-slate-900">
                            {summary.total_conflicts}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Konflik Kritis</span>
                        <div className="mt-2 text-2xl font-bold text-rose-600">
                            {summary.critical_conflicts}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Peringatan</span>
                        <div className="mt-2 text-2xl font-bold text-amber-600">
                            {summary.warning_conflicts}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-indigo-600" />
                        Daftar Konflik Jadwal Terverifikasi
                    </h2>
                </div>

                {!summary || summary.conflicts.length === 0 ? (
                    <div className="p-12 text-center">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-slate-900">Tidak Ditemukan Tabrakan Jadwal</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Semua jadwal guru, rombel, dan alokasi ruangan berada dalam status terisolasi dan valid.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-700">
                            <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">Tingkat Keparahan</th>
                                    <th className="px-6 py-3">Tipe Tabrakan</th>
                                    <th className="px-6 py-3">Entitas Terkait</th>
                                    <th className="px-6 py-3">Deskripsi Tabrakan</th>
                                    <th className="px-6 py-3">Waktu Deteksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {summary.conflicts.map((conf) => (
                                    <tr key={conf.conflict_id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                conf.severity === 'CRITICAL' 
                                                    ? 'bg-rose-100 text-rose-800' 
                                                    : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                {conf.severity}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs font-medium text-slate-900">
                                            {conf.conflict_type}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-600">
                                            {conf.entity_id}
                                        </td>
                                        <td className="px-6 py-4 text-slate-800">
                                            {conf.message}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                                            {new Date(conf.detected_at).toLocaleTimeString('id-ID')}
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
