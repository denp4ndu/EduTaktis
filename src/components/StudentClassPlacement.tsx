import React, { useState, useEffect } from 'react';
import { GraduationCap, Users, Calendar, AlertCircle } from 'lucide-react';
import { StudentPlacement, SchoolClass } from '../types/curriculum';
import { schoolAdministrationRepositoryEngine } from '../services/schoolAdministrationRepositoryEngine';

interface StudentClassPlacementProps {
    studentId: string;
    academicYearId?: string;
}

export const StudentClassPlacement: React.FC<StudentClassPlacementProps> = ({
    studentId,
    academicYearId = 'AY-2026-2027'
}) => {
    const [placement, setPlacement] = useState<StudentPlacement | null>(null);
    const [classData, setClassData] = useState<SchoolClass | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        schoolAdministrationRepositoryEngine
            .getPlacementByStudentAndYear(studentId, academicYearId)
            .then(async (plc) => {
                if (!isMounted) return;
                setPlacement(plc);
                if (plc) {
                    const cls = await schoolAdministrationRepositoryEngine.getClass(plc.class_id);
                    if (isMounted) setClassData(cls);
                }
            })
            .catch((err) => {
                if (isMounted) setError(err?.message || 'Gagal memuat penempatan kelas.');
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [studentId, academicYearId]);

    if (loading) {
        return (
            <div className="p-4 text-center text-xs text-slate-400">
                Memuat penempatan rombel siswa...
            </div>
        );
    }

    if (error || !placement || !classData) {
        return (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2 text-slate-500 text-xs">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Belum ada penetapan rombel kelas aktif untuk periode tahun ajaran ini.</span>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-900 font-heading">
                        {classData.class_name} ({classData.class_code})
                    </h3>
                    <p className="text-[11px] text-slate-400">
                        Tingkat {classData.grade_level} · Status: <span className="font-bold text-emerald-700">{placement.status}</span>
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-3 border-t border-slate-100">
                <div>
                    <span className="text-slate-400 block">Wali Kelas:</span>
                    <span className="font-bold text-slate-800">{classData.homeroom_teacher_id}</span>
                </div>
                <div>
                    <span className="text-slate-400 block">Tahun Akademik:</span>
                    <span className="font-bold text-slate-800">{placement.academic_year_id}</span>
                </div>
            </div>
        </div>
    );
};
