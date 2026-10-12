import React, { useState, useEffect } from 'react';
import { TeacherBehaviorMonitoring } from '../types/curriculum';
import { behaviorEngine } from '../services/behaviorEngine';

interface BehaviorAnalyticsMonitoringProps {
    teacherId: string;
    courseId: string;
    coursePeriodId: string;
    semesterId: string;
    enrolledStudentIds: string[];
}

export const BehaviorAnalyticsMonitoring: React.FC<BehaviorAnalyticsMonitoringProps> = ({
    teacherId,
    courseId,
    coursePeriodId,
    semesterId,
    enrolledStudentIds
}) => {
    const [monitoring, setMonitoring] = useState<TeacherBehaviorMonitoring | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadMonitoring();
    }, [teacherId, courseId, coursePeriodId, semesterId, enrolledStudentIds]);

    const loadMonitoring = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await behaviorEngine.getTeacherBehaviorMonitoring(
                teacherId,
                courseId,
                coursePeriodId,
                semesterId,
                enrolledStudentIds
            );
            setMonitoring(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load behavior analytics');
        } finally {
            setLoading(false);
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
                <p className="font-semibold">Error Loading Analytics</p>
                <p className="mt-1">{error}</p>
                <button 
                    onClick={loadMonitoring}
                    className="mt-3 px-3 py-1.5 bg-rose-800 hover:bg-rose-700 text-white rounded text-xs"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!monitoring) return null;

    return (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Behavior & Guidance Analytics</h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Course: <span className="font-mono text-indigo-400 font-semibold">{courseId}</span> • Enrolled Students: <span className="font-mono text-emerald-400">{monitoring.student_count}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold rounded-full">
                        Authoritative Aggregate
                    </span>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Total Course Events</div>
                    <div className="text-3xl font-bold text-white mt-2">{monitoring.event_count}</div>
                    <div className="text-xs text-slate-500 mt-1">Logged Conduct Entries</div>
                </div>
                <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Requiring Attention</div>
                    <div className={`text-3xl font-bold mt-2 ${monitoring.students_requiring_attention.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {monitoring.students_requiring_attention.length}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Students with Flags</div>
                </div>
                <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Open Discipline Cases</div>
                    <div className="text-3xl font-bold text-amber-400 mt-2">{monitoring.open_case_count}</div>
                    <div className="text-xs text-slate-500 mt-1">Active Referrals</div>
                </div>
                <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Active Interventions</div>
                    <div className="text-3xl font-bold text-cyan-400 mt-2">{monitoring.intervention_count}</div>
                    <div className="text-xs text-slate-500 mt-1">Counseling Plans</div>
                </div>
            </div>

            {/* Students Requiring Attention Banner */}
            {monitoring.students_requiring_attention.length > 0 && (
                <div className="p-4 bg-rose-950/30 border border-rose-800/50 rounded-xl">
                    <h4 className="text-rose-300 font-bold text-sm mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                        Students Requiring Pastoral / Academic Attention:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {monitoring.students_requiring_attention.map(sid => (
                            <span key={sid} className="px-3 py-1 bg-rose-900/60 border border-rose-700/50 rounded-lg text-xs font-mono text-rose-200 font-semibold">
                                {sid}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Student Table */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-200">Individual Student Conduct Breakdown</h3>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-semibold">
                            <tr>
                                <th className="p-3">Student ID</th>
                                <th className="p-3">Positive Events</th>
                                <th className="p-3">Warnings</th>
                                <th className="p-3">Violations</th>
                                <th className="p-3">Open Cases</th>
                                <th className="p-3">Active Interventions</th>
                                <th className="p-3">Pending Follow-ups</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                            {monitoring.student_summaries.map(s => (
                                <tr key={s.student_id} className="hover:bg-slate-800/40 transition">
                                    <td className="p-3 font-mono font-semibold text-white">{s.student_id}</td>
                                    <td className="p-3 text-emerald-400 font-medium">{s.positive_events}</td>
                                    <td className="p-3 text-amber-400 font-medium">{s.warning_events}</td>
                                    <td className="p-3 text-rose-400 font-medium">{s.violation_events}</td>
                                    <td className="p-3 text-indigo-400">{s.open_cases}</td>
                                    <td className="p-3 text-cyan-400">{s.active_interventions}</td>
                                    <td className="p-3 text-slate-300">{s.follow_up_pending}</td>
                                </tr>
                            ))}
                            {monitoring.student_summaries.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-6 text-center text-slate-500">
                                        No student summaries available.
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
