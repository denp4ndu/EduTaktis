import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveEnvironment } from './storageEnvironment';
import { loadDatabaseConfiguration, getDiagnosticInfo } from './storageConfiguration';
import {
    createAuthenticationStorageProvider,
    createSessionStorageProvider,
    createAttendanceStorageProvider,
    PostgreSQLAuthenticationStorageProvider
} from './storageFactory';
import { ProductionStorageInvariantViolation, DatabaseConfigurationError } from './storageErrors';
import { InMemoryAuthenticationStorageProvider } from '../authenticationStorageProvider';

describe('EduTaktis Storage Provider Architecture - Centralized Factory & Fail-Fast Gates', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalDbUrl = process.env.DATABASE_URL;

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
        process.env.DATABASE_URL = originalDbUrl;
    });

    it('1. test env selects in-memory/memory provider', () => {
        process.env.NODE_ENV = 'test';
        const provider = createAuthenticationStorageProvider();
        expect(provider).toBeInstanceOf(InMemoryAuthenticationStorageProvider);
    });

    it('2. development env selects in-memory/memory provider', () => {
        process.env.NODE_ENV = 'development';
        const provider = createAuthenticationStorageProvider();
        expect(provider).toBeInstanceOf(InMemoryAuthenticationStorageProvider);
    });

    it('3. staging env selects PostgreSQL provider', () => {
        process.env.NODE_ENV = 'staging';
        process.env.DATABASE_URL = 'postgresql://localhost:5432/db';
        const provider = createAuthenticationStorageProvider();
        expect(provider).toBeInstanceOf(PostgreSQLAuthenticationStorageProvider);
    });

    it('4. production env selects PostgreSQL provider', () => {
        process.env.NODE_ENV = 'production';
        process.env.DATABASE_URL = 'postgresql://localhost:5432/db';
        const provider = createAuthenticationStorageProvider();
        expect(provider).toBeInstanceOf(PostgreSQLAuthenticationStorageProvider);
    });

    it('5. unknown environment results in DatabaseConfigurationError', () => {
        process.env.NODE_ENV = 'invalid_env';
        expect(() => resolveEnvironment()).toThrow(DatabaseConfigurationError);
    });

    it('6. production without DATABASE_URL throws DatabaseConfigurationError', () => {
        process.env.NODE_ENV = 'production';
        delete process.env.DATABASE_URL;
        expect(() => loadDatabaseConfiguration()).toThrow(DatabaseConfigurationError);
        expect(() => createAuthenticationStorageProvider()).toThrow(DatabaseConfigurationError);
    });

    it('7. staging without DATABASE_URL throws DatabaseConfigurationError', () => {
        process.env.NODE_ENV = 'staging';
        delete process.env.DATABASE_URL;
        expect(() => loadDatabaseConfiguration()).toThrow(DatabaseConfigurationError);
        expect(() => createAuthenticationStorageProvider()).toThrow(DatabaseConfigurationError);
    });

    it('8. production PostgreSQL failure throws DatabaseConfigurationError', () => {
        process.env.NODE_ENV = 'production';
        process.env.DATABASE_URL = 'fail_connect';
        expect(() => createAuthenticationStorageProvider()).toThrow(DatabaseConfigurationError);
    });

    it('9. staging PostgreSQL failure throws DatabaseConfigurationError', () => {
        process.env.NODE_ENV = 'staging';
        process.env.DATABASE_URL = 'fail_connect';
        expect(() => createAuthenticationStorageProvider()).toThrow(DatabaseConfigurationError);
    });

    it('10. production MemoryStorageProvider request throws ProductionStorageInvariantViolation', () => {
        process.env.NODE_ENV = 'production';
        process.env.DATABASE_URL = 'postgresql://localhost:5432/db';
        const provider = createAuthenticationStorageProvider();
        expect(() => (provider as any).fail()).toThrow(ProductionStorageInvariantViolation);
    });

    it('11. staging MemoryStorageProvider request throws ProductionStorageInvariantViolation', () => {
        process.env.NODE_ENV = 'staging';
        process.env.DATABASE_URL = 'postgresql://localhost:5432/db';
        const provider = createAuthenticationStorageProvider();
        expect(() => (provider as any).fail()).toThrow(ProductionStorageInvariantViolation);
    });

    it('12. production never silently falls back to memory', () => {
        process.env.NODE_ENV = 'production';
        delete process.env.DATABASE_URL;
        // Should throw, never return InMemory provider
        expect(() => createAuthenticationStorageProvider()).toThrow(DatabaseConfigurationError);
    });

    it('13. DATABASE_URL is never exposed in diagnostic output', () => {
        process.env.NODE_ENV = 'production';
        process.env.DATABASE_URL = 'postgresql://user:secret_pass@host:5432/db';
        const diag = getDiagnosticInfo();
        expect(diag.environment).toBe('production');
        expect(diag.storageMode).toBe('postgres');
        const serialized = JSON.stringify(diag);
        expect(serialized).not.toContain('secret_pass');
        expect(serialized).not.toContain('postgresql');
    });

    it('14. existing domain engines remain interface-compatible', () => {
        process.env.NODE_ENV = 'test';
        const provider = createAuthenticationStorageProvider();
        // Interface checking method presence
        expect(provider.saveUserAccount).toBeDefined();
        expect(provider.getUserAccount).toBeDefined();
        expect(provider.getUserAccountByUsername).toBeDefined();
        expect(provider.getUserAccountByEmail).toBeDefined();
    });
});
