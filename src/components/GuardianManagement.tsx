import React, { useState, useEffect, useCallback } from 'react';
import { Guardian, GuardianRole, GuardianRelationshipType } from '../types/curriculum';
import { parentPortalEngine } from '../services/parentPortalEngine';

interface GuardianManagementProps {
    actorId: string;
    actorRole: string;
}

export const GuardianManagement: React.FC<GuardianManagementProps> = ({
    actorId,
    actorRole
}) => {
    const [guardians, setGuardians] = useState<Guardian[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form states
    const [guardianIdInput, setGuardianIdInput] = useState<string>('');
    const [displayName, setDisplayName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [role, setRole] = useState<GuardianRole>('PARENT');

    // Link relationship states
    const [selectedGuardianId, setSelectedGuardianId] = useState<string>('');
    const [studentIdInput, setStudentIdInput] = useState<string>('');
    const [relType, setRelType] = useState<GuardianRelationshipType>('PARENT');
    const [isPrimary, setIsPrimary] = useState<boolean>(true);

    const loadGuardians = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await parentPortalEngine.listGuardians(actorRole);
            setGuardians(list);
        } catch (err: unknown) {
            setError((err as Error).message || 'Gagal memuat daftar wali');
        } finally {
            setLoading(false);
        }
    }, [actorRole]);

    useEffect(() => {
        loadGuardians();
    }, [loadGuardians]);

    const handleRegisterGuardian = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        try {
            const newGuardian = await parentPortalEngine.registerGuardian({
                guardian_id: guardianIdInput.trim() || undefined,
                display_name: displayName.trim(),
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                role,
                status: 'ACTIVE',
                actor_id: actorId,
                actor_role: actorRole
            });
            setSuccessMessage(`Wali ${newGuardian.display_name} (${newGuardian.guardian_id}) berhasil didaftarkan!`);
            setGuardianIdInput('');
            setDisplayName('');
            setEmail('');
            setPhone('');
            loadGuardians();
        } catch (err: unknown) {
            setError((err as Error).message || 'Pendaftaran wali gagal');
        }
    };

    const handleLinkStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        if (!selectedGuardianId || !studentIdInput.trim()) {
            setError('Pilih wali dan masukkan ID siswa!');
            return;
        }

        try {
            const rel = await parentPortalEngine.createRelationship({
                guardian_id: selectedGuardianId,
                student_id: studentIdInput.trim(),
                relationship_type: relType,
                effective_from: new Date().toISOString(),
                is_primary_contact: isPrimary,
                actor_id: actorId,
                actor_role: actorRole
            });
            setSuccessMessage(`Hubungan wali ${selectedGuardianId} dengan siswa ${rel.student_id} berhasil dibuat (${rel.relationship_id})!`);
            setStudentIdInput('');
        } catch (err: unknown) {
            setError((err as Error).message || 'Gagal menghubungkan wali dengan siswa');
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100 max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div>
                    <h2 className="text-xl font-bold text-white">Manajemen Data Orang Tua / Wali</h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Pendaftaran identitas wali dan pengaitan relasi siswa (Otoritas: {actorRole})
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-sm">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-emerald-300 text-sm">
                    {successMessage}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form Registrasi Wali */}
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400">
                        1. Pendaftaran Wali Baru
                    </h3>
                    <form onSubmit={handleRegisterGuardian} className="space-y-3 text-xs">
                        <div>
                            <label className="block text-slate-400 mb-1">ID Wali (Opsional / Auto):</label>
                            <input
                                type="text"
                                value={guardianIdInput}
                                onChange={(e) => setGuardianIdInput(e.target.value)}
                                placeholder="Contoh: GRD-001"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 mb-1">Nama Lengkap Wali *:</label>
                            <input
                                type="text"
                                required
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Nama lengkap orang tua / wali"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-slate-400 mb-1">Email:</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="email@example.com"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 mb-1">Nomor HP/WA:</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="08123456789"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-slate-400 mb-1">Peran / Kategori Wali:</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as GuardianRole)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                            >
                                <option value="PARENT">Orang Tua Kandung (PARENT)</option>
                                <option value="LEGAL_GUARDIAN">Wali Sah / Hukum (LEGAL_GUARDIAN)</option>
                                <option value="AUTHORIZED_CAREGIVER">Pengasuh Terotorisasi (AUTHORIZED_CAREGIVER)</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow"
                        >
                            Daftarkan Profil Wali
                        </button>
                    </form>
                </div>

                {/* Form Hubungkan Siswa */}
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">
                        2. Hubungkan Wali dengan Siswa
                    </h3>
                    <form onSubmit={handleLinkStudent} className="space-y-3 text-xs">
                        <div>
                            <label className="block text-slate-400 mb-1">Pilih Wali Terdaftar *:</label>
                            <select
                                required
                                value={selectedGuardianId}
                                onChange={(e) => setSelectedGuardianId(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                            >
                                <option value="">-- Pilih Wali --</option>
                                {guardians.map(g => (
                                    <option key={g.guardian_id} value={g.guardian_id}>
                                        {g.display_name} ({g.guardian_id}) - {g.role}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-slate-400 mb-1">ID Siswa Terdaftar *:</label>
                            <input
                                type="text"
                                required
                                value={studentIdInput}
                                onChange={(e) => setStudentIdInput(e.target.value)}
                                placeholder="Contoh: STU-001"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 mb-1">Jenis Hubungan:</label>
                            <select
                                value={relType}
                                onChange={(e) => setRelType(e.target.value as GuardianRelationshipType)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                            >
                                <option value="PARENT">Orang Tua (PARENT)</option>
                                <option value="LEGAL_GUARDIAN">Wali Hukum (LEGAL_GUARDIAN)</option>
                                <option value="AUTHORIZED_CAREGIVER">Pengasuh Terdaftar (AUTHORIZED_CAREGIVER)</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="is-primary"
                                checked={isPrimary}
                                onChange={(e) => setIsPrimary(e.target.checked)}
                                className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                            />
                            <label htmlFor="is-primary" className="text-slate-300">Tetapkan sebagai Kontak Utama</label>
                        </div>
                        <button
                            type="submit"
                            className="w-full mt-2 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow"
                        >
                            Tautkan Hubungan Siswa
                        </button>
                    </form>
                </div>
            </div>

            {/* Daftar Wali Terdaftar */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">
                    Daftar Wali Terdaftar ({guardians.length})
                </h3>
                {loading ? (
                    <div className="p-4 text-center text-slate-500">Memuat data...</div>
                ) : guardians.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left text-slate-300">
                            <thead className="bg-slate-900/80 text-slate-400 font-mono uppercase">
                                <tr>
                                    <th className="p-3">ID Wali</th>
                                    <th className="p-3">Nama Lengkap</th>
                                    <th className="p-3">Peran</th>
                                    <th className="p-3">Kontak</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Checksum</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {guardians.map(g => (
                                    <tr key={g.guardian_id} className="hover:bg-slate-800/30">
                                        <td className="p-3 font-mono text-indigo-300">{g.guardian_id}</td>
                                        <td className="p-3 font-medium text-white">{g.display_name}</td>
                                        <td className="p-3">{g.role}</td>
                                        <td className="p-3">{g.phone || g.email || '-'}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                g.status === 'ACTIVE' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                                            }`}>
                                                {g.status}
                                            </span>
                                        </td>
                                        <td className="p-3 font-mono text-slate-500">{g.checksum}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-4 text-center text-slate-500 italic">Belum ada data wali terdaftar.</div>
                )}
            </div>
        </div>
    );
};
