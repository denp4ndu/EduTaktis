import { Guardian, GuardianStudentRelationship, GuardianAuditEvent } from '../types/curriculum';

export interface GuardianStorageProvider {
    saveGuardian(guardian: Guardian): Promise<void>;
    getGuardian(guardian_id: string): Promise<Guardian | null>;
    listGuardians(): Promise<Guardian[]>;
    saveRelationship(relationship: GuardianStudentRelationship): Promise<void>;
    getRelationship(relationship_id: string): Promise<GuardianStudentRelationship | null>;
    listRelationships(filter?: { guardian_id?: string; student_id?: string }): Promise<GuardianStudentRelationship[]>;
    saveAuditEvent(event: GuardianAuditEvent): Promise<void>;
    listAuditEvents(filter?: { entity_id?: string; actor_id?: string }): Promise<GuardianAuditEvent[]>;
    clear(): Promise<void>;
}

export class InMemoryGuardianStorageProvider implements GuardianStorageProvider {
    private guardians: Map<string, Guardian> = new Map();
    private relationships: Map<string, GuardianStudentRelationship> = new Map();
    private auditEvents: GuardianAuditEvent[] = [];

    async saveGuardian(guardian: Guardian): Promise<void> {
        this.guardians.set(guardian.guardian_id, JSON.parse(JSON.stringify(guardian)));
    }

    async getGuardian(guardian_id: string): Promise<Guardian | null> {
        const item = this.guardians.get(guardian_id);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }

    async listGuardians(): Promise<Guardian[]> {
        return Array.from(this.guardians.values()).map(g => JSON.parse(JSON.stringify(g)));
    }

    async saveRelationship(relationship: GuardianStudentRelationship): Promise<void> {
        this.relationships.set(relationship.relationship_id, JSON.parse(JSON.stringify(relationship)));
    }

    async getRelationship(relationship_id: string): Promise<GuardianStudentRelationship | null> {
        const item = this.relationships.get(relationship_id);
        return item ? JSON.parse(JSON.stringify(item)) : null;
    }

    async listRelationships(filter?: { guardian_id?: string; student_id?: string }): Promise<GuardianStudentRelationship[]> {
        let results = Array.from(this.relationships.values());
        if (filter?.guardian_id) {
            results = results.filter(r => r.guardian_id === filter.guardian_id);
        }
        if (filter?.student_id) {
            results = results.filter(r => r.student_id === filter.student_id);
        }
        return results.map(r => JSON.parse(JSON.stringify(r)));
    }

    async saveAuditEvent(event: GuardianAuditEvent): Promise<void> {
        this.auditEvents.push(JSON.parse(JSON.stringify(event)));
    }

    async listAuditEvents(filter?: { entity_id?: string; actor_id?: string }): Promise<GuardianAuditEvent[]> {
        let results = [...this.auditEvents];
        if (filter?.entity_id) {
            results = results.filter(e => e.entity_id === filter.entity_id);
        }
        if (filter?.actor_id) {
            results = results.filter(e => e.actor_id === filter.actor_id);
        }
        return results.map(e => JSON.parse(JSON.stringify(e)));
    }

    async clear(): Promise<void> {
        this.guardians.clear();
        this.relationships.clear();
        this.auditEvents = [];
    }
}

export const guardianStorageProvider = new InMemoryGuardianStorageProvider();
