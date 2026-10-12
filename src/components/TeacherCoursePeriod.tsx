import React, { useState, useEffect } from 'react';
import { CoursePeriod, Semester, AcademicYear } from '../types/curriculum';
import { coursePeriodEngine } from '../services/coursePeriodEngine';
import { academicCalendarRepositoryEngine } from '../services/academicCalendarRepositoryEngine';

interface TeacherCoursePeriodProps {
    teacherId: string;
    teacherAuthorizedCourses?: string[];
}

export const TeacherCoursePeriod: React.FC<TeacherCoursePeriodProps> = ({
    teacherId,
    teacherAuthorizedCourses = ['CRS-MAT-101', 'CRS-FIS-101']
}) => {
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [coursePeriods, setCoursePeriods] = useState<CoursePeriod[]>([]);

    const [selectedCourseId, setSelectedCourseId] = useState<string>(teacherAuthorizedCourses[0] || '');
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
    const [selectedYearId, setSelectedYearId] = useState<string>('');

    const [startDate, setStartDate] = useState('2026-07-15');
    const [endDate, setEndDate] = useState('2026-12-15');
    const [revisionReason, setRevisionReason] = useState('');
    const [reopeningPeriodId, setReopeningPeriodId] = useState<string | null>(null);

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
                const activeSem = sems.find(s => s.status === 'ACTIVE') || sems[0];
                if (activeSem && !selectedSemesterId) {
                    setSelectedSemesterId(activeSem.semester_id);
                }
            }

            const periods = await coursePeriodEngine.listCoursePeriodsForTeacher(teacherId, {
                academic_year_id: currentYearId || undefined,
                semester_id: selectedSemesterId || undefined,
                course_id: selectedCourseId || undefined
            });
            setCoursePeriods(periods);
        } catch (err: any) {
            setError(err.message || 'Gagal memuat periode kursus');
        }
    };

    useEffect(() => {
        loadData();
    }, [teacherId, selectedCourseId, selectedSemesterId, selectedYearId]);

    const handleCreatePeriod = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSemesterId || !selectedYearId || !selectedCourseId) {
            setError('Pilih tahun ajaran, semester, dan mata pelajaran.');
            return;
        }

        setError(null);
        setSuccessMessage(null);

        try {
            const created = await coursePeriodEngine.createCoursePeriod({
                course_id: selectedCourseId,
                academic_year_id: selectedYearId,
                semester_id: selectedSemesterId,
                teacher_id: teacherId,
                start_at: `${startDate}T00:00:00.000Z`,
                end_at: `${endDate}T23:59:59.000Z`,
                actor_id: teacherId,
                actor_role: 'TEACHER',
                teacher_authorized_courses: teacherAuthorizedCourses
            });
            setSuccessMessage(`Periode kursus ${created.course_id} berhasil dibuat (${created.course_period_id}).`);
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Gagal membuat periode kursus');
        }
    };

    const handleSchedule = async (periodId: string) => {
        setError(null);
        try {
            await coursePeriodEngine.scheduleCoursePeriod({
                course_period_id: periodId,
                actor_id: teacherId,
                actor_role: 'TEACHER'
            });
            setSuccessMessage('Periode berhasil dijadwalkan (SCHEDULED).');
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Gagal menjadwalkan periode');
        }
    };

    const handleActivate = async (periodId: string) => {
        setError(null);
        try {
            await coursePeriodEngine.activateCoursePeriod({
                course_period_id: periodId,
                actor_id: teacherId,
                actor_role: 'TEACHER',
                revision_reason: revisionReason || undefined
            });
            setSuccessMessage('Periode berhasil diaktifkan (ACTIVE).');
            setReopeningPeriodId(null);
            setRevisionReason('');
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Gagal mengaktifkan periode');
        }
    };

    const handleClose = async (periodId: string) => {
        setError(null);
        try {
            await coursePeriodEngine.closeCoursePeriod({
                course_period_id: periodId,
                actor_id: teacherId,
                actor_role: 'TEACHER'
            });
            setSuccessMessage('Periode berhasil ditutup (CLOSED).');
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Gagal menutup periode');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="border-b border-slate-200 pb-4">
                <h2 className="text-xl font-bold text-slate-800">Manajemen Periode Kursus Guru</h2>
                <p className="text-sm text-slate-500">
                    Otoritas jadwal pembelajaran per mata pelajaran dalam semester aktif (Phase 32)
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

            {/* Selection Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mata Pelajaran (Scope):</label>
                    <select
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm"
                        value={selectedCourseId}
                        onChange={e => setSelectedCourseId(e.target.value)}
                    >
                        {teacherAuthorizedCourses.map(cid => (
                            <option key={cid} value={cid}>{cid}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Ajaran:</label>
                    <select
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm"
                        value={selectedYearId}
                        onChange={e => setSelectedYearId(e.target.value)}
                    >
                        {academicYears.map(yr => (
                            <option key={yr.academic_year_id} value={yr.academic_year_id}>
                                {yr.label} ({yr.code})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Semester:</label>
                    <select
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm"
                        value={selectedSemesterId}
                        onChange={e => setSelectedSemesterId(e.target.value)}
                    >
                        {semesters.map(sem => (
                            <option key={sem.semester_id} value={sem.semester_id}>
                                {sem.label} ({sem.status})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Create Course Period */}
            <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4">
                <h3 className="font-semibold text-slate-700">Tetapkan Periode Kursus Baru</h3>
                <form onSubmit={handleCreatePeriod} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Tanggal Mulai Pembelajaran</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Tanggal Selesai Pembelajaran</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="submit"
                            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium"
                        >
                            + Buat Periode (DRAFT)
                        </button>
                    </div>
                </form>
            </div>

            {/* Period List */}
            <div className="space-y-3">
                <h3 className="font-semibold text-slate-700">Daftar Periode Kursus</h3>
                {coursePeriods.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center">Belum ada periode kursus untuk konfigurasi ini.</p>
                ) : (
                    coursePeriods.map(p => (
                        <div key={p.course_period_id} className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded">
                                            {p.course_id}
                                        </span>
                                        <h4 className="font-semibold text-slate-800 text-sm">{p.course_period_id}</h4>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Waktu: {new Date(p.start_at).toLocaleDateString()} — {new Date(p.end_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                                        p.status === 'ACTIVE'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : p.status === 'SCHEDULED'
                                            ? 'bg-blue-100 text-blue-800'
                                            : p.status === 'CLOSED'
                                            ? 'bg-slate-100 text-slate-700'
                                            : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {p.status} (v{p.version_number})
                                    </span>
                                    <p className="text-[10px] font-mono text-slate-400 mt-1">{p.checksum}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                {p.status === 'DRAFT' && (
                                    <button
                                        type="button"
                                        onClick={() => handleSchedule(p.course_period_id)}
                                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                                    >
                                        Jadwalkan (SCHEDULED)
                                    </button>
                                )}
                                {p.status === 'SCHEDULED' && (
                                    <button
                                        type="button"
                                        onClick={() => handleActivate(p.course_period_id)}
                                        className="text-xs px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 font-medium"
                                    >
                                        Aktifkan (ACTIVE)
                                    </button>
                                )}
                                {p.status === 'ACTIVE' && (
                                    <button
                                        type="button"
                                        onClick={() => handleClose(p.course_period_id)}
                                        className="text-xs px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-700 font-medium"
                                    >
                                        Tutup (CLOSED)
                                    </button>
                                )}
                                {p.status === 'CLOSED' && reopeningPeriodId !== p.course_period_id && (
                                    <button
                                        type="button"
                                        onClick={() => setReopeningPeriodId(p.course_period_id)}
                                        className="text-xs px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 font-medium"
                                    >
                                        Buka Kembali...
                                    </button>
                                )}
                            </div>

                            {reopeningPeriodId === p.course_period_id && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md space-y-2">
                                    <label className="block text-xs font-semibold text-amber-900">Alasan Pembukaan Kembali:</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded"
                                        value={revisionReason}
                                        onChange={e => setRevisionReason(e.target.value)}
                                        placeholder="Perpanjangan materi remidial"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleActivate(p.course_period_id)}
                                            className="text-xs px-3 py-1 bg-amber-700 text-white rounded hover:bg-amber-800 font-medium"
                                        >
                                            Konfirmasi Pembukaan Kembali
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setReopeningPeriodId(null)}
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
