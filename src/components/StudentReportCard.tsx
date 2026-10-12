import React, { useEffect, useState } from 'react';
import { AcademicReportCard } from '../types/curriculum';
import { academicReportCardEngine } from '../services/academicReportCardEngine';

interface StudentReportCardProps {
    studentId: string;
    academicPeriod?: string;
}

export const StudentReportCard: React.FC<StudentReportCardProps> = ({
    studentId,
    academicPeriod = '2026/2027-SEMESTER-1'
}) => {
    const [reportCard, setReportCard] = useState<AcademicReportCard | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStudentReportCard = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await academicReportCardEngine.getStudentReportCard({
                    authenticated_student_id: studentId,
                    student_id: studentId,
                    academic_period: academicPeriod
                });
                setReportCard(data);
            } catch (err: any) {
                setError(err.message || 'Failed to load report card');
            } finally {
                setLoading(false);
            }
        };

        if (studentId) {
            fetchStudentReportCard();
        }
    }, [studentId, academicPeriod]);

    if (loading) {
        return (
            <div className="p-8 text-center text-slate-400 bg-slate-900 rounded-xl max-w-4xl mx-auto border border-slate-800">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mb-2"></div>
                <p className="text-sm">Loading authoritative academic report card...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 text-sm max-w-4xl mx-auto">
                <h4 className="font-bold text-base mb-1">Access Restricted</h4>
                <p>{error}</p>
            </div>
        );
    }

    if (!reportCard) {
        return (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl max-w-4xl mx-auto text-slate-400">
                <p className="text-sm font-semibold">No report card is currently available for academic period {academicPeriod}.</p>
                <p className="text-xs text-slate-500 mt-1">Report cards are published by your teachers once all required assessments are evaluated.</p>
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-900 text-slate-100 rounded-xl max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <span className="text-2xs uppercase tracking-widest text-indigo-400 font-bold">Official Academic Record</span>
                    <h2 className="text-2xl font-black text-white">Student Academic Report Card</h2>
                    <p className="text-xs text-slate-400">
                        Student: <span className="font-semibold text-white">{reportCard.student_id}</span> | Period: <span className="text-slate-300">{reportCard.academic_period}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                        reportCard.status === 'PUBLISHED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        reportCard.status === 'FINALIZED' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                        'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                        {reportCard.status}
                    </span>
                    <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
                        v{reportCard.version_number}
                    </span>
                </div>
            </div>

            {/* Academic summary card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 p-5 rounded-xl border border-slate-800">
                <div className="border-b sm:border-b-0 sm:border-r border-slate-800 pb-3 sm:pb-0 sm:pr-4">
                    <span className="text-xs text-slate-400 font-medium">Overall Cumulative Average</span>
                    <div className="text-3xl font-black text-indigo-400 mt-1">{reportCard.overall_average}%</div>
                    <span className="text-2xs text-slate-500">Across {reportCard.total_courses} course(s)</span>
                </div>
                <div className="border-b sm:border-b-0 sm:border-r border-slate-800 pb-3 sm:pb-0 sm:pr-4">
                    <span className="text-xs text-slate-400 font-medium">Final Academic Grade</span>
                    <div className="text-3xl font-black text-white mt-1">{reportCard.overall_grade_letter}</div>
                    <span className="text-2xs text-emerald-400 font-semibold">{reportCard.overall_average >= 60 ? 'PASSED SEMESTER' : 'REMEDIAL REQUIRED'}</span>
                </div>
                <div>
                    <span className="text-xs text-slate-400 font-medium">Completion Status</span>
                    <div className="text-base font-bold text-white mt-2">
                        {reportCard.completed_courses} / {reportCard.total_courses} Completed
                    </div>
                    <span className="text-2xs font-mono text-slate-500 block truncate mt-1">
                        Checksum: {reportCard.checksum}
                    </span>
                </div>
            </div>

            {/* Course details list */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Course Evaluations</h3>
                <div className="space-y-3">
                    {reportCard.courses.map((course) => (
                        <div key={course.course_id} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div>
                                    <h4 className="text-base font-bold text-white">{course.subject}</h4>
                                    <p className="text-xs text-slate-400">Course ID: <span className="font-mono text-slate-300">{course.course_id}</span></p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <div className="text-lg font-black text-white">{course.final_percentage}%</div>
                                        <div className="text-2xs text-slate-400">Grade <span className="font-bold text-indigo-400">{course.grade_letter}</span></div>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                                        course.passing_status ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-800' : 'bg-rose-900/60 text-rose-300 border border-rose-800'
                                    }`}>
                                        {course.passing_status ? 'PASS' : 'FAIL'}
                                    </span>
                                </div>
                            </div>

                            {/* Assessment Breakdown */}
                            <div className="border-t border-slate-800 pt-3">
                                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Evaluated Assessments</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {course.assessment_summary.map((a) => (
                                        <div key={a.assessment_id} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80 flex justify-between items-center text-xs">
                                            <div>
                                                <div className="font-semibold text-slate-200">{a.assessment_title}</div>
                                                <div className="text-2xs text-slate-400">Weight: {a.weight} | Type: {a.assessment_type}</div>
                                            </div>
                                            <div className="text-right font-bold text-white">
                                                {a.graded ? `${a.percentage}% (${a.grade_letter})` : <span className="text-amber-400 text-2xs">Pending</span>}
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
    );
};
