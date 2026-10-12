import React, { useState, useEffect } from 'react';
import { learningSessionEngine } from '../services/learningSessionEngine';
import { studentProgressEngine } from '../services/studentProgressEngine';
import { PublishedLearningContent } from '../types/curriculum';
import { deliveryEngine } from '../services/aiEducationalArtifactDeliveryEngine';

export const LearningSessionWorkspace: React.FC<{ studentId: string, publicationId: string }> = ({ studentId, publicationId }) => {
    const [content, setContent] = useState<PublishedLearningContent | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        deliveryEngine.getPublishedContent(publicationId).then(setContent).catch(e => setError(e.message));
        learningSessionEngine.startSession(studentId, publicationId).then(s => setSessionId(s.session_id)).catch(e => setError(e.message));
    }, [studentId, publicationId]);

    const handleProgress = async (activityId: string, percent: number) => {
        if (!sessionId) return;
        try {
            await studentProgressEngine.updateActivityProgress(studentId, sessionId, activityId, percent);
        } catch (e: any) {
            setError(e.message);
        }
    };

    return (
        <div className="p-4">
            {error && <p className="text-red-500">Error: {error}</p>}
            {content && (
                <div>
                    <h1 className="text-xl font-bold">{content.title}</h1>
                    <div className="mt-4">
                        <h2 className="font-semibold">Activities</h2>
                        <ul>
                            {content.learning_activities.map(a => (
                                <li key={a} className="flex gap-2">
                                    {a}
                                    <button onClick={() => handleProgress(a, 50)}>Progress 50%</button>
                                    <button onClick={() => handleProgress(a, 100)}>Complete</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};
