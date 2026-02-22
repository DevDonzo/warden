import {
    WardenError,
    ScanError,
    FixError,
    PRError,
    ConfigError,
    ValidationError,
} from '../src/errors';

describe('Error Types', () => {
    describe('WardenError', () => {
        it('should create a base error with code and timestamp', () => {
            const error = new WardenError('Test error', 'TEST_CODE', true);

            expect(error.name).toBe('WardenError');
            expect(error.message).toBe('Test error');
            expect(error.code).toBe('TEST_CODE');
            expect(error.recoverable).toBe(true);
            expect(error.timestamp).toBeInstanceOf(Date);
        });

        it('should serialize to JSON', () => {
            const error = new WardenError('Test', 'CODE', false);
            const json = error.toJSON();

            expect(json).toHaveProperty('name', 'WardenError');
            expect(json).toHaveProperty('code', 'CODE');
            expect(json).toHaveProperty('message', 'Test');
            expect(json).toHaveProperty('timestamp');
            expect(json).toHaveProperty('recoverable', false);
        });
    });

    describe('ScanError', () => {
        it('should include scanner information', () => {
            const error = new ScanError('Scan failed', 'snyk', 'API timeout');

            expect(error.name).toBe('ScanError');
            expect(error.code).toBe('SCAN_ERROR');
            expect(error.scanner).toBe('snyk');
            expect(error.details).toBe('API timeout');
        });

        it('should be recoverable by default', () => {
            const error = new ScanError('Scan failed', 'npm-audit');
            expect(error.recoverable).toBe(true);
        });
    });

    describe('FixError', () => {
        it('should include vulnerability and package info', () => {
            const error = new FixError(
                'Fix failed',
                'CVE-2021-1234',
                'lodash',
                'npm update lodash@4.17.21'
            );

            expect(error.name).toBe('FixError');
            expect(error.code).toBe('FIX_ERROR');
            expect(error.vulnerabilityId).toBe('CVE-2021-1234');
            expect(error.packageName).toBe('lodash');
            expect(error.attemptedFix).toBe('npm update lodash@4.17.21');
        });
    });

    describe('PRError', () => {
        it('should include branch and HTTP status', () => {
            const error = new PRError('PR creation failed', 'warden/fix-lodash', 422);

            expect(error.name).toBe('PRError');
            expect(error.code).toBe('PR_ERROR');
            expect(error.branch).toBe('warden/fix-lodash');
            expect(error.httpStatus).toBe(422);
        });

        it('should handle rate limiting', () => {
            const error = new PRError('Rate limited', 'warden/fix-test', 429, true);

            expect(error.rateLimited).toBe(true);
            expect(error.recoverable).toBe(false); // Rate limited = not immediately recoverable
        });
    });

    describe('ConfigError', () => {
        it('should include config path and invalid field', () => {
            const error = new ConfigError(
                'Invalid config',
                '/path/to/.wardenrc.json',
                'scannerType'
            );

            expect(error.name).toBe('ConfigError');
            expect(error.code).toBe('CONFIG_ERROR');
            expect(error.configPath).toBe('/path/to/.wardenrc.json');
            expect(error.invalidField).toBe('scannerType');
        });
    });

    describe('ValidationError', () => {
        it('should include field validation details', () => {
            const error = new ValidationError('Invalid severity', 'severity', 'string', 123);

            expect(error.name).toBe('ValidationError');
            expect(error.code).toBe('VALIDATION_ERROR');
            expect(error.field).toBe('severity');
            expect(error.expectedType).toBe('string');
            expect(error.receivedValue).toBe(123);
        });
    });
});
