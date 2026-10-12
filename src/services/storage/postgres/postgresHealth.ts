import { query } from './postgresPool';
import { loadMigrations } from './postgresMigrations';

export interface PostgresHealthResult {
    status: 'UP' | 'DOWN';
    reachable: boolean;
    migrationsSynced: boolean;
    error?: string;
}

export async function checkPostgresHealth(): Promise<PostgresHealthResult> {
    try {
        // Differentiate reachable status using standard SELECT 1
        await query('SELECT 1');

        // Check if tracking table exists and matches migration counts
        const { rows } = await query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_name = 'schema_migrations'
        `);

        if (parseInt(rows[0].count, 10) === 0) {
            return {
                status: 'DOWN',
                reachable: true,
                migrationsSynced: false,
                error: 'MIGRATION_INCOMPLETE: Tracking table schema_migrations does not exist.'
            };
        }

        const { rows: migrations } = await query('SELECT COUNT(*) as count FROM schema_migrations');
        const appliedCount = parseInt(migrations[0].count, 10);
        const availableCount = loadMigrations().length;

        if (appliedCount < availableCount) {
            return {
                status: 'DOWN',
                reachable: true,
                migrationsSynced: false,
                error: `MIGRATION_INCOMPLETE: Applied ${appliedCount} out of ${availableCount} migrations.`
            };
        }

        return {
            status: 'UP',
            reachable: true,
            migrationsSynced: true
        };
    } catch (err: any) {
        return {
            status: 'DOWN',
            reachable: false,
            migrationsSynced: false,
            error: 'DATABASE_UNAVAILABLE: Connection timed out or server refused connection.'
        };
    }
}
