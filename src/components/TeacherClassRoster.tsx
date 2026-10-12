import React, { useState, useEffect } from 'react';
import { StudentRoster, EnrollmentStatus } from '../types/curriculum';
import { classEnrollmentEngine } from '../services/classEnrollmentEngine';

interface TeacherClassRosterProps {
    courseId: string;
    teacherId: string;
    authorizedCourses: string[];
    classId?: string;
}

export const TeacherClassRoster: React.FC<TeacherClassRosterProps> = ({
    courseId,
    teacherId,
    authorizedCourses,
    classId
}) => {
    const [roster, setRoster] = useState<StudentRoster | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [newStudentId, setNewStudentId] = useState<string>('');
    const [actionMsg, setActionMsg] = useState<string | null>(null);

    const loadRoster = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await classEnrollmentEngine.getTeacherRoster(courseId, teacherId, authorizedCourses, classId);
            setRoster(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load class roster');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRoster();
    }, [courseId, teacherId, classId]);

    const handleEnrollStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStudentId.trim()) return;

        try {
            setActionMsg(null);
            await classEnrollmentEngine.createEnrollment({
                student_id: newStudentId.trim(),
                course_id: courseId,
                class_id: classId,
                initial_status: 'ACTIVE',
                actor_id: teacherId,
                actor_role: 'TEACHER',
                teacher_authorized_courses: authorizedCourses
            });
            setNewStudentId('');
            setActionMsg(`Student ${newStudentId} enrolled successfully.`);
            await loadRoster();
        } catch (err: any) {
            setError(err.message || 'Failed to enroll student');
        }
    };

    const handleUpdateStatus = async (enrollmentId: string, targetStatus: EnrollmentStatus) => {
        try {
            setActionMsg(null);
            await classEnrollmentEngine.updateEnrollmentStatus(
                enrollmentId,
                targetStatus,
                teacherId,
                'TEACHER',
                authorizedCourses
            );
            setActionMsg(`Enrollment ${enrollmentId} updated to ${targetStatus}.`);
            await loadRoster();
        } catch (err: any) {
            setError(err.message || 'Failed to update enrollment status');
        }
    };

    if (loading) {
        return (
            <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                    <div className="space-y-2">
                        <div className="h-10 bg-slate-100 rounded"></div>
                        <div className="h-10 bg-slate-100 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
                <h3 className="font-semibold text-lg mb-2">Scope or Authorization Error</h3>
                <p className="text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Class Student Roster</h2>
                    <p className="text-sm text-slate-500">Course ID: {courseId} {classId && `| Class: ${classId}`}</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md font-medium">
                        Total: {roster?.total_enrolled || 0}
                    </span>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-md font-medium">
                        Active: {roster?.active_students || 0}
                    </span>
                </div>
            </div>

            {actionMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-sm">
                    {actionMsg}
                </div>
            )}

            <form onSubmit={handleEnrollStudent} className="flex gap-2">
                <input
                    type="text"
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    placeholder="Enter Student ID (e.g. STU-001)"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                    Enroll Student
                </button>
            </form>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                            <th className="pb-3 font-semibold">Student ID</th>
                            <th className="pb-3 font-semibold">Enrollment ID</th>
                            <th className="pb-3 font-semibold">Status</th>
                            <th className="pb-3 font-semibold">Enrolled At</th>
                            <th className="pb-3 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {roster?.entries.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-400">
                                    No students enrolled in this course yet.
                                </td>
                            </tr>
                        ) : (
                            roster?.entries.map((entry) => (
                                <tr key={entry.enrollment_id} className="hover:bg-slate-50">
                                    <td className="py-3 font-medium text-slate-800">{entry.student_id}</td>
                                    <td className="py-3 font-mono text-xs text-slate-500">{entry.enrollment_id}</td>
                                    <td className="py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                            entry.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                                            entry.status === 'SUSPENDED' ? 'bg-amber-100 text-amber-800' :
                                            entry.status === 'WITHDRAWN' ? 'bg-rose-100 text-rose-800' :
                                            entry.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                                            'bg-slate-100 text-slate-800'
                                        }`}>
                                            {entry.status}
                                        </span>
                                    </td>
                                    <td className="py-3 text-xs text-slate-500">{new Date(entry.enrolled_at).toLocaleDateString()}</td>
                                    <td className="py-3 text-right space-x-2">
                                        {entry.status === 'ACTIVE' && (
                                            <>
                                                <button
                                                    onClick={() => handleUpdateStatus(entry.enrollment_id, 'SUSPENDED')}
                                                    className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200"
                                                >
                                                    Suspend
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(entry.enrollment_id, 'COMPLETED')}
                                                    className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200"
                                                >
                                                    Complete
                                                </button>
                                            </>
                                        )}
                                        {entry.status === 'SUSPENDED' && (
                                            <button
                                                onClick={() => handleUpdateStatus(entry.enrollment_id, 'ACTIVE')}
                                                className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200"
                                            >
                                                Reactivate
                                            </button>
                                        )}
                                        {(entry.status === 'PENDING' || entry.status === 'ACTIVE' || entry.status === 'SUSPENDED') && (
                                            <button
                                                onClick={() => handleUpdateStatus(entry.enrollment_id, 'WITHDRAWN')}
                                                className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200"
                                            >
                                                Withdraw
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
