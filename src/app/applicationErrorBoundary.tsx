import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { ApplicationErrorRecord } from '../types/curriculum';
import { frontendAuthorizationAdapter } from '../services/frontendAuthorizationAdapter';

interface Props {
    children: ReactNode;
    fallback?: (error: ApplicationErrorRecord, reset: () => void) => ReactNode;
}

interface State {
    hasError: boolean;
    errorRecord: ApplicationErrorRecord | null;
}

export class ApplicationErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        errorRecord: null
    };

    public static getDerivedStateFromError(error: Error): State {
        const classified = frontendAuthorizationAdapter.classifyError(error);
        return {
            hasError: true,
            errorRecord: classified
        };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log internally for debugging without exposing to public DOM
        console.error('ApplicationErrorBoundary caught an error:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({
            hasError: false,
            errorRecord: null
        });
    };

    public render() {
        if (this.state.hasError && this.state.errorRecord) {
            if (this.props.fallback) {
                return this.props.fallback(this.state.errorRecord, this.handleReset);
            }

            return (
                <div 
                    role="alert" 
                    aria-live="assertive" 
                    className="min-h-[400px] flex items-center justify-center p-6 bg-slate-50"
                >
                    <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xs text-center">
                        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8" />
                        </div>

                        <h2 className="text-xl font-black text-slate-900 font-heading mb-2">
                            Terjadi Kendala Sistem
                        </h2>

                        <p className="text-xs text-slate-600 leading-relaxed mb-4">
                            Sistem mendeteksi kendala pada antarmuka. Keamanan data dan status sesi Anda tetap terjaga.
                        </p>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-500 mb-6 text-left">
                            <span className="font-bold text-slate-700 block mb-0.5">Klasifikasi Masalah:</span>
                            {this.state.errorRecord.type} (ID: {this.state.errorRecord.error_id})
                        </div>

                        <div className="flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={this.handleReset}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-blue-600"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span>Coba Muat Ulang</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => window.location.href = '/'}
                                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-slate-600"
                            >
                                <Home className="w-4 h-4" />
                                <span>Ke Halaman Utama</span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
