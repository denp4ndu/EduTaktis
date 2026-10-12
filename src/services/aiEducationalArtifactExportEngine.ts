import { EducationalContentArtifact } from '../types/curriculum';
import { repositoryEngine } from './aiEducationalArtifactRepositoryEngine';
import { validateEducationalArtifact } from './aiEducationalArtifactValidationEngine';
import { deepFreeze } from './aiPromptEngine';

export type ExportFormat = 'clipboard' | 'markdown' | 'html' | 'json';
export type ExportErrorType = 
    | 'INVALID_ARTIFACT' 
    | 'ARTIFACT_NOT_FOUND' 
    | 'ARTIFACT_VALIDATION_FAILED' 
    | 'UNSUPPORTED_EXPORT_FORMAT' 
    | 'EXPORT_GENERATION_FAILED' 
    | 'CLIPBOARD_WRITE_FAILED';

export class ExportError extends Error {
    constructor(public code: ExportErrorType, message: string) {
        super(message);
        this.name = 'ExportError';
    }
}

export class ExportEngine {
    async exportEducationalArtifact(artifactId: string, format: ExportFormat): Promise<string> {
        // 1. Fetch from Repository
        const persisted = await repositoryEngine.getLatestArtifact(artifactId);
        if (!persisted) throw new ExportError('ARTIFACT_NOT_FOUND', 'Artifact not found');

        // 2. Validation Gate
        const validation = validateEducationalArtifact(persisted.artifact, persisted.artifact.curriculum_context);
        if (!validation.isValid) throw new ExportError('ARTIFACT_VALIDATION_FAILED', 'Artifact failed validation');
        
        const artifact = deepFreeze(validation.artifact!);

        // 3. Format Generation
        switch (format) {
            case 'json':
                return JSON.stringify(this.sanitizeArtifact(artifact), null, 2);
            case 'markdown':
                return this.generateMarkdown(artifact);
            case 'html':
                return this.generateHTML(artifact);
            case 'clipboard':
                return this.generateMarkdown(artifact); // Clipboard uses markdown format
            default:
                throw new ExportError('UNSUPPORTED_EXPORT_FORMAT', 'Unsupported format');
        }
    }

    public sanitizeArtifact(artifact: EducationalContentArtifact): any {
        const { curriculum_context, ...rest } = artifact;
        const sanitized = {
            ...rest,
            curriculum_context: {
                authority: curriculum_context.authority,
                institution: curriculum_context.institution,
                grade: curriculum_context.grade,
                phase: curriculum_context.phase,
                subject_id: curriculum_context.subject_id,
                curriculum: curriculum_context.curriculum,
                pedagogical_context: curriculum_context.pedagogical_context,
                cp_verification_status: curriculum_context.cp_verification_status,
            }
        };

        // Handle CP safety
        if (sanitized.curriculum_context.cp_verification_status === 'PENDING_SOURCE') {
            sanitized.learning_objectives = sanitized.learning_objectives.map(obj => 
                obj.replace(/CP resmi/i, "CP resmi belum tersedia dalam master data terverifikasi.")
            );
        }
        
        return sanitized;
    }

    private generateMarkdown(artifact: EducationalContentArtifact): string {
        const data = this.sanitizeArtifact(artifact);
        return `# ${data.title}
## Metadata
- Mata Pelajaran: ${data.curriculum_context.subject_id}
- Institusi: ${data.curriculum_context.institution}
- Kelas: ${data.curriculum_context.grade}
- Fase: ${data.curriculum_context.phase}
- Kurikulum: ${data.curriculum_context.curriculum}

## Tujuan Pembelajaran
${data.learning_objectives.map((o: string) => `- ${o}`).join('\n')}

## Aktivitas Pembelajaran
${data.learning_activities.map((a: string) => `- ${a}`).join('\n')}

## Assessment
${data.assessment}
`;
    }

    private generateHTML(artifact: EducationalContentArtifact): string {
        const md = this.generateMarkdown(artifact);
        return `<div>${md.replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/- (.*$)/gim, '<li>$1</li>')
            .replace(/\n/g, '<br/>')}</div>`;
    }
}

export const exportEngine = new ExportEngine();
