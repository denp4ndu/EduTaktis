import React, { useState } from 'react';
import { authenticationEngine } from '../services/authenticationEngine';
import { AuthenticatedIdentity } from '../types/curriculum';
import { KeyRound, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

interface AccountSecurityProps {
    identity: AuthenticatedIdentity;
    onPasswordChanged?: () => void;
}

export const AccountSecurity: React.FC<AccountSecurityProps> = ({ identity, onPasswordChanged }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [revokeOthers, setRevokeOthers] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMessage(null);
        setErrorMessage(null);

        if (newPassword !== confirmPassword) {
            setErrorMessage('Konfirmasi kata sandi baru tidak cocok.');
            return;
        }

        setIsLoading(true);
        try {
            await authenticationEngine.changePassword({
                user_id: identity.user_id,
                current_password: currentPassword,
                new_password: newPassword,
                revoke_other_sessions: revokeOthers
            });

            setSuccessMessage('Kata sandi berhasil diperbarui dengan aman.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            if (onPasswordChanged) {
                onPasswordChanged();
            }
        } catch (err: any) {
            setErrorMessage(err?.message || 'Gagal mengubah kata sandi.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                        <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900 font-heading">Keamanan & Ubah Kata Sandi</h3>
                        <p className="text-xs text-slate-500">Perbarui kredensial akun dengan enkripsi derivasi multi-round</p>
                    </div>
                </div>

                {successMessage && (
                    <div className="p-4 mb-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                {errorMessage && (
                    <div className="p-4 mb-5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Kata Sandi Saat Ini</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Kata Sandi Baru</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            placeholder="Min. 8 karakter (huruf besar, kecil, angka, simbol)"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Konfirmasi Kata Sandi Baru</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Ulangi kata sandi baru"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="revokeOthers"
                            checked={revokeOthers}
                            onChange={(e) => setRevokeOthers(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="revokeOthers" className="text-xs text-slate-600 font-medium">
                            Cabut semua sesi aktif lainnya di perangkat lain setelah perubahan
                        </label>
                    </div>

                    <div className="pt-3">
                        <button
                            type="submit"
                            disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2"
                        >
                            <ShieldAlert className="w-4 h-4" />
                            <span>{isLoading ? 'Menyimpan...' : 'Simpan Perubahan Kata Sandi'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
