export class ProductionStorageInvariantViolation extends Error {
    constructor(message: string = 'PRODUCTION_STORAGE_INVARIANT_VIOLATION: In-memory storage is disallowed in production runtime.') {
        super(message);
        this.name = 'ProductionStorageInvariantViolation';
        Object.setPrototypeOf(this, ProductionStorageInvariantViolation.prototype);
    }
}

export class DatabaseConfigurationError extends Error {
    constructor(message: string = 'DATABASE_CONFIGURATION_ERROR') {
        super(message);
        this.name = 'DatabaseConfigurationError';
        Object.setPrototypeOf(this, DatabaseConfigurationError.prototype);
    }
}
