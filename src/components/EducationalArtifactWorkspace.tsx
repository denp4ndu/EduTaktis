import React, { useState, useEffect } from 'react';
import { authoringEngine } from '../services/aiEducationalArtifactAuthoringEngine';
import { repositoryEngine } from '../services/aiEducationalArtifactRepositoryEngine';
import { diffEngine } from '../services/aiEducationalArtifactDiffEngine';
import { approvalEngine } from '../services/aiEducationalArtifactApprovalEngine';
import { EducationalContentArtifact, PersistedArtifact, EducationalArtifactDiff, ApprovalMetadata } from '../types/curriculum';

interface WorkspaceProps {
  artifactId: string;
  onClose: () => void;
}

export const EducationalArtifactWorkspace: React.FC<WorkspaceProps> = ({ artifactId, onClose }) => {
  const [draft, setDraft] = useState<EducationalContentArtifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<PersistedArtifact[]>([]);
  const [diff, setDiff] = useState<EducationalArtifactDiff | null>(null);
  const [vA, setVA] = useState<number>(1);
  const [vB, setVB] = useState<number>(2);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalMetadata | null>(null);

  useEffect(() => {
    authoringEngine.createDraftFromArtifact(artifactId).then(d => {
      setDraft(d);
      setLoading(false);
    });
    repositoryEngine.searchArtifacts({ artifactId }).then(h => {
        setHistory(h.sort((a,b) => b.metadata.versionNumber - a.metadata.versionNumber));
    });
    approvalEngine.getApprovalStatus(artifactId).then(setApprovalStatus);
  }, [artifactId]);

  const handleApprovalAction = async (action: 'submit' | 'approve' | 'release') => {
      try {
          if (action === 'submit') await approvalEngine.submitForReview(artifactId);
          if (action === 'approve') await approvalEngine.approveArtifact(artifactId);
          if (action === 'release') await approvalEngine.releaseArtifact(artifactId);
          setApprovalStatus(await approvalEngine.getApprovalStatus(artifactId));
      } catch (e) { alert('Action failed'); }
  };

  const handleUpdate = (changes: Partial<EducationalContentArtifact>) => {
    setDraft(authoringEngine.updateDraft(changes));
  };

  const handleCommit = async () => {
    try {
      if (!authoringEngine.validateDraft()) {
          alert('Draft invalid!');
          return;
      }
      await authoringEngine.commitDraft();
      alert('Committed!');
      onClose();
    } catch (e) { alert('Commit failed'); }
  };

  const handleCompare = async () => {
    try {
        const d = await diffEngine.compareArtifactVersions(artifactId, vA, vB);
        setDiff(d);
    } catch(e) { alert('Diff failed'); }
  };

  if (loading) return <div>Loading...</div>;
  if (!draft) return <div>Error</div>;

  return (
    <div className="fixed inset-0 z-50 bg-white p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Authoring: {draft.title}</h2>
        <div className="flex gap-2">
            <button onClick={handleCommit} className="bg-emerald-600 text-white px-4 py-2 rounded">Commit New Version</button>
            <button onClick={() => handleApprovalAction('submit')} className="bg-sky-600 text-white px-4 py-2 rounded">Submit for Review</button>
            <button onClick={() => handleApprovalAction('approve')} className="bg-green-600 text-white px-4 py-2 rounded">Approve</button>
            <button onClick={() => handleApprovalAction('release')} className="bg-purple-600 text-white px-4 py-2 rounded">Release</button>
            <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded">Close</button>
        </div>
      </div>
      <p className="mb-4">Status: {approvalStatus?.status || 'draft'}</p>
      
      <div className="mb-8 p-4 border rounded">
        <h3 className="font-bold mb-2">Version Comparison</h3>
        <select onChange={e => setVA(Number(e.target.value))} value={vA}>
            {history.map(h => <option key={h.metadata.versionNumber} value={h.metadata.versionNumber}>V{h.metadata.versionNumber}</option>)}
        </select>
        <select onChange={e => setVB(Number(e.target.value))} value={vB}>
            {history.map(h => <option key={h.metadata.versionNumber} value={h.metadata.versionNumber}>V{h.metadata.versionNumber}</option>)}
        </select>
        <button onClick={handleCompare} className="bg-blue-600 text-white px-4 py-2 rounded ml-2">Compare</button>
      </div>

      {diff && (
          <div className="p-4 border rounded bg-slate-50">
              <h3 className="font-bold">Diff Result (Status: {diff.status})</h3>
              {diff.status === 'BLOCKED' && <p className="text-red-600 font-bold">SECURITY VIOLATION - TRUSTED METADATA CHANGED</p>}
              <p>Changed Fields: {diff.summary.changedFields}</p>
          </div>
      )}

      <label className="block font-semibold">Title (Editable):</label>
      <input type="text" value={draft.title ?? ''} onChange={(e) => handleUpdate({ title: e.target.value })} className="w-full text-2xl font-bold border-b mb-4 outline-none" />
      <label className="block font-semibold">Learning Objectives (Editable):</label>
      <textarea value={draft.learning_objectives.join('\n')} onChange={(e) => handleUpdate({ learning_objectives: e.target.value.split('\n') })} className="w-full border p-2 h-32 mb-4" />
      
      <div className="bg-slate-100 p-4 rounded mt-6">
        <h3 className="font-bold">Trusted Metadata (Locked):</h3>
        <p>Authority: {draft.curriculum_context.authority}</p>
        <p>Institution: {draft.curriculum_context.institution}</p>
      </div>
    </div>
  );
};
