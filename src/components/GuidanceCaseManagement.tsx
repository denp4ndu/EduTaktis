import React, { useState, useEffect } from 'react';
import { 
    GuidanceCase, 
    GuidancePriority, 
    GuidanceSourceType 
} from '../types/curriculum';
import { guidanceEngine } from '../services/guidanceEngine';

interface GuidanceCaseManagementProps {
    actorId: string;
    actorRole: 'COUNSELOR' | 'HEADMASTER' | 'DISCIPLINE_OFFICER' | 'ADMIN';
    semesterId: string;
    academicYearId: string;
}

export const GuidanceCaseManagement: React.FC<GuidanceCaseManagementProps> = ({
    actorId,
    actorRole,
    semesterId,
    academicYearId
}) => {
    const [cases, setCases] = useState<GuidanceCase[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Modal state for creating new case
    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
    const [studentId, setStudentId] = useState<string>('');
    const [sourceType, setSourceType] = useState<GuidanceSourceType>('TEACHER_REFERRAL');
    const [priority, setPriority] = useState<GuidancePriority>('MEDIUM');
    const [summary, setSummary] = useState<string>('');
    const [confidentialNotes, setConfidentialNotes] = useState<string>('');

    // Escalation modal
    const [escalatingCase, setEscalatingCase] = useState<GuidanceCase | null>(null);
    const [escalationReason, setEscalationReason] = useState<string>('');

    // Resolution modal
    const [resolvingCase, setResolvingCase] = useState<GuidanceCase | null>(null);
    const [resolutionNotes, setResolutionNotes] = useState<string>('');

    useEffect(() => {
        loadCases();
    }, [actorId, semesterId]);

    const loadCases = async () => {
        try {
            setLoading(true);
            setError(null);
            const list = await guidanceEngine.listGuidanceCases({ semester_id: semesterId }, actorRole);
            setCases(list);
        } catch (err: any) {
            setError(err.message || 'Failed to load guidance cases');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCase = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError(null);
            await guidanceEngine.createGuidanceCase({
                student_id: studentId,
                academic_year_id: academicYearId,
                semester_id: semesterId,
                source_type: sourceType,
                priority,
                summary,
                confidential_notes: confidentialNotes,
                assigned_counselor_id: actorRole === 'COUNSELOR' ? actorId : undefined,
                actor_id: actorId,
                actor_role: actorRole
            });

            setSuccessMsg('Guidance case opened successfully.');
            setShowCreateModal(false);
            setStudentId('');
            setSummary('');
            setConfidentialNotes('');
            await loadCases();
        } catch (err: any) {
            setError(err.message || 'Failed to open guidance case');
        }
    };

    const handleEscalateCase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!escalatingCase) return;

        try {
            setError(null);
            await guidanceEngine.escalateGuidanceCase({
                case_id: escalatingCase.case_id,
                target_role: 'HEADMASTER',
                reason: escalationReason,
                actor_id: actorId,
                actor_role: actorRole
            });

            setSuccessMsg('Case escalated to Headmaster successfully.');
            setEscalatingCase(null);
            setEscalationReason('');
            await loadCases();
        } catch (err: any) {
            setError(err.message || 'Failed to escalate case');
        }
    };

    const handleResolveCase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resolvingCase) return;

        try {
            setError(null);
            await guidanceEngine.resolveGuidanceCase({
                case_id: resolvingCase.case_id,
                resolution_notes: resolutionNotes,
                actor_id: actorId,
                actor_role: actorRole
            });

            setSuccessMsg('Case resolved successfully.');
            setResolvingCase(null);
            setResolutionNotes('');
            await loadCases();
        } catch (err: any) {
            setError(err.message || 'Failed to resolve case');
        }
    };

    if (loading) {
        return (
            <div className="p-6 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 animate-pulse space-y-4">
                <div className="h-6 bg-slate-800 rounded w-1/3"></div>
                <div className="h-40 bg-slate-800 rounded"></div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Guidance Case Lifecycle & Referral Management</h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Role: <span className="font-semibold text-indigo-400">{actorRole}</span> • Semester: <span className="font-mono text-cyan-400">{semesterId}</span>
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition shadow-lg shadow-indigo-600/20"
                >
                    + Open Guidance Case
                </button>
            </div>

            {error && (
                <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-200 text-sm">
                    {error}
                </div>
            )}

            {successMsg && (
                <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-200 text-sm flex justify-between items-center">
                    <span>{successMsg}</span>
                    <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 font-bold ml-4">✕</button>
                </div>
            )}

            {/* Cases List */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">Registered Guidance Cases</h3>
                {cases.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-800/30 rounded-xl border border-slate-800">
                        No guidance cases registered for this semester.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {cases.map(c => (
                            <div 
                                key={c.case_id}
                                className="p-5 bg-slate-800/50 border border-slate-700/60 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-600 transition"
                            >
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs text-indigo-300 font-bold bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-800/50">
                                            {c.student_id}
                                        </span>
                                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                                            {c.source_type.replace(/_/g, ' ')}
                                        </span>
                                        <span className={`text-xs px-2.5 py-0.5 rounded font-semibold ${
                                            c.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                                            c.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-300'
                                        }`}>
                                            {c.priority}
                                        </span>
                                    </div>
                                    <div className="font-semibold text-white text-base">{c.summary}</div>
                                    {c.confidential_notes && (
                                        <div className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800">
                                            <span className="font-semibold text-amber-300">Confidential Note:</span> {c.confidential_notes}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="text-right flex flex-col items-end">
                                        <span className={`text-xs font-mono px-2 py-1 rounded font-semibold ${
                                            c.status === 'ESCALATED' ? 'bg-rose-950/70 text-rose-300 border border-rose-800/50' :
                                            c.status === 'RESOLVED' ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/50' :
                                            'bg-slate-900 text-slate-300'
                                        }`}>
                                            v{c.current_version} • {c.status}
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-500 truncate max-w-[130px] mt-1">
                                            {c.checksum}
                                        </span>
                                    </div>

                                    {/* Action Buttons */}
                                    {c.status === 'IN_PROGRESS' && (
                                        <button
                                            onClick={() => setEscalatingCase(c)}
                                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition"
                                        >
                                            Escalate
                                        </button>
                                    )}
                                    {(c.status === 'IN_PROGRESS' || c.status === 'ESCALATED') && (
                                        <button
                                            onClick={() => setResolvingCase(c)}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
                                        >
                                            Resolve
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal for Creating Case */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h3 className="text-lg font-bold text-white">Open Student Guidance Case</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleCreateCase} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Student ID</label>
                                <input
                                    type="text"
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                    placeholder="e.g. STU-1001"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Source Type</label>
                                    <select
                                        value={sourceType}
                                        onChange={(e) => setSourceType(e.target.value as GuidanceSourceType)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                                    >
                                        <option value="TEACHER_REFERRAL">Teacher Referral</option>
                                        <option value="BEHAVIOR_EVENT">Behavior Event</option>
                                        <option value="DISCIPLINE_CASE">Discipline Case</option>
                                        <option value="SELF_REFERRAL">Self Referral</option>
                                        <option value="PARENT_REFERRAL">Parent Referral</option>
                                        <option value="ACADEMIC_CONCERN">Academic Concern</option>
                                        <option value="ATTENDANCE_CONCERN">Attendance Concern</option>
                                        <option value="WELLBEING_CONCERN">Wellbeing Concern</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Priority</label>
                                    <select
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value as GuidancePriority)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="CRITICAL">Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Case Summary</label>
                                <textarea
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    placeholder="Summary of referral concern..."
                                    rows={2}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Confidential Clinical Notes</label>
                                <textarea
                                    value={confidentialNotes}
                                    onChange={(e) => setConfidentialNotes(e.target.value)}
                                    placeholder="Internal counselor notes (confidential)..."
                                    rows={3}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold"
                                >
                                    Open Case
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal for Escalating Case */}
            {escalatingCase && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h3 className="text-lg font-bold text-white">Escalate Guidance Case</h3>
                            <button onClick={() => setEscalatingCase(null)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleEscalateCase} className="space-y-4">
                            <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 space-y-1">
                                <div className="text-xs text-indigo-400 font-semibold">Student: {escalatingCase.student_id}</div>
                                <div className="text-sm font-medium text-white">{escalatingCase.summary}</div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Escalation Reason</label>
                                <textarea
                                    value={escalationReason}
                                    onChange={(e) => setEscalationReason(e.target.value)}
                                    placeholder="Explain why headmaster intervention is required..."
                                    rows={3}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEscalatingCase(null)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold"
                                >
                                    Confirm Escalation
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal for Resolving Case */}
            {resolvingCase && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h3 className="text-lg font-bold text-white">Resolve Guidance Case</h3>
                            <button onClick={() => setResolvingCase(null)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleResolveCase} className="space-y-4">
                            <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 space-y-1">
                                <div className="text-xs text-indigo-400 font-semibold">Student: {resolvingCase.student_id}</div>
                                <div className="text-sm font-medium text-white">{resolvingCase.summary}</div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Resolution Summary & Follow-up Plan</label>
                                <textarea
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    placeholder="Detail intervention outcome and resolution rationale..."
                                    rows={3}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setResolvingCase(null)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold"
                                >
                                    Complete Resolution
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
