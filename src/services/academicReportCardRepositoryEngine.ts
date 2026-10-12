import { 
    AcademicReportCard, 
    ReportCardHistoryEntry, 
    ReportCardAuditEvent 
} from '../types/curriculum';
import { 
    academicReportCardStorageProvider, 
    AcademicReportCardStorageProvider 
} from './academicReportCardStorageProvider';
import { 
    academicReportCardValidationEngine, 
    AcademicReportCardValidationEngine 
} from './academicReportCardValidationEngine';
import { deepFreeze } from './aiPromptEngine';

export class AcademicReportCardRepositoryEngine {
    constructor(
        private storage: AcademicReportCardStorageProvider = academicReportCardStorageProvider,
        private validator: AcademicReportCardValidationEngine = academicReportCardValidationEngine
    ) {}

    async saveReportCard(reportCard: AcademicReportCard): Promise<AcademicReportCard> {
        this.validator.validateSecurity(reportCard);
        this.validator.validateStructure(reportCard);

        const frozen = deepFreeze(JSON.parse(JSON.stringify(reportCard))) as AcademicReportCard;
        await this.storage.saveReportCard(frozen);
        return frozen;
    }

    async getReportCard(reportCardId: string): Promise<AcademicReportCard | null> {
        const card = await this.storage.getReportCard(reportCardId);
        if (!card) return null;
        return deepFreeze(JSON.parse(JSON.stringify(card))) as AcademicReportCard;
    }

    async getLatestByStudent(studentId: string, academicPeriod: string): Promise<AcademicReportCard | null> {
        const card = await this.storage.getLatestByStudent(studentId, academicPeriod);
        if (!card) return null;
        return deepFreeze(JSON.parse(JSON.stringify(card))) as AcademicReportCard;
    }

    async listByStudent(studentId: string): Promise<AcademicReportCard[]> {
        const cards = await this.storage.listByStudent(studentId);
        return deepFreeze(JSON.parse(JSON.stringify(cards))) as AcademicReportCard[];
    }

    async listAll(): Promise<AcademicReportCard[]> {
        const cards = await this.storage.listAll();
        return deepFreeze(JSON.parse(JSON.stringify(cards))) as AcademicReportCard[];
    }

    async recordHistory(entry: ReportCardHistoryEntry): Promise<ReportCardHistoryEntry> {
        this.validator.validateSecurity(entry);
        const frozen = deepFreeze(JSON.parse(JSON.stringify(entry))) as ReportCardHistoryEntry;
        await this.storage.saveHistory(frozen);
        return frozen;
    }

    async getHistory(reportCardId: string): Promise<ReportCardHistoryEntry[]> {
        const history = await this.storage.getHistory(reportCardId);
        return deepFreeze(JSON.parse(JSON.stringify(history))) as ReportCardHistoryEntry[];
    }

    async recordAuditEvent(event: ReportCardAuditEvent): Promise<ReportCardAuditEvent> {
        this.validator.validateSecurity(event);
        const frozen = deepFreeze(JSON.parse(JSON.stringify(event))) as ReportCardAuditEvent;
        await this.storage.recordAuditEvent(frozen);
        return frozen;
    }

    async getAuditEvents(reportCardId: string): Promise<ReportCardAuditEvent[]> {
        const events = await this.storage.getAuditEvents(reportCardId);
        return deepFreeze(JSON.parse(JSON.stringify(events))) as ReportCardAuditEvent[];
    }

    async clearAll(): Promise<void> {
        await this.storage.clearAll();
    }
}

export const academicReportCardRepositoryEngine = new AcademicReportCardRepositoryEngine();
