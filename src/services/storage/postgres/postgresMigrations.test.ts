import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runMigrations, computeSHA256, loadMigrations } from './postgresMigrations';
import { getDiagnosticInfo } from '../storageConfiguration';
import { checkPostgresHealth } from './postgresHealth';
import { DatabaseConfigurationError } from '../storageErrors';
import { createAuthenticationStorageProvider } from '../storageFactory';
import { shutdownPool } from './postgresPool';

// Mock pg pool and client queries
const mockQuery = vi.fn();
const mockRelease = vi.fn();
const mockConnect = vi.fn().mockResolvedValue({
    query: mockQuery,
    release: mockRelease
});

vi.mock('pg', () => {
    return {
        Pool: vi.fn().mockImplementation(function() {
            return {
                connect: mockConnect,
                query: mockQuery,
                on: vi.fn(),
                end: vi.fn()
            };
        })
    };
});

describe('Postgres Migrations and Health Diagnostics Engine', () => {
    let originalEnv: string | undefined;
    let originalDbUrl: string | undefined;

    beforeEach(async () => {
        vi.clearAllMocks();
        originalEnv = process.env.NODE_ENV;
        originalDbUrl = process.env.DATABASE_URL;
        process.env.NODE_ENV = 'test';
        process.env.DATABASE_URL = 'postgresql://test_user:test_password@localhost:5432/test_db';
        await shutdownPool();
        
        mockConnect.mockResolvedValue({
            query: mockQuery,
            release: mockRelease
        });
    });

    afterEach(async () => {
        process.env.NODE_ENV = originalEnv;
        process.env.DATABASE_URL = originalDbUrl;
        await shutdownPool();
        vi.restoreAllMocks();
    });

    it('1. Successful migrations applied', async () => {
        mockQuery.mockImplementation(async (text: string) => {
            if (text.includes('SELECT version, checksum FROM schema_migrations')) {
                return { rows: [] };
            }
            return { rows: [] };
        });

        await runMigrations();

        expect(mockConnect).toHaveBeenCalled();
        expect(mockQuery).toHaveBeenCalledWith('BEGIN');
        expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_migrations'));
        expect(mockQuery).toHaveBeenCalledWith('COMMIT');
        expect(mockRelease).toHaveBeenCalled();
    });

    it('2. Mismatch in existing migration checksum throws DatabaseConfigurationError and ROLLBACK', async () => {
        mockQuery.mockImplementation(async (text: string) => {
            if (text.includes('SELECT version, checksum FROM schema_migrations')) {
                return {
                    rows: [
                        { version: '0001_initial_schema', checksum: 'invalid_sha256_hash_here' }
                    ]
                };
            }
            return { rows: [] };
        });

        await expect(runMigrations()).rejects.toThrow(DatabaseConfigurationError);
        expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
    });

    it('3. Successful migrations do not re-apply existing migrations', async () => {
        const available = loadMigrations();
        
        mockQuery.mockImplementation(async (text: string) => {
            if (text.includes('SELECT version, checksum FROM schema_migrations')) {
                // Return matched checksums
                return {
                    rows: available.map(m => ({ version: m.version, checksum: m.checksum }))
                };
            }
            return { rows: [] };
        });

        await runMigrations();
        // Insert should not be called since all migrations match
        expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO schema_migrations'));
    });

    it('4. Failed migration executes ROLLBACK and releases client', async () => {
        mockQuery.mockImplementation(async (text: string) => {
            if (text.includes('SELECT version, checksum FROM schema_migrations')) {
                throw new Error('MOCK_SQL_ERROR');
            }
            return { rows: [] };
        });

        await expect(runMigrations()).rejects.toThrow('MOCK_SQL_ERROR');
        expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
        expect(mockRelease).toHaveBeenCalled();
    });

    it('5. Database health status returns DOWN if unreachable', async () => {
        mockConnect.mockRejectedValueOnce(new Error('CONN_TIMEOUT'));
        const health = await checkPostgresHealth();
        expect(health.status).toBe('DOWN');
        expect(health.reachable).toBe(false);
        expect(health.error).toContain('DATABASE_UNAVAILABLE');
    });

    it('6. Database health status returns DOWN if schema_migrations table is missing', async () => {
        mockQuery.mockImplementation(async (text: string) => {
            if (text.includes('SELECT 1')) return { rows: [] };
            if (text.includes('information_schema.tables')) return { rows: [{ count: '0' }] };
            return { rows: [] };
        });

        const health = await checkPostgresHealth();
        expect(health.status).toBe('DOWN');
        expect(health.reachable).toBe(true);
        expect(health.migrationsSynced).toBe(false);
        expect(health.error).toContain('MIGRATION_INCOMPLETE');
    });

    it('7. Production memory storage fallback remains strictly prohibited', async () => {
        process.env.NODE_ENV = 'production';
        delete process.env.DATABASE_URL;
        await shutdownPool();
        expect(() => createAuthenticationStorageProvider()).toThrow(DatabaseConfigurationError);
    });

    it('8. SHA-256 compute behaves deterministically', () => {
        const hash1 = computeSHA256('test_sql_statement');
        const hash2 = computeSHA256('test_sql_statement');
        expect(hash1).toBe(hash2);
        expect(hash1).toHaveLength(64);
    });
});

describe('Diagnostic Security Redaction Boundary', () => {
    it('9. Never exposes database credentials in diagnostic profiles', () => {
        process.env.NODE_ENV = 'production';
        process.env.DATABASE_URL = 'postgresql://my_postgres_user:sensitive_pazzword@db.host:5432/primary_db';
        const diag = getDiagnosticInfo();
        expect(diag.environment).toBe('production');
        expect(diag.storageMode).toBe('postgres');
        const serialized = JSON.stringify(diag);
        expect(serialized).not.toContain('sensitive_pazzword');
        expect(serialized).not.toContain('my_postgres_user');
    });
});
