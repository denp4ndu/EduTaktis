import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getPool } from './postgresPool';
import { DatabaseConfigurationError } from '../storageErrors';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export interface MigrationFile {
    version: string;
    filePath: string;
    content: string;
    checksum: string;
}

export function computeSHA256(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
}

export function loadMigrations(): MigrationFile[] {
    const migrationsDir = path.join(__dirname, '../../../../database/migrations');
    if (!fs.existsSync(migrationsDir)) {
        return [];
    }

    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort(); // ensures chronological ordering

    return files.map(file => {
        const filePath = path.join(migrationsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        return {
            version: file.replace('.sql', ''),
            filePath,
            content,
            checksum: computeSHA256(content)
        };
    });
}

export async function runMigrations(): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();

    try {
        // Enforce concurrency safety with serializable transaction and PostgreSQL advisory lock
        await client.query('BEGIN');
        
        // 987654321 is our unique application advisory lock identifier
        await client.query('SELECT pg_advisory_xact_lock(987654321)');

        // Initialize schema_migrations tracking table
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(50) PRIMARY KEY,
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                checksum VARCHAR(64) NOT NULL
            );
        `);

        // Read currently applied migrations
        const { rows: applied } = await client.query('SELECT version, checksum FROM schema_migrations');
        const appliedMap = new Map<string, string>();
        applied.forEach(row => appliedMap.set(row.version, row.checksum));

        const available = loadMigrations();

        for (const migration of available) {
            const existingChecksum = appliedMap.get(migration.version);

            if (existingChecksum !== undefined) {
                // If migration has been applied, verify checksum integrity to detect unauthorized retro edits
                if (existingChecksum !== migration.checksum) {
                    throw new DatabaseConfigurationError(
                        `MIGRATION_INTEGRITY_VIOLATION: Applied migration "${migration.version}" has changed. Current checksum: "${migration.checksum}", Expected: "${existingChecksum}"`
                    );
                }
            } else {
                // Execute new migration
                console.log(`DATABASE_MIGRATION: Applying migration "${migration.version}"...`);
                await client.query(migration.content);

                // Log entry to schema_migrations
                await client.query(
                    'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
                    [migration.version, migration.checksum]
                );
            }
        }

        await client.query('COMMIT');
        console.log('DATABASE_MIGRATION: All migrations verified and running cleanly.');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
