import React, { useState, useEffect } from 'react';
import { AcademicYear, Semester, SemesterStatus } from '../types/curriculum';
import { academicCalendarEngine } from '../services/academicCalendarEngine';
import { academicCalendarRepositoryEngine } from '../services/academicCalendarRepositoryEngine';

interface AcademicSemesterManagementProps {
    actorId?: string;
    actorRole?: string;
}

export const AcademicSemesterManagement: React.FC<AcademicSemesterManagementProps> = ({
    actorId = 'ADM-01',
    actorRole = 'ADMIN'
}) => {
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>('');
    const [semesters, setSemesters] = useState<Semester[]>([]);

    const [newSemCode, setNewSemCode] = useState('GANJIL');
    const [newSemLabel, setNewSemLabel] = useState('Semester Ganjil 2026/2027');
    const [newSemSequence, setNewSemSequence] = useState(1);
    const [newSemStart, setNewSemStart] = useState('2026-07-01');
    const [newSemEnd, setNewSemEnd] = useState('2026-12-31');

    const [revisionReason, setRevisionReason] = useState('');
    const [selectedSemesterForReopen, setSelectedSemesterForReopen] = useState<string | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setError(null);
            const years = await academicCalendarRepositoryEngine.listAcademicYears();
            setAcademicYears(years);

            const activeYear = years.find(y => y.status === 'ACTIVE') || years[0];
            const currentYearId = selectedYearId || activeYear?.academic_year_id || '';
            if (currentYearId && !selectedYearId) {
                setSelectedYearId(currentYearId);
            }

            if (currentYearId) {
                const sems = await academicCalendarRepositoryEngine.listSemesters(currentYearId);
                setSemesters(sems);
            }
        } catch (err: any) {
            setError(err.message || 'Gagal memuat data semester');
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedYearId]);

    const handleCreateSemester = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedYearId) {
            setError('Pilih tahun ajaran terlebih dahulu');
            return;
        }

        setError(null);
        setSuccessMessage(null);

        try {
            const created = await academicCalendarEngine.createSemester({
                academic_year_id: selectedYearId,
                code: newSemCode,
                label: newSemLabel,
                sequence: Number(newSemSequence),
                start_at: `${newSemStart}T00:00:00.000Z`,
                end_at: `${newSemEnd}T23:59:59.000Z`,
                actor_id: actorId,
                actor_role: actorRole
            });
            setSuccessMessage(`Semester ${created.label} berhasil dibuat (${created.semester_id}).`);
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Gagal membuat semester');
        }
    };

    const handleActivateSemester = async (semesterId: string) => {
        setError(null);
        setSuccessMessage(null);
        try {
            const updated = await academicCalendarEngine.activateSemester({
                semester_id: semesterId,
                actor_id: actorId,
                actor_role: actorRole,
                revision_reason: revisionReason || undefined
            });
            setSuccessMessage(`Semester ${updated.label} berhasil diaktifkan.`);
            setSelectedSemesterForReopen(null);
            setRevisionReason('');
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Gagal mengaktifkan semester');
        }
    };

    const handleCloseSemester = async (semesterId: string) => {
        setError(null);
        setSuccessMessage(null);
        try {
            const updated = await academicCalendarEngine.closeSemester({
                semester_id: semesterId,
                actor_id: actorId,
                actor_role: actorRole
            });
            setSuccessMessage(`Semester ${updated.label} berhasil ditutup.`);
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Gagal menutup semester');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="border-b border-slate-200 pb-4">
                <h2 className="text-xl font-bold text-slate-800">Manajemen Semester & Periode Akademik</h2>
                <p className="text-sm text-slate-500">
                    Otoritas penjadwalan semester, batas waktu KBM, dan aktivasi siklus akademik
                </p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
                    ⚠️ {error}
                </div>
            )}

            {successMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm font-medium">
                    ✓ {successMessage}
                </div>
            )}

            {/* Academic Year Selector */}
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Pilih Tahun Ajaran:</label>
                <select
                    className="w-full max-w-xs px-3 py-2 bg-white border border-slate-300 rounded-md text-sm"
                    value={selectedYearId}
                    onChange={e => setSelectedYearId(e.target.value)}
                >
                    {academicYears.map(yr => (
                        <option key={yr.academic_year_id} value={yr.academic_year_id}>
                            {yr.label} ({yr.code}) — {yr.status}
                        </option>
                    ))}
                </select>
            </div>

            {/* Create Semester Form */}
            <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4">
                <h3 className="font-semibold text-slate-700">Buat Semester Baru</h3>
                <form onSubmit={handleCreateSemester} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Kode Semester</label>
                        <select
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm"
                            value={newSemCode}
                            onChange={e => {
                                setNewSemCode(e.target.value);
                                if (e.target.value === 'GANJIL') {
                                    setNewSemSequence(1);
                                    setNewSemLabel('Semester Ganjil');
                                } else {
                                    setNewSemSequence(2);
                                    setNewSemLabel('Semester Genap');
                                }
                            }}
                        >
                            <option value="GANJIL">GANJIL (Semester 1)</option>
                            <option value="GENAP">GENAP (Semester 2)</option>
                            <option value="PENDEK">PENDEK (Semester Antara)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Label Semester</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm"
                            value={newSemLabel}
                            onChange={e => setNewSemLabel(e.target.value)}
                            placeholder="Semester Ganjil 2026/2027"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Urutan (Sequence)</label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm"
                            value={newSemSequence}
                            onChange={e => setNewSemSequence(Number(e.target.value))}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Tanggal Mulai</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm"
                            value={newSemStart}
                            onChange={e => setNewSemStart(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Tanggal Selesai</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm"
                            value={newSemEnd}
                            onChange={e => setNewSemEnd(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            type="submit"
                            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium"
                        >
                            + Tambah Semester
                        </button>
                    </div>
                </form>
            </div>

            {/* Semesters List */}
            <div className="space-y-3">
                <h3 className="font-semibold text-slate-700">Daftar Semester Pada Tahun Ajaran Ini</h3>
                {semesters.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center">Belum ada semester terdaftar pada tahun ajaran yang dipilih.</p>
                ) : (
                    semesters.map(sem => (
                        <div key={sem.semester_id} className="p-4 bg-white border border-slate-200 rounded-lg space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded">
                                            #{sem.sequence} {sem.code}
                                        </span>
                                        <h4 className="font-semibold text-slate-800 text-base">{sem.label}</h4>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Periode: {new Date(sem.start_at).toLocaleDateString()} — {new Date(sem.end_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                                    sem.status === 'ACTIVE'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : sem.status === 'CLOSED'
                                        ? 'bg-slate-100 text-slate-700'
                                        : 'bg-amber-100 text-amber-800'
                                }`}>
                                    {sem.status} (v{sem.version_number})
                                </span>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                {sem.status === 'DRAFT' && (
                                    <button
                                        type="button"
                                        onClick={() => handleActivateSemester(sem.semester_id)}
                                        className="text-xs px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 font-medium"
                                    >
                                        Aktifkan Semester
                                    </button>
                                )}
                                {sem.status === 'ACTIVE' && (
                                    <button
                                        type="button"
                                        onClick={() => handleCloseSemester(sem.semester_id)}
                                        className="text-xs px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-700 font-medium"
                                    >
                                        Tutup Semester
                                    </button>
                                )}
                                {sem.status === 'CLOSED' && selectedSemesterForReopen !== sem.semester_id && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSemesterForReopen(sem.semester_id)}
                                        className="text-xs px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 font-medium"
                                    >
                                        Buka Kembali...
                                    </button>
                                )}
                            </div>

                            {selectedSemesterForReopen === sem.semester_id && (
                                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md space-y-2">
                                    <label className="block text-xs font-semibold text-amber-900">Alasan Pembukaan Kembali (Revision Reason):</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded"
                                        value={revisionReason}
                                        onChange={e => setRevisionReason(e.target.value)}
                                        placeholder="Perpanjangan masa ujian susulan"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleActivateSemester(sem.semester_id)}
                                            className="text-xs px-3 py-1 bg-amber-700 text-white rounded hover:bg-amber-800 font-medium"
                                        >
                                            Konfirmasi Pembukaan Kembali
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedSemesterForReopen(null)}
                                            className="text-xs px-3 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
