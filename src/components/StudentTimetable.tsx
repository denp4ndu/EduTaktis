import React, { useState, useEffect } from 'react';
import { Calendar, Clock, BookOpen, MapPin, AlertCircle } from 'lucide-react';
import { StudentTimetableEntry, UserRole } from '../types/curriculum';
import { schedulingEngine } from '../services/schedulingEngine';

interface StudentTimetableProps {
    identity?: {
        user_id?: string;
        actor_id?: string;
        role: UserRole;
    };
    institutionId?: string;
    semesterId?: string;
}

export const StudentTimetable: React.FC<StudentTimetableProps> = ({
    identity,
    institutionId = 'INST-DEFAULT',
    semesterId = 'SEM-DEFAULT'
}) => {
    const studentId = identity?.actor_id || identity?.user_id || 'STU-DEFAULT';
    const [timetable, setTimetable] = useState<StudentTimetableEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStudentTimetable();
    }, [studentId, institutionId, semesterId]);

    const loadStudentTimetable = async () => {
        try {
            setLoading(true);
            setError(null);

            const entries = await schedulingEngine.getStudentTimetable({
                student_id: studentId,
                institution_id: institutionId,
                semester_id: semesterId,
                caller_id: studentId,
                caller_role: identity?.role || 'STUDENT'
            });
            setTimetable(entries);
        } catch (err: any) {
            setError(err.message || 'Gagal memuat jadwal pelajaran siswa');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-slate-600">Memuat jadwal pelajaran Anda...</span>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <header className="border-b border-slate-200 pb-4">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-indigo-600" />
                    Jadwal Pelajaran Siswa
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Jadwal resmi mata pelajaran terdaftar untuk Siswa: <span className="font-mono font-medium text-slate-700">{studentId}</span>
                </p>
            </header>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        Jadwal Belajar Mingguan
                    </h2>
                    <span className="text-xs font-medium bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                        {timetable.length} Mata Pelajaran Terjadwal
                    </span>
                </div>

                {timetable.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        Tidak ada jadwal aktif ditemukan untuk pendaftaran mata pelajaran Anda pada semester ini.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-700">
                            <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">Hari</th>
                                    <th className="px-6 py-3">Waktu</th>
                                    <th className="px-6 py-3">Mata Pelajaran</th>
                                    <th className="px-6 py-3">Guru Pengampu</th>
                                    <th className="px-6 py-3">Ruangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {timetable.map((item) => (
                                    <tr key={item.schedule_id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 font-semibold text-slate-900">
                                            {item.day_of_week || '-'}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-600">
                                            {item.start_time} - {item.end_time}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-indigo-600">
                                            {item.course_id}
                                        </td>
                                        <td className="px-6 py-4 text-slate-700 font-mono text-xs">
                                            {item.teacher_id}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 flex items-center gap-1.5 font-mono text-xs">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                            {item.room_id}
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
