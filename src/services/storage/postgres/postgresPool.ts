import { Pool, PoolClient, QueryResult } from 'pg';
import { loadDatabaseConfiguration } from '../storageConfiguration';
import { DatabaseConfigurationError } from '../storageErrors';

let pool: Pool | null = null;

export function getPool(): Pool {
    if (pool) return pool;

    const config = loadDatabaseConfiguration();
    if (!config.DATABASE_URL || config.DATABASE_URL.trim().length === 0) {
        throw new DatabaseConfigurationError('DATABASE_CONFIGURATION_ERROR: Cannot initialize pool without DATABASE_URL.');
    }

    pool = new Pool({
        connectionString: config.DATABASE_URL,
        max: 10, // bounded connection pool size
        connectionTimeoutMillis: 5000, // acquisition timeout
        idleTimeoutMillis: 10000, // idle timeout
        allowExitOnIdle: true
    });

    pool.on('error', (err) => {
        // Log cleanly without credentials
        console.error('DATABASE_POOL_ERROR: Idle client encountered error:', err.message);
    });

    return pool;
}

export async function query(text: string, params?: any[]): Promise<QueryResult<any>> {
    const activePool = getPool();
    return activePool.query(text, params);
}

export async function getClient(): Promise<PoolClient> {
    const activePool = getPool();
    return activePool.connect();
}

export async function shutdownPool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
