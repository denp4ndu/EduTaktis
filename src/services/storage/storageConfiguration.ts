import { DatabaseConfigurationError } from './storageErrors';
import { resolveEnvironment } from './storageEnvironment';

export interface DatabaseConfiguration {
    DATABASE_URL: string;
}

export function loadDatabaseConfiguration(): DatabaseConfiguration {
    const env = resolveEnvironment();
    
    // In production or staging, DATABASE_URL must exist
    if (env === 'production' || env === 'staging') {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl || dbUrl.trim().length === 0) {
            throw new DatabaseConfigurationError('DATABASE_CONFIGURATION_ERROR: DATABASE_URL is missing or empty in production/staging environment.');
        }
        return { DATABASE_URL: dbUrl.trim() };
    }
    
    // In dev/test, fallback cleanly or return empty
    return { DATABASE_URL: process.env.DATABASE_URL || '' };
}

export function getDiagnosticInfo(): { environment: string; storageMode: string } {
    const env = resolveEnvironment();
    const mode = (env === 'production' || env === 'staging') ? 'postgres' : 'memory';
    return {
        environment: env,
        storageMode: mode
    };
}
