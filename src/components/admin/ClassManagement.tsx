import React, { useState, useEffect } from 'react';
import { GraduationCap, Plus, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SchoolClass, UserRole } from '../../types/curriculum';
import { schoolAdministrationRepositoryEngine } from '../../services/schoolAdministrationRepositoryEngine';
import { schoolAdministrationEngine } from '../../services/schoolAdministrationEngine';

interface ClassManagementProps {
    institutionId?: string;
    actorId?: string;
    actorRole?: UserRole;
}

export const ClassManagement: React.FC<ClassManagementProps> = ({
    institutionId = 'INST-DEFAULT',
    actorId = 'ADM-001',
    actorRole = 'ADMIN'
}) => {
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form states
    const [showForm, setShowForm] = useState(false);
    const [classCode, setClassCode] = useState('');
    const [className, setClassName] = useState('');
    const [gradeLevel, setGradeLevel] = useState<number>(10);
    const [capacity, setCapacity] = useState<number>(32);
    const [homeroomTeacherId, setHomeroomTeacherId] = useState('');

    const loadClasses = async () => {
        try {
            setLoading(true);
            const list = await schoolAdministrationRepositoryEngine.listClasses(institutionId);
            setClasses(list);
            setError(null);
        } catch (err: any) {
            setError(err?.message || 'Gagal memuat daftar rombel kelas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClasses();
    }, [institutionId]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            await schoolAdministrationEngine.createClass({
                institution_id: institutionId,
                academic_year_id: 'AY-2026-2027',
                semester_id: 'SEM-1-2026',
                class_code: classCode,
                class_name: className,
                grade_level: Number(gradeLevel),
                capacity: Number(capacity),
                homeroom_teacher_id: homeroomTeacherId,
                actor_id: actorId,
                actor_role: actorRole
            });
            setSuccessMessage('Kelas rombel berhasil dibuat dalam status DRAFT');
            setShowForm(false);
            setClassCode('');
            setClassName('');
            setHomeroomTeacherId('');
            loadClasses();
        } catch (err: any) {
            setError(err?.message || 'Gagal membuat kelas');
        }
    };

    const handleActivate = async (classId: string) => {
        try {
            setError(null);
            await schoolAdministrationEngine.transitionClassStatus({
                class_id: classId,
                target_status: 'ACTIVE',
                actor_id: actorId,
                actor_role: actorRole,
                reason: 'Aktivasi kelas untuk tahun ajaran aktif'
            });
            setSuccessMessage('Kelas berhasil diaktifkan');
            loadClasses();
        } catch (err: any) {
            setError(err?.message || 'Gagal mengaktifkan kelas');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-slate-900 font-heading">
                        Manajemen Kelas & Rombel
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Kelola rombongan belajar, kapasitas siswa, dan penugasan wali kelas.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                    <Plus className="w-4 h-4" />
                    <span>Buat Kelas Baru</span>
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-xs" role="alert">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {successMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs" role="status">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Create Form */}
            {showForm && (
                <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                    <h2 className="text-sm font-bold text-slate-900 font-heading">Rombel Kelas Baru</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Kode Kelas</label>
                            <input
                                type="text"
                                required
                                value={classCode}
                                onChange={(e) => setClassCode(e.target.value)}
                                placeholder="Contoh: X-MIPA-1"
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Rombel</label>
                            <input
                                type="text"
                                required
                                value={className}
                                onChange={(e) => setClassName(e.target.value)}
                                placeholder="Contoh: Kelas 10 MIPA 1"
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Tingkat / Grade</label>
                            <input
                                type="number"
                                required
                                min={1}
                                max={12}
                                value={gradeLevel}
                                onChange={(e) => setGradeLevel(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Kapasitas Maksimal</label>
                            <input
                                type="number"
                                required
                                min={1}
                                max={50}
                                value={capacity}
                                onChange={(e) => setCapacity(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">Wali Kelas (ID Guru)</label>
                            <input
                                type="text"
                                required
                                value={homeroomTeacherId}
                                onChange={(e) => setHomeroomTeacherId(e.target.value)}
                                placeholder="Contoh: TEA-001"
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs"
                        >
                            Simpan Kelas
                        </button>
                    </div>
                </form>
            )}

            {/* List Classes */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                {classes.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">Belum ada kelas terdaftar.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {classes.map((c) => (
                            <div 
                                key={c.class_id}
                                className="p-4 border border-slate-200 rounded-2xl bg-slate-50 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <GraduationCap className="w-4 h-4 text-blue-600" />
                                            <span className="font-bold text-slate-900 text-xs">{c.class_name}</span>
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 font-bold text-slate-700">
                                            {c.status}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        Kode: <span className="font-mono text-slate-700">{c.class_code}</span> · Tingkat {c.grade_level}
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Kapasitas: <span className="font-bold text-slate-700">{c.capacity}</span> siswa · Wali: {c.homeroom_teacher_id}
                                    </p>
                                </div>

                                {c.status === 'DRAFT' && (
                                    <div className="mt-3 pt-3 border-t border-slate-200 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => handleActivate(c.class_id)}
                                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors"
                                        >
                                            Aktifkan
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
