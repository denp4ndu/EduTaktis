import React from 'react';
import { teacherSubmissionReviewEngine } from '../services/teacherSubmissionReviewEngine';

export const TeacherSubmissionReview: React.FC<{ teacherId: string, submissionId: string }> = ({ teacherId, submissionId }) => {
    const handleAccept = async () => {
        await teacherSubmissionReviewEngine.provideFeedback(submissionId, teacherId, {
            feedback_text: 'Well done!',
            score: 100,
            reviewer_id: teacherId,
            reviewed_at: new Date().toISOString(),
            review_status: 'ACCEPTED'
        });
    };

    return (
        <div className="p-4">
            <h1>Review Submission: {submissionId}</h1>
            <button className="bg-green-500 text-white p-2" onClick={handleAccept}>Accept</button>
        </div>
    );
};
