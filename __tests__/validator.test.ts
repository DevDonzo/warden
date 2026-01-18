import { validator } from '../src/utils/validator';
import * as fs from 'fs';
import * as path from 'path';

describe('Validator', () => {
    describe('validateEnvironment', () => {
        const originalEnv = process.env;

        beforeEach(() => {
            jest.resetModules();
            process.env = { ...originalEnv };
        });

        afterAll(() => {
            process.env = originalEnv;
        });

        it('should fail validation when GITHUB_TOKEN is missing', () => {
            delete process.env.GITHUB_TOKEN;
            const result = validator.validateEnvironment();

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('GITHUB_TOKEN is required for creating pull requests');
        });

        it('should pass validation when GITHUB_TOKEN is present', () => {
            process.env.GITHUB_TOKEN = 'test-token';
            const result = validator.validateEnvironment();

            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should warn when SNYK_TOKEN is missing', () => {
            process.env.GITHUB_TOKEN = 'test-token';
            delete process.env.SNYK_TOKEN;

            const result = validator.validateEnvironment();

            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.warnings.some(w => w.includes('SNYK_TOKEN'))).toBe(true);
        });
    });

    describe('validateDependencies', () => {
        it('should detect git installation', () => {
            const result = validator.validateDependencies();

            // Git should be installed on most systems
            const gitError = result.errors.find(e => e.includes('Git'));
            expect(gitError).toBeUndefined();
        });

        it('should detect node installation', () => {
            const result = validator.validateDependencies();

            const nodeError = result.errors.find(e => e.includes('Node.js'));
            expect(nodeError).toBeUndefined();
        });
    });

    describe('validatePackageJson', () => {
        it('should validate package.json exists in project root', () => {
            const projectRoot = path.resolve(__dirname, '..');
            const result = validator.validatePackageJson(projectRoot);

            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should fail when package.json does not exist', () => {
            const nonExistentPath = '/tmp/nonexistent-path-12345';
            const result = validator.validatePackageJson(nonExistentPath);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('package.json not found'))).toBe(true);
        });
    });
});
