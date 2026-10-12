import React, { useState, useEffect, useCallback } from 'react';
import { 
    CommunicationThread, 
    CommunicationMessage 
} from '../types/curriculum';
import { parentTeacherCommunicationEngine } from '../services/parentTeacherCommunicationEngine';

interface ParentTeacherCommunicationProps {
    guardianId: string;
}

export const ParentTeacherCommunication: React.FC<ParentTeacherCommunicationProps> = ({
    guardianId = 'GRD-101'
}) => {
    const [threads, setThreads] = useState<CommunicationThread[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string>('');
    const [messages, setMessages] = useState<CommunicationMessage[]>([]);
    const [messageInput, setMessageInput] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const loadThreads = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await parentTeacherCommunicationEngine.listThreads(guardianId, 'GUARDIAN');
            setThreads(list);
            if (list.length > 0 && !selectedThreadId) {
                setSelectedThreadId(list[0].thread_id);
            }
        } catch (err: unknown) {
            setError((err as Error).message || 'Gagal memuat pesan percakapan');
        } finally {
            setLoading(false);
        }
    }, [guardianId, selectedThreadId]);

    const loadMessages = useCallback(async (threadId: string) => {
        if (!threadId) return;
        try {
            const res = await parentTeacherCommunicationEngine.getThread(threadId, guardianId, 'GUARDIAN');
            setMessages(res.messages);
            await parentTeacherCommunicationEngine.markThreadRead({
                thread_id: threadId,
                actor_id: guardianId,
                actor_role: 'GUARDIAN'
            });
        } catch (err: unknown) {
            setError((err as Error).message || 'Gagal memuat isi pesan');
        }
    }, [guardianId]);

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
                actor_id: guardianId,
                actor_role: 'GUARDIAN'
            });
            setMessageInput('');
            loadMessages(selectedThreadId);
        } catch (err: unknown) {
            setError((err as Error).message || 'Gagal mengirim pesan');
        }
    };

    const selectedThread = threads.find(t => t.thread_id === selectedThreadId);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100 max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div>
                    <h3 className="text-xl font-bold text-white">Komunikasi Orang Tua / Wali ↔ Guru</h3>
                    <p className="text-xs text-slate-400 mt-1">
                        Saluran komunikasi resmi dan aman antara wali murid dan guru pengampu (Wali: {guardianId})
                    </p>
                </div>
                <button
                    onClick={loadThreads}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                >
                    Segarkan
                </button>
            </div>

            {error && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-xs">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Thread List Sidebar */}
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Percakapan Aktif ({threads.length})
                    </h4>
                    {loading ? (
                        <div className="p-4 text-center text-slate-500 text-xs">Memuat daftar...</div>
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
                            Belum ada percakapan aktif.
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
                                    Konteks: {selectedThread.context_type} | Siswa: {selectedThread.student_id}
                                </div>
                            </div>

                            {/* Messages body */}
                            <div className="space-y-3 overflow-y-auto max-h-[300px] p-2">
                                {messages.length > 0 ? (
                                    messages.map(msg => {
                                        const isMe = msg.sender_id === guardianId;
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
                                <label htmlFor="guardian-message-input" className="sr-only">Tulis pesan untuk guru</label>
                                <input
                                    id="guardian-message-input"
                                    type="text"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    placeholder="Tulis pesan untuk guru..."
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
                            Pilih percakapan di sebelah kiri untuk melihat pesan.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
