import { 
    AcademicTranscript, 
    TranscriptHistoryEntry, 
    TranscriptAuditEvent 
} from '../types/curriculum';

export interface AcademicTranscriptStorageProvider {
    saveTranscript(transcript: AcademicTranscript): Promise<void>;
    getTranscript(transcriptId: string): Promise<AcademicTranscript | null>;
    getLatestTranscript(studentId: string, academicYear?: string, semester?: string): Promise<AcademicTranscript | null>;
    listStudentTranscripts(studentId: string): Promise<AcademicTranscript[]>;
    listByAcademicYear(studentId: string, academicYear: string): Promise<AcademicTranscript[]>;
    listBySemester(studentId: string, academicYear: string, semester: string): Promise<AcademicTranscript[]>;
    listAll(): Promise<AcademicTranscript[]>;
    saveHistory(entry: TranscriptHistoryEntry): Promise<void>;
    getHistory(transcriptId: string): Promise<TranscriptHistoryEntry[]>;
    recordAuditEvent(event: TranscriptAuditEvent): Promise<void>;
    getAuditEvents(transcriptId: string): Promise<TranscriptAuditEvent[]>;
    clearAll(): Promise<void>;
}

export class InMemoryAcademicTranscriptStorageProvider implements AcademicTranscriptStorageProvider {
    private transcripts: Map<string, AcademicTranscript> = new Map();
    private history: Map<string, TranscriptHistoryEntry[]> = new Map();
    private auditEvents: TranscriptAuditEvent[] = [];

    async saveTranscript(transcript: AcademicTranscript): Promise<void> {
        this.transcripts.set(transcript.transcript_id, transcript);
    }

    async getTranscript(transcriptId: string): Promise<AcademicTranscript | null> {
        return this.transcripts.get(transcriptId) || null;
    }

    async getLatestTranscript(studentId: string, academicYear?: string, semester?: string): Promise<AcademicTranscript | null> {
        const matches = Array.from(this.transcripts.values()).filter(t => {
            if (t.student_id !== studentId) return false;
            if (academicYear && t.academic_year !== academicYear) return false;
            if (semester && t.semester !== semester) return false;
            return true;
        });

        if (matches.length === 0) return null;
        matches.sort((a, b) => b.version_number - a.version_number);
        return matches[0];
    }

    async listStudentTranscripts(studentId: string): Promise<AcademicTranscript[]> {
        return Array.from(this.transcripts.values()).filter(t => t.student_id === studentId);
    }

    async listByAcademicYear(studentId: string, academicYear: string): Promise<AcademicTranscript[]> {
        return Array.from(this.transcripts.values()).filter(
            t => t.student_id === studentId && t.academic_year === academicYear
        );
    }

    async listBySemester(studentId: string, academicYear: string, semester: string): Promise<AcademicTranscript[]> {
        return Array.from(this.transcripts.values()).filter(
            t => t.student_id === studentId && t.academic_year === academicYear && t.semester === semester
        );
    }

    async listAll(): Promise<AcademicTranscript[]> {
        return Array.from(this.transcripts.values());
    }

    async saveHistory(entry: TranscriptHistoryEntry): Promise<void> {
        const list = this.history.get(entry.transcript_id) || [];
        list.push(entry);
        this.history.set(entry.transcript_id, list);
    }

    async getHistory(transcriptId: string): Promise<TranscriptHistoryEntry[]> {
        return this.history.get(transcriptId) || [];
    }

    async recordAuditEvent(event: TranscriptAuditEvent): Promise<void> {
        this.auditEvents.push(event);
    }

    async getAuditEvents(transcriptId: string): Promise<TranscriptAuditEvent[]> {
        return this.auditEvents.filter(e => e.transcript_id === transcriptId);
    }

    async clearAll(): Promise<void> {
        this.transcripts.clear();
        this.history.clear();
        this.auditEvents = [];
    }
}

export const academicTranscriptStorageProvider = new InMemoryAcademicTranscriptStorageProvider();
