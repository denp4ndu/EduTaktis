import React, { useEffect, useState } from 'react';
import { TeacherGradebook as ITeacherGradebook } from '../types/curriculum';
import { gradebookEngine } from '../services/gradebookEngine';
import { gradingEngine } from '../services/gradingEngine';

interface TeacherGradebookProps {
    teacherId: string;
    courseId: string;
    authorizedCourses?: string[];
}

export const TeacherGradebook: React.FC<TeacherGradebookProps> = ({
    teacherId,
    courseId,
    authorizedCourses
}) => {
    const [gradebook, setGradebook] = useState<ITeacherGradebook | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Grading modal / input state
    const [selectedStudent, setSelectedStudent] = useState<string>('');
    const [selectedAssessment, setSelectedAssessment] = useState<string>('');
    const [scoreInput, setScoreInput] = useState<number>(0);
    const [feedbackInput, setFeedbackInput] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const loadGradebook = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await gradebookEngine.getTeacherGradebook(
                courseId,
                teacherId,
                authorizedCourses
            );
            setGradebook(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load gradebook');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGradebook();
    }, [teacherId, courseId]);

    const handleQuickGrade = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAssessment || !selectedStudent) return;

        try {
            setIsSubmitting(true);
            await gradingEngine.gradeSubmission({
                assessment_id: selectedAssessment,
                submission_id: `SUB-${selectedStudent}-${selectedAssessment}`,
                student_id: selectedStudent,
                course_id: courseId,
                teacher_id: teacherId,
                raw_score: Number(scoreInput),
                feedback: feedbackInput,
                teacher_authorized_courses: authorizedCourses,
                actor_id: teacherId,
                actor_role: 'TEACHER'
            });
            await loadGradebook();
            setFeedbackInput('');
        } catch (err: any) {
            setError(err.message || 'Failed to record grade');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 animate-pulse">
                Loading Teacher Gradebook...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-950/40 text-red-300 rounded-xl border border-red-800/50">
                <h3 className="text-lg font-bold">Gradebook Access Denied</h3>
                <p className="text-sm mt-1">{error}</p>
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Teacher Gradebook</h2>
                    <p className="text-xs text-slate-400">Course ID: {courseId} | Teacher ID: {teacherId}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
                        Course Avg: <span className="font-semibold text-emerald-400">{gradebook?.course_average_percentage ?? 0}%</span>
                    </div>
                </div>
            </div>

            {/* Matrix table */}
            <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="bg-slate-800/60 border-b border-slate-800 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            <th className="p-3">Student ID</th>
                            {gradebook?.assessments.map(asm => (
                                <th key={asm.assessment_id} className="p-3 text-center">
                                    <div className="font-semibold">{asm.title}</div>
                                    <div className="text-[10px] text-slate-400 font-normal">Max: {asm.max_score}</div>
                                </th>
                            ))}
                            <th className="p-3 text-center">Average</th>
                            <th className="p-3 text-center">Passed / Failed</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {gradebook?.student_rows.length === 0 ? (
                            <tr>
                                <td colSpan={(gradebook?.assessments.length || 0) + 3} className="p-4 text-center text-slate-500">
                                    No student grades recorded yet.
                                </td>
                            </tr>
                        ) : (
                            gradebook?.student_rows.map(row => (
                                <tr key={row.student_id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-3 font-mono text-xs font-medium text-slate-300">{row.student_id}</td>
                                    {gradebook.assessments.map(asm => {
                                        const g = row.grades[asm.assessment_id];
                                        return (
                                            <td key={asm.assessment_id} className="p-3 text-center font-mono text-xs">
                                                {g ? (
                                                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                                        g.passed ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                                                    }`}>
                                                        {g.raw_score} ({g.grade})
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600">-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="p-3 text-center font-semibold text-xs text-slate-200">
                                        {row.average_percentage}%
                                    </td>
                                    <td className="p-3 text-center text-xs">
                                        <span className="text-emerald-400 font-semibold">{row.passed_count}</span>
                                        <span className="text-slate-600 mx-1">/</span>
                                        <span className="text-rose-400 font-semibold">{row.failed_count}</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Quick Grade Form */}
            <form onSubmit={handleQuickGrade} className="bg-slate-950/40 p-4 rounded-lg border border-slate-800 space-y-3">
                <h4 className="text-sm font-semibold text-slate-200">Record / Update Grade</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input 
                        type="text"
                        placeholder="Student ID"
                        value={selectedStudent}
                        onChange={e => setSelectedStudent(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-xs text-slate-200 p-2 rounded focus:outline-none focus:border-indigo-500"
                        required
                    />
                    <select
                        value={selectedAssessment}
                        onChange={e => setSelectedAssessment(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-xs text-slate-200 p-2 rounded focus:outline-none focus:border-indigo-500"
                        required
                    >
                        <option value="">Select Assessment</option>
                        {gradebook?.assessments.map(asm => (
                            <option key={asm.assessment_id} value={asm.assessment_id}>
                                {asm.title} (Max: {asm.max_score})
                            </option>
                        ))}
                    </select>
                    <input 
                        type="number"
                        placeholder="Raw Score"
                        value={scoreInput}
                        onChange={e => setScoreInput(Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 text-xs text-slate-200 p-2 rounded focus:outline-none focus:border-indigo-500"
                        min="0"
                        step="0.5"
                        required
                    />
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2 px-4 rounded transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : 'Submit Grade'}
                    </button>
                </div>
                <div>
                    <input 
                        type="text"
                        placeholder="Feedback (optional)"
                        value={feedbackInput}
                        onChange={e => setFeedbackInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 p-2 rounded focus:outline-none focus:border-indigo-500"
                    />
                </div>
            </form>
        </div>
    );
};
