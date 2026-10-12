import React from 'react';
import { Clock, LogIn } from 'lucide-react';

interface SessionExpiredProps {
    onLoginClick: () => void;
    reason?: string;
}

export const SessionExpired: React.FC<SessionExpiredProps> = ({
    onLoginClick,
    reason = 'Sesi login Anda telah berakhir demi menjaga keamanan data akun Anda.'
}) => {
    return (
        <div 
            role="alert" 
            aria-live="assertive" 
            className="w-full max-w-md mx-auto my-12 p-8 bg-white border border-slate-200 rounded-3xl shadow-xs text-center"
        >
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
                <Clock className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-black text-slate-900 font-heading mb-2">
                Sesi Telah Berakhir
            </h2>
            
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
                {reason} Silakan masuk kembali dengan kredensial Anda.
            </p>

            <button
                type="button"
                onClick={onLoginClick}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
                <LogIn className="w-4 h-4" />
                <span>Masuk Kembali Sekarang</span>
            </button>
        </div>
    );
};
