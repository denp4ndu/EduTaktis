import React, { useState, useEffect } from 'react';
import { MapPin, Plus, AlertCircle } from 'lucide-react';
import { LearningRoom, RoomType, ScheduleEntry, RoomUtilizationSummary, UserRole } from '../types/curriculum';
import { schedulingEngine } from '../services/schedulingEngine';
import { schedulingAnalyticsEngine } from '../services/schedulingAnalyticsEngine';

interface RoomScheduleManagementProps {
    identity?: {
        user_id?: string;
        actor_id?: string;
        role: UserRole;
    };
    institutionId?: string;
    semesterId?: string;
}

export const RoomScheduleManagement: React.FC<RoomScheduleManagementProps> = ({
    identity,
    institutionId = 'INST-DEFAULT',
    semesterId = 'SEM-DEFAULT'
}) => {
    const [rooms, setRooms] = useState<LearningRoom[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [roomSchedules, setRoomSchedules] = useState<ScheduleEntry[]>([]);
    const [utilization, setUtilization] = useState<RoomUtilizationSummary | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Form fields
    const [newCode, setNewCode] = useState('');
    const [newName, setNewName] = useState('');
    const [newCapacity, setNewCapacity] = useState(30);
    const [newType, setNewType] = useState<RoomType>('CLASSROOM');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        loadRooms();
    }, [institutionId]);

    useEffect(() => {
        if (selectedRoomId) {
            loadRoomDetails(selectedRoomId);
        }
    }, [selectedRoomId, institutionId, semesterId]);

    const loadRooms = async () => {
        try {
            setLoading(true);
            setError(null);
            const list = await schedulingEngine.listLearningRooms(institutionId);
            setRooms(list);
            if (list.length > 0 && !selectedRoomId) {
                setSelectedRoomId(list[0].room_id);
            }
        } catch (err: any) {
            setError(err.message || 'Gagal memuat daftar ruangan');
        } finally {
            setLoading(false);
        }
    };

    const loadRoomDetails = async (roomId: string) => {
        try {
            setError(null);
            const schedules = await schedulingEngine.getRoomTimetable({
                room_id: roomId,
                institution_id: institutionId,
                semester_id: semesterId,
                actor_id: identity?.actor_id || identity?.user_id || 'ADM-DEFAULT',
                actor_role: identity?.role || 'ADMIN'
            });
            setRoomSchedules(schedules);

            const util = await schedulingAnalyticsEngine.getRoomUtilizationSummary(roomId, institutionId, semesterId);
            setUtilization(util);
        } catch (err: any) {
            setError(err.message || 'Gagal memuat jadwal penggunaan ruangan');
        }
    };

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            setSuccess(null);
            const room = await schedulingEngine.createLearningRoom({
                institution_id: institutionId,
                code: newCode,
                name: newName,
                capacity: newCapacity,
                room_type: newType,
                actor_id: identity?.actor_id || identity?.user_id || 'ADM-DEFAULT',
                actor_role: identity?.role || 'ADMIN'
            });

            setSuccess(`Ruangan ${room.name} (${room.code}) berhasil didaftarkan`);
            setShowCreateModal(false);
            setNewCode('');
            setNewName('');
            await loadRooms();
            setSelectedRoomId(room.room_id);
        } catch (err: any) {
            setError(err.message || 'Gagal menambahkan ruangan');
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <header className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <MapPin className="w-6 h-6 text-indigo-600" />
                        Manajemen Ruangan & Utilitas Jadwal
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Pengelolaan alokasi ruang kelas, laboratorium, dan kapasitas penggunaan
                    </p>
                </div>
                {(identity?.role === 'ADMIN' || identity?.role === 'HEADMASTER') && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Daftarkan Ruangan Baru
                    </button>
                )}
            </header>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
                    {success}
                </div>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
                        <h2 className="text-lg font-bold text-slate-900">Tambah Ruangan Baru</h2>
                        <form onSubmit={handleCreateRoom} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600">Kode Ruangan</label>
                                <input
                                    type="text"
                                    required
                                    value={newCode}
                                    onChange={(e) => setNewCode(e.target.value)}
                                    placeholder="Contoh: LAB-IPA-1"
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600">Nama Ruangan</label>
                                <input
                                    type="text"
                                    required
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Contoh: Laboratorium Fisika"
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600">Kapasitas</label>
                                    <input
                                        type="number"
                                        min={1}
                                        required
                                        value={newCapacity}
                                        onChange={(e) => setNewCapacity(parseInt(e.target.value, 10))}
                                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600">Tipe Ruangan</label>
                                    <select
                                        value={newType}
                                        onChange={(e) => setNewType(e.target.value as RoomType)}
                                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                    >
                                        <option value="CLASSROOM">Kelas Teori</option>
                                        <option value="LABORATORY">Laboratorium</option>
                                        <option value="WORKSHOP">Bengkel/Praktik</option>
                                        <option value="AUDITORIUM">Auditorium</option>
                                        <option value="LIBRARY">Perpustakaan</option>
                                        <option value="OTHER">Lainnya</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                                >
                                    Simpan Ruangan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Rooms List */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-sm text-slate-800">
                        Daftar Ruangan Terdaftar ({rooms.length})
                    </div>
                    {rooms.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-sm">Belum ada ruangan yang didaftarkan.</div>
                    ) : (
                        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                            {rooms.map((room) => (
                                <button
                                    key={room.room_id}
                                    onClick={() => setSelectedRoomId(room.room_id)}
                                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center justify-between ${
                                        selectedRoomId === room.room_id ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : ''
                                    }`}
                                >
                                    <div>
                                        <p className="font-semibold text-sm text-slate-900">{room.name}</p>
                                        <p className="text-xs text-slate-500 font-mono mt-0.5">Kode: {room.code} • Kapasitas: {room.capacity}</p>
                                    </div>
                                    <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-700">
                                        {room.room_type}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Room Detail & Utilization */}
                <div className="lg:col-span-2 space-y-4">
                    {utilization && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Persentase Utilisasi</span>
                                <div className="mt-2 text-2xl font-bold text-indigo-600">
                                    {utilization.utilization_percentage}%
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sesi Terjadwal</span>
                                <div className="mt-2 text-2xl font-bold text-slate-900">
                                    {utilization.utilized_periods} <span className="text-xs text-slate-500 font-normal">Sesi</span>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Menit Penggunaan</span>
                                <div className="mt-2 text-2xl font-bold text-slate-900">
                                    {utilization.utilized_minutes} <span className="text-xs text-slate-500 font-normal">Menit</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-800 text-sm">
                                Alokasi Jadwal Ruangan Terpilih
                            </h3>
                            <span className="text-xs text-slate-500">
                                {roomSchedules.length} Sesi Terjadwal
                            </span>
                        </div>

                        {roomSchedules.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                Ruangan ini belum memiliki alokasi jadwal pada semester aktif.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-700">
                                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-3">ID Jadwal</th>
                                            <th className="px-6 py-3">Kelas</th>
                                            <th className="px-6 py-3">Mata Pelajaran</th>
                                            <th className="px-6 py-3">Guru</th>
                                            <th className="px-6 py-3">Time Slot</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {roomSchedules.map((s) => (
                                            <tr key={s.schedule_id} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-4 font-mono text-xs font-medium text-slate-900">{s.schedule_id}</td>
                                                <td className="px-6 py-4 font-medium text-slate-800">{s.class_id}</td>
                                                <td className="px-6 py-4 text-indigo-600">{s.course_id}</td>
                                                <td className="px-6 py-4 font-mono text-xs text-slate-600">{s.teacher_id}</td>
                                                <td className="px-6 py-4 font-mono text-xs text-slate-600">{s.time_slot_id}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
