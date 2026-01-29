/**
 * Warden Error Classes
 * 
 * Structured error types for better error handling and debugging.
 */

export class WardenError extends Error {
    public readonly code: string;
    public readonly timestamp: Date;
    public readonly recoverable: boolean;

    constructor(message: string, code: string, recoverable = false) {
        super(message);
        this.name = 'WardenError';
        this.code = code;
        this.timestamp = new Date();
        this.recoverable = recoverable;
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            timestamp: this.timestamp.toISOString(),
            recoverable: this.recoverable,
        };
    }
}

/**
 * Errors related to security scanning
 */
export class ScanError extends WardenError {
    public readonly scanner: string;
    public readonly details?: string;

    constructor(message: string, scanner: string, details?: string, recoverable = true) {
        super(message, 'SCAN_ERROR', recoverable);
        this.name = 'ScanError';
        this.scanner = scanner;
        this.details = details;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            scanner: this.scanner,
            details: this.details,
        };
    }
}

/**
 * Errors related to applying fixes
 */
export class FixError extends WardenError {
    public readonly vulnerabilityId: string;
    public readonly packageName: string;
    public readonly attemptedFix?: string;

    constructor(
        message: string,
        vulnerabilityId: string,
        packageName: string,
        attemptedFix?: string,
        recoverable = true
    ) {
        super(message, 'FIX_ERROR', recoverable);
        this.name = 'FixError';
        this.vulnerabilityId = vulnerabilityId;
        this.packageName = packageName;
        this.attemptedFix = attemptedFix;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            vulnerabilityId: this.vulnerabilityId,
            packageName: this.packageName,
            attemptedFix: this.attemptedFix,
        };
    }
}

/**
 * Errors related to GitHub PR operations
 */
export class PRError extends WardenError {
    public readonly branch: string;
    public readonly httpStatus?: number;
    public readonly rateLimited: boolean;

    constructor(
        message: string,
        branch: string,
        httpStatus?: number,
        rateLimited = false
    ) {
        super(message, 'PR_ERROR', !rateLimited);
        this.name = 'PRError';
        this.branch = branch;
        this.httpStatus = httpStatus;
        this.rateLimited = rateLimited;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            branch: this.branch,
            httpStatus: this.httpStatus,
            rateLimited: this.rateLimited,
        };
    }
}

/**
 * Errors related to configuration
 */
export class ConfigError extends WardenError {
    public readonly configPath?: string;
    public readonly invalidField?: string;

    constructor(message: string, configPath?: string, invalidField?: string) {
        super(message, 'CONFIG_ERROR', true);
        this.name = 'ConfigError';
        this.configPath = configPath;
        this.invalidField = invalidField;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            configPath: this.configPath,
            invalidField: this.invalidField,
        };
    }
}

/**
 * Errors related to validation
 */
export class ValidationError extends WardenError {
    public readonly field: string;
    public readonly expectedType?: string;
    public readonly receivedValue?: unknown;

    constructor(
        message: string,
        field: string,
        expectedType?: string,
        receivedValue?: unknown
    ) {
        super(message, 'VALIDATION_ERROR', true);
        this.name = 'ValidationError';
        this.field = field;
        this.expectedType = expectedType;
        this.receivedValue = receivedValue;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            field: this.field,
            expectedType: this.expectedType,
            receivedValue: this.receivedValue,
        };
    }
}
