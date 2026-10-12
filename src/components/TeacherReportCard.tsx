import React, { useState } from 'react';
import { AcademicReportCard } from '../types/curriculum';
import { academicReportCardEngine, CourseCalculationInput } from '../services/academicReportCardEngine';
import { academicReportCardRepositoryEngine } from '../services/academicReportCardRepositoryEngine';

interface TeacherReportCardProps {
    teacherId: string;
    authorizedCourses?: string[];
    defaultStudentId?: string;
    defaultAcademicPeriod?: string;
}

export const TeacherReportCard: React.FC<TeacherReportCardProps> = ({
    teacherId,
    authorizedCourses,
    defaultStudentId = '',
    defaultAcademicPeriod = '2026/2027-SEMESTER-1'
}) => {
    const [studentId, setStudentId] = useState<string>(defaultStudentId);
    const [academicPeriod, setAcademicPeriod] = useState<string>(defaultAcademicPeriod);
    const [reportCard, setReportCard] = useState<AcademicReportCard | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Revision state
    const [showRevisionModal, setShowRevisionModal] = useState<boolean>(false);
    const [revisionReason, setRevisionReason] = useState<string>('');

    const handleFetchReportCard = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!studentId || !academicPeriod) return;

        try {
            setLoading(true);
            setError(null);
            setSuccessMessage(null);
            const card = await academicReportCardEngine.getTeacherReportCard({
                teacher_id: teacherId,
                student_id: studentId,
                academic_period: academicPeriod,
                teacher_authorized_courses: authorizedCourses
            });
            setReportCard(card);
            if (!card) {
                setError(`No report card found for student ${studentId} in period ${academicPeriod}`);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch report card');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async () => {
        if (!reportCard) return;
        try {
            setLoading(true);
            setError(null);
            const updated = await academicReportCardEngine.finalizeReportCard({
                report_card_id: reportCard.report_card_id,
                actor_id: teacherId,
                actor_role: 'TEACHER',
                teacher_authorized_courses: authorizedCourses
            });
            setReportCard(updated);
            setSuccessMessage('Report card successfully finalized.');
        } catch (err: any) {
            setError(err.message || 'Failed to finalize report card');
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!reportCard) return;
        try {
            setLoading(true);
            setError(null);
            const updated = await academicReportCardEngine.publishReportCard({
                report_card_id: reportCard.report_card_id,
                actor_id: teacherId,
                actor_role: 'TEACHER',
                teacher_authorized_courses: authorizedCourses
            });
            setReportCard(updated);
            setSuccessMessage('Report card successfully published to student portal.');
        } catch (err: any) {
            setError(err.message || 'Failed to publish report card');
        } finally {
            setLoading(false);
        }
    };

    const handleArchive = async () => {
        if (!reportCard) return;
        try {
            setLoading(true);
            setError(null);
            const updated = await academicReportCardEngine.archiveReportCard({
                report_card_id: reportCard.report_card_id,
                actor_id: teacherId,
                actor_role: 'TEACHER',
                teacher_authorized_courses: authorizedCourses
            });
            setReportCard(updated);
            setSuccessMessage('Report card successfully archived.');
        } catch (err: any) {
            setError(err.message || 'Failed to archive report card');
        } finally {
            setLoading(false);
        }
    };

    const handleRevise = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reportCard || !revisionReason.trim()) return;

        try {
            setLoading(true);
            setError(null);

            // Construct calculation input from existing courses
            const coursesInput: CourseCalculationInput[] = reportCard.courses.map(c => ({
                course_id: c.course_id,
                subject: c.subject,
                teacher_id: c.teacher_id,
                assessments: c.assessment_summary.map(a => ({
                    assessment_id: a.assessment_id,
                    assessment_title: a.assessment_title,
                    assessment_type: a.assessment_type,
                    max_score: a.max_score,
                    weight: a.weight
                })),
                curriculum_context: reportCard.curriculum_context
            }));

            const revised = await academicReportCardEngine.reviseReportCard({
                report_card_id: reportCard.report_card_id,
                revision_reason: revisionReason,
                courses: coursesInput,
                actor_id: teacherId,
                actor_role: 'TEACHER',
                teacher_authorized_courses: authorizedCourses
            });

            setReportCard(revised);
            setShowRevisionModal(false);
            setRevisionReason('');
            setSuccessMessage(`Report card revised to version ${revised.version_number}.`);
        } catch (err: any) {
            setError(err.message || 'Failed to revise report card');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-slate-900 text-slate-100 rounded-xl max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Teacher Academic Report Card Management</h2>
                    <p className="text-sm text-slate-400">Deterministic final grade aggregation, completeness verification, and publishing</p>
                </div>
                <div className="text-xs bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700 text-slate-300">
                    Authority: <span className="font-semibold text-emerald-400">Official Curriculum Context</span>
                </div>
            </div>

            {/* Student selection form */}
            <form onSubmit={handleFetchReportCard} className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Student ID</label>
                    <input
                        type="text"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="e.g. STU-001"
                        className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Academic Period</label>
                    <input
                        type="text"
                        value={academicPeriod}
                        onChange={(e) => setAcademicPeriod(e.target.value)}
                        placeholder="e.g. 2026/2027-SEMESTER-1"
                        className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        required
                    />
                </div>
                <div className="flex items-end">
                    <button
                        type="submit"
                        disabled={loading || !studentId || !academicPeriod}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-md text-sm transition"
                    >
                        {loading ? 'Loading...' : 'Load Report Card'}
                    </button>
                </div>
            </form>

            {error && (
                <div className="p-4 bg-rose-950/50 border border-rose-800 rounded-lg text-rose-300 text-sm">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="p-4 bg-emerald-950/50 border border-emerald-800 rounded-lg text-emerald-300 text-sm">
                    {successMessage}
                </div>
            )}

            {reportCard && (
                <div className="space-y-6 bg-slate-800/40 p-6 rounded-xl border border-slate-800">
                    {/* Header info */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-bold text-white">{reportCard.student_id}</h3>
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                                    reportCard.status === 'PUBLISHED' ? 'bg-emerald-900 text-emerald-300 border border-emerald-700' :
                                    reportCard.status === 'FINALIZED' ? 'bg-blue-900 text-blue-300 border border-blue-700' :
                                    reportCard.status === 'CALCULATED' ? 'bg-indigo-900 text-indigo-300 border border-indigo-700' :
                                    reportCard.status === 'INCOMPLETE' ? 'bg-amber-900 text-amber-300 border border-amber-700' :
                                    reportCard.status === 'ARCHIVED' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                                    'bg-slate-800 text-slate-300'
                                }`}>
                                    {reportCard.status}
                                </span>
                                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                                    v{reportCard.version_number}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                Period: <span className="text-slate-200">{reportCard.academic_period}</span> | Checksum: <span className="font-mono text-slate-400">{reportCard.checksum}</span>
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-black text-indigo-400">{reportCard.overall_average}%</div>
                            <div className="text-xs font-semibold text-slate-300">Grade Letter: <span className="text-white font-bold text-sm">{reportCard.overall_grade_letter}</span></div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        {reportCard.status === 'CALCULATED' && (
                            <button
                                onClick={handleFinalize}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-md transition"
                            >
                                Finalize Report Card
                            </button>
                        )}
                        {reportCard.status === 'FINALIZED' && (
                            <button
                                onClick={handlePublish}
                                disabled={loading}
                                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-md transition"
                            >
                                Publish to Student Portal
                            </button>
                        )}
                        {reportCard.status !== 'ARCHIVED' && (
                            <>
                                <button
                                    onClick={() => setShowRevisionModal(true)}
                                    disabled={loading}
                                    className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-md transition"
                                >
                                    Revise Report Card
                                </button>
                                <button
                                    onClick={handleArchive}
                                    disabled={loading}
                                    className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-xs font-bold px-4 py-2 rounded-md transition"
                                >
                                    Archive
                                </button>
                            </>
                        )}
                    </div>

                    {/* Courses matrix */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Enrolled Courses & Final Evaluations</h4>
                        <div className="grid grid-cols-1 gap-4">
                            {reportCard.courses.map((course) => (
                                <div key={course.course_id} className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-xs font-mono text-indigo-400">{course.course_id}</span>
                                            <h5 className="text-base font-bold text-white">{course.subject}</h5>
                                            <p className="text-xs text-slate-400">Teacher: {course.teacher_id}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-bold text-white">{course.final_percentage}%</div>
                                            <div className="text-xs font-semibold">
                                                Grade: <span className="text-indigo-400 font-bold">{course.grade_letter}</span> ({course.passing_status ? <span className="text-emerald-400">PASSED</span> : <span className="text-rose-400">FAILED</span>})
                                            </div>
                                        </div>
                                    </div>

                                    {/* Assessment list */}
                                    <div className="border-t border-slate-800/80 pt-3">
                                        <div className="text-xs font-semibold text-slate-400 mb-2">Assessment Breakdown</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                            {course.assessment_summary.map((a) => (
                                                <div key={a.assessment_id} className="bg-slate-900/80 p-2.5 rounded border border-slate-800 text-xs space-y-1">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-semibold text-slate-200 truncate">{a.assessment_title}</span>
                                                        <span className="text-2xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{a.assessment_type}</span>
                                                    </div>
                                                    <div className="flex justify-between text-slate-400">
                                                        <span>Weight: {a.weight}</span>
                                                        <span>{a.graded ? `${a.percentage}% (${a.grade_letter})` : <span className="text-amber-400 font-semibold">NOT GRADED</span>}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Revision Modal */}
            {showRevisionModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleRevise} className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-4">
                        <h3 className="text-lg font-bold text-white">Revise Academic Report Card</h3>
                        <p className="text-xs text-slate-400">
                            Revising will generate an immutable version v{reportCard ? reportCard.version_number + 1 : 2} and archive the previous version into the audit history.
                        </p>
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                                Revision Reason <span className="text-rose-400">*</span>
                            </label>
                            <textarea
                                value={revisionReason}
                                onChange={(e) => setRevisionReason(e.target.value)}
                                placeholder="Explain why this report card is being revised..."
                                rows={3}
                                className="w-full bg-slate-950 border border-slate-700 rounded-md p-3 text-sm text-white focus:outline-none focus:border-amber-500"
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowRevisionModal(false)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-md transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !revisionReason.trim()}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition"
                            >
                                Confirm Revision
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
