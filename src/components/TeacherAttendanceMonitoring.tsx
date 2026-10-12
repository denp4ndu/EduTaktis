import React, { useState, useEffect } from 'react';
import { TeacherAttendanceMonitoring as MonitoringData } from '../types/curriculum';
import { attendanceAnalyticsEngine } from '../services/attendanceAnalyticsEngine';

interface TeacherAttendanceMonitoringProps {
    teacherId: string;
    courseId: string;
    coursePeriodId: string;
    semesterId: string;
    teacherAuthorizedCourses?: string[];
}

export const TeacherAttendanceMonitoring: React.FC<TeacherAttendanceMonitoringProps> = ({
    teacherId,
    courseId,
    coursePeriodId,
    semesterId,
    teacherAuthorizedCourses = ['CRS-MAT-101', 'CRS-FIS-101']
}) => {
    const [data, setData] = useState<MonitoringData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMonitoring = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await attendanceAnalyticsEngine.getTeacherAttendanceMonitoring({
                    teacher_id: teacherId,
                    course_id: courseId,
                    course_period_id: coursePeriodId,
                    semester_id: semesterId,
                    teacher_authorized_courses: teacherAuthorizedCourses
                });
                setData(res);
            } catch (err: any) {
                setError(err.message || 'Gagal memuat monitoring presensi guru');
            } finally {
                setLoading(false);
            }
        };

        if (teacherId && courseId && coursePeriodId && semesterId) {
            fetchMonitoring();
        }
    }, [teacherId, courseId, coursePeriodId, semesterId]);

    if (loading) {
        return (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
                <p className="text-sm text-slate-500">Memuat analisis kehadiran kelas...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
                <h3 className="font-bold text-base mb-1">Akses Ditolak</h3>
                <p className="text-sm">{error}</p>
            </div>
        );
    }

    if (!data) return null;

    const { course_attendance_summary: cs, student_summaries: students } = data;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 gap-2">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Monitoring & Analisis Kehadiran Kelas</h2>
                    <p className="text-sm text-slate-500">
                        Guru: {teacherId} | Mapel: <span className="font-semibold text-slate-700">{courseId}</span> | Periode: {coursePeriodId}
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-xs text-slate-500">Rata-rata Kehadiran Kelas:</span>
                    <div className="text-2xl font-black text-indigo-700">{cs.course_attendance_percentage}%</div>
                </div>
            </div>

            {/* Course Analytics Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                    <span className="text-xs text-slate-500">Total Sesi Dilaksanakan</span>
                    <p className="text-xl font-bold text-slate-800">{cs.total_sessions}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 text-center">
                    <span className="text-xs text-emerald-700">Present Rate</span>
                    <p className="text-xl font-bold text-emerald-800">{cs.present_rate}%</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-center">
                    <span className="text-xs text-amber-700">Late Rate</span>
                    <p className="text-xl font-bold text-amber-800">{cs.late_rate}%</p>
                </div>
                <div className="bg-rose-50 p-4 rounded-lg border border-rose-200 text-center">
                    <span className="text-xs text-rose-700">Absence Rate</span>
                    <p className="text-xl font-bold text-rose-800">{cs.absence_rate}%</p>
                </div>
            </div>

            {/* Students Table */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-slate-700">Daftar Kehadiran Siswa ({students.length} Siswa)</h3>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold">
                            <tr>
                                <th className="px-4 py-2.5 text-left">Siswa ID</th>
                                <th className="px-4 py-2.5 text-center">Total Sesi</th>
                                <th className="px-4 py-2.5 text-center text-emerald-700">Hadir</th>
                                <th className="px-4 py-2.5 text-center text-amber-700">Telat</th>
                                <th className="px-4 py-2.5 text-center text-blue-700">Izin</th>
                                <th className="px-4 py-2.5 text-center text-purple-700">Sakit</th>
                                <th className="px-4 py-2.5 text-center text-rose-700">Alpa</th>
                                <th className="px-4 py-2.5 text-center">Persentase</th>
                                <th className="px-4 py-2.5 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {students.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                                        Belum ada rekaman presensi siswa.
                                    </td>
                                </tr>
                            ) : (
                                students.map(st => (
                                    <tr key={st.student_id} className="hover:bg-slate-50 transition">
                                        <td className="px-4 py-2.5 font-medium text-slate-800">{st.student_id}</td>
                                        <td className="px-4 py-2.5 text-center text-slate-600">{st.total_sessions}</td>
                                        <td className="px-4 py-2.5 text-center font-semibold text-emerald-700">{st.present_count}</td>
                                        <td className="px-4 py-2.5 text-center font-semibold text-amber-700">{st.late_count}</td>
                                        <td className="px-4 py-2.5 text-center text-blue-700">{st.excused_count}</td>
                                        <td className="px-4 py-2.5 text-center text-purple-700">{st.sick_count}</td>
                                        <td className="px-4 py-2.5 text-center font-bold text-rose-700">{st.absent_count}</td>
                                        <td className="px-4 py-2.5 text-center font-bold text-slate-800">
                                            {st.overall_attendance_percentage}%
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            {st.overall_attendance_percentage < 75 ? (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                                    PERINGATAN (&lt;75%)
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                    BAIK
                                                </span>
                                            )}
                                        </td>
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
