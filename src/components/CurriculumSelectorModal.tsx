import React, { useState, useMemo } from 'react';
import {
  EducationAuthorityId,
  InstitutionTypeId,
  PedagogicalFrameworkId,
  CurriculumSelection,
  ValidationResult,
  EducationalContentArtifact,
  PersistedArtifact,
} from '../types/curriculum';
import { AUTHORITIES, INSTITUTIONS } from '../data/curriculumMaster';
import {
  getPhaseFromGrade,
  getAvailableSubjects,
  validateSelection,
} from '../services/curriculumEngine';
import { buildAIPromptContext, formatSystemPrompt } from '../services/aiPromptEngine';
import {
  generateEducationalContent,
  AIGenerationState,
  AIGenerationResult,
  AIGenerationError,
} from '../services/aiGenerationEngine';
import { structureAIContent } from '../services/aiEducationalStructuringEngine';
import { persistenceEngine } from '../services/aiEducationalArtifactPersistenceEngine';

interface CurriculumSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CurriculumSelectorModal: React.FC<CurriculumSelectorModalProps> = ({ isOpen, onClose }) => {
  const [authorityId, setAuthorityId] = useState<EducationAuthorityId>('AUTH-PEND');
  const [institutionId, setInstitutionId] = useState<InstitutionTypeId>('SMP');
  const [grade, setGrade] = useState<number>(7);
  const [subjectId, setSubjectId] = useState<string>('SUBJ-IPA');
  const [pedagogicalContext, setPedagogicalContext] = useState<PedagogicalFrameworkId>('NONE');

  // AI State
  const [activeTab, setActiveTab] = useState<'RAW' | 'STRUCTURED'>('RAW');
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [generationState, setGenerationState] = useState<AIGenerationState>('idle');
  const [generationResult, setGenerationResult] = useState<AIGenerationResult | null>(null);
  const [structuredArtifact, setStructuredArtifact] = useState<EducationalContentArtifact | null>(null);
  const [persistedArtifact, setPersistedArtifact] = useState<PersistedArtifact | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedResult, setCopiedResult] = useState(false);

  const availableInstitutions = useMemo(() => INSTITUTIONS.filter((inst) => inst.authorityId === authorityId), [authorityId]);

  const handleAuthorityChange = (newAuth: EducationAuthorityId) => {
    setAuthorityId(newAuth);
    const firstInst = INSTITUTIONS.find((i) => i.authorityId === newAuth);
    if (firstInst) {
      setInstitutionId(firstInst.id);
      setGrade(firstInst.allowedGrades[0]);
    }
    setPedagogicalContext('NONE');
    setGenerationResult(null);
    setStructuredArtifact(null);
    setErrorMessage(null);
  };

  const handleInstitutionChange = (newInstId: InstitutionTypeId) => {
    setInstitutionId(newInstId);
    const inst = INSTITUTIONS.find((i) => i.id === newInstId);
    if (inst) setGrade(inst.allowedGrades[0]);
    setPedagogicalContext('NONE');
    setGenerationResult(null);
    setStructuredArtifact(null);
    setErrorMessage(null);
  };

  const computedPhase = useMemo(() => { try { return getPhaseFromGrade(institutionId, grade); } catch { return 'A'; } }, [institutionId, grade]);
  const availableSubjects = useMemo(() => getAvailableSubjects({ authorityId, institutionId, grade }), [authorityId, institutionId, grade]);
  const currentSelection: CurriculumSelection = useMemo(() => ({ authorityId, institutionId, grade, subjectId, pedagogicalContext }), [authorityId, institutionId, grade, subjectId, pedagogicalContext]);
  const validation: ValidationResult = useMemo(() => validateSelection(currentSelection), [currentSelection]);
  const generatedContext = useMemo(() => { if (!validation.isValid) return null; try { return formatSystemPrompt(buildAIPromptContext(currentSelection)); } catch { return null; } }, [validation, currentSelection]);

  const handleCopyPrompt = () => { if (generatedContext) { navigator.clipboard.writeText(generatedContext); setCopiedPrompt(true); setTimeout(() => setCopiedPrompt(false), 2000); } };
  const handleCopyResult = () => { if (generationResult?.text) { navigator.clipboard.writeText(generationResult.text); setCopiedResult(true); setTimeout(() => setCopiedResult(false), 2000); } };

  const handleGenerate = async () => {
    if (!validation.isValid) return;
    setGenerationState('generating');
    setErrorMessage(null);
    setStructuredArtifact(null);
    try {
      const result = await generateEducationalContent(currentSelection, userPrompt);
      setGenerationResult(result);
      setGenerationState('success');
      const structuring = structureAIContent(result.context, result.text);
      setStructuredArtifact(structuring.artifact);
    } catch (err: any) {
      setGenerationState('error');
      setErrorMessage(err instanceof AIGenerationError ? `[${err.code}] ${err.message}` : (err?.message || 'Error processing AI content.'));
    }
  };

  const handleSave = async () => {
    if (!structuredArtifact) return;
    try {
        const saved = await persistenceEngine.saveArtifact(structuredArtifact, persistedArtifact?.metadata.artifactId);
        setPersistedArtifact(saved);
        alert('Artifact saved!');
    } catch (e: any) { alert(`Save failed: ${e.message}`); }
  };

  if (!isOpen) return null;
  // ... (JSX render)
  // ... (Add button in JSX)
  <button onClick={handleSave} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white">💾 Simpan</button>

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-100 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 bg-slate-900 text-white shrink-0">
          <h3 className="font-bold text-lg font-heading">Curriculum Intelligence & AI Generation Engine</h3>
          <p className="text-xs text-slate-300">Generator Konten & Modul Ajar Resmi</p>
        </div>
        <div className="p-6 space-y-5 text-sm overflow-y-auto grow">
          {/* ... (Selection inputs - simplified for brevity) ... */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Instruksi Khusus Guru (Opsional)</label>
            <textarea value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)} rows={3} className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none resize-none" />
          </div>

          {generationResult && (
            <div className="space-y-3 pt-2">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button className={`flex-1 text-xs py-1.5 rounded-md font-bold ${activeTab === 'RAW' ? 'bg-white shadow' : 'text-slate-500'}`} onClick={() => setActiveTab('RAW')}>Hasil AI (Raw)</button>
                <button className={`flex-1 text-xs py-1.5 rounded-md font-bold ${activeTab === 'STRUCTURED' ? 'bg-white shadow' : 'text-slate-500'}`} onClick={() => setActiveTab('STRUCTURED')}>Struktur Pedagogis</button>
              </div>

              {activeTab === 'RAW' && (
                <div className="p-4 bg-slate-50 text-slate-800 rounded-xl border border-slate-200 text-xs leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap font-sans">
                  {generationResult.text}
                </div>
              )}
              {activeTab === 'STRUCTURED' && structuredArtifact && (
                <div className="p-4 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 text-xs leading-relaxed max-h-72 overflow-y-auto font-sans space-y-2">
                  <h4 className="font-bold text-sm">{structuredArtifact.title || 'Tanpa Judul'}</h4>
                  <p><strong>Tujuan:</strong> {structuredArtifact.learning_objectives.join(', ')}</p>
                  <p><strong>Langkah:</strong> {structuredArtifact.learning_steps.join(' -> ')}</p>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
           <button onClick={onClose} className="px-4 py-2 text-slate-600 text-xs font-bold">Tutup</button>
           {structuredArtifact && <button onClick={handleSave} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white">💾 Simpan</button>}
           <button disabled={!validation.isValid || generationState === 'generating'} onClick={handleGenerate} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white disabled:opacity-50">
             {generationState === 'generating' ? 'Memproses...' : '✨ Generate'}
           </button>
        </div>
      </div>
    </div>
  );
};
