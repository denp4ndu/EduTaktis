import React, { useState, useEffect } from 'react';
import { 
    StudentAttendanceSummary, 
    AttendanceRecord 
} from '../types/curriculum';
import { attendanceAnalyticsEngine } from '../services/attendanceAnalyticsEngine';
import { attendanceEngine } from '../services/attendanceEngine';

interface StudentAttendanceProps {
    studentId: string;
    semesterId: string;
}

export const StudentAttendance: React.FC<StudentAttendanceProps> = ({
    studentId,
    semesterId
}) => {
    const [summary, setSummary] = useState<StudentAttendanceSummary | null>(null);
    const [history, setHistory] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                setLoading(true);
                setError(null);

                const sum = await attendanceAnalyticsEngine.getStudentAttendanceSummary(
                    studentId, 
                    semesterId, 
                    studentId
                );
                setSummary(sum);

                const records = await attendanceEngine.getStudentAttendanceHistory({
                    authenticated_student_id: studentId,
                    student_id: studentId,
                    semester_id: semesterId
                });
                setHistory(records);
            } catch (err: any) {
                setError(err.message || 'Gagal memuat catatan kehadiran siswa');
            } finally {
                setLoading(false);
            }
        };

        if (studentId && semesterId) {
            fetchAttendance();
        }
    }, [studentId, semesterId]);

    if (loading) {
        return (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
                <p className="text-sm text-slate-500">Memuat rekap presensi siswa...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
                <h3 className="font-bold text-base mb-1">Akses Ditolak / Kesalahan</h3>
                <p className="text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 gap-2">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Rekap Kehadiran Siswa</h2>
                    <p className="text-sm text-slate-500">
                        Siswa: <span className="font-semibold text-slate-700">{studentId}</span> | Semester: {semesterId}
                    </p>
                </div>

                {summary && (
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <span className="text-xs text-slate-500">Tingkat Kehadiran:</span>
                            <div className="text-2xl font-black text-indigo-700">
                                {summary.overall_attendance_percentage}%
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Stat Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-center">
                        <span className="text-xs text-slate-500">Total Sesi</span>
                        <p className="text-lg font-bold text-slate-800">{summary.total_sessions}</p>
                    </div>
                    <div className="bg-emerald-50 p-3.5 rounded-lg border border-emerald-200 text-center">
                        <span className="text-xs text-emerald-700">Hadir (Present)</span>
                        <p className="text-lg font-bold text-emerald-800">{summary.present_count}</p>
                    </div>
                    <div className="bg-amber-50 p-3.5 rounded-lg border border-amber-200 text-center">
                        <span className="text-xs text-amber-700">Terlambat (Late)</span>
                        <p className="text-lg font-bold text-amber-800">{summary.late_count}</p>
                    </div>
                    <div className="bg-blue-50 p-3.5 rounded-lg border border-blue-200 text-center">
                        <span className="text-xs text-blue-700">Izin (Excused)</span>
                        <p className="text-lg font-bold text-blue-800">{summary.excused_count}</p>
                    </div>
                    <div className="bg-purple-50 p-3.5 rounded-lg border border-purple-200 text-center">
                        <span className="text-xs text-purple-700">Sakit (Sick)</span>
                        <p className="text-lg font-bold text-purple-800">{summary.sick_count}</p>
                    </div>
                    <div className="bg-rose-50 p-3.5 rounded-lg border border-rose-200 text-center">
                        <span className="text-xs text-rose-700">Alpa (Absent)</span>
                        <p className="text-lg font-bold text-rose-800">{summary.absent_count}</p>
                    </div>
                </div>
            )}

            {/* Course Summary Breakdown */}
            {summary && summary.course_summaries.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-semibold text-slate-700 text-sm">Persentase Kehadiran per Mata Pelajaran</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {summary.course_summaries.map(cs => (
                            <div key={cs.course_id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-slate-800 text-sm">{cs.course_id}</h4>
                                    <span className="text-sm font-bold text-indigo-700">{cs.attendance_percentage}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div 
                                        className="bg-indigo-600 h-2 rounded-full" 
                                        style={{ width: `${Math.min(100, cs.attendance_percentage)}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[11px] text-slate-500">
                                    <span>Hadir: {cs.present_count}</span>
                                    <span>Telat: {cs.late_count}</span>
                                    <span>Izin: {cs.excused_count}</span>
                                    <span>Sakit: {cs.sick_count}</span>
                                    <span>Alpa: {cs.absent_count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Chronological Log */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
                <h3 className="font-semibold text-slate-700 text-sm">Riwayat Presensi Masuk</h3>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold">
                            <tr>
                                <th className="px-4 py-2.5 text-left">Mata Pelajaran</th>
                                <th className="px-4 py-2.5 text-left">Status</th>
                                <th className="px-4 py-2.5 text-left">Keterangan</th>
                                <th className="px-4 py-2.5 text-left">Waktu Dicatat</th>
                                <th className="px-4 py-2.5 text-left">Dicatat Oleh</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                                        Belum ada rekaman presensi.
                                    </td>
                                </tr>
                            ) : (
                                history.map(h => (
                                    <tr key={h.attendance_id}>
                                        <td className="px-4 py-2.5 font-medium text-slate-800">{h.course_id}</td>
                                        <td className="px-4 py-2.5">
                                            <span className={`px-2 py-0.5 rounded font-bold ${
                                                h.status === 'PRESENT'
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : h.status === 'LATE'
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : h.status === 'ABSENT'
                                                    ? 'bg-rose-100 text-rose-800'
                                                    : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {h.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-600">
                                            {h.status === 'LATE' ? `${h.late_minutes} menit` : h.reason}
                                            {h.note ? ` (${h.note})` : ''}
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-500">
                                            {new Date(h.marked_at).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-500">{h.marked_by}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
