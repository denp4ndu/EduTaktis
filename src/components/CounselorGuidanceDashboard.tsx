import React, { useState, useEffect } from 'react';
import { 
    CounselorGuidanceDashboard as ICounselorGuidanceDashboard, 
    GuidanceCase, 
    GuidanceSession 
} from '../types/curriculum';
import { guidanceAnalyticsEngine } from '../services/guidanceAnalyticsEngine';
import { guidanceEngine } from '../services/guidanceEngine';

interface CounselorGuidanceDashboardProps {
    counselorId: string;
    semesterId: string;
}

export const CounselorGuidanceDashboard: React.FC<CounselorGuidanceDashboardProps> = ({
    counselorId,
    semesterId
}) => {
    const [dashboard, setDashboard] = useState<ICounselorGuidanceDashboard | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Complete session modal
    const [completingSession, setCompletingSession] = useState<GuidanceSession | null>(null);
    const [sessionSummary, setSessionSummary] = useState<string>('');
    const [confidentialNotes, setConfidentialNotes] = useState<string>('');
    const [nextAction, setNextAction] = useState<string>('');

    useEffect(() => {
        loadDashboard();
    }, [counselorId, semesterId]);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await guidanceAnalyticsEngine.getCounselorGuidanceDashboard(counselorId, semesterId);
            setDashboard(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load counselor dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!completingSession) return;
        try {
            setError(null);
            await guidanceEngine.completeSession({
                session_id: completingSession.session_id,
                session_summary: sessionSummary,
                confidential_notes: confidentialNotes,
                next_action: nextAction,
                actor_id: counselorId,
                actor_role: 'COUNSELOR'
            });
            setCompletingSession(null);
            setSessionSummary('');
            setConfidentialNotes('');
            setNextAction('');
            await loadDashboard();
        } catch (err: any) {
            setError(err.message || 'Failed to complete session');
        }
    };

    if (loading) {
        return (
            <div className="p-6 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 animate-pulse space-y-4">
                <div className="h-6 bg-slate-800 rounded w-1/3"></div>
                <div className="grid grid-cols-4 gap-4">
                    <div className="h-20 bg-slate-800 rounded"></div>
                    <div className="h-20 bg-slate-800 rounded"></div>
                    <div className="h-20 bg-slate-800 rounded"></div>
                    <div className="h-20 bg-slate-800 rounded"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-200 text-sm">
                <p className="font-semibold">Error Loading Dashboard</p>
                <p className="mt-1">{error}</p>
                <button 
                    onClick={loadDashboard}
                    className="mt-3 px-3 py-1.5 bg-rose-800 hover:bg-rose-700 text-white rounded text-xs"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!dashboard) return null;

    return (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Counselor Clinical & Guidance Dashboard</h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Counselor ID: <span className="font-mono text-indigo-400 font-semibold">{counselorId}</span> • Semester: <span className="font-mono text-cyan-400">{semesterId}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold rounded-full">
                        Full Clinical Scope Access
                    </span>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Total Assigned Cases</div>
                    <div className="text-3xl font-bold text-white mt-2">{dashboard.total_assigned_cases}</div>
                    <div className="text-xs text-slate-500 mt-1">{dashboard.open_cases.length} Open / In Progress</div>
                </div>
                <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Escalated Cases</div>
                    <div className="text-3xl font-bold text-rose-400 mt-2">{dashboard.escalated_cases.length}</div>
                    <div className="text-xs text-slate-500 mt-1">Headmaster Referral</div>
                </div>
                <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Upcoming Sessions</div>
                    <div className="text-3xl font-bold text-cyan-400 mt-2">{dashboard.upcoming_sessions.length}</div>
                    <div className="text-xs text-slate-500 mt-1">Scheduled Appointments</div>
                </div>
                <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Intervention Rate</div>
                    <div className="text-3xl font-bold text-emerald-400 mt-2">{dashboard.effectiveness_summary.improvement_rate}%</div>
                    <div className="text-xs text-slate-500 mt-1">Measured Improvement</div>
                </div>
            </div>

            {/* Upcoming Sessions & Open Cases */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upcoming Sessions */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-200">Scheduled Counseling Sessions</h3>
                    {dashboard.upcoming_sessions.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 bg-slate-800/30 rounded-xl border border-slate-800">
                            No upcoming counseling sessions scheduled.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {dashboard.upcoming_sessions.map(s => (
                                <div key={s.session_id} className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl flex justify-between items-center">
                                    <div className="space-y-1">
                                        <div className="text-xs text-indigo-400 font-semibold font-mono">Student: {s.student_id}</div>
                                        <div className="font-semibold text-white">{s.session_summary}</div>
                                        <div className="text-xs text-slate-400">Time: {new Date(s.scheduled_at).toLocaleString()}</div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setCompletingSession(s);
                                            setSessionSummary(s.session_summary);
                                        }}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
                                    >
                                        Complete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Open Cases */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-200">Active Case Queue</h3>
                    {dashboard.open_cases.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 bg-slate-800/30 rounded-xl border border-slate-800">
                            No active cases in queue.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {dashboard.open_cases.map(c => (
                                <div key={c.case_id} className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-2">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-mono font-semibold text-indigo-300">
                                            {c.student_id} • {c.source_type}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                                            c.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                                            c.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-300'
                                        }`}>
                                            {c.priority}
                                        </span>
                                    </div>
                                    <p className="text-sm text-white font-medium">{c.summary}</p>
                                    {c.confidential_notes && (
                                        <div className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800">
                                            <span className="font-semibold text-amber-300">Confidential Note:</span> {c.confidential_notes}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for Completing Session */}
            {completingSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h3 className="text-lg font-bold text-white">Complete Counseling Session</h3>
                            <button onClick={() => setCompletingSession(null)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleCompleteSession} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Session Summary (Shared)</label>
                                <textarea
                                    value={sessionSummary}
                                    onChange={(e) => setSessionSummary(e.target.value)}
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
                                    rows={3}
                                    placeholder="Private notes (restricted to counselor only)..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Next Action</label>
                                <input
                                    type="text"
                                    value={nextAction}
                                    onChange={(e) => setNextAction(e.target.value)}
                                    placeholder="e.g. Schedule parent check-in in 2 weeks"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCompletingSession(null)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold"
                                >
                                    Save & Complete Session
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
