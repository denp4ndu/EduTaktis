import React, { useState, useEffect } from 'react';
import { 
    StudentBehaviorEvent, 
    DisciplineCase, 
    GuidanceIntervention, 
    StudentBehaviorSummary 
} from '../types/curriculum';
import { behaviorEngine } from '../services/behaviorEngine';

interface StudentBehaviorWorkspaceProps {
    studentId: string;
    semesterId: string;
    academicYearId?: string;
}

export const StudentBehaviorWorkspace: React.FC<StudentBehaviorWorkspaceProps> = ({
    studentId,
    semesterId
}) => {
    const [summary, setSummary] = useState<StudentBehaviorSummary | null>(null);
    const [events, setEvents] = useState<StudentBehaviorEvent[]>([]);
    const [cases, setCases] = useState<DisciplineCase[]>([]);
    const [interventions, setInterventions] = useState<GuidanceIntervention[]>([]);
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'POSITIVE' | 'GUIDANCE' | 'HISTORY'>('OVERVIEW');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [studentId, semesterId]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [sum, evts, caseList, intervList] = await Promise.all([
                behaviorEngine.getStudentBehaviorSummary(studentId, semesterId),
                behaviorEngine.listBehaviorEvents({ student_id: studentId, semester_id: semesterId }),
                behaviorEngine.listDisciplineCases({ student_id: studentId, semester_id: semesterId }),
                behaviorEngine.listInterventions({ student_id: studentId, semester_id: semesterId })
            ]);

            setSummary(sum);
            setEvents(evts);
            setCases(caseList);
            setInterventions(intervList);
        } catch (err: any) {
            setError(err.message || 'Failed to load behavior records');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 animate-pulse">
                <div className="h-6 bg-slate-800 rounded w-1/4 mb-4"></div>
                <div className="h-24 bg-slate-800 rounded mb-6"></div>
                <div className="h-48 bg-slate-800 rounded"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-200">
                <h3 className="font-semibold text-lg mb-2">Error Loading Behavior Workspace</h3>
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

    const positiveEvents = events.filter(e => 
        e.category === 'POSITIVE_BEHAVIOR' || e.category === 'ACHIEVEMENT' || e.category === 'PARTICIPATION'
    );

    return (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Student Guidance & Conduct Record</h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Student ID: <span className="font-mono text-emerald-400 font-semibold">{studentId}</span> • Semester: <span className="font-mono text-indigo-400">{semesterId}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full">
                        Zero-Trust Authoritative View
                    </span>
                </div>
            </div>

            {/* Metric Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                        <div className="text-xs text-slate-400 uppercase font-semibold">Positive Commendations</div>
                        <div className="text-3xl font-bold text-emerald-400 mt-2">{summary.positive_events}</div>
                        <div className="text-xs text-slate-500 mt-1">Achievements & Merits</div>
                    </div>
                    <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                        <div className="text-xs text-slate-400 uppercase font-semibold">Notices & Warnings</div>
                        <div className="text-3xl font-bold text-amber-400 mt-2">{summary.warning_events}</div>
                        <div className="text-xs text-slate-500 mt-1">Guidance Reminders</div>
                    </div>
                    <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                        <div className="text-xs text-slate-400 uppercase font-semibold">Active Guidance Plans</div>
                        <div className="text-3xl font-bold text-indigo-400 mt-2">{summary.active_interventions}</div>
                        <div className="text-xs text-slate-500 mt-1">Support Programs</div>
                    </div>
                    <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                        <div className="text-xs text-slate-400 uppercase font-semibold">Follow-Up Sessions</div>
                        <div className="text-3xl font-bold text-cyan-400 mt-2">{summary.follow_up_pending}</div>
                        <div className="text-xs text-slate-500 mt-1">Scheduled Check-ins</div>
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 gap-2">
                <button
                    onClick={() => setActiveTab('OVERVIEW')}
                    className={`pb-3 px-4 text-sm font-medium transition border-b-2 ${
                        activeTab === 'OVERVIEW' 
                            ? 'border-indigo-500 text-indigo-400' 
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    Overview & Timeline
                </button>
                <button
                    onClick={() => setActiveTab('POSITIVE')}
                    className={`pb-3 px-4 text-sm font-medium transition border-b-2 ${
                        activeTab === 'POSITIVE' 
                            ? 'border-emerald-500 text-emerald-400' 
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    Commendations ({positiveEvents.length})
                </button>
                <button
                    onClick={() => setActiveTab('GUIDANCE')}
                    className={`pb-3 px-4 text-sm font-medium transition border-b-2 ${
                        activeTab === 'GUIDANCE' 
                            ? 'border-cyan-500 text-cyan-400' 
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    Counseling & Guidance ({interventions.length})
                </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'OVERVIEW' && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-200">Recent Behavior & Conduct Timeline</h3>
                    {events.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 bg-slate-800/30 rounded-xl border border-slate-800">
                            No behavior events logged for this academic semester.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {events.map((evt) => (
                                <div 
                                    key={evt.event_id}
                                    className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-600 transition"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                                evt.category.startsWith('POSITIVE') || evt.category === 'ACHIEVEMENT' || evt.category === 'PARTICIPATION'
                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                    : evt.category === 'WARNING'
                                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                            }`}>
                                                {evt.category.replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {new Date(evt.event_date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="font-semibold text-slate-100">{evt.title}</div>
                                        <div className="text-sm text-slate-300">{evt.description}</div>
                                        {evt.reviewer_notes && (
                                            <div className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800 mt-2">
                                                <span className="font-semibold text-indigo-300">Teacher / Reviewer Note:</span> {evt.reviewer_notes}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right flex flex-col md:items-end gap-1">
                                        <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded">
                                            v{evt.version_number} • {evt.status}
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]">
                                            {evt.checksum}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'POSITIVE' && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-emerald-300">Achievements & Positive Merits</h3>
                    {positiveEvents.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 bg-slate-800/30 rounded-xl border border-slate-800">
                            No commendations recorded yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {positiveEvents.map(evt => (
                                <div key={evt.event_id} className="p-5 bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-800/40 rounded-xl space-y-2">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{evt.category.replace(/_/g, ' ')}</span>
                                        <span className="text-xs text-slate-400">{new Date(evt.event_date).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="font-bold text-white text-base">{evt.title}</h4>
                                    <p className="text-sm text-slate-300">{evt.description}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'GUIDANCE' && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-cyan-300">Guidance & Counseling Interventions</h3>
                    {interventions.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 bg-slate-800/30 rounded-xl border border-slate-800">
                            No active counseling interventions assigned.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {interventions.map(int => (
                                <div key={int.intervention_id} className="p-5 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                                {int.intervention_type}
                                            </span>
                                            <h4 className="font-bold text-white text-base mt-2">{int.goal}</h4>
                                        </div>
                                        <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-900 text-cyan-400 border border-cyan-500/30">
                                            {int.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-300 bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                                        <span className="font-semibold text-slate-200">Action Plan:</span> {int.action_plan}
                                    </p>
                                    {int.follow_ups.length > 0 && (
                                        <div className="mt-3 border-t border-slate-800 pt-3">
                                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Follow-up Sessions</div>
                                            <div className="space-y-2">
                                                {int.follow_ups.map(fol => (
                                                    <div key={fol.follow_up_id} className="text-xs flex justify-between items-center p-2 rounded bg-slate-900/50 border border-slate-800">
                                                        <span className="text-slate-300">Scheduled: {new Date(fol.scheduled_at).toLocaleDateString()}</span>
                                                        <span className={`px-2 py-0.5 rounded font-medium ${fol.status === 'COMPLETED' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                                                            {fol.status}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
