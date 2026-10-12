import React, { useState, useEffect, useCallback } from 'react';
import { ParentStudentOverview, Guardian } from '../types/curriculum';
import { parentPortalEngine } from '../services/parentPortalEngine';

interface ParentStudentMonitoringProps {
    guardianId: string;
    onSelectStudent?: (studentId: string) => void;
}

export const ParentStudentMonitoring: React.FC<ParentStudentMonitoringProps> = ({
    guardianId,
    onSelectStudent
}) => {
    const [guardian, setGuardian] = useState<Guardian | null>(null);
    const [students, setStudents] = useState<ParentStudentOverview[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const g = await parentPortalEngine.getGuardian(guardianId);
            setGuardian(g);
            const list = await parentPortalEngine.listAuthorizedStudents(guardianId);
            setStudents(list);
        } catch (err: unknown) {
            setError((err as Error).message || 'Gagal memuat ringkasan siswa');
        } finally {
            setLoading(false);
        }
    }, [guardianId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100 max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div>
                    <h3 className="text-xl font-bold text-white">Daftar Siswa Terdaftar (Wali)</h3>
                    <p className="text-xs text-slate-400 mt-1">
                        Wali: {guardian?.display_name || guardianId} | Peran: {guardian?.role || '-'}
                    </p>
                </div>
                <button
                    onClick={loadData}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                >
                    Segarkan Data
                </button>
            </div>

            {error && (
                <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="p-8 text-center text-slate-400">Memuat data monitoring siswa...</div>
            ) : students.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {students.map(s => (
                        <div 
                            key={s.student_id} 
                            className={`p-5 rounded-xl border transition-all ${
                                s.has_action_items
                                    ? 'bg-amber-950/20 border-amber-800/50'
                                    : 'bg-slate-800/50 border-slate-700/60'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="text-base font-bold text-white">{s.student_display_name}</div>
                                    <div className="text-xs text-slate-400">
                                        Hubungan: {s.relationship_type} {s.is_primary_contact && '(Kontak Utama)'}
                                    </div>
                                </div>
                                {s.has_action_items && (
                                    <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold rounded-full">
                                        Perlu Perhatian
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 my-4 text-center">
                                <div className="p-2 bg-slate-900/60 rounded-lg">
                                    <div className="text-[10px] uppercase text-slate-400">Presensi</div>
                                    <div className="text-base font-bold text-emerald-400">{s.attendance_rate}%</div>
                                </div>
                                <div className="p-2 bg-slate-900/60 rounded-lg">
                                    <div className="text-[10px] uppercase text-slate-400">Perilaku</div>
                                    <div className="text-xs font-bold text-amber-400 mt-1">{s.behavior_standing}</div>
                                </div>
                                <div className="p-2 bg-slate-900/60 rounded-lg">
                                    <div className="text-[10px] uppercase text-slate-400">Bimbingan</div>
                                    <div className="text-xs font-bold text-cyan-400 mt-1">{s.guidance_standing}</div>
                                </div>
                            </div>

                            {onSelectStudent && (
                                <button
                                    onClick={() => onSelectStudent(s.student_id)}
                                    className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition-colors"
                                >
                                    Buka Detail Lengkap
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center text-slate-500 italic">
                    Tidak ada siswa terotorisasi untuk wali ini.
                </div>
            )}
        </div>
    );
};
