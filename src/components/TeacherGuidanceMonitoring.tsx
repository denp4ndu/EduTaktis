import React, { useState, useEffect } from 'react';
import { TeacherGuidanceMonitoring as ITeacherGuidanceMonitoring } from '../types/curriculum';
import { guidanceAnalyticsEngine } from '../services/guidanceAnalyticsEngine';

interface TeacherGuidanceMonitoringProps {
    teacherId: string;
    courseId: string;
    coursePeriodId: string;
    semesterId: string;
    enrolledStudentIds: string[];
}

export const TeacherGuidanceMonitoring: React.FC<TeacherGuidanceMonitoringProps> = ({
    teacherId,
    courseId,
    coursePeriodId,
    semesterId,
    enrolledStudentIds
}) => {
    const [monitoring, setMonitoring] = useState<ITeacherGuidanceMonitoring | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadMonitoring();
    }, [teacherId, courseId, coursePeriodId, semesterId, enrolledStudentIds]);

    const loadMonitoring = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await guidanceAnalyticsEngine.getTeacherGuidanceMonitoring(
                teacherId,
                courseId,
                coursePeriodId,
                semesterId,
                enrolledStudentIds
            );
            setMonitoring(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load teacher guidance monitoring');
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
                <p className="font-semibold">Error Loading Monitoring</p>
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
    const { class_summary } = monitoring;

    return (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Teacher Guidance & Pastoral Monitoring</h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Course: <span className="font-mono text-indigo-400 font-semibold">{courseId}</span> • Class Size: <span className="font-mono text-emerald-400">{class_summary.student_count}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold rounded-full">
                        Sanitized Educational Scope
                    </span>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Students with Cases</div>
                    <div className="text-3xl font-bold text-white mt-2">{class_summary.students_with_guidance_cases}</div>
                    <div className="text-xs text-slate-500 mt-1">Under Pastoral Care</div>
                </div>
                <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Active Interventions</div>
                    <div className="text-3xl font-bold text-cyan-400 mt-2">{class_summary.active_intervention_count}</div>
                    <div className="text-xs text-slate-500 mt-1">Ongoing Support Plans</div>
                </div>
                <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                    <div className="text-xs text-slate-400 uppercase font-semibold">High / Critical Flags</div>
                    <div className={`text-3xl font-bold mt-2 ${class_summary.critical_case_count > 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                        {class_summary.high_priority_case_count + class_summary.critical_case_count}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{class_summary.critical_case_count} Critical Case(s)</div>
                </div>
                <div className="p-4 bg-slate-800/70 border border-slate-700/60 rounded-xl">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Resolved Cases</div>
                    <div className="text-3xl font-bold text-emerald-400 mt-2">{class_summary.resolved_case_count}</div>
                    <div className="text-xs text-slate-500 mt-1">Successfully Closed</div>
                </div>
            </div>

            {/* Student Table */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-200">Enrolled Student Pastoral Indicators</h3>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-semibold">
                            <tr>
                                <th className="p-3">Student ID</th>
                                <th className="p-3">Active Case</th>
                                <th className="p-3">Priority Level</th>
                                <th className="p-3">Guidance Status</th>
                                <th className="p-3">Active Plans</th>
                                <th className="p-3">Action Required</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                            {monitoring.student_guidance_statuses.map(s => (
                                <tr key={s.student_id} className="hover:bg-slate-800/40 transition">
                                    <td className="p-3 font-mono font-semibold text-white">{s.student_id}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                            s.has_open_case ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-500'
                                        }`}>
                                            {s.has_open_case ? 'YES' : 'NO'}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                            s.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                                            s.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300' :
                                            s.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300' :
                                            'bg-slate-800 text-slate-400'
                                        }`}>
                                            {s.priority}
                                        </span>
                                    </td>
                                    <td className="p-3 text-xs font-mono">{s.status}</td>
                                    <td className="p-3 font-medium text-cyan-400">{s.active_intervention_count}</td>
                                    <td className="p-3">
                                        {s.has_warning && (
                                            <span className="text-xs px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/60 text-rose-300">
                                                Special Attention
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
