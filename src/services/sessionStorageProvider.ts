import { UserSession } from '../types/curriculum';

export interface SessionStorageProvider {
    saveSession(session: UserSession): Promise<void>;
    getSession(session_id: string): Promise<UserSession | null>;
    listSessionsByUser(user_id: string): Promise<UserSession[]>;
    listAllSessions(): Promise<UserSession[]>;
    clear(): Promise<void>;
}

export class InMemorySessionStorageProvider implements SessionStorageProvider {
    private sessions: Map<string, UserSession> = new Map();

    private deepCopy<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
    }

    async saveSession(session: UserSession): Promise<void> {
        this.sessions.set(session.session_id, this.deepCopy(session));
    }

    async getSession(session_id: string): Promise<UserSession | null> {
        const item = this.sessions.get(session_id);
        return item ? this.deepCopy(item) : null;
    }

    async listSessionsByUser(user_id: string): Promise<UserSession[]> {
        const results: UserSession[] = [];
        for (const session of this.sessions.values()) {
            if (session.user_id === user_id) {
                results.push(this.deepCopy(session));
            }
        }
        return results;
    }

    async listAllSessions(): Promise<UserSession[]> {
        return Array.from(this.sessions.values()).map(s => this.deepCopy(s));
    }

    async clear(): Promise<void> {
        this.sessions.clear();
    }
}

export const sessionStorageProvider = new InMemorySessionStorageProvider();
