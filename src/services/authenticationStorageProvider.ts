import { UserAccount, PasswordCredential, AccountSecurityState } from '../types/curriculum';

export interface AuthenticationStorageProvider {
    saveUserAccount(account: UserAccount): Promise<void>;
    getUserAccount(user_id: string): Promise<UserAccount | null>;
    getUserAccountByUsername(username: string): Promise<UserAccount | null>;
    getUserAccountByEmail(email: string): Promise<UserAccount | null>;
    listUserAccounts(): Promise<UserAccount[]>;

    saveCredential(credential: PasswordCredential): Promise<void>;
    getCredential(user_id: string): Promise<PasswordCredential | null>;

    saveSecurityState(state: AccountSecurityState): Promise<void>;
    getSecurityState(user_id: string): Promise<AccountSecurityState | null>;

    clear(): Promise<void>;
}

export class InMemoryAuthenticationStorageProvider implements AuthenticationStorageProvider {
    private accounts: Map<string, UserAccount> = new Map();
    private credentials: Map<string, PasswordCredential> = new Map();
    private securityStates: Map<string, AccountSecurityState> = new Map();

    private deepCopy<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
    }

    async saveUserAccount(account: UserAccount): Promise<void> {
        this.accounts.set(account.user_id, this.deepCopy(account));
    }

    async getUserAccount(user_id: string): Promise<UserAccount | null> {
        const item = this.accounts.get(user_id);
        return item ? this.deepCopy(item) : null;
    }

    async getUserAccountByUsername(username: string): Promise<UserAccount | null> {
        const lower = username.toLowerCase().trim();
        for (const acc of this.accounts.values()) {
            if (acc.username.toLowerCase().trim() === lower) {
                return this.deepCopy(acc);
            }
        }
        return null;
    }

    async getUserAccountByEmail(email: string): Promise<UserAccount | null> {
        const lower = email.toLowerCase().trim();
        for (const acc of this.accounts.values()) {
            if (acc.email.toLowerCase().trim() === lower) {
                return this.deepCopy(acc);
            }
        }
        return null;
    }

    async listUserAccounts(): Promise<UserAccount[]> {
        return Array.from(this.accounts.values()).map(a => this.deepCopy(a));
    }

    async saveCredential(credential: PasswordCredential): Promise<void> {
        this.credentials.set(credential.user_id, this.deepCopy(credential));
    }

    async getCredential(user_id: string): Promise<PasswordCredential | null> {
        const item = this.credentials.get(user_id);
        return item ? this.deepCopy(item) : null;
    }

    async saveSecurityState(state: AccountSecurityState): Promise<void> {
        this.securityStates.set(state.user_id, this.deepCopy(state));
    }

    async getSecurityState(user_id: string): Promise<AccountSecurityState | null> {
        const item = this.securityStates.get(user_id);
        return item ? this.deepCopy(item) : null;
    }

    async clear(): Promise<void> {
        this.accounts.clear();
        this.credentials.clear();
        this.securityStates.clear();
    }
}

export const authenticationStorageProvider = new InMemoryAuthenticationStorageProvider();
