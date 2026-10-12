import React, { useState, useEffect, useCallback } from 'react';
import { 
    Guardian, 
    ParentDashboard, 
    ParentStudentOverview 
} from '../types/curriculum';
import { parentPortalEngine } from '../services/parentPortalEngine';

interface ParentPortalWorkspaceProps {
    initialGuardianId?: string;
}

export const ParentPortalWorkspace: React.FC<ParentPortalWorkspaceProps> = ({
    initialGuardianId = 'GRD-MOCK-1'
}) => {
    const [guardianId, setGuardianId] = useState<string>(initialGuardianId);
    const [guardian, setGuardian] = useState<Guardian | null>(null);
    const [authorizedStudents, setAuthorizedStudents] = useState<ParentStudentOverview[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [dashboard, setDashboard] = useState<ParentDashboard | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ACADEMICS' | 'ATTENDANCE' | 'WELLBEING' | 'DOCUMENTS'>('OVERVIEW');

    const loadGuardianAndStudents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const g = await parentPortalEngine.getGuardian(guardianId);
            setGuardian(g);
            if (g) {
                const students = await parentPortalEngine.listAuthorizedStudents(guardianId);
                setAuthorizedStudents(students);
                if (students.length > 0 && !selectedStudentId) {
                    setSelectedStudentId(students[0].student_id);
                }
            } else {
                setAuthorizedStudents([]);
            }
        } catch (err: unknown) {
            setError((err as Error).message || 'Gagal memuat profil wali');
        } finally {
            setLoading(false);
        }
    }, [guardianId, selectedStudentId]);

    const loadDashboard = useCallback(async (studentId: string) => {
        if (!studentId || !guardianId) return;
        setLoading(true);
        setError(null);
        try {
            const d = await parentPortalEngine.getParentDashboard(guardianId, studentId);
            setDashboard(d);
        } catch (err: unknown) {
            setError((err as Error).message || 'Gagal memuat dashboard siswa');
            setDashboard(null);
        } finally {
            setLoading(false);
        }
    }, [guardianId]);

    useEffect(() => {
        loadGuardianAndStudents();
    }, [loadGuardianAndStudents]);

    useEffect(() => {
        if (selectedStudentId) {
            loadDashboard(selectedStudentId);
        }
    }, [selectedStudentId, loadDashboard]);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-800 gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-xs font-semibold mb-2">
                        Portal Orang Tua & Wali Terintegrasi
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">
                        Monitoring Akademik & Kesejahteraan Siswa
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Akses resmi berbasis Zero-Trust untuk pemantauan perkembangan putra/putri Anda.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                        <div className="font-medium text-slate-200">{guardian?.display_name || guardianId}</div>
                        <div className="text-slate-400 font-mono">Status: {guardian?.status || 'UNKNOWN'}</div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300">
                        {guardian?.display_name ? guardian.display_name.charAt(0).toUpperCase() : 'W'}
                    </div>
                </div>
            </div>

            {/* Error Notification */}
            {error && (
                <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button 
                        onClick={() => setError(null)} 
                        className="text-rose-400 hover:text-rose-200 font-bold ml-4"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Student Switcher & Selector */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pilih Siswa:</span>
                    {authorizedStudents.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {authorizedStudents.map(student => (
                                <button
                                    key={student.student_id}
                                    onClick={() => setSelectedStudentId(student.student_id)}
                                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
                                        selectedStudentId === student.student_id
                                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                                            : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                                    }`}
                                >
                                    {student.student_display_name} ({student.relationship_type})
                                </button>
                            ))}
                        </div>
                    ) : (
                        <span className="text-xs text-amber-400 italic">Belum ada data siswa terotorisasi untuk wali ini.</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <label htmlFor="guardian-id-input" className="text-xs text-slate-400 font-mono">ID Wali:</label>
                    <input 
                        id="guardian-id-input"
                        type="text" 
                        value={guardianId} 
                        onChange={(e) => setGuardianId(e.target.value)}
                        placeholder="Contoh: GRD-001"
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono w-36"
                    />
                    <button 
                        onClick={loadGuardianAndStudents}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium"
                    >
                        Muat
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1">
                {[
                    { id: 'OVERVIEW', label: 'Ringkasan Umum' },
                    { id: 'ACADEMICS', label: 'Progres & Nilai Akademik' },
                    { id: 'ATTENDANCE', label: 'Presensi & Kehadiran' },
                    { id: 'WELLBEING', label: 'Karakter & Bimbingan' },
                    { id: 'DOCUMENTS', label: 'Rapor & Transkrip' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="p-12 text-center text-slate-400">
                    <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="text-sm font-medium">Memuat data proyeksi terverifikasi...</p>
                </div>
            ) : dashboard ? (
                <div className="space-y-6">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'OVERVIEW' && (
                        <div className="space-y-6">
                            {/* Metric Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4">
                                    <div className="text-xs text-slate-400 uppercase font-semibold">Tingkat Presensi</div>
                                    <div className="text-2xl font-bold text-emerald-400 mt-1">
                                        {dashboard.attendance.attendance_percentage}%
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        {dashboard.attendance.present_count} Hadir / {dashboard.attendance.total_sessions} Sesi
                                    </div>
                                </div>

                                <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4">
                                    <div className="text-xs text-slate-400 uppercase font-semibold">Progres Pembelajaran</div>
                                    <div className="text-2xl font-bold text-indigo-400 mt-1">
                                        {dashboard.course_progress.length > 0 
                                            ? Math.round(dashboard.course_progress.reduce((acc, c) => acc + c.progress_percentage, 0) / dashboard.course_progress.length) 
                                            : 0}%
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        {dashboard.course_progress.length} Mata Pelajaran Aktif
                                    </div>
                                </div>

                                <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4">
                                    <div className="text-xs text-slate-400 uppercase font-semibold">Kategori Perilaku</div>
                                    <div className="text-2xl font-bold text-amber-400 mt-1">
                                        {dashboard.behavior.standing}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        Indeks Skor: {dashboard.behavior.behavior_index}
                                    </div>
                                </div>

                                <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4">
                                    <div className="text-xs text-slate-400 uppercase font-semibold">Status Bimbingan</div>
                                    <div className="text-2xl font-bold text-cyan-400 mt-1">
                                        {dashboard.guidance.overall_standing}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        {dashboard.guidance.has_active_guidance ? 'Dalam Pemantauan BK' : 'Perkembangan Normal'}
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activities */}
                            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">
                                    Aktivitas & Catatan Perkembangan Terkini
                                </h3>
                                {dashboard.recent_activities.length > 0 ? (
                                    <div className="space-y-3">
                                        {dashboard.recent_activities.map(act => (
                                            <div key={act.activity_id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-xs font-mono">
                                                        {act.activity_type}
                                                    </span>
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-200">{act.title}</div>
                                                        <div className="text-xs text-slate-400">{act.description}</div>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-slate-400 font-mono">
                                                    {new Date(act.timestamp).toLocaleDateString('id-ID')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">Belum ada riwayat aktivitas terbaru.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ACADEMICS TAB */}
                    {activeTab === 'ACADEMICS' && (
                        <div className="space-y-6">
                            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">
                                    Progres Mata Pelajaran
                                </h3>
                                <div className="space-y-4">
                                    {dashboard.course_progress.map(cp => (
                                        <div key={cp.course_period_id} className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                                            <div className="flex justify-between items-center">
                                                <div className="font-semibold text-slate-200">{cp.course_name}</div>
                                                <span className="text-xs font-mono font-bold text-indigo-400">{cp.progress_percentage}% Selesai</span>
                                            </div>
                                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                                <div 
                                                    className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                                                    style={{ width: `${cp.progress_percentage}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-xs text-slate-400">
                                                <span>{cp.completed_activities} dari {cp.total_activities} aktivitas terpenuhi</span>
                                                <span className="font-mono">Status: {cp.completion_status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">
                                    Hasil Penilaian & Asesmen
                                </h3>
                                <div className="space-y-4">
                                    {dashboard.assessments.map(asm => (
                                        <div key={asm.course_period_id} className="space-y-2">
                                            <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
                                                <span>Rata-Rata Nilai: {asm.average_score} / 100</span>
                                                <span className={asm.is_passing ? 'text-emerald-400' : 'text-rose-400'}>
                                                    {asm.is_passing ? 'Memenuhi KKTP' : 'Perlu Remidial'} (KKTP: {asm.passing_grade})
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {asm.graded_items.map(item => (
                                                    <div key={item.assessment_id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex justify-between items-center">
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-200">{item.title}</div>
                                                            <div className="text-xs text-slate-400">
                                                                {item.is_passed ? 'Tuntas' : 'Belum Tuntas'}
                                                            </div>
                                                        </div>
                                                        <div className="text-lg font-bold font-mono text-indigo-300">
                                                            {item.score}<span className="text-xs text-slate-400 font-normal">/{item.max_score}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ATTENDANCE TAB */}
                    {activeTab === 'ATTENDANCE' && (
                        <div className="space-y-6">
                            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">
                                    Rincian Kehadiran Semester Ini
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    <div className="p-3 bg-slate-900/80 border border-emerald-900/40 rounded-lg text-center">
                                        <div className="text-xs text-emerald-400 font-semibold uppercase">Hadir</div>
                                        <div className="text-2xl font-bold text-white mt-1">{dashboard.attendance.present_count}</div>
                                    </div>
                                    <div className="p-3 bg-slate-900/80 border border-amber-900/40 rounded-lg text-center">
                                        <div className="text-xs text-amber-400 font-semibold uppercase">Terlambat</div>
                                        <div className="text-2xl font-bold text-white mt-1">{dashboard.attendance.late_count}</div>
                                    </div>
                                    <div className="p-3 bg-slate-900/80 border border-cyan-900/40 rounded-lg text-center">
                                        <div className="text-xs text-cyan-400 font-semibold uppercase">Izin</div>
                                        <div className="text-2xl font-bold text-white mt-1">{dashboard.attendance.excused_count}</div>
                                    </div>
                                    <div className="p-3 bg-slate-900/80 border border-blue-900/40 rounded-lg text-center">
                                        <div className="text-xs text-blue-400 font-semibold uppercase">Sakit</div>
                                        <div className="text-2xl font-bold text-white mt-1">{dashboard.attendance.sick_count}</div>
                                    </div>
                                    <div className="p-3 bg-slate-900/80 border border-rose-900/40 rounded-lg text-center">
                                        <div className="text-xs text-rose-400 font-semibold uppercase">Alpha (Tanpa Keterangan)</div>
                                        <div className="text-2xl font-bold text-white mt-1">{dashboard.attendance.absent_count}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* WELLBEING TAB */}
                    {activeTab === 'WELLBEING' && (
                        <div className="space-y-6">
                            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">
                                    Perilaku & Karakter Siswa (Safe Summary)
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-center">
                                        <div className="text-xs text-emerald-400">Catatan Positif</div>
                                        <div className="text-xl font-bold text-white mt-1">{dashboard.behavior.positive_count}</div>
                                    </div>
                                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-center">
                                        <div className="text-xs text-slate-400">Catatan Netral</div>
                                        <div className="text-xl font-bold text-white mt-1">{dashboard.behavior.neutral_count}</div>
                                    </div>
                                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-center">
                                        <div className="text-xs text-amber-400">Peringatan</div>
                                        <div className="text-xl font-bold text-white mt-1">{dashboard.behavior.warning_count}</div>
                                    </div>
                                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-center">
                                        <div className="text-xs text-rose-400">Pelanggaran</div>
                                        <div className="text-xl font-bold text-white mt-1">{dashboard.behavior.violation_count}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">
                                    Dukungan Bimbingan Konseling (BK)
                                </h3>
                                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-300">Status Pendampingan BK:</span>
                                        <span className="font-semibold text-cyan-400">{dashboard.guidance.overall_standing}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-300">Sesi Pendampingan Terjadwal:</span>
                                        <span className="font-mono text-slate-200">{dashboard.guidance.scheduled_sessions_count}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-300">Sesi Pendampingan Selesai:</span>
                                        <span className="font-mono text-slate-200">{dashboard.guidance.completed_sessions_count}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DOCUMENTS TAB */}
                    {activeTab === 'DOCUMENTS' && (
                        <div className="space-y-6">
                            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">
                                    Dokumen Akademik Resmi Terbit
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                                        <div className="font-bold text-slate-200">Rapor Semester</div>
                                        {dashboard.report_card?.is_published ? (
                                            <div>
                                                <div className="text-xs text-emerald-400 font-semibold">Tersedia & Terverifikasi</div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    Semester: {dashboard.report_card.semester_id} | Predikat: {dashboard.report_card.overall_predicate || '-'}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-slate-500 italic">Belum diterbitkan oleh pihak sekolah.</div>
                                        )}
                                    </div>

                                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                                        <div className="font-bold text-slate-200">Transkrip Kumulatif</div>
                                        {dashboard.transcript?.is_published ? (
                                            <div>
                                                <div className="text-xs text-emerald-400 font-semibold">Tersedia & Terverifikasi</div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    IPK: {dashboard.transcript.cumulative_gpa} | Total SKS: {dashboard.transcript.total_credits}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-slate-500 italic">Belum diterbitkan secara resmi.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Security & Checksum footer */}
                    <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs font-mono text-slate-500 flex flex-col md:flex-row justify-between items-center gap-2">
                        <span>Zero-Trust Checksum: {dashboard.checksum}</span>
                        <span>Diperbarui: {new Date(dashboard.generated_at).toLocaleString('id-ID')}</span>
                    </div>
                </div>
            ) : (
                <div className="p-12 text-center text-slate-500 italic">
                    Pilih siswa untuk menampilkan dashboard terverifikasi.
                </div>
            )}
        </div>
    );
};
