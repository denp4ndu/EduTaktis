import React, { useState, useEffect } from 'react';
import { ShieldAlert, Plus, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AdministrativeRoleAssignment, UserRole } from '../../types/curriculum';
import { schoolAdministrationRepositoryEngine } from '../../services/schoolAdministrationRepositoryEngine';
import { schoolAdministrationEngine } from '../../services/schoolAdministrationEngine';

interface AdminRoleProps {
    institutionId?: string;
    actorId?: string;
    actorRole?: UserRole;
}

export const AdministrativeRoleManagement: React.FC<AdminRoleProps> = ({
    institutionId = 'INST-DEFAULT',
    actorId = 'ADM-001',
    actorRole = 'ADMIN'
}) => {
    const [assignments, setAssignments] = useState<AdministrativeRoleAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form
    const [showForm, setShowForm] = useState(false);
    const [userId, setUserId] = useState('');
    const [role, setRole] = useState<UserRole>('HEADMASTER');

    const loadAssignments = async () => {
        try {
            setLoading(true);
            const list = await schoolAdministrationRepositoryEngine.listAdminRoleAssignments(institutionId);
            setAssignments(list);
            setError(null);
        } catch (err: any) {
            setError(err?.message || 'Gagal memuat daftar penugasan administratif');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAssignments();
    }, [institutionId]);

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            await schoolAdministrationEngine.assignAdministrativeRole({
                institution_id: institutionId,
                user_id: userId,
                role,
                actor_id: actorId,
                actor_role: actorRole
            });
            setSuccessMessage('Penugasan administratif berhasil disimpan');
            setShowForm(false);
            setUserId('');
            loadAssignments();
        } catch (err: any) {
            setError(err?.message || 'Gagal menetapkan peran administratif');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-slate-900 font-heading">
                        Penugasan Peran Administratif & Tata Kelola
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Kelola penugasan Kepala Sekolah, Administrator, dan Pejabat Struktural.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                    <Plus className="w-4 h-4" />
                    <span>Tugaskan Peran Baru</span>
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

            {showForm && (
                <form onSubmit={handleAssign} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                    <h2 className="text-sm font-bold text-slate-900 font-heading">Penugasan Peran Struktural Baru</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">User ID Pejabat</label>
                            <input
                                type="text"
                                required
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                placeholder="Contoh: USR-HM-001"
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Peran Struktural</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as UserRole)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600 bg-white"
                            >
                                <option value="HEADMASTER">HEADMASTER (Kepala Sekolah)</option>
                                <option value="ADMIN">ADMIN (Administrator Institusi)</option>
                                <option value="COUNSELOR">COUNSELOR (Koordinator BK)</option>
                                <option value="DISCIPLINE_OFFICER">DISCIPLINE_OFFICER (Kesiswaan / Disiplin)</option>
                            </select>
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
                            Simpan Penugasan
                        </button>
                    </div>
                </form>
            )}

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                {assignments.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">Belum ada penugasan peran administratif.</p>
                ) : (
                    <div className="space-y-3">
                        {assignments.map((a) => (
                            <div 
                                key={a.assignment_id}
                                className="p-4 border border-slate-100 bg-slate-50 rounded-2xl flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                                        <ShieldAlert className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 text-xs">{a.user_id}</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-extrabold uppercase">
                                                {a.role}
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                                                {a.status}
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-slate-400">
                                            Ditugaskan oleh: {a.assigned_by} · Tanggal: {new Date(a.assigned_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
