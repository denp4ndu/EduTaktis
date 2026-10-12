import React, { useState, useEffect } from 'react';
import { ClassEnrollment } from '../types/curriculum';
import { classEnrollmentEngine } from '../services/classEnrollmentEngine';

interface StudentClassEnrollmentProps {
    studentId: string;
    authenticatedStudentId: string;
}

export const StudentClassEnrollment: React.FC<StudentClassEnrollmentProps> = ({
    studentId,
    authenticatedStudentId
}) => {
    const [enrollments, setEnrollments] = useState<ClassEnrollment[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [actionMsg, setActionMsg] = useState<string | null>(null);

    const loadEnrollments = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await classEnrollmentEngine.getStudentEnrollments(studentId, authenticatedStudentId);
            setEnrollments(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load student enrollments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEnrollments();
    }, [studentId, authenticatedStudentId]);

    const handleWithdraw = async (enrollmentId: string) => {
        try {
            setActionMsg(null);
            await classEnrollmentEngine.updateEnrollmentStatus(
                enrollmentId,
                'WITHDRAWN',
                authenticatedStudentId,
                'STUDENT'
            );
            setActionMsg('You have successfully withdrawn from the course.');
            await loadEnrollments();
        } catch (err: any) {
            setError(err.message || 'Failed to withdraw from course');
        }
    };

    if (loading) {
        return (
            <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-10 bg-slate-100 rounded"></div>
                    <div className="h-10 bg-slate-100 rounded"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
                <h3 className="font-semibold text-lg mb-2">Enrollment Access Error</h3>
                <p className="text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">My Course Enrollments</h2>
                    <p className="text-sm text-slate-500">Student ID: {studentId}</p>
                </div>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-md font-medium text-sm">
                    {enrollments.length} Enrolled {enrollments.length === 1 ? 'Course' : 'Courses'}
                </span>
            </div>

            {actionMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-sm">
                    {actionMsg}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enrollments.length === 0 ? (
                    <div className="col-span-2 py-8 text-center text-slate-400">
                        You are not currently enrolled in any courses.
                    </div>
                ) : (
                    enrollments.map((enr) => (
                        <div key={enr.enrollment_id} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-slate-800">{enr.course_id}</h3>
                                    {enr.class_id && <p className="text-xs text-slate-500">Class: {enr.class_id}</p>}
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    enr.enrollment_status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                                    enr.enrollment_status === 'SUSPENDED' ? 'bg-amber-100 text-amber-800' :
                                    enr.enrollment_status === 'WITHDRAWN' ? 'bg-rose-100 text-rose-800' :
                                    enr.enrollment_status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                                    'bg-slate-100 text-slate-800'
                                }`}>
                                    {enr.enrollment_status}
                                </span>
                            </div>

                            <div className="text-xs text-slate-500 space-y-1">
                                <p>Enrollment ID: <span className="font-mono">{enr.enrollment_id}</span></p>
                                <p>Enrolled Date: {new Date(enr.created_at).toLocaleDateString()}</p>
                                <p>Version: v{enr.version_number}</p>
                            </div>

                            {(enr.enrollment_status === 'ACTIVE' || enr.enrollment_status === 'PENDING' || enr.enrollment_status === 'SUSPENDED') && (
                                <div className="pt-2 border-t border-slate-200">
                                    <button
                                        onClick={() => handleWithdraw(enr.enrollment_id)}
                                        className="w-full py-1.5 text-xs font-medium text-rose-700 bg-white hover:bg-rose-50 rounded border border-rose-200 transition-colors"
                                    >
                                        Withdraw from Course
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
