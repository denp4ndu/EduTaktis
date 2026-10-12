import { getClient } from './postgresPool';
import { PoolClient } from 'pg';

export async function executeInTransaction<T>(
    operation: (client: PoolClient) => Promise<T>
): Promise<T> {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const result = await operation(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('DATABASE_TRANSACTION_ROLLBACK_FAILED:', rollbackErr);
        }
        throw err;
    } finally {
        client.release();
    }
}
