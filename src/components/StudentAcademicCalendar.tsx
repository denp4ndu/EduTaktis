import React, { useState, useEffect } from 'react';
import { 
    AcademicYear, 
    Semester, 
    AcademicCalendar, 
    CoursePeriod 
} from '../types/curriculum';
import { academicCalendarEngine } from '../services/academicCalendarEngine';

interface StudentAcademicCalendarProps {
    studentId: string;
    semesterId?: string;
}

export const StudentAcademicCalendar: React.FC<StudentAcademicCalendarProps> = ({
    studentId,
    semesterId
}) => {
    const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
    const [semester, setSemester] = useState<Semester | null>(null);
    const [calendar, setCalendar] = useState<AcademicCalendar | null>(null);
    const [coursePeriods, setCoursePeriods] = useState<CoursePeriod[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStudentCalendar = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await academicCalendarEngine.getStudentAcademicCalendar({
                    authenticated_student_id: studentId,
                    student_id: studentId,
                    semester_id: semesterId
                });

                setAcademicYear(data.academic_year);
                setSemester(data.semester);
                setCalendar(data.calendar);
                setCoursePeriods(data.course_periods);
            } catch (err: any) {
                setError(err.message || 'Gagal memuat kalender akademik siswa');
            } finally {
                setLoading(false);
            }
        };

        if (studentId) {
            fetchStudentCalendar();
        }
    }, [studentId, semesterId]);

    if (loading) {
        return (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
                <p className="text-sm text-slate-500">Memuat jadwal dan kalender akademik...</p>
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
                    <h2 className="text-xl font-bold text-slate-800">Kalender Akademik Siswa</h2>
                    <p className="text-sm text-slate-500">
                        Siswa ID: <span className="font-semibold text-slate-700">{studentId}</span>
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {academicYear && (
                        <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded-full border border-indigo-100">
                            {academicYear.label} ({academicYear.code})
                        </span>
                    )}
                    {semester && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                            semester.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-slate-100 text-slate-600'
                        }`}>
                            {semester.label} ({semester.status})
                        </span>
                    )}
                </div>
            </div>

            {/* Semester Window Info */}
            {semester && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                        <h3 className="font-semibold text-indigo-900 text-sm">{semester.label}</h3>
                        <p className="text-xs text-indigo-700 mt-0.5">
                            Periode Berlangsung: {new Date(semester.start_at).toLocaleDateString('id-ID', { dateStyle: 'long' })} — {new Date(semester.end_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                        </p>
                    </div>
                    <span className="text-xs font-mono text-indigo-600">v{semester.version_number}</span>
                </div>
            )}

            {/* Academic Events Grid */}
            <div className="space-y-3">
                <h3 className="font-semibold text-slate-700 text-base">Agenda & Kegiatan Akademik</h3>
                {!calendar || calendar.events.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center bg-slate-50 rounded-lg border border-slate-100">
                        Belum ada agenda kegiatan resmi yang dipublikasikan untuk semester ini.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {calendar.events.map(ev => (
                            <div key={ev.event_id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                        ev.type === 'EXAMINATION'
                                            ? 'bg-rose-100 text-rose-800'
                                            : ev.type === 'HOLIDAY'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : ev.type === 'ASSESSMENT'
                                            ? 'bg-amber-100 text-amber-800'
                                            : ev.type === 'SUBMISSION_WINDOW'
                                            ? 'bg-purple-100 text-purple-800'
                                            : 'bg-blue-100 text-blue-800'
                                    }`}>
                                        {ev.type}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {new Date(ev.start_at).toLocaleDateString('id-ID')}
                                    </span>
                                </div>
                                <h4 className="font-semibold text-slate-800 text-sm">{ev.title}</h4>
                                {ev.description && (
                                    <p className="text-xs text-slate-500">{ev.description}</p>
                                )}
                                <p className="text-[11px] text-slate-400">
                                    Waktu: {new Date(ev.start_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} — {new Date(ev.end_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Course Periods */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
                <h3 className="font-semibold text-slate-700 text-base">Periode Pembelajaran Mata Pelajaran Terdaftar</h3>
                {coursePeriods.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center bg-slate-50 rounded-lg border border-slate-100">
                        Belum ada periode pembelajaran aktif untuk mata pelajaran Anda.
                    </p>
                ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                        {coursePeriods.map(cp => (
                            <div key={cp.course_period_id} className="p-3.5 bg-white flex justify-between items-center hover:bg-slate-50 transition">
                                <div>
                                    <h4 className="font-semibold text-slate-800 text-sm">{cp.course_id}</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Masa Belajar: {new Date(cp.start_at).toLocaleDateString()} — {new Date(cp.end_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className={`text-xs px-2.5 py-0.5 rounded font-semibold ${
                                    cp.status === 'ACTIVE'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-slate-100 text-slate-600'
                                }`}>
                                    {cp.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
