import { 
    AcademicReportCard, 
    ReportCardHistoryEntry, 
    ReportCardAuditEvent 
} from '../types/curriculum';

export interface AcademicReportCardStorageProvider {
    saveReportCard(reportCard: AcademicReportCard): Promise<void>;
    getReportCard(reportCardId: string): Promise<AcademicReportCard | null>;
    getLatestByStudent(studentId: string, academicPeriod: string): Promise<AcademicReportCard | null>;
    listByStudent(studentId: string): Promise<AcademicReportCard[]>;
    listAll(): Promise<AcademicReportCard[]>;
    saveHistory(entry: ReportCardHistoryEntry): Promise<void>;
    getHistory(reportCardId: string): Promise<ReportCardHistoryEntry[]>;
    recordAuditEvent(event: ReportCardAuditEvent): Promise<void>;
    getAuditEvents(reportCardId: string): Promise<ReportCardAuditEvent[]>;
    clearAll(): Promise<void>;
}

export class InMemoryAcademicReportCardStorageProvider implements AcademicReportCardStorageProvider {
    private reportCards: Map<string, AcademicReportCard> = new Map();
    private history: Map<string, ReportCardHistoryEntry[]> = new Map();
    private auditEvents: ReportCardAuditEvent[] = [];

    async saveReportCard(reportCard: AcademicReportCard): Promise<void> {
        this.reportCards.set(reportCard.report_card_id, reportCard);
    }

    async getReportCard(reportCardId: string): Promise<AcademicReportCard | null> {
        return this.reportCards.get(reportCardId) || null;
    }

    async getLatestByStudent(studentId: string, academicPeriod: string): Promise<AcademicReportCard | null> {
        const cards = Array.from(this.reportCards.values()).filter(
            c => c.student_id === studentId && c.academic_period === academicPeriod
        );
        if (cards.length === 0) return null;
        // Sort descending by version number
        cards.sort((a, b) => b.version_number - a.version_number);
        return cards[0];
    }

    async listByStudent(studentId: string): Promise<AcademicReportCard[]> {
        return Array.from(this.reportCards.values()).filter(c => c.student_id === studentId);
    }

    async listAll(): Promise<AcademicReportCard[]> {
        return Array.from(this.reportCards.values());
    }

    async saveHistory(entry: ReportCardHistoryEntry): Promise<void> {
        const list = this.history.get(entry.report_card_id) || [];
        list.push(entry);
        this.history.set(entry.report_card_id, list);
    }

    async getHistory(reportCardId: string): Promise<ReportCardHistoryEntry[]> {
        return this.history.get(reportCardId) || [];
    }

    async recordAuditEvent(event: ReportCardAuditEvent): Promise<void> {
        this.auditEvents.push(event);
    }

    async getAuditEvents(reportCardId: string): Promise<ReportCardAuditEvent[]> {
        return this.auditEvents.filter(e => e.report_card_id === reportCardId);
    }

    async clearAll(): Promise<void> {
        this.reportCards.clear();
        this.history.clear();
        this.auditEvents = [];
    }
}

export const academicReportCardStorageProvider = new InMemoryAcademicReportCardStorageProvider();
