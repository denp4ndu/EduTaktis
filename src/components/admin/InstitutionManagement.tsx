import React, { useState, useEffect } from 'react';
import { School, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Institution, UserRole } from '../../types/curriculum';
import { schoolAdministrationRepositoryEngine } from '../../services/schoolAdministrationRepositoryEngine';
import { schoolAdministrationEngine } from '../../services/schoolAdministrationEngine';

interface InstitutionManagementProps {
    actorId?: string;
    actorRole?: UserRole;
}

export const InstitutionManagement: React.FC<InstitutionManagementProps> = ({
    actorId = 'ADM-001',
    actorRole = 'ADMIN'
}) => {
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [legalName, setLegalName] = useState('');
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    const loadInstitutions = async () => {
        try {
            setLoading(true);
            const list = await schoolAdministrationRepositoryEngine.listInstitutions();
            setInstitutions(list);
            setError(null);
        } catch (err: any) {
            setError(err?.message || 'Gagal memuat daftar institusi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInstitutions();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            await schoolAdministrationEngine.createInstitution({
                institution_code: code,
                institution_name: name,
                institution_type: 'SENIOR_HIGH',
                legal_name: legalName,
                address: { street, city, country: 'Indonesia' },
                contact_information: { email, phone },
                actor_id: actorId,
                actor_role: actorRole
            });
            setSuccessMessage('Institusi berhasil didaftarkan');
            setShowForm(false);
            setName('');
            setCode('');
            setLegalName('');
            setStreet('');
            setCity('');
            setEmail('');
            setPhone('');
            loadInstitutions();
        } catch (err: any) {
            setError(err?.message || 'Gagal membuat institusi');
        }
    };

    const handleActivate = async (institutionId: string) => {
        try {
            setError(null);
            await schoolAdministrationEngine.transitionInstitutionStatus({
                institution_id: institutionId,
                target_status: 'ACTIVE',
                actor_id: actorId,
                actor_role: actorRole,
                reason: 'Aktivasi institusi resmi oleh Admin'
            });
            setSuccessMessage('Status institusi berhasil diperbarui menjadi ACTIVE');
            loadInstitutions();
        } catch (err: any) {
            setError(err?.message || 'Gagal mengaktifkan institusi');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-slate-900 font-heading">
                        Manajemen Institusi Sekolah
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Kelola identitas resmi, legalitas, dan status operasional sekolah.
                    </p>
                </div>

                {actorRole === 'ADMIN' && (
                    <button
                        type="button"
                        onClick={() => setShowForm(!showForm)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Daftarkan Sekolah Baru</span>
                    </button>
                )}
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

            {/* Form Pendaftaran Institusi */}
            {showForm && (
                <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                    <h2 className="text-sm font-bold text-slate-900 font-heading">Formulir Institusi Baru</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Institusi</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Contoh: SMA Negeri 1 EduTaktis"
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Kode Institusi</label>
                            <input
                                type="text"
                                required
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="Contoh: SMAN1-EDUTAK"
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Legal / Yayasan</label>
                            <input
                                type="text"
                                required
                                value={legalName}
                                onChange={(e) => setLegalName(e.target.value)}
                                placeholder="Contoh: Yayasan Pendidikan EduTaktis Nusantara"
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Email Resmi</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="info@sman1edutaktis.sch.id"
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Telepon</label>
                            <input
                                type="text"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="021-5551234"
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Kota</label>
                            <input
                                type="text"
                                required
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="Jakarta Selatan"
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
                            Simpan Institusi
                        </button>
                    </div>
                </form>
            )}

            {/* List Institusi */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                {institutions.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">Belum ada data institusi terdaftar.</p>
                ) : (
                    <div className="space-y-3">
                        {institutions.map((inst) => (
                            <div 
                                key={inst.institution_id}
                                className="p-4 border border-slate-100 bg-slate-50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                        <School className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 text-xs">{inst.institution_name}</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                                                {inst.status}
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-slate-400">
                                            Kode: {inst.institution_code} · {inst.address.city} · Ver {inst.version_number}
                                        </span>
                                    </div>
                                </div>

                                {inst.status === 'DRAFT' && actorRole === 'ADMIN' && (
                                    <button
                                        type="button"
                                        onClick={() => handleActivate(inst.institution_id)}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                                    >
                                        Aktifkan Institusi
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
