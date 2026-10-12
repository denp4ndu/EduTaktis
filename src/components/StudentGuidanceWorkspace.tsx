import React, { useState, useEffect } from 'react';
import { 
    StudentSafeGuidanceCaseProjection, 
    StudentGuidanceSummary, 
    GuidanceSession 
} from '../types/curriculum';
import { guidanceEngine } from '../services/guidanceEngine';
import { guidanceAnalyticsEngine } from '../services/guidanceAnalyticsEngine';

interface StudentGuidanceWorkspaceProps {
    studentId: string;
    semesterId: string;
}

export const StudentGuidanceWorkspace: React.FC<StudentGuidanceWorkspaceProps> = ({
    studentId,
    semesterId
}) => {
    const [summary, setSummary] = useState<StudentGuidanceSummary | null>(null);
    const [cases, setCases] = useState<StudentSafeGuidanceCaseProjection[]>([]);
    const [sessions, setSessions] = useState<GuidanceSession[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [studentId, semesterId]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [sum, caseList, sessionList] = await Promise.all([
                guidanceAnalyticsEngine.getStudentGuidanceSummary(studentId, semesterId),
                guidanceEngine.listGuidanceCases({ student_id: studentId, semester_id: semesterId }, 'STUDENT'),
                guidanceEngine.listSessions({ student_id: studentId }, 'STUDENT')
            ]);

            setSummary(sum);
            setSessions(sessionList);

            // Fetch safe projections
            const projections: StudentSafeGuidanceCaseProjection[] = [];
            for (const c of caseList) {
                const proj = await guidanceEngine.getStudentSafeCaseProjection(c.case_id, studentId);
                if (proj) projections.push(proj);
            }
            setCases(projections);
        } catch (err: any) {
            setError(err.message || 'Failed to load guidance workspace');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 animate-pulse space-y-4">
                <div className="h-6 bg-slate-800 rounded w-1/4"></div>
                <div className="h-24 bg-slate-800 rounded"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-200">
                <h3 className="font-semibold text-lg mb-2">Error Loading Guidance Workspace</h3>
                <p className="text-sm">{error}</p>
                <button 
                    onClick={loadData}
                    className="mt-4 px-4 py-2 bg-rose-800 hover:bg-rose-700 text-white rounded-lg text-sm transition"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Student Pastoral & Guidance Portal</h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Student ID: <span className="font-mono text-cyan-400 font-semibold">{studentId}</span> • Semester: <span className="font-mono text-indigo-400">{semesterId}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold rounded-full">
                        Confidential Student Safe View
                    </span>
                </div>
            </div>

            {/* Metric Summary */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                        <div className="text-xs text-slate-400 uppercase font-semibold">Active Support Plans</div>
                        <div className="text-3xl font-bold text-cyan-400 mt-2">{summary.active_interventions}</div>
                        <div className="text-xs text-slate-500 mt-1">Personalized Guidance</div>
                    </div>
                    <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                        <div className="text-xs text-slate-400 uppercase font-semibold">Scheduled Sessions</div>
                        <div className="text-3xl font-bold text-indigo-400 mt-2">{summary.scheduled_followups}</div>
                        <div className="text-xs text-slate-500 mt-1">Upcoming Check-ins</div>
                    </div>
                    <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                        <div className="text-xs text-slate-400 uppercase font-semibold">Completed Sessions</div>
                        <div className="text-3xl font-bold text-emerald-400 mt-2">{summary.completed_followups}</div>
                        <div className="text-xs text-slate-500 mt-1">Milestones Achieved</div>
                    </div>
                    <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                        <div className="text-xs text-slate-400 uppercase font-semibold">Support Status</div>
                        <div className="text-2xl font-bold text-slate-200 mt-2">{summary.open_cases > 0 ? 'Active Support' : 'All Clear'}</div>
                        <div className="text-xs text-slate-500 mt-1">{summary.open_cases} Active Case(s)</div>
                    </div>
                </div>
            )}

            {/* Cases & Sessions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Guidance Cases */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-200">My Guidance & Support Cases</h3>
                    {cases.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 bg-slate-800/30 rounded-xl border border-slate-800">
                            No active guidance cases registered for this semester.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cases.map(c => (
                                <div key={c.case_id} className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-2">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                            {c.source_type.replace(/_/g, ' ')}
                                        </span>
                                        <span className={`text-xs px-2.5 py-0.5 rounded font-mono font-medium ${
                                            c.status === 'RESOLVED' || c.status === 'CLOSED'
                                                ? 'bg-emerald-500/20 text-emerald-300'
                                                : 'bg-cyan-500/20 text-cyan-300'
                                        }`}>
                                            {c.status}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-white">{c.summary}</p>
                                    <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800">
                                        <span>Sessions: {c.completed_sessions_count} completed / {c.scheduled_sessions_count} scheduled</span>
                                        <span>Opened: {new Date(c.opened_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Counseling Sessions */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-200">Scheduled Counseling Sessions</h3>
                    {sessions.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 bg-slate-800/30 rounded-xl border border-slate-800">
                            No upcoming counseling sessions scheduled.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sessions.map(s => (
                                <div key={s.session_id} className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-2">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs text-slate-400">
                                            Scheduled: <span className="font-semibold text-white">{new Date(s.scheduled_at).toLocaleString()}</span>
                                        </span>
                                        <span className={`text-xs px-2.5 py-0.5 rounded font-mono ${
                                            s.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                                        }`}>
                                            {s.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-300">{s.session_summary}</p>
                                    {s.next_action && (
                                        <div className="text-xs text-cyan-300 bg-cyan-950/30 p-2 rounded border border-cyan-800/40">
                                            <span className="font-semibold">Next Action:</span> {s.next_action}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
