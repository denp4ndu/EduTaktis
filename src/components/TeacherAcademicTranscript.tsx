import React, { useState } from 'react';
import { AcademicTranscript } from '../types/curriculum';
import { academicTranscriptEngine } from '../services/academicTranscriptEngine';
import { academicReportCardRepositoryEngine } from '../services/academicReportCardRepositoryEngine';

interface TeacherAcademicTranscriptProps {
    teacherId: string;
    authorizedCourses?: string[];
    defaultStudentId?: string;
    defaultAcademicYear?: string;
    defaultSemester?: string;
}

export const TeacherAcademicTranscript: React.FC<TeacherAcademicTranscriptProps> = ({
    teacherId,
    authorizedCourses,
    defaultStudentId = '',
    defaultAcademicYear = '2026/2027',
    defaultSemester = 'SEMESTER-1'
}) => {
    const [studentId, setStudentId] = useState<string>(defaultStudentId);
    const [academicYear, setAcademicYear] = useState<string>(defaultAcademicYear);
    const [semester, setSemester] = useState<string>(defaultSemester);

    const [transcript, setTranscript] = useState<AcademicTranscript | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Regenerate modal state
    const [showRegenerateModal, setShowRegenerateModal] = useState<boolean>(false);
    const [revisionReason, setRevisionReason] = useState<string>('');

    const handleLoadTranscript = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!studentId || !academicYear || !semester) return;

        try {
            setLoading(true);
            setError(null);
            setSuccessMessage(null);
            const data = await academicTranscriptEngine.getTeacherTranscript({
                teacher_id: teacherId,
                student_id: studentId,
                academic_year: academicYear,
                semester: semester,
                teacher_authorized_courses: authorizedCourses
            });
            setTranscript(data);
            if (!data) {
                setError(`No transcript record found for student ${studentId} (${academicYear} - ${semester})`);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load transcript');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!transcript) return;
        try {
            setLoading(true);
            setError(null);
            const verified = await academicTranscriptEngine.verifyTranscript({
                transcript_id: transcript.transcript_id,
                actor_id: teacherId,
                actor_role: 'TEACHER'
            });
            setTranscript(verified);
            setSuccessMessage('Transcript officially verified against source report cards.');
        } catch (err: any) {
            setError(err.message || 'Failed to verify transcript');
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!transcript) return;
        try {
            setLoading(true);
            setError(null);
            const published = await academicTranscriptEngine.publishTranscript({
                transcript_id: transcript.transcript_id,
                actor_id: teacherId,
                actor_role: 'TEACHER'
            });
            setTranscript(published);
            setSuccessMessage('Transcript officially published to student portal.');
        } catch (err: any) {
            setError(err.message || 'Failed to publish transcript');
        } finally {
            setLoading(false);
        }
    };

    const handleArchive = async () => {
        if (!transcript) return;
        try {
            setLoading(true);
            setError(null);
            const archived = await academicTranscriptEngine.archiveTranscript({
                transcript_id: transcript.transcript_id,
                actor_id: teacherId,
                actor_role: 'TEACHER'
            });
            setTranscript(archived);
            setSuccessMessage('Transcript successfully archived.');
        } catch (err: any) {
            setError(err.message || 'Failed to archive transcript');
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transcript || !revisionReason.trim()) return;

        try {
            setLoading(true);
            setError(null);

            // Fetch source report cards
            const sourceReportCards = [];
            for (const rcId of transcript.source_report_card_ids) {
                const rc = await academicReportCardRepositoryEngine.getReportCard(rcId);
                if (rc) sourceReportCards.push(rc);
            }

            const regenerated = await academicTranscriptEngine.regenerateTranscript({
                transcript_id: transcript.transcript_id,
                revision_reason: revisionReason,
                source_report_cards: sourceReportCards,
                actor_id: teacherId,
                actor_role: 'TEACHER',
                teacher_authorized_courses: authorizedCourses
            });

            setTranscript(regenerated);
            setShowRegenerateModal(false);
            setRevisionReason('');
            setSuccessMessage(`Transcript regenerated to version v${regenerated.version_number}.`);
        } catch (err: any) {
            setError(err.message || 'Failed to regenerate transcript');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-slate-900 text-slate-100 rounded-xl max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Teacher Academic Transcript Administration</h2>
                    <p className="text-sm text-slate-400">Deterministic multi-semester transcript generation, source verification, and publishing</p>
                </div>
                <div className="text-xs bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700 text-slate-300">
                    Authority: <span className="font-semibold text-emerald-400">Curriculum Context Chain</span>
                </div>
            </div>

            {/* Selection Form */}
            <form onSubmit={handleLoadTranscript} className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Student ID</label>
                    <input
                        type="text"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="e.g. STU-001"
                        className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Academic Year</label>
                    <input
                        type="text"
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        placeholder="e.g. 2026/2027"
                        className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Semester</label>
                    <input
                        type="text"
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                        placeholder="e.g. SEMESTER-1"
                        className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        required
                    />
                </div>
                <div className="flex items-end">
                    <button
                        type="submit"
                        disabled={loading || !studentId}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-md text-sm transition"
                    >
                        {loading ? 'Loading...' : 'Load Transcript'}
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

            {transcript && (
                <div className="space-y-6 bg-slate-800/40 p-6 rounded-xl border border-slate-800">
                    {/* Header info */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-bold text-white">{transcript.student_id}</h3>
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                                    transcript.status === 'PUBLISHED' ? 'bg-emerald-900 text-emerald-300 border border-emerald-700' :
                                    transcript.status === 'VERIFIED' ? 'bg-blue-900 text-blue-300 border border-blue-700' :
                                    transcript.status === 'GENERATED' ? 'bg-indigo-900 text-indigo-300 border border-indigo-700' :
                                    'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}>
                                    {transcript.status}
                                </span>
                                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                                    v{transcript.version_number}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                {transcript.academic_year} ({transcript.semester}) | Checksum: <span className="font-mono text-slate-400">{transcript.checksum}</span>
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-black text-emerald-400">{transcript.cumulative_summary.average_percentage}%</div>
                            <div className="text-xs font-semibold text-slate-300">
                                Grade: <span className="text-white font-bold">{transcript.cumulative_summary.overall_grade_letter}</span> | Passed: <span className="text-emerald-400">{transcript.cumulative_summary.passed_courses}</span>/{transcript.cumulative_summary.total_courses}
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        {transcript.status === 'GENERATED' && (
                            <button
                                onClick={handleVerify}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-md transition"
                            >
                                Verify Source Report Cards
                            </button>
                        )}
                        {(transcript.status === 'VERIFIED' || transcript.status === 'GENERATED') && (
                            <button
                                onClick={handlePublish}
                                disabled={loading}
                                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-md transition"
                            >
                                Publish Transcript
                            </button>
                        )}
                        {transcript.status !== 'ARCHIVED' && (
                            <>
                                <button
                                    onClick={() => setShowRegenerateModal(true)}
                                    disabled={loading}
                                    className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-md transition"
                                >
                                    Regenerate (New Version)
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

                    {/* Courses table */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Course Grade Records</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                                <thead className="bg-slate-900 text-slate-400 uppercase text-2xs border-b border-slate-800">
                                    <tr>
                                        <th className="p-3">Course</th>
                                        <th className="p-3">Subject</th>
                                        <th className="p-3">Teacher</th>
                                        <th className="p-3 text-right">Final %</th>
                                        <th className="p-3 text-center">Grade</th>
                                        <th className="p-3 text-center">Status</th>
                                        <th className="p-3">Source Report Card</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {transcript.courses.map((course) => (
                                        <tr key={course.course_id}>
                                            <td className="p-3 font-mono text-indigo-400">{course.course_id}</td>
                                            <td className="p-3 font-bold text-white">{course.subject_name}</td>
                                            <td className="p-3 text-slate-400">{course.teacher_id}</td>
                                            <td className="p-3 text-right font-bold text-white">{course.final_percentage}%</td>
                                            <td className="p-3 text-center font-bold text-emerald-400">{course.final_grade_letter}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-2xs font-bold ${
                                                    course.passing_status ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                                                }`}>
                                                    {course.passing_status ? 'PASS' : 'FAIL'}
                                                </span>
                                            </td>
                                            <td className="p-3 font-mono text-2xs text-slate-500">
                                                {course.source_report_card_id} (v{course.source_report_card_version})
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Regenerate modal */}
            {showRegenerateModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleRegenerate} className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-4">
                        <h3 className="text-lg font-bold text-white">Regenerate Academic Transcript</h3>
                        <p className="text-xs text-slate-400">
                            Regenerating will create an immutable version v{transcript ? transcript.version_number + 1 : 2} linked to the previous version.
                        </p>
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                                Revision Reason <span className="text-rose-400">*</span>
                            </label>
                            <textarea
                                value={revisionReason}
                                onChange={(e) => setRevisionReason(e.target.value)}
                                placeholder="Explain why the transcript is being regenerated..."
                                rows={3}
                                className="w-full bg-slate-950 border border-slate-700 rounded-md p-3 text-sm text-white focus:outline-none focus:border-amber-500"
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowRegenerateModal(false)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-md transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !revisionReason.trim()}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition"
                            >
                                Confirm Regeneration
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
