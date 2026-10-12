import React, { useState, useEffect, useCallback } from 'react';
import { 
    CommunicationThread, 
    CommunicationMessage 
} from '../types/curriculum';
import { parentTeacherCommunicationEngine } from '../services/parentTeacherCommunicationEngine';

interface TeacherParentCommunicationProps {
    teacherId: string;
}

export const TeacherParentCommunication: React.FC<TeacherParentCommunicationProps> = ({
    teacherId = 'TCH-001'
}) => {
    const [threads, setThreads] = useState<CommunicationThread[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string>('');
    const [messages, setMessages] = useState<CommunicationMessage[]>([]);
    const [messageInput, setMessageInput] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // New thread form states
    const [showNewThreadModal, setShowNewThreadModal] = useState<boolean>(false);
    const [newSubject, setNewSubject] = useState<string>('');
    const [newStudentId, setNewStudentId] = useState<string>('');
    const [newGuardianId, setNewGuardianId] = useState<string>('');
    const [newInitialMessage, setNewInitialMessage] = useState<string>('');

    const loadThreads = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await parentTeacherCommunicationEngine.listThreads(teacherId, 'TEACHER');
            setThreads(list);
            if (list.length > 0 && !selectedThreadId) {
                setSelectedThreadId(list[0].thread_id);
            }
        } catch (err: unknown) {
            setError((err as Error).message || 'Gagal memuat percakapan');
        } finally {
            setLoading(false);
        }
    }, [teacherId, selectedThreadId]);

    const loadMessages = useCallback(async (threadId: string) => {
        if (!threadId) return;
        try {
            const res = await parentTeacherCommunicationEngine.getThread(threadId, teacherId, 'TEACHER');
            setMessages(res.messages);
            await parentTeacherCommunicationEngine.markThreadRead({
                thread_id: threadId,
                actor_id: teacherId,
                actor_role: 'TEACHER'
            });
        } catch (err: unknown) {
            setError((err as Error).message || 'Gagal memuat pesan');
        }
    }, [teacherId]);

    useEffect(() => {
        loadThreads();
    }, [loadThreads]);

    useEffect(() => {
        if (selectedThreadId) {
            loadMessages(selectedThreadId);
        }
    }, [selectedThreadId, loadMessages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedThreadId) return;

        setError(null);
        try {
            await parentTeacherCommunicationEngine.sendMessage({
                thread_id: selectedThreadId,
                body: messageInput.trim(),
                actor_id: teacherId,
                actor_role: 'TEACHER'
            });
            setMessageInput('');
            loadMessages(selectedThreadId);
        } catch (err: unknown) {
            setError((err as Error).message || 'Gagal mengirim pesan');
        }
    };

    const handleCreateThread = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const result = await parentTeacherCommunicationEngine.createThread({
                subject: newSubject.trim(),
                student_id: newStudentId.trim(),
                guardian_id: newGuardianId.trim(),
                teacher_id: teacherId,
                initial_message: newInitialMessage.trim() || undefined,
                actor_id: teacherId,
                actor_role: 'TEACHER'
            });
            setShowNewThreadModal(false);
            setNewSubject('');
            setNewStudentId('');
            setNewGuardianId('');
            setNewInitialMessage('');
            setSelectedThreadId(result.thread.thread_id);
            loadThreads();
        } catch (err: unknown) {
            setError((err as Error).message || 'Gagal membuat topik percakapan');
        }
    };

    const selectedThread = threads.find(t => t.thread_id === selectedThreadId);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100 max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div>
                    <h3 className="text-xl font-bold text-white">Komunikasi Guru ↔ Orang Tua / Wali</h3>
                    <p className="text-xs text-slate-400 mt-1">
                        Portal koordinasi akademik dan perkembangan karakter siswa (Guru: {teacherId})
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowNewThreadModal(true)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                    >
                        + Mulai Percakapan Baru
                    </button>
                    <button
                        onClick={loadThreads}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                    >
                        Segarkan
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-xs">
                    {error}
                </div>
            )}

            {/* Create Thread Modal */}
            {showNewThreadModal && (
                <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                        Form Percakapan Baru dengan Wali Murid
                    </h4>
                    <form onSubmit={handleCreateThread} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                            <label htmlFor="thread-subject-input" className="block text-slate-400 mb-1">Topik / Subjek *:</label>
                            <input
                                id="thread-subject-input"
                                type="text"
                                required
                                value={newSubject}
                                onChange={(e) => setNewSubject(e.target.value)}
                                placeholder="Contoh: Konsultasi Progres Belajar IPA"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="thread-student-id-input" className="block text-slate-400 mb-1">ID Siswa *:</label>
                            <input
                                id="thread-student-id-input"
                                type="text"
                                required
                                value={newStudentId}
                                onChange={(e) => setNewStudentId(e.target.value)}
                                placeholder="STU-001"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="thread-guardian-id-input" className="block text-slate-400 mb-1">ID Wali Murid Terdaftar *:</label>
                            <input
                                id="thread-guardian-id-input"
                                type="text"
                                required
                                value={newGuardianId}
                                onChange={(e) => setNewGuardianId(e.target.value)}
                                placeholder="GRD-101"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="thread-initial-message-input" className="block text-slate-400 mb-1">Pesan Pembuka (Opsional):</label>
                            <input
                                id="thread-initial-message-input"
                                type="text"
                                value={newInitialMessage}
                                onChange={(e) => setNewInitialMessage(e.target.value)}
                                placeholder="Tuliskan pesan pembuka..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowNewThreadModal(false)}
                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold"
                            >
                                Buat Percakapan
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Thread Sidebar */}
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Daftar Percakapan ({threads.length})
                    </h4>
                    {loading ? (
                        <div className="p-4 text-center text-slate-500 text-xs">Memuat data...</div>
                    ) : threads.length > 0 ? (
                        <div className="space-y-2">
                            {threads.map(thread => (
                                <button
                                    key={thread.thread_id}
                                    onClick={() => setSelectedThreadId(thread.thread_id)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                                        selectedThreadId === thread.thread_id
                                            ? 'bg-indigo-600/30 border-indigo-500 text-white'
                                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                                    }`}
                                >
                                    <div className="text-xs font-bold truncate">{thread.subject}</div>
                                    <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                                        <span>Siswa: {thread.student_id}</span>
                                        <span className="font-mono">{thread.status}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center text-slate-500 text-xs italic">
                            Belum ada topik percakapan.
                        </div>
                    )}
                </div>

                {/* Message Stream */}
                <div className="md:col-span-2 bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between min-h-[400px]">
                    {selectedThread ? (
                        <div className="space-y-4 flex flex-col h-full justify-between">
                            {/* Thread header */}
                            <div className="pb-3 border-b border-slate-800">
                                <h4 className="text-sm font-bold text-white">{selectedThread.subject}</h4>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    Partisipan: {selectedThread.participant_ids.join(', ')} | Siswa: {selectedThread.student_id}
                                </div>
                            </div>

                            {/* Messages body */}
                            <div className="space-y-3 overflow-y-auto max-h-[300px] p-2">
                                {messages.length > 0 ? (
                                    messages.map(msg => {
                                        const isMe = msg.sender_id === teacherId;
                                        return (
                                            <div
                                                key={msg.message_id}
                                                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                                            >
                                                <div className="text-[10px] text-slate-400 mb-0.5 font-mono">
                                                    {msg.sender_role} ({msg.sender_id})
                                                </div>
                                                <div
                                                    className={`p-3 rounded-xl max-w-md text-xs leading-relaxed ${
                                                        isMe
                                                            ? 'bg-indigo-600 text-white rounded-br-none'
                                                            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                                                    }`}
                                                >
                                                    {msg.body}
                                                    {msg.edited_at && (
                                                        <span className="text-[9px] block text-slate-300/70 mt-1 italic">
                                                            (diedit: {new Date(msg.edited_at).toLocaleTimeString('id-ID')})
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                                                    {new Date(msg.created_at).toLocaleTimeString('id-ID')}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-8 text-center text-slate-500 text-xs italic">
                                        Belum ada pesan dalam topik ini.
                                    </div>
                                )}
                            </div>

                            {/* Message input */}
                            <form onSubmit={handleSendMessage} className="flex gap-2 pt-3 border-t border-slate-800">
                                <label htmlFor="teacher-message-input" className="sr-only">Tulis pesan untuk wali murid</label>
                                <input
                                    id="teacher-message-input"
                                    type="text"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    placeholder="Tulis pesan untuk wali murid..."
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                                >
                                    Kirim
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-slate-500 text-xs italic my-auto">
                            Pilih percakapan di sebelah kiri atau buat percakapan baru.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
