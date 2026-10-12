import { DatabaseConfigurationError } from './storageErrors';

export type AppEnvironment = 'test' | 'development' | 'staging' | 'production';

export function resolveEnvironment(): AppEnvironment {
    const env = (process.env.NODE_ENV || 'development').trim().toLowerCase();
    
    if (env === 'test' || env === 'development' || env === 'staging' || env === 'production') {
        return env as AppEnvironment;
    }
    
    throw new DatabaseConfigurationError(`UNKNOWN_ENVIRONMENT_ERROR: Environment "${env}" is not recognized.`);
}
