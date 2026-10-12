import React, { useState, useEffect, useCallback } from 'react';
import { authenticationStorageProvider } from '../services/authenticationStorageProvider';
import { authenticationEngine } from '../services/authenticationEngine';
import { UserAccount, UserAccountStatus, UserRole } from '../types/curriculum';
import { Users, Shield, UserCheck, Lock, Unlock, UserX, AlertTriangle } from 'lucide-react';

interface UserAccessManagementProps {
    adminActorId: string;
}

export const UserAccessManagement: React.FC<UserAccessManagementProps> = ({ adminActorId }) => {
    const [accounts, setAccounts] = useState<UserAccount[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

    const loadAccounts = useCallback(async () => {
        setIsLoading(true);
        try {
            const list = await authenticationStorageProvider.listUserAccounts();
            setAccounts(list);
        } catch (err: any) {
            console.error('Failed to load accounts:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAccounts();
    }, [loadAccounts]);

    const handleUpdateStatus = async (userId: string, newStatus: UserAccountStatus) => {
        try {
            await authenticationEngine.updateAccountStatus(userId, newStatus, adminActorId);
            await loadAccounts();
        } catch (err: any) {
            alert(`Gagal memperbarui status akun: ${err.message}`);
        }
    };

    const handleUnlock = async (userId: string) => {
        try {
            await authenticationEngine.unlockAccount(userId, adminActorId);
            await loadAccounts();
        } catch (err: any) {
            alert(`Gagal membuka kunci akun: ${err.message}`);
        }
    };

    const filteredAccounts = accounts.filter(acc => {
        if (selectedRoleFilter === 'ALL') return true;
        return acc.role === selectedRoleFilter;
    });

    return (
        <div className="space-y-6">
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 font-heading">Manajemen Akses & Akun Pengguna</h3>
                            <p className="text-xs text-slate-500">Kontrol otoritas pengguna, status akun, dan mitigasi keamanan</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={selectedRoleFilter}
                            onChange={(e) => setSelectedRoleFilter(e.target.value)}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                        >
                            <option value="ALL">Semua Peran</option>
                            <option value="STUDENT">Siswa (STUDENT)</option>
                            <option value="TEACHER">Guru (TEACHER)</option>
                            <option value="PARENT">Orang Tua (PARENT)</option>
                            <option value="COUNSELOR">Konselor (COUNSELOR)</option>
                            <option value="DISCIPLINE_OFFICER">Disiplin (DISCIPLINE_OFFICER)</option>
                            <option value="HEADMASTER">Kepala Sekolah (HEADMASTER)</option>
                            <option value="ADMIN">Administrator (ADMIN)</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 font-bold">
                                <th className="pb-3 px-3">Pengguna</th>
                                <th className="pb-3 px-3">Email / Username</th>
                                <th className="pb-3 px-3">Peran</th>
                                <th className="pb-3 px-3">Status</th>
                                <th className="pb-3 px-3 text-right">Aksi Kontrol</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredAccounts.map((acc) => (
                                <tr key={acc.user_id} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="py-3 px-3 font-bold text-slate-900">
                                        {acc.display_name}
                                    </td>
                                    <td className="py-3 px-3 text-slate-600">
                                        <div>{acc.email}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">@{acc.username}</div>
                                    </td>
                                    <td className="py-3 px-3">
                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold">
                                            {acc.role}
                                        </span>
                                    </td>
                                    <td className="py-3 px-3">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                            acc.status === 'ACTIVE'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : acc.status === 'LOCKED'
                                                ? 'bg-amber-100 text-amber-800'
                                                : acc.status === 'SUSPENDED'
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {acc.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-3 text-right space-x-1.5">
                                        {acc.status === 'LOCKED' && (
                                            <button
                                                onClick={() => handleUnlock(acc.user_id)}
                                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold text-[11px] border border-emerald-200"
                                            >
                                                Buka Kunci
                                            </button>
                                        )}

                                        {acc.status === 'ACTIVE' && (
                                            <button
                                                onClick={() => handleUpdateStatus(acc.user_id, 'SUSPENDED')}
                                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[11px] border border-amber-200"
                                            >
                                                Bekukan
                                            </button>
                                        )}

                                        {acc.status === 'SUSPENDED' && (
                                            <button
                                                onClick={() => handleUpdateStatus(acc.user_id, 'ACTIVE')}
                                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[11px] border border-blue-200"
                                            >
                                                Aktifkan
                                            </button>
                                        )}

                                        {acc.status !== 'REVOKED' && acc.status !== 'ARCHIVED' && (
                                            <button
                                                onClick={() => handleUpdateStatus(acc.user_id, 'REVOKED')}
                                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-bold text-[11px] border border-red-200"
                                            >
                                                Cabut
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {filteredAccounts.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-400">
                                        Tidak ada akun pengguna yang sesuai filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
