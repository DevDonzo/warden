import { ConfigManager, getConfig, resetConfig } from '../src/utils/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ConfigManager', () => {
    const testConfigPath = path.join(os.tmpdir(), 'test-wardenrc.json');

    afterEach(() => {
        // Cleanup test files
        if (fs.existsSync(testConfigPath)) {
            fs.unlinkSync(testConfigPath);
        }
        resetConfig();
    });

    describe('constructor and loading', () => {
        it('should load default config when no file exists', () => {
            const manager = new ConfigManager('/nonexistent/path');
            const config = manager.getConfig();

            expect(config.scanner.primary).toBe('snyk');
            expect(config.fixes.maxPerRun).toBe(1);
            expect(config.fixes.minSeverity).toBe('high');
            expect(config.github.autoAssign).toBe(true);
        });

        it('should load config from file when it exists', () => {
            const customConfig = {
                scanner: { primary: 'npm-audit' },
                fixes: { maxPerRun: 5 }
            };
            fs.writeFileSync(testConfigPath, JSON.stringify(customConfig));

            const manager = new ConfigManager(testConfigPath);
            const config = manager.getConfig();

            expect(config.scanner.primary).toBe('npm-audit');
            expect(config.fixes.maxPerRun).toBe(5);
            // Should merge with defaults
            expect(config.fixes.minSeverity).toBe('high');
        });

        it('should handle invalid JSON gracefully', () => {
            fs.writeFileSync(testConfigPath, 'invalid json {');

            const manager = new ConfigManager(testConfigPath);
            const config = manager.getConfig();

            // Should fall back to defaults
            expect(config.scanner.primary).toBe('snyk');
        });
    });

    describe('getters and setters', () => {
        it('should get config values by key', () => {
            const manager = new ConfigManager('/nonexistent');
            const scanner = manager.get('scanner');

            expect(scanner.primary).toBe('snyk');
            expect(scanner.fallback).toBe(true);
        });

        it('should set config values by key', () => {
            const manager = new ConfigManager('/nonexistent');
            manager.set('fixes', {
                maxPerRun: 10,
                minSeverity: 'critical',
                autoMerge: true,
                branchPrefix: 'custom/prefix'
            });

            const fixes = manager.get('fixes');
            expect(fixes.maxPerRun).toBe(10);
            expect(fixes.minSeverity).toBe('critical');
        });

        it('should return a copy of config on getConfig', () => {
            const manager = new ConfigManager('/nonexistent');
            const config1 = manager.getConfig();
            config1.fixes.maxPerRun = 999;

            const config2 = manager.getConfig();
            expect(config2.fixes.maxPerRun).toBe(1);
        });
    });

    describe('validation', () => {
        it('should validate correct configuration', () => {
            const manager = new ConfigManager('/nonexistent');
            const result = manager.validate();

            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should detect invalid scanner.primary', () => {
            const manager = new ConfigManager('/nonexistent');
            manager.set('scanner', {
                primary: 'invalid-scanner' as any,
                fallback: true,
                timeout: 300000,
                retries: 3
            });

            const result = manager.validate();
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid scanner.primary value');
        });

        it('should detect invalid minSeverity', () => {
            const manager = new ConfigManager('/nonexistent');
            manager.set('fixes', {
                maxPerRun: 1,
                minSeverity: 'invalid' as any,
                autoMerge: false,
                branchPrefix: 'warden/fix'
            });

            const result = manager.validate();
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid fixes.minSeverity value');
        });

        it('should detect invalid maxPerRun', () => {
            const manager = new ConfigManager('/nonexistent');
            manager.set('fixes', {
                maxPerRun: 0,
                minSeverity: 'high',
                autoMerge: false,
                branchPrefix: 'warden/fix'
            });

            const result = manager.validate();
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('fixes.maxPerRun must be at least 1');
        });

        it('should detect invalid logging level', () => {
            const manager = new ConfigManager('/nonexistent');
            manager.set('logging', {
                level: 'trace' as any,
                file: true,
                console: true
            });

            const result = manager.validate();
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid logging.level value');
        });

        it('should detect invalid policy values', () => {
            const manager = new ConfigManager('/nonexistent');
            manager.set('policy', {
                failOnSeverity: 'invalid' as any,
                failOnPosture: 'bad' as any,
                requireApprovalAboveSeverity: 'nope' as any
            });

            const result = manager.validate();
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid policy.failOnSeverity value');
            expect(result.errors).toContain('Invalid policy.failOnPosture value');
            expect(result.errors).toContain('Invalid policy.requireApprovalAboveSeverity value');
        });
    });

    describe('save and persistence', () => {
        it('should save configuration to file', () => {
            const manager = new ConfigManager('/nonexistent');
            manager.set('fixes', {
                maxPerRun: 3,
                minSeverity: 'medium',
                autoMerge: false,
                branchPrefix: 'warden/fix'
            });

            manager.save(testConfigPath);

            expect(fs.existsSync(testConfigPath)).toBe(true);
            const saved = JSON.parse(fs.readFileSync(testConfigPath, 'utf-8'));
            expect(saved.fixes.maxPerRun).toBe(3);
            expect(saved.fixes.minSeverity).toBe('medium');
        });

        it('should create default configuration file', () => {
            ConfigManager.createDefault(testConfigPath);

            expect(fs.existsSync(testConfigPath)).toBe(true);
            const config = JSON.parse(fs.readFileSync(testConfigPath, 'utf-8'));
            expect(config.scanner.primary).toBe('snyk');
        });

        it('should throw when creating default if file already exists', () => {
            fs.writeFileSync(testConfigPath, '{}');

            expect(() => {
                ConfigManager.createDefault(testConfigPath);
            }).toThrow('Config file already exists');
        });
    });

    describe('singleton pattern', () => {
        it('should return same instance on subsequent calls', () => {
            resetConfig();
            const config1 = getConfig();
            const config2 = getConfig();

            expect(config1).toBe(config2);
        });

        it('should reset singleton on resetConfig', () => {
            const config1 = getConfig();
            resetConfig();
            const config2 = getConfig();

            expect(config1).not.toBe(config2);
        });
    });
});
