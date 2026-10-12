import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GovernanceSettings, UserRole } from '../../types/curriculum';
import { schoolAdministrationRepositoryEngine } from '../../services/schoolAdministrationRepositoryEngine';
import { schoolAdministrationEngine } from '../../services/schoolAdministrationEngine';

interface GovernanceSettingsProps {
    institutionId?: string;
    actorId?: string;
    actorRole?: UserRole;
}

export const GovernanceSettingsManagement: React.FC<GovernanceSettingsProps> = ({
    institutionId = 'INST-DEFAULT',
    actorId = 'ADM-001',
    actorRole = 'ADMIN'
}) => {
    const [settings, setSettings] = useState<GovernanceSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form
    const [reportCardMode, setReportCardMode] = useState<'AUTOMATIC' | 'MANUAL_APPROVAL'>('MANUAL_APPROVAL');
    const [transcriptMode, setTranscriptMode] = useState<'OFFICIAL_SEALED' | 'DRAFT_ALLOWED'>('OFFICIAL_SEALED');
    const [guardianComm, setGuardianComm] = useState(true);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await schoolAdministrationRepositoryEngine.getGovernanceSettings(institutionId);
            if (data) {
                setSettings(data);
                setReportCardMode(data.report_card_publication_mode);
                setTranscriptMode(data.transcript_generation_mode);
                setGuardianComm(data.guardian_communication_enabled);
            }
            setError(null);
        } catch (err: any) {
            setError(err?.message || 'Gagal memuat pengaturan tata kelola');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, [institutionId]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            const updated = await schoolAdministrationEngine.updateGovernanceSettings({
                institution_id: institutionId,
                report_card_publication_mode: reportCardMode,
                transcript_generation_mode: transcriptMode,
                guardian_communication_enabled: guardianComm,
                actor_id: actorId,
                actor_role: actorRole
            });
            setSettings(updated);
            setSuccessMessage('Pengaturan tata kelola institusi berhasil disimpan.');
        } catch (err: any) {
            setError(err?.message || 'Gagal menyimpan pengaturan tata kelola');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-black text-slate-900 font-heading">
                    Kebijakan & Tata Kelola Institusi (Governance)
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                    Konfigurasi parameter kepatuhan publikasi rapor, segel transkrip, dan gerbang komunikasi.
                </p>
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

            <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    <h2 className="text-sm font-bold text-slate-900 font-heading">Parameter Kebijakan</h2>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Mode Publikasi Rapor Akademik
                        </label>
                        <select
                            value={reportCardMode}
                            onChange={(e) => setReportCardMode(e.target.value as any)}
                            className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600 bg-white"
                        >
                            <option value="MANUAL_APPROVAL">MANUAL_APPROVAL (Membutuhkan Pengesahan Kepala Sekolah)</option>
                            <option value="AUTOMATIC">AUTOMATIC (Otomatis Terbit Sesuai Jadwal Kalender)</option>
                        </select>
                        <p className="text-[11px] text-slate-400 mt-1">
                            Mengatur apakah rapor siswa memerlukan persetujuan manual kepala sekolah sebelum dapat dilihat wali murid.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Mode Penerbitan Transkrip Akademik
                        </label>
                        <select
                            value={transcriptMode}
                            onChange={(e) => setTranscriptMode(e.target.value as any)}
                            className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-blue-600 bg-white"
                        >
                            <option value="OFFICIAL_SEALED">OFFICIAL_SEALED (Segel Resmi & Validasi Kriptografis)</option>
                            <option value="DRAFT_ALLOWED">DRAFT_ALLOWED (Pratinjau Draf Diperbolehkan)</option>
                        </select>
                    </div>

                    <div className="pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={guardianComm}
                                onChange={(e) => setGuardianComm(e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs font-bold text-slate-800">
                                Aktifkan Gerbang Komunikasi Guru - Orang Tua / Wali
                            </span>
                        </label>
                        <p className="text-[11px] text-slate-400 ml-6 mt-0.5">
                            Menonaktifkan opsi ini akan menangguhkan pembukaan thread pesan baru antara wali dan guru.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                        type="submit"
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                    >
                        Simpan Perubahan Tata Kelola
                    </button>
                </div>
            </form>
        </div>
    );
};
