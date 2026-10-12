import React, { useState, useEffect, useCallback } from 'react';
import { sessionEngine } from '../services/sessionEngine';
import { UserSession } from '../types/curriculum';
import { Laptop, Smartphone, Globe, ShieldCheck, LogOut, RefreshCw, AlertCircle } from 'lucide-react';

interface SessionManagementProps {
    userId: string;
    currentSessionId: string;
    onCurrentSessionRevoked?: () => void;
}

export const SessionManagement: React.FC<SessionManagementProps> = ({
    userId,
    currentSessionId,
    onCurrentSessionRevoked
}) => {
    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);

    const loadSessions = useCallback(async () => {
        setIsLoading(true);
        try {
            const list = await sessionEngine.listUserSessions(userId);
            setSessions(list);
        } catch (err: any) {
            console.error('Failed to load sessions:', err);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const handleRevokeSession = async (sessionId: string) => {
        try {
            await sessionEngine.revokeSession(sessionId, 'USER_INITIATED_REVOCATION');
            setActionMessage(`Sesi ${sessionId.substring(0, 12)}... berhasil dicabut.`);
            await loadSessions();
            if (sessionId === currentSessionId && onCurrentSessionRevoked) {
                onCurrentSessionRevoked();
            }
        } catch (err: any) {
            alert(`Gagal mencabut sesi: ${err.message}`);
        }
    };

    const handleRevokeAllOthers = async () => {
        try {
            const allSessions = await sessionEngine.listUserSessions(userId);
            let count = 0;
            for (const s of allSessions) {
                if (s.session_id !== currentSessionId && s.status === 'ACTIVE') {
                    await sessionEngine.revokeSession(s.session_id, 'REVOKE_OTHER_DEVICES');
                    count++;
                }
            }
            setActionMessage(`${count} sesi perangkat lain telah berhasil dicabut.`);
            await loadSessions();
        } catch (err: any) {
            alert(`Gagal mencabut sesi lain: ${err.message}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <Laptop className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 font-heading">Manajemen Sesi Aktif</h3>
                            <p className="text-xs text-slate-500">Pantau dan kelola seluruh sesi login terotorisasi Anda</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadSessions}
                            disabled={isLoading}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold flex items-center gap-1.5"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            <span>Segarkan</span>
                        </button>

                        <button
                            onClick={handleRevokeAllOthers}
                            className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition-colors flex items-center gap-1.5"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Cabut Semua Sesi Lain</span>
                        </button>
                    </div>
                </div>

                {actionMessage && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{actionMessage}</span>
                    </div>
                )}

                <div className="divide-y divide-slate-100">
                    {sessions.map((session) => {
                        const isCurrent = session.session_id === currentSessionId;
                        const isActive = session.status === 'ACTIVE';

                        return (
                            <div key={session.session_id} className="py-4 flex items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className={`p-2.5 rounded-xl mt-0.5 ${isCurrent ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                        {session.user_agent?.toLowerCase().includes('mobile') ? (
                                            <Smartphone className="w-4 h-4" />
                                        ) : (
                                            <Laptop className="w-4 h-4" />
                                        )}
                                    </div>

                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-900 font-mono">
                                                {session.session_id.substring(0, 16)}...
                                            </span>
                                            {isCurrent && (
                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold">
                                                    Perangkat Ini
                                                </span>
                                            )}
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                session.status === 'ACTIVE'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {session.status}
                                            </span>
                                        </div>

                                        <p className="text-[11px] text-slate-500">
                                            Dibuat: {new Date(session.created_at).toLocaleString('id-ID')} · Kedaluwarsa: {new Date(session.expires_at).toLocaleTimeString('id-ID')}
                                        </p>
                                    </div>
                                </div>

                                {isActive && (
                                    <button
                                        onClick={() => handleRevokeSession(session.session_id)}
                                        className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                                    >
                                        Cabut Sesi
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    {sessions.length === 0 && !isLoading && (
                        <div className="py-8 text-center text-slate-400 text-xs">
                            Tidak ada data sesi yang ditemukan.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
