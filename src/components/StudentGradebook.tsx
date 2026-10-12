import React, { useEffect, useState } from 'react';
import { StudentGradebook as IStudentGradebook } from '../types/curriculum';
import { gradebookEngine } from '../services/gradebookEngine';

interface StudentGradebookProps {
    studentId: string;
    courseId: string;
    authenticatedStudentId: string;
}

export const StudentGradebook: React.FC<StudentGradebookProps> = ({
    studentId,
    courseId,
    authenticatedStudentId
}) => {
    const [gradebook, setGradebook] = useState<IStudentGradebook | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadGradebook = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await gradebookEngine.getStudentGradebook(
                    studentId,
                    courseId,
                    authenticatedStudentId
                );
                setGradebook(data);
            } catch (err: any) {
                setError(err.message || 'Failed to load gradebook');
            } finally {
                setLoading(false);
            }
        };

        loadGradebook();
    }, [studentId, courseId, authenticatedStudentId]);

    if (loading) {
        return (
            <div className="p-6 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 animate-pulse">
                Loading Student Gradebook...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-950/40 text-red-300 rounded-xl border border-red-800/50">
                <h3 className="text-lg font-bold">Access Denied</h3>
                <p className="text-sm mt-1">{error}</p>
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Academic Gradebook</h2>
                    <p className="text-xs text-slate-400">Student ID: {studentId} | Course ID: {courseId}</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-center">
                        <div className="text-[10px] text-slate-400">Overall Average</div>
                        <div className="font-bold text-emerald-400 text-sm">{gradebook?.aggregate_average ?? 0}%</div>
                    </div>
                    <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-center">
                        <div className="text-[10px] text-slate-400">Completion</div>
                        <div className="font-bold text-indigo-400 text-sm">{gradebook?.completion_rate ?? 0}%</div>
                    </div>
                    <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-center">
                        <div className="text-[10px] text-slate-400">Passed / Total</div>
                        <div className="font-bold text-slate-200 text-sm">{gradebook?.passed_count} / {gradebook?.total_assessments}</div>
                    </div>
                </div>
            </div>

            {/* List of Assessments / Grades */}
            <div className="space-y-3">
                {gradebook?.entries.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                        No graded assessments available yet for this course.
                    </div>
                ) : (
                    gradebook?.entries.map(entry => (
                        <div 
                            key={entry.assessment_id}
                            className="bg-slate-950/40 p-4 rounded-lg border border-slate-800/80 hover:border-slate-700 transition-colors space-y-2"
                        >
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <div className="font-semibold text-sm text-slate-200">{entry.assessment_title}</div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mt-0.5">
                                        Type: {entry.assessment_type} | Version: v{entry.version_number}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${
                                        entry.passed 
                                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' 
                                            : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                                    }`}>
                                        Grade {entry.grade} • {entry.percentage}%
                                    </span>
                                    <div className="text-[11px] text-slate-400 mt-1 font-mono">
                                        Score: {entry.raw_score} / {entry.max_score}
                                    </div>
                                </div>
                            </div>

                            {entry.feedback && (
                                <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 text-xs text-slate-300">
                                    <span className="font-semibold text-slate-400 text-[11px] block mb-0.5">Teacher Feedback:</span>
                                    {entry.feedback}
                                </div>
                            )}

                            {entry.grade_history && entry.grade_history.length > 0 && (
                                <div className="pt-2 border-t border-slate-900 text-[11px] text-slate-400">
                                    <span className="font-medium text-slate-500">Revision History: </span>
                                    {entry.grade_history.map(h => (
                                        <span key={h.history_id} className="inline-block mr-3">
                                            v{h.version_number} ({h.previous_score}➔{h.new_score}): {h.revision_reason}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
