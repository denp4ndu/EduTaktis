import React, { useState } from 'react';
import { authenticationEngine } from '../services/authenticationEngine';
import { AuthenticationResult } from '../types/curriculum';
import { Lock, User, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react';

interface LoginProps {
    onLoginSuccess: (result: AuthenticationResult) => void;
    onForgotPassword?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onForgotPassword }) => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setIsLoading(true);

        try {
            const result = await authenticationEngine.authenticate({
                login_identifier: identifier,
                password,
                user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'ReactUI'
            });

            if (result.success && result.identity && result.session) {
                onLoginSuccess(result);
            }
        } catch (err: any) {
            setErrorMessage(err?.message || 'Gagal masuk. Periksa kembali username dan kata sandi Anda.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <div className="text-center space-y-2 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md">
                    <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 font-heading">Masuk ke EduTaktis LMS</h2>
                <p className="text-xs text-slate-500 font-medium">Autentikasi Aman & Isolasi Identitas Zero-Trust</p>
            </div>

            {errorMessage && (
                <div className="p-4 mb-5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <span>{errorMessage}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Username atau Email
                    </label>
                    <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="nama_pengguna / email@sekolah.sch.id"
                            required
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        />
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                            Kata Sandi
                        </label>
                        {onForgotPassword && (
                            <button
                                type="button"
                                onClick={onForgotPassword}
                                className="text-xs font-semibold text-blue-600 hover:underline"
                            >
                                Lupa sandi?
                            </button>
                        )}
                    </div>
                    <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isLoading || !identifier.trim() || !password.trim()}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        <span>{isLoading ? 'Memverifikasi...' : 'Masuk Terproteksi'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
};
