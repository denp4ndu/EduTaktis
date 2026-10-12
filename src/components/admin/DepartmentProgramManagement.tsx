import React, { useState, useEffect } from 'react';
import { Layers, Plus, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Department, Program, OrganizationUnit, UserRole } from '../../types/curriculum';
import { schoolAdministrationRepositoryEngine } from '../../services/schoolAdministrationRepositoryEngine';
import { schoolAdministrationEngine } from '../../services/schoolAdministrationEngine';

interface DeptProgramProps {
    institutionId?: string;
    actorId?: string;
    actorRole?: UserRole;
}

export const DepartmentProgramManagement: React.FC<DeptProgramProps> = ({
    institutionId = 'INST-DEFAULT',
    actorId = 'ADM-001',
    actorRole = 'ADMIN'
}) => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [units, setUnits] = useState<OrganizationUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form states
    const [activeTab, setActiveTab] = useState<'DEPT' | 'PROG'>('DEPT');
    const [deptCode, setDeptCode] = useState('');
    const [deptName, setDeptName] = useState('');
    const [orgUnitId, setOrgUnitId] = useState('');

    const [progCode, setProgCode] = useState('');
    const [progName, setProgName] = useState('');
    const [selectedDeptId, setSelectedDeptId] = useState('');

    const loadData = async () => {
        try {
            setLoading(true);
            const [depts, progs, uList] = await Promise.all([
                schoolAdministrationRepositoryEngine.listDepartments(institutionId),
                schoolAdministrationRepositoryEngine.listPrograms(institutionId),
                schoolAdministrationRepositoryEngine.listOrganizationUnits(institutionId)
            ]);
            setDepartments(depts);
            setPrograms(progs);
            setUnits(uList);
            setError(null);
        } catch (err: any) {
            setError(err?.message || 'Gagal memuat data departemen/program');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [institutionId]);

    const handleCreateDept = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            await schoolAdministrationEngine.createDepartment({
                institution_id: institutionId,
                organization_unit_id: orgUnitId,
                department_code: deptCode,
                department_name: deptName,
                actor_id: actorId,
                actor_role: actorRole
            });
            setSuccessMessage('Departemen berhasil ditambahkan');
            setDeptCode('');
            setDeptName('');
            setOrgUnitId('');
            loadData();
        } catch (err: any) {
            setError(err?.message || 'Gagal membuat departemen');
        }
    };

    const handleCreateProgram = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            await schoolAdministrationEngine.createProgram({
                institution_id: institutionId,
                department_id: selectedDeptId,
                program_code: progCode,
                program_name: progName,
                actor_id: actorId,
                actor_role: actorRole
            });
            setSuccessMessage('Program akademik berhasil ditambahkan');
            setProgCode('');
            setProgName('');
            setSelectedDeptId('');
            loadData();
        } catch (err: any) {
            setError(err?.message || 'Gagal membuat program');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-slate-900 font-heading">
                        Departemen & Program Akademik
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Kelola bidang keilmuan, jurusan, peminatan, dan program studi.
                    </p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                        type="button"
                        onClick={() => setActiveTab('DEPT')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            activeTab === 'DEPT' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
                        }`}
                    >
                        Departemen
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('PROG')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            activeTab === 'PROG' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
                        }`}
                    >
                        Program Studi
                    </button>
                </div>
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

            {/* Department Tab */}
            {activeTab === 'DEPT' && (
                <div className="space-y-4">
                    <form onSubmit={handleCreateDept} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                        <h2 className="text-sm font-bold text-slate-900 font-heading">Tambah Departemen Baru</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Unit Kerja Induk</label>
                                <select
                                    required
                                    value={orgUnitId}
                                    onChange={(e) => setOrgUnitId(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600 bg-white"
                                >
                                    <option value="">-- Pilih Unit Kerja --</option>
                                    {units.map((u) => (
                                        <option key={u.organization_unit_id} value={u.organization_unit_id}>
                                            {u.unit_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Kode Departemen</label>
                                <input
                                    type="text"
                                    required
                                    value={deptCode}
                                    onChange={(e) => setDeptCode(e.target.value)}
                                    placeholder="Contoh: DPT-MIPA"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Departemen</label>
                                <input
                                    type="text"
                                    required
                                    value={deptName}
                                    onChange={(e) => setDeptName(e.target.value)}
                                    placeholder="Contoh: Departemen Sains & MIPA"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs"
                            >
                                Simpan Departemen
                            </button>
                        </div>
                    </form>

                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                        {departments.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">Belum ada departemen terdaftar.</p>
                        ) : (
                            <div className="space-y-3">
                                {departments.map((d) => (
                                    <div key={d.department_id} className="p-4 border border-slate-100 bg-slate-50 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                                <Layers className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <span className="font-bold text-slate-900 text-xs block">{d.department_name}</span>
                                                <span className="text-[11px] text-slate-400">
                                                    Kode: {d.department_code} · Unit ID: {d.organization_unit_id} · Ver {d.version_number}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Program Tab */}
            {activeTab === 'PROG' && (
                <div className="space-y-4">
                    <form onSubmit={handleCreateProgram} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                        <h2 className="text-sm font-bold text-slate-900 font-heading">Tambah Program Akademik Baru</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Departemen Induk</label>
                                <select
                                    required
                                    value={selectedDeptId}
                                    onChange={(e) => setSelectedDeptId(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600 bg-white"
                                >
                                    <option value="">-- Pilih Departemen --</option>
                                    {departments.map((d) => (
                                        <option key={d.department_id} value={d.department_id}>
                                            {d.department_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Kode Program</label>
                                <input
                                    type="text"
                                    required
                                    value={progCode}
                                    onChange={(e) => setProgCode(e.target.value)}
                                    placeholder="Contoh: PRG-IPA"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Program</label>
                                <input
                                    type="text"
                                    required
                                    value={progName}
                                    onChange={(e) => setProgName(e.target.value)}
                                    placeholder="Contoh: Peminatan Matematika & Ilmu Alam"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs"
                            >
                                Simpan Program
                            </button>
                        </div>
                    </form>

                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                        {programs.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">Belum ada program akademik terdaftar.</p>
                        ) : (
                            <div className="space-y-3">
                                {programs.map((p) => (
                                    <div key={p.program_id} className="p-4 border border-slate-100 bg-slate-50 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                                <BookOpen className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <span className="font-bold text-slate-900 text-xs block">{p.program_name}</span>
                                                <span className="text-[11px] text-slate-400">
                                                    Kode: {p.program_code} · Dept ID: {p.department_id} · Ver {p.version_number}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
