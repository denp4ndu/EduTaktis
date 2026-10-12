import React, { useState, useEffect } from 'react';
import { studentLearningDashboardEngine } from '../services/studentLearningDashboardEngine';
import { StudentLearningDashboard } from '../types/curriculum';

export const StudentLearningDashboardComponent: React.FC<{ studentId: string }> = ({ studentId }) => {
    const [dashboard, setDashboard] = useState<StudentLearningDashboard | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        studentLearningDashboardEngine.getDashboard(studentId)
            .then(d => { setDashboard(d); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, [studentId]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div className="text-red-500">Error: {error}</div>;

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold">Personal Dashboard</h1>
            {dashboard && (
                <div>
                    <p>Total Courses: {dashboard.total_courses}</p>
                    <p>Overall Progress: {dashboard.overall_progress}%</p>
                </div>
            )}
        </div>
    );
};
