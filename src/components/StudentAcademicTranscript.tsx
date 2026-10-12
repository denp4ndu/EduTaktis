import React, { useEffect, useState } from 'react';
import { AcademicTranscript } from '../types/curriculum';
import { academicTranscriptEngine } from '../services/academicTranscriptEngine';

interface StudentAcademicTranscriptProps {
    studentId: string;
    academicYear?: string;
    semester?: string;
}

export const StudentAcademicTranscript: React.FC<StudentAcademicTranscriptProps> = ({
    studentId,
    academicYear = '2026/2027',
    semester = 'SEMESTER-1'
}) => {
    const [transcript, setTranscript] = useState<AcademicTranscript | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedYear, setSelectedYear] = useState<string>(academicYear);
    const [selectedSemester, setSelectedSemester] = useState<string>(semester);

    const fetchTranscript = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await academicTranscriptEngine.getStudentTranscript({
                authenticated_student_id: studentId,
                student_id: studentId,
                academic_year: selectedYear,
                semester: selectedSemester
            });
            setTranscript(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load official academic transcript');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (studentId) {
            fetchTranscript();
        }
    }, [studentId, selectedYear, selectedSemester]);

    return (
        <div className="p-6 bg-slate-900 text-slate-100 rounded-xl max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <span className="text-2xs uppercase tracking-widest text-emerald-400 font-bold">
                        Authoritative Academic Record
                    </span>
                    <h2 className="text-2xl font-black text-white">Official Academic Transcript</h2>
                    <p className="text-xs text-slate-400">
                        Student: <span className="font-semibold text-white">{studentId}</span> | 
                        Authority: <span className="text-slate-300">Official Curriculum Registry</span>
                    </p>
                </div>
                {transcript && (
                    <div className="flex items-center gap-2">
                        <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                            transcript.status === 'PUBLISHED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            transcript.status === 'VERIFIED' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                            transcript.status === 'GENERATED' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                            'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                            {transcript.status}
                        </span>
                        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
                            v{transcript.version_number}
                        </span>
                    </div>
                )}
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Academic Year</label>
                    <input
                        type="text"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        placeholder="e.g. 2026/2027"
                        className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Semester</label>
                    <input
                        type="text"
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        placeholder="e.g. SEMESTER-1"
                        className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                </div>
            </div>

            {loading && (
                <div className="p-8 text-center text-slate-400 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="animate-spin inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mb-2"></div>
                    <p className="text-sm">Loading verified transcript record...</p>
                </div>
            )}

            {error && (
                <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 text-sm">
                    <h4 className="font-bold mb-1">Access Notice</h4>
                    <p>{error}</p>
                </div>
            )}

            {!loading && !error && !transcript && (
                <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-xl text-slate-400">
                    <p className="text-sm font-semibold">No official transcript available for {selectedYear} ({selectedSemester}).</p>
                    <p className="text-xs text-slate-500 mt-1">Transcripts are generated and published from finalized report cards.</p>
                </div>
            )}

            {transcript && (
                <div className="space-y-6">
                    {/* Cumulative Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950 p-5 rounded-xl border border-slate-800">
                        <div className="border-r border-slate-800 pr-3">
                            <span className="text-xs text-slate-400 font-medium">Cumulative Average</span>
                            <div className="text-3xl font-black text-emerald-400 mt-1">
                                {transcript.cumulative_summary.average_percentage}%
                            </div>
                            <span className="text-2xs text-slate-500">Grade Letter: <strong className="text-white">{transcript.cumulative_summary.overall_grade_letter}</strong></span>
                        </div>
                        <div className="border-r border-slate-800 pr-3">
                            <span className="text-xs text-slate-400 font-medium">Courses Completed</span>
                            <div className="text-2xl font-black text-white mt-1">
                                {transcript.cumulative_summary.completed_courses} / {transcript.cumulative_summary.total_courses}
                            </div>
                            <span className="text-2xs text-slate-500">
                                {transcript.cumulative_summary.incomplete_courses} Incomplete
                            </span>
                        </div>
                        <div className="border-r border-slate-800 pr-3">
                            <span className="text-xs text-slate-400 font-medium">Pass / Fail</span>
                            <div className="text-2xl font-black text-white mt-1">
                                <span className="text-emerald-400">{transcript.cumulative_summary.passed_courses}</span> / <span className="text-rose-400">{transcript.cumulative_summary.failed_courses}</span>
                            </div>
                            <span className="text-2xs text-slate-500">Passing Rate: {Math.round((transcript.cumulative_summary.passed_courses / Math.max(1, transcript.cumulative_summary.total_courses)) * 100)}%</span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 font-medium">Verification</span>
                            <div className="text-xs font-semibold text-slate-200 mt-2">
                                {transcript.verified_at ? 'Officially Verified' : 'Pending Verification'}
                            </div>
                            <span className="text-2xs font-mono text-slate-500 block truncate mt-1">
                                {transcript.checksum}
                            </span>
                        </div>
                    </div>

                    {/* Course list */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Completed Academic Course Units</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider text-2xs border-b border-slate-800">
                                    <tr>
                                        <th className="p-3">Course Code</th>
                                        <th className="p-3">Subject Name</th>
                                        <th className="p-3">Teacher</th>
                                        <th className="p-3 text-right">Score</th>
                                        <th className="p-3 text-center">Grade</th>
                                        <th className="p-3 text-center">Status</th>
                                        <th className="p-3">Source Report Card</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {transcript.courses.map((course) => (
                                        <tr key={course.course_id} className="hover:bg-slate-900/50 transition">
                                            <td className="p-3 font-mono text-indigo-400 font-medium">{course.course_id}</td>
                                            <td className="p-3 font-semibold text-white">{course.subject_name}</td>
                                            <td className="p-3 text-slate-400">{course.teacher_id}</td>
                                            <td className="p-3 text-right font-bold text-white">{course.final_percentage}%</td>
                                            <td className="p-3 text-center font-bold text-indigo-400">{course.final_grade_letter}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-2xs font-bold ${
                                                    course.passing_status ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                                                }`}>
                                                    {course.passing_status ? 'PASSED' : 'FAILED'}
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
        </div>
    );
};
