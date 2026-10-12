import React from 'react';
import { Shield, Loader2 } from 'lucide-react';

interface AuthenticationLoadingProps {
    message?: string;
}

export const AuthenticationLoading: React.FC<AuthenticationLoadingProps> = ({
    message = 'Memverifikasi sesi & otorisasi aman...'
}) => {
    return (
        <div 
            role="status" 
            aria-live="polite" 
            className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center"
        >
            <div className="relative mb-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Shield className="w-7 h-7" />
                </div>
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin absolute -bottom-1 -right-1" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 font-heading mb-1">
                EduTaktis LMS Security Gateway
            </h3>
            <p className="text-xs text-slate-500 max-w-xs">
                {message}
            </p>
            <span className="sr-only">Sedang memuat data autentikasi</span>
        </div>
    );
};
