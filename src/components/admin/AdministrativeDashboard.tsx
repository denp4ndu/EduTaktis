import React, { useState, useEffect } from 'react';
import { 
    School, 
    Building2, 
    Layers, 
    BookOpen, 
    GraduationCap, 
    Users, 
    ShieldCheck, 
    Settings, 
    AlertCircle 
} from 'lucide-react';
import { AdministrativeDashboard as IDashboard } from '../../types/curriculum';
import { schoolAdministrationRepositoryEngine } from '../../services/schoolAdministrationRepositoryEngine';

interface AdministrativeDashboardProps {
    institutionId?: string;
    onNavigate?: (path: string) => void;
}

export const AdministrativeDashboard: React.FC<AdministrativeDashboardProps> = ({
    institutionId = 'INST-DEFAULT',
    onNavigate
}) => {
    const [dashboard, setDashboard] = useState<IDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        schoolAdministrationRepositoryEngine
            .getAdministrativeDashboard(institutionId)
            .then((data) => {
                if (isMounted) {
                    setDashboard(data);
                    setError(null);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setError(err?.message || 'Gagal memuat ringkasan tata kelola institusi.');
                }
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [institutionId]);

    if (loading) {
        return (
            <div className="p-8 text-center" role="status" aria-live="polite">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-500 font-bold">Memuat data tata kelola institusi...</p>
            </div>
        );
    }

    if (error || !dashboard) {
        return (
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3" role="alert">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-sm font-bold text-amber-900">Institusi Belum Terdaftar</h3>
                    <p className="text-xs text-amber-700 mt-1">
                        {error || 'Silakan daftarkan institusi baru melalui menu Administrasi Sekolah.'}
                    </p>
                </div>
            </div>
        );
    }

    const { institution, governance } = dashboard;

    return (
        <div className="space-y-6">
            {/* Header Profil Institusi */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl shadow-xs">
                            <School className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-black text-slate-900 font-heading">
                                    {institution.institution_name}
                                </h1>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold uppercase">
                                    {institution.status}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Kode: {institution.institution_code} · {institution.legal_name} · {institution.timezone}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                            Versi {institution.version_number}
                        </span>
                    </div>
                </div>
            </div>

            {/* Statistik Organisasi Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Unit Kerja</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{dashboard.total_organization_units}</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Departemen</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{dashboard.total_departments}</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <BookOpen className="w-4 h-4 text-emerald-600" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Program</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{dashboard.total_programs}</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <GraduationCap className="w-4 h-4 text-purple-600" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Rombel / Kelas</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{dashboard.total_classes}</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Users className="w-4 h-4 text-amber-600" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Siswa Terdaftar</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{dashboard.total_active_students_placed}</p>
                </div>
            </div>

            {/* Kebijakan Tata Kelola */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    <h2 className="text-sm font-bold text-slate-900 font-heading">
                        Konfigurasi Tata Kelola Institusi (Governance)
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                        <span className="font-bold text-slate-800 block mb-1">Publikasi Rapor:</span>
                        Mode: <span className="font-mono text-blue-600">{governance.report_card_publication_mode}</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                        <span className="font-bold text-slate-800 block mb-1">Penerbitan Transkrip:</span>
                        Mode: <span className="font-mono text-purple-600">{governance.transcript_generation_mode}</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                        <span className="font-bold text-slate-800 block mb-1">Komunikasi Wali / Orang Tua:</span>
                        Status: <span className="font-bold text-emerald-700">{governance.guardian_communication_enabled ? 'Aktif' : 'Non-aktif'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                        <span className="font-bold text-slate-800 block mb-1">Kanal Notifikasi:</span>
                        {governance.notification_channels.join(', ')}
                    </div>
                </div>
            </div>
        </div>
    );
};
