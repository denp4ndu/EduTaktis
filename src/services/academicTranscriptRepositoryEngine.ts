import { 
    AcademicTranscript, 
    TranscriptHistoryEntry, 
    TranscriptAuditEvent 
} from '../types/curriculum';
import { 
    academicTranscriptStorageProvider, 
    AcademicTranscriptStorageProvider 
} from './academicTranscriptStorageProvider';
import { 
    academicTranscriptValidationEngine, 
    AcademicTranscriptValidationEngine 
} from './academicTranscriptValidationEngine';
import { deepFreeze } from './aiPromptEngine';

export class AcademicTranscriptRepositoryEngine {
    constructor(
        private storage: AcademicTranscriptStorageProvider = academicTranscriptStorageProvider,
        private validator: AcademicTranscriptValidationEngine = academicTranscriptValidationEngine
    ) {}

    async saveTranscript(transcript: AcademicTranscript): Promise<AcademicTranscript> {
        this.validator.validateSecurity(transcript);
        this.validator.validateStructure(transcript);

        const frozen = deepFreeze(JSON.parse(JSON.stringify(transcript))) as AcademicTranscript;
        await this.storage.saveTranscript(frozen);
        return frozen;
    }

    async getTranscript(transcriptId: string): Promise<AcademicTranscript | null> {
        const transcript = await this.storage.getTranscript(transcriptId);
        if (!transcript) return null;
        return deepFreeze(JSON.parse(JSON.stringify(transcript))) as AcademicTranscript;
    }

    async getLatestTranscript(studentId: string, academicYear?: string, semester?: string): Promise<AcademicTranscript | null> {
        const transcript = await this.storage.getLatestTranscript(studentId, academicYear, semester);
        if (!transcript) return null;
        return deepFreeze(JSON.parse(JSON.stringify(transcript))) as AcademicTranscript;
    }

    async listStudentTranscripts(studentId: string): Promise<AcademicTranscript[]> {
        const transcripts = await this.storage.listStudentTranscripts(studentId);
        return deepFreeze(JSON.parse(JSON.stringify(transcripts))) as AcademicTranscript[];
    }

    async listByAcademicYear(studentId: string, academicYear: string): Promise<AcademicTranscript[]> {
        const transcripts = await this.storage.listByAcademicYear(studentId, academicYear);
        return deepFreeze(JSON.parse(JSON.stringify(transcripts))) as AcademicTranscript[];
    }

    async listBySemester(studentId: string, academicYear: string, semester: string): Promise<AcademicTranscript[]> {
        const transcripts = await this.storage.listBySemester(studentId, academicYear, semester);
        return deepFreeze(JSON.parse(JSON.stringify(transcripts))) as AcademicTranscript[];
    }

    async listAll(): Promise<AcademicTranscript[]> {
        const transcripts = await this.storage.listAll();
        return deepFreeze(JSON.parse(JSON.stringify(transcripts))) as AcademicTranscript[];
    }

    async recordHistory(entry: TranscriptHistoryEntry): Promise<TranscriptHistoryEntry> {
        this.validator.validateSecurity(entry);
        const frozen = deepFreeze(JSON.parse(JSON.stringify(entry))) as TranscriptHistoryEntry;
        await this.storage.saveHistory(frozen);
        return frozen;
    }

    async getHistory(transcriptId: string): Promise<TranscriptHistoryEntry[]> {
        const history = await this.storage.getHistory(transcriptId);
        return deepFreeze(JSON.parse(JSON.stringify(history))) as TranscriptHistoryEntry[];
    }

    async recordAuditEvent(event: TranscriptAuditEvent): Promise<TranscriptAuditEvent> {
        this.validator.validateSecurity(event);
        const frozen = deepFreeze(JSON.parse(JSON.stringify(event))) as TranscriptAuditEvent;
        await this.storage.recordAuditEvent(frozen);
        return frozen;
    }

    async getAuditEvents(transcriptId: string): Promise<TranscriptAuditEvent[]> {
        const events = await this.storage.getAuditEvents(transcriptId);
        return deepFreeze(JSON.parse(JSON.stringify(events))) as TranscriptAuditEvent[];
    }

    async clearAll(): Promise<void> {
        await this.storage.clearAll();
    }
}

export const academicTranscriptRepositoryEngine = new AcademicTranscriptRepositoryEngine();
