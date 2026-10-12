import React, { useState, useEffect } from 'react';
import { 
    AttendanceSession, 
    AttendanceRecord, 
    AttendanceStatus, 
    AttendanceReason 
} from '../types/curriculum';
import { attendanceEngine } from '../services/attendanceEngine';

interface TeacherAttendanceManagementProps {
    teacherId: string;
    courseId: string;
    coursePeriodId: string;
    semesterId: string;
    academicYearId: string;
    enrolledStudents?: { student_id: string; name: string }[];
    teacherAuthorizedCourses?: string[];
}

export const TeacherAttendanceManagement: React.FC<TeacherAttendanceManagementProps> = ({
    teacherId,
    courseId,
    coursePeriodId,
    semesterId,
    academicYearId,
    enrolledStudents = [
        { student_id: 'STU-001', name: 'Ahmad Fauzi' },
        { student_id: 'STU-002', name: 'Budi Santoso' },
        { student_id: 'STU-003', name: 'Citra Dewi' }
    ],
    teacherAuthorizedCourses = ['CRS-MAT-101', 'CRS-FIS-101']
}) => {
    const [sessions, setSessions] = useState<AttendanceSession[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string>('');
    const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);

    const [newSessionTitle, setNewSessionTitle] = useState('Pertemuan 1: Pengantar Materi');
    const [newSessionDate, setNewSessionDate] = useState('2026-08-01');
    const [newSessionStart, setNewSessionStart] = useState('2026-08-01T07:30:00.000Z');
    const [newSessionEnd, setNewSessionEnd] = useState('2026-08-01T09:00:00.000Z');

    const [markingStudentId, setMarkingStudentId] = useState<string>('');
    const [markingStatus, setMarkingStatus] = useState<AttendanceStatus>('PRESENT');
    const [markingReason, setMarkingReason] = useState<AttendanceReason>('NONE');
    const [markingLateMinutes, setMarkingLateMinutes] = useState<number>(0);
    const [markingNote, setMarkingNote] = useState<string>('');

    const [revisionReason, setRevisionReason] = useState<string>('');
    const [revisingRecordId, setRevisingRecordId] = useState<string | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setError(null);
            const sessList = await attendanceEngine.listAttendanceSessions({
                course_id: courseId,
                course_period_id: coursePeriodId,
                semester_id: semesterId,
                teacher_id: teacherId
            });
            setSessions(sessList);

            const currSessionId = selectedSessionId || sessList[0]?.attendance_session_id || '';
            if (currSessionId) {
                if (!selectedSessionId) setSelectedSessionId(currSessionId);
                const sess = await attendanceEngine.getAttendanceSession(currSessionId);
                setActiveSession(sess);

                const recList = await attendanceEngine.listAttendanceRecordsForSession(
                    currSessionId, 
                    teacherId, 
                    teacherAuthorizedCourses
                );
                setRecords(recList);
            }
        } catch (err: any) {
            setError(err.message || 'Gagal memuat sesi absensi');
        }
    };

    useEffect(() => {
        loadData();
    }, [teacherId, courseId, coursePeriodId, selectedSessionId]);

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        try {
            const created = await attendanceEngine.createAttendanceSession({
                academic_year_id: academicYearId,
                semester_id: semesterId,
                course_id: courseId,
                course_period_id: coursePeriodId,
                teacher_id: teacherId,
                title: newSessionTitle,
                session_date: newSessionDate,
                start_at: newSessionStart,
                end_at: newSessionEnd,
                actor_id: teacherId,
                actor_role: 'TEACHER',
                teacher_authorized_courses: teacherAuthorizedCourses
            });
            setSuccessMessage(`Sesi absensi '${created.title}' berhasil dibuat.`);
            setSelectedSessionId(created.attendance_session_id);
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Gagal membuat sesi absensi');
        }
    };

    const handleOpenSession = async (sessionId: string) => {
        setError(null);
        try {
            const opened = await attendanceEngine.openAttendanceSession({
                attendance_session_id: sessionId,
                actor_id: teacherId,
                actor_role: 'TEACHER',
                teacher_authorized_courses: teacherAuthorizedCourses
            });
            setActiveSession(opened);
            setSuccessMessage('Sesi absensi dibuka. Guru dapat mencatat kehadiran.');
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Gagal membuka sesi absensi');
        }
    };

    const handleCloseSession = async (sessionId: string) => {
        setError(null);
        try {
            const closed = await attendanceEngine.closeAttendanceSession({
                attendance_session_id: sessionId,
                actor_id: teacherId,
                actor_role: 'TEACHER',
                teacher_authorized_courses: teacherAuthorizedCourses
            });
            setActiveSession(closed);
            setSuccessMessage('Sesi absensi ditutup.');
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Gagal menutup sesi absensi');
        }
    };

    const handleMarkAttendance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSessionId || !markingStudentId) {
            setError('Pilih siswa dan sesi absensi terlebih dahulu.');
            return;
        }

        setError(null);
        setSuccessMessage(null);
        try {
            const record = await attendanceEngine.markAttendance({
                attendance_session_id: selectedSessionId,
                student_id: markingStudentId,
                status: markingStatus,
                reason: markingReason,
                late_minutes: markingStatus === 'LATE' ? Number(markingLateMinutes) : 0,
                note: markingNote || undefined,
                actor_id: teacherId,
                actor_role: 'TEACHER',
                teacher_authorized_courses: teacherAuthorizedCourses
            });
            setSuccessMessage(`Kehadiran siswa ${record.student_id} dicatat: ${record.status}.`);
            setMarkingNote('');
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Gagal mencatat absensi');
        }
    };

    const handleReviseAttendance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!revisingRecordId) return;

        setError(null);
        setSuccessMessage(null);
        try {
            const updated = await attendanceEngine.reviseAttendance({
                attendance_id: revisingRecordId,
                new_status: markingStatus,
                new_reason: markingReason,
                new_late_minutes: markingStatus === 'LATE' ? Number(markingLateMinutes) : 0,
                revision_reason: revisionReason,
                note: markingNote || undefined,
                actor_id: teacherId,
                actor_role: 'TEACHER',
                teacher_authorized_courses: teacherAuthorizedCourses
            });
            setSuccessMessage(`Revisi absensi ${updated.student_id} berhasil (v${updated.version_number}).`);
            setRevisingRecordId(null);
            setRevisionReason('');
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Gagal merevisi absensi');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="border-b border-slate-200 pb-4">
                <h2 className="text-xl font-bold text-slate-800">Manajemen Presensi & Kehadiran Kelas</h2>
                <p className="text-sm text-slate-500">
                    Mata Pelajaran: <span className="font-semibold text-slate-700">{courseId}</span> | Periode: {coursePeriodId}
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

            {/* Create Session */}
            <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4">
                <h3 className="font-semibold text-slate-700">Buat Sesi Pertemuan / Presensi Baru</h3>
                <form onSubmit={handleCreateSession} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Judul / Materi Pertemuan</label>
                        <input
                            type="text"
                            className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded"
                            value={newSessionTitle}
                            onChange={e => setNewSessionTitle(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Tanggal Sesi</label>
                        <input
                            type="date"
                            className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded"
                            value={newSessionDate}
                            onChange={e => {
                                setNewSessionDate(e.target.value);
                                setNewSessionStart(`${e.target.value}T07:30:00.000Z`);
                                setNewSessionEnd(`${e.target.value}T09:00:00.000Z`);
                            }}
                            required
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="submit"
                            className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium"
                        >
                            + Buat Sesi (DRAFT)
                        </button>
                    </div>
                </form>
            </div>

            {/* Session Selector & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">Pilih Sesi:</label>
                    <select
                        className="w-full md:w-80 px-3 py-1.5 bg-white border border-slate-300 rounded text-sm"
                        value={selectedSessionId}
                        onChange={e => setSelectedSessionId(e.target.value)}
                    >
                        {sessions.map(s => (
                            <option key={s.attendance_session_id} value={s.attendance_session_id}>
                                {s.title} ({s.session_date}) — {s.status}
                            </option>
                        ))}
                    </select>
                </div>

                {activeSession && (
                    <div className="flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                            activeSession.status === 'OPEN'
                                ? 'bg-emerald-100 text-emerald-800'
                                : activeSession.status === 'CLOSED'
                                ? 'bg-slate-200 text-slate-700'
                                : activeSession.status === 'LOCKED'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-amber-100 text-amber-800'
                        }`}>
                            STATUS: {activeSession.status}
                        </span>

                        {activeSession.status === 'DRAFT' && (
                            <button
                                type="button"
                                onClick={() => handleOpenSession(activeSession.attendance_session_id)}
                                className="text-xs px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 font-medium"
                            >
                                Buka Presensi (OPEN)
                            </button>
                        )}

                        {activeSession.status === 'OPEN' && (
                            <button
                                type="button"
                                onClick={() => handleCloseSession(activeSession.attendance_session_id)}
                                className="text-xs px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-700 font-medium"
                            >
                                Tutup Presensi (CLOSED)
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Attendance Marking Table */}
            {activeSession && (
                <div className="space-y-4">
                    <h3 className="font-semibold text-slate-700">Daftar Kehadiran Siswa</h3>
                    
                    {activeSession.status === 'OPEN' && !revisingRecordId && (
                        <form onSubmit={handleMarkAttendance} className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Siswa</label>
                                <select
                                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                                    value={markingStudentId}
                                    onChange={e => setMarkingStudentId(e.target.value)}
                                    required
                                >
                                    <option value="">Pilih Siswa</option>
                                    {enrolledStudents.map(st => (
                                        <option key={st.student_id} value={st.student_id}>
                                            {st.name} ({st.student_id})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Status Kehadiran</label>
                                <select
                                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                                    value={markingStatus}
                                    onChange={e => setMarkingStatus(e.target.value as AttendanceStatus)}
                                >
                                    <option value="PRESENT">PRESENT (Hadir)</option>
                                    <option value="LATE">LATE (Terlambat)</option>
                                    <option value="EXCUSED">EXCUSED (Izin Resmi)</option>
                                    <option value="SICK">SICK (Sakit)</option>
                                    <option value="ABSENT">ABSENT (Alpa)</option>
                                </select>
                            </div>

                            {markingStatus === 'LATE' && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Menit Terlambat</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                                        value={markingLateMinutes}
                                        onChange={e => setMarkingLateMinutes(Number(e.target.value))}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Alasan / Keterangan</label>
                                <select
                                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                                    value={markingReason}
                                    onChange={e => setMarkingReason(e.target.value as AttendanceReason)}
                                >
                                    <option value="NONE">NONE</option>
                                    <option value="SICK">Sakit</option>
                                    <option value="OFFICIAL_ACTIVITY">Tugas Sekolah</option>
                                    <option value="FAMILY_REASON">Urusan Keluarga</option>
                                    <option value="AUTHORIZED_ABSENCE">Izin Disetujui</option>
                                    <option value="OTHER">Lainnya</option>
                                </select>
                            </div>

                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium"
                                >
                                    Simpan Kehadiran
                                </button>
                            </div>
                        </form>
                    )}

                    {revisingRecordId && (
                        <form onSubmit={handleReviseAttendance} className="bg-amber-50 p-4 rounded-lg border border-amber-200 space-y-3">
                            <h4 className="text-xs font-bold text-amber-900">Revisi Catatan Kehadiran ({revisingRecordId})</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-amber-800 mb-1">Status Baru</label>
                                    <select
                                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded"
                                        value={markingStatus}
                                        onChange={e => setMarkingStatus(e.target.value as AttendanceStatus)}
                                    >
                                        <option value="PRESENT">PRESENT</option>
                                        <option value="LATE">LATE</option>
                                        <option value="EXCUSED">EXCUSED</option>
                                        <option value="SICK">SICK</option>
                                        <option value="ABSENT">ABSENT</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-amber-800 mb-1">Alasan Presensi</label>
                                    <select
                                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded"
                                        value={markingReason}
                                        onChange={e => setMarkingReason(e.target.value as AttendanceReason)}
                                    >
                                        <option value="NONE">NONE</option>
                                        <option value="SICK">Sakit</option>
                                        <option value="OFFICIAL_ACTIVITY">Tugas Sekolah</option>
                                        <option value="AUTHORIZED_ABSENCE">Izin Resmi</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-amber-800 mb-1">Alasan Koreksi (Wajib)</label>
                                    <input
                                        type="text"
                                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded"
                                        value={revisionReason}
                                        onChange={e => setRevisionReason(e.target.value)}
                                        placeholder="Surat dokter diserahkan setelah jam KBM"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    className="px-3 py-1 bg-amber-700 text-white rounded text-xs font-semibold hover:bg-amber-800"
                                >
                                    Konfirmasi Revisi
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRevisingRecordId(null)}
                                    className="px-3 py-1 bg-slate-200 text-slate-700 rounded text-xs hover:bg-slate-300"
                                >
                                    Batal
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Records Table */}
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-semibold">
                                <tr>
                                    <th className="px-4 py-2.5 text-left">Siswa ID</th>
                                    <th className="px-4 py-2.5 text-left">Status</th>
                                    <th className="px-4 py-2.5 text-left">Alasan / Menit</th>
                                    <th className="px-4 py-2.5 text-left">Waktu Catat</th>
                                    <th className="px-4 py-2.5 text-left">Versi</th>
                                    <th className="px-4 py-2.5 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {records.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                                            Belum ada catatan presensi pada sesi ini.
                                        </td>
                                    </tr>
                                ) : (
                                    records.map(r => (
                                        <tr key={r.attendance_id}>
                                            <td className="px-4 py-2.5 font-medium text-slate-800">{r.student_id}</td>
                                            <td className="px-4 py-2.5">
                                                <span className={`px-2 py-0.5 rounded font-bold ${
                                                    r.status === 'PRESENT'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : r.status === 'LATE'
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : r.status === 'ABSENT'
                                                        ? 'bg-rose-100 text-rose-800'
                                                        : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-600">
                                                {r.status === 'LATE' ? `${r.late_minutes} menit` : r.reason}
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-500">
                                                {new Date(r.marked_at).toLocaleTimeString()}
                                            </td>
                                            <td className="px-4 py-2.5 font-mono text-slate-500">v{r.version_number}</td>
                                            <td className="px-4 py-2.5 text-center">
                                                {activeSession.status !== 'LOCKED' && activeSession.status !== 'ARCHIVED' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setRevisingRecordId(r.attendance_id);
                                                            setMarkingStatus(r.status);
                                                            setMarkingReason(r.reason);
                                                            setMarkingLateMinutes(r.late_minutes);
                                                        }}
                                                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                                                    >
                                                        Koreksi
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
