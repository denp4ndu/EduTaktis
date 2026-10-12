import React, { useState } from 'react';
import { studentActivitySubmissionEngine } from '../services/studentActivitySubmissionEngine';

export const StudentActivityWorkspace: React.FC<{ studentId: string, publicationId: string, activityId: string }> = ({ studentId, publicationId, activityId }) => {
    const [text, setText] = useState('');
    const [status, setStatus] = useState<string>('IDLE');

    const handleSaveDraft = async () => {
        try {
            await studentActivitySubmissionEngine.createDraft(studentId, publicationId, activityId, { text, attachments: [] });
            setStatus('DRAFT_SAVED');
        } catch (e) {
            setStatus('ERROR');
        }
    };

    return (
        <div className="p-4">
            <h1>Activity Workspace: {activityId}</h1>
            <textarea className="border w-full p-2" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="bg-blue-500 text-white p-2" onClick={handleSaveDraft}>Save Draft</button>
            <p>Status: {status}</p>
        </div>
    );
};
