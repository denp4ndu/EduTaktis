import React, { useState, useEffect } from 'react';
import { classMonitoringEngine } from '../services/classMonitoringEngine';
import { ClassProgressSummary } from '../types/curriculum';

export const TeacherLearningMonitoring: React.FC<{ teacherId: string, courseId: string, publicationId: string }> = ({ teacherId, courseId, publicationId }) => {
    const [summary, setSummary] = useState<ClassProgressSummary | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        classMonitoringEngine.getClassProgress(teacherId, courseId, publicationId)
            .then(setSummary)
            .catch(e => setError(e.message));
    }, [teacherId, courseId, publicationId]);

    return (
        <div className="p-4">
            {error && <p className="text-red-500">Error: {error}</p>}
            {summary && (
                <div>
                    <h1 className="text-2xl font-bold">Class Monitoring</h1>
                    <p>Total Students: {summary.total_students}</p>
                    <p>Average Progress: {summary.average_progress.toFixed(1)}%</p>
                    <p>Completion Rate: {summary.completion_rate.toFixed(1)}%</p>
                </div>
            )}
        </div>
    );
};
