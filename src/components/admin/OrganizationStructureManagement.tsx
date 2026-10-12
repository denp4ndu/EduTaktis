import React, { useState, useEffect } from 'react';
import { Building2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { OrganizationUnit, OrganizationUnitType, UserRole } from '../../types/curriculum';
import { schoolAdministrationRepositoryEngine } from '../../services/schoolAdministrationRepositoryEngine';
import { schoolAdministrationEngine } from '../../services/schoolAdministrationEngine';

interface OrganizationStructureProps {
    institutionId?: string;
    actorId?: string;
    actorRole?: UserRole;
}

export const OrganizationStructureManagement: React.FC<OrganizationStructureProps> = ({
    institutionId = 'INST-DEFAULT',
    actorId = 'ADM-001',
    actorRole = 'ADMIN'
}) => {
    const [units, setUnits] = useState<OrganizationUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form
    const [showForm, setShowForm] = useState(false);
    const [unitCode, setUnitCode] = useState('');
    const [unitName, setUnitName] = useState('');
    const [unitType, setUnitType] = useState<OrganizationUnitType>('DEPARTMENT');
    const [parentUnitId, setParentUnitId] = useState<string>('');

    const loadUnits = async () => {
        try {
            setLoading(true);
            const list = await schoolAdministrationRepositoryEngine.listOrganizationUnits(institutionId);
            setUnits(list);
            setError(null);
        } catch (err: any) {
            setError(err?.message || 'Gagal memuat struktur organisasi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUnits();
    }, [institutionId]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            await schoolAdministrationEngine.createOrganizationUnit({
                institution_id: institutionId,
                parent_unit_id: parentUnitId || null,
                unit_code: unitCode,
                unit_name: unitName,
                unit_type: unitType,
                actor_id: actorId,
                actor_role: actorRole
            });
            setSuccessMessage('Unit organisasi berhasil ditambahkan');
            setShowForm(false);
            setUnitCode('');
            setUnitName('');
            setParentUnitId('');
            loadUnits();
        } catch (err: any) {
            setError(err?.message || 'Gagal membuat unit organisasi');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-slate-900 font-heading">
                        Struktur Organisasi Sekolah
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Kelola hierarki unit kerja, fakultas, divisi, dan departemen operasional.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Unit Organisasi</span>
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
                <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                    <h2 className="text-sm font-bold text-slate-900 font-heading">Unit Organisasi Baru</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Kode Unit</label>
                            <input
                                type="text"
                                required
                                value={unitCode}
                                onChange={(e) => setUnitCode(e.target.value)}
                                placeholder="Contoh: DIV-KUR"
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Unit</label>
                            <input
                                type="text"
                                required
                                value={unitName}
                                onChange={(e) => setUnitName(e.target.value)}
                                placeholder="Contoh: Divisi Kurikulum & Pembelajaran"
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Unit</label>
                            <select
                                value={unitType}
                                onChange={(e) => setUnitType(e.target.value as OrganizationUnitType)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600 bg-white"
                            >
                                <option value="SCHOOL">SCHOOL</option>
                                <option value="FACULTY">FACULTY</option>
                                <option value="DEPARTMENT">DEPARTMENT</option>
                                <option value="PROGRAM">PROGRAM</option>
                                <option value="DIVISION">DIVISION</option>
                                <option value="OTHER">OTHER</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Unit Induk (Parent)</label>
                            <select
                                value={parentUnitId}
                                onChange={(e) => setParentUnitId(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600 bg-white"
                            >
                                <option value="">-- Tanpa Induk (Root Unit) --</option>
                                {units.map((u) => (
                                    <option key={u.organization_unit_id} value={u.organization_unit_id}>
                                        {u.unit_name} ({u.unit_code})
                                    </option>
                                ))}
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
                            Simpan Unit
                        </button>
                    </div>
                </form>
            )}

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                {units.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">Belum ada unit organisasi terdaftar.</p>
                ) : (
                    <div className="space-y-3">
                        {units.map((u) => (
                            <div 
                                key={u.organization_unit_id}
                                className="p-4 border border-slate-100 bg-slate-50 rounded-2xl flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                                        <Building2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 text-xs">{u.unit_name}</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 font-bold text-slate-700">
                                                {u.unit_type}
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-slate-400">
                                            Kode: {u.unit_code} · {u.parent_unit_id ? `Induk: ${u.parent_unit_id}` : 'Root'} · Ver {u.version_number}
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
