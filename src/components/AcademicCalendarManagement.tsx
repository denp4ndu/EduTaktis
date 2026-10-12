import React, { useState, useEffect } from 'react';
import { 
    AcademicYear, 
    Semester, 
    AcademicCalendar, 
    AcademicCalendarEventType 
} from '../types/curriculum';
import { academicCalendarEngine } from '../services/academicCalendarEngine';
import { academicCalendarRepositoryEngine } from '../services/academicCalendarRepositoryEngine';

interface AcademicCalendarManagementProps {
    actorId?: string;
    actorRole?: string;
}

export const AcademicCalendarManagement: React.FC<AcademicCalendarManagementProps> = ({
    actorId = 'ADM-01',
    actorRole = 'ADMIN'
}) => {
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [calendars, setCalendars] = useState<AcademicCalendar[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>('');
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
    const [activeCalendar, setActiveCalendar] = useState<AcademicCalendar | null>(null);

    const [newYearCode, setNewYearCode] = useState('');
    const [newYearLabel, setNewYearLabel] = useState('');
    const [newYearStart, setNewYearStart] = useState('2026-07-01');
    const [newYearEnd, setNewYearEnd] = useState('2027-06-30');

    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventType, setNewEventType] = useState<AcademicCalendarEventType>('TEACHING');
    const [newEventStart, setNewEventStart] = useState('2026-07-15T08:00:00.000Z');
    const [newEventEnd, setNewEventEnd] = useState('2026-07-15T16:00:00.000Z');

    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setError(null);
            const years = await academicCalendarRepositoryEngine.listAcademicYears();
            setAcademicYears(years);

            if (years.length > 0 && !selectedYearId) {
                setSelectedYearId(years[0].academic_year_id);
            }

            const sems = await academicCalendarRepositoryEngine.listSemesters(selectedYearId || undefined);
            setSemesters(sems);

            if (sems.length > 0 && !selectedSemesterId) {
                setSelectedSemesterId(sems[0].semester_id);
            }

            const cals = await academicCalendarRepositoryEngine.listCalendars();
            setCalendars(cals);

            if (selectedSemesterId) {
                const cal = await academicCalendarRepositoryEngine.getCalendarBySemester(selectedSemesterId);
                setActiveCalendar(cal);
            }
        } catch (err: any) {
            setError(err.message || 'Gagal memuat data kalender akademik');
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedYearId, selectedSemesterId]);

    const handleCreateAcademicYear = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        try {
            const created = await academicCalendarEngine.createAcademicYear({
                code: newYearCode,
                label: newYearLabel,
                start_at: `${newYearStart}T00:00:00.000Z`,
                end_at: `${newYearEnd}T23:59:59.000Z`,
                actor_id: actorId,
                actor_role: actorRole
            });
            setSuccessMessage(`Tahun ajaran ${created.label} berhasil dibuat (${created.academic_year_id})`);
            setNewYearCode('');
            setNewYearLabel('');
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Gagal membuat tahun ajaran');
        }
    };

    const handleActivateYear = async (yearId: string) => {
        setError(null);
        setSuccessMessage(null);
        try {
            const updated = await academicCalendarEngine.activateAcademicYear({
                academic_year_id: yearId,
                actor_id: actorId,
                actor_role: actorRole
            });
            setSuccessMessage(`Tahun ajaran ${updated.label} diaktifkan.`);
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Gagal mengaktifkan tahun ajaran');
        }
    };

    const handleCloseYear = async (yearId: string) => {
        setError(null);
        setSuccessMessage(null);
        try {
            const updated = await academicCalendarEngine.closeAcademicYear({
                academic_year_id: yearId,
                actor_id: actorId,
                actor_role: actorRole
            });
            setSuccessMessage(`Tahun ajaran ${updated.label} ditutup.`);
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Gagal menutup tahun ajaran');
        }
    };

    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeCalendar) {
            setError('Pilih kalender semester terlebih dahulu');
            return;
        }
        setError(null);
        setSuccessMessage(null);
        try {
            const updated = await academicCalendarEngine.addCalendarEvent({
                calendar_id: activeCalendar.calendar_id,
                type: newEventType,
                title: newEventTitle,
                start_at: newEventStart,
                end_at: newEventEnd,
                actor_id: actorId,
                actor_role: actorRole
            });
            setActiveCalendar(updated);
            setSuccessMessage(`Kegiatan '${newEventTitle}' berhasil ditambahkan ke kalender.`);
            setNewEventTitle('');
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Gagal menambahkan kegiatan kalender');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="border-b border-slate-200 pb-4">
                <h2 className="text-xl font-bold text-slate-800">Manajemen Kalender Akademik</h2>
                <p className="text-sm text-slate-500">
                    Otoritas jadwal tahun ajaran, semester, dan kegiatan akademik (Phase 32)
                </p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
                    ⚠️ {error}
                </div>
            )}

            {successMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm font-medium">
                    ✓ {successMessage}
                </div>
            )}

            {/* Academic Year Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4">
                    <h3 className="font-semibold text-slate-700">Buat Tahun Ajaran Baru</h3>
                    <form onSubmit={handleCreateAcademicYear} className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Kode (misal: 2026/2027)</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={newYearCode}
                                onChange={e => setNewYearCode(e.target.value)}
                                placeholder="2026/2027"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={newYearLabel}
                                onChange={e => setNewYearLabel(e.target.value)}
                                placeholder="Tahun Ajaran 2026/2027"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Mulai</label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                                    value={newYearStart}
                                    onChange={e => setNewYearStart(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Selesai</label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                                    value={newYearEnd}
                                    onChange={e => setNewYearEnd(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition"
                        >
                            + Tambah Tahun Ajaran
                        </button>
                    </form>
                </div>

                {/* Academic Year List */}
                <div className="space-y-3">
                    <h3 className="font-semibold text-slate-700">Daftar Tahun Ajaran</h3>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {academicYears.length === 0 ? (
                            <p className="text-sm text-slate-400">Belum ada tahun ajaran terdaftar.</p>
                        ) : (
                            academicYears.map(yr => (
                                <div 
                                    key={yr.academic_year_id}
                                    className={`p-3 rounded-lg border transition ${
                                        selectedYearId === yr.academic_year_id
                                            ? 'bg-indigo-50 border-indigo-300'
                                            : 'bg-white border-slate-200'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold text-slate-800 text-sm">{yr.label} ({yr.code})</h4>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {new Date(yr.start_at).toLocaleDateString()} — {new Date(yr.end_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                                            yr.status === 'ACTIVE'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : yr.status === 'CLOSED'
                                                ? 'bg-slate-100 text-slate-700'
                                                : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {yr.status} (v{yr.version_number})
                                        </span>
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedYearId(yr.academic_year_id)}
                                            className="text-xs px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50"
                                        >
                                            Pilih
                                        </button>
                                        {yr.status === 'DRAFT' && (
                                            <button
                                                type="button"
                                                onClick={() => handleActivateYear(yr.academic_year_id)}
                                                className="text-xs px-2.5 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                            >
                                                Aktifkan
                                            </button>
                                        )}
                                        {yr.status === 'ACTIVE' && (
                                            <button
                                                type="button"
                                                onClick={() => handleCloseYear(yr.academic_year_id)}
                                                className="text-xs px-2.5 py-1 bg-slate-600 text-white rounded hover:bg-slate-700"
                                            >
                                                Tutup
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Calendar Events Section */}
            {activeCalendar && (
                <div className="pt-6 border-t border-slate-200 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800">
                            Jadwal Kegiatan Kalender ({activeCalendar.status} - v{activeCalendar.version_number})
                        </h3>
                        <span className="text-xs font-mono text-slate-400">{activeCalendar.checksum}</span>
                    </div>

                    <form onSubmit={handleAddEvent} className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Nama Kegiatan</label>
                            <input
                                type="text"
                                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded"
                                value={newEventTitle}
                                onChange={e => setNewEventTitle(e.target.value)}
                                placeholder="Ujian Tengah Semester"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Kategori</label>
                            <select
                                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded"
                                value={newEventType}
                                onChange={e => setNewEventType(e.target.value as AcademicCalendarEventType)}
                            >
                                <option value="TEACHING">TEACHING (KBM)</option>
                                <option value="EXAMINATION">EXAMINATION (Ujian)</option>
                                <option value="ASSESSMENT">ASSESSMENT (Penilaian)</option>
                                <option value="SUBMISSION_WINDOW">SUBMISSION_WINDOW (Tugas)</option>
                                <option value="REPORT_CARD">REPORT_CARD (Rapor)</option>
                                <option value="HOLIDAY">HOLIDAY (Libur)</option>
                                <option value="ACADEMIC_EVENT">ACADEMIC_EVENT</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Mulai</label>
                            <input
                                type="datetime-local"
                                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded"
                                value={newEventStart.substring(0, 16)}
                                onChange={e => setNewEventStart(new Date(e.target.value).toISOString())}
                                required
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium"
                            >
                                + Tambah Jadwal
                            </button>
                        </div>
                    </form>

                    <div className="space-y-2">
                        {activeCalendar.events.length === 0 ? (
                            <p className="text-sm text-slate-400 py-4 text-center">Belum ada agenda kegiatan dalam kalender semester ini.</p>
                        ) : (
                            activeCalendar.events.map(ev => (
                                <div key={ev.event_id} className="p-3 bg-white border border-slate-200 rounded-lg flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded">
                                                {ev.type}
                                            </span>
                                            <h4 className="text-sm font-semibold text-slate-800">{ev.title}</h4>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {new Date(ev.start_at).toLocaleString()} — {new Date(ev.end_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <span className="text-xs text-slate-400 font-mono">v{ev.version_number}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
