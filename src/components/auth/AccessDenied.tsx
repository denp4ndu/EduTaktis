import React from 'react';
import { ShieldAlert, ArrowLeft, Home, LogIn } from 'lucide-react';

interface AccessDeniedProps {
    title?: string;
    message?: string;
    onGoHome?: () => void;
    onReAuthenticate?: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
    title = 'Akses Dibatasi',
    message = 'Anda tidak memiliki hak otorisasi yang mencukupi untuk mengakses modul ini.',
    onGoHome,
    onReAuthenticate
}) => {
    return (
        <div 
            role="alert" 
            aria-live="assertive" 
            className="w-full max-w-lg mx-auto my-12 p-8 bg-white border border-slate-200 rounded-3xl shadow-xs text-center"
        >
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
                <ShieldAlert className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-black text-slate-900 font-heading mb-2">
                {title}
            </h2>
            
            <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto mb-6">
                {message}
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-500 mb-6 text-left">
                <span className="font-bold text-slate-700 block mb-0.5">Kebijakan Keamanan Zero-Trust:</span>
                Setiap permintaan diverifikasi secara independen oleh Authorization Engine berdasarkan peran, izin, dan relasi resmi.
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {onGoHome && (
                    <button
                        type="button"
                        onClick={onGoHome}
                        className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                        <Home className="w-4 h-4" />
                        <span>Ke Beranda Utama</span>
                    </button>
                )}

                {onReAuthenticate && (
                    <button
                        type="button"
                        onClick={onReAuthenticate}
                        className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-slate-600"
                    >
                        <LogIn className="w-4 h-4" />
                        <span>Ganti Akun</span>
                    </button>
                )}
            </div>
        </div>
    );
};
