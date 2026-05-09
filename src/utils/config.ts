import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { DastConfig, DastTarget } from '../types';

export interface WardenConfig {
    // Scanner settings
    scanner: {
        primary: 'snyk' | 'npm-audit' | 'all';
        fallback: boolean;
        timeout: number;
        retries: number;
    };

    // Fix settings
    fixes: {
        maxPerRun: number;
        minSeverity: 'low' | 'medium' | 'high' | 'critical';
        autoMerge: boolean;
        branchPrefix: string;
    };

    // GitHub settings
    github: {
        assignees: string[];
        labels: string[];
        reviewers: string[];
        autoAssign: boolean;
    };

    // Notification settings
    notifications: {
        enabled: boolean;
        slack?: {
            webhook: string;
            channel?: string;
        };
        discord?: {
            webhook: string;
        };
        email?: {
            to: string[];
            from: string;
        };
    };

    // Logging settings
    logging: {
        level: 'error' | 'warn' | 'info' | 'debug';
        file: boolean;
        console: boolean;
    };

    // Policy settings
    policy: {
        failOnSeverity?: 'low' | 'medium' | 'high' | 'critical';
        failOnPosture?: 'guarded' | 'elevated' | 'critical';
        requireApprovalAboveSeverity?: 'low' | 'medium' | 'high' | 'critical';
    };

    // Exclusions
    exclude: {
        packages: string[];
        vulnerabilities: string[];
        severities: string[];
    };

    // DAST settings (optional)
    dast?: DastConfig;
}

const DEFAULT_CONFIG: WardenConfig = {
    scanner: {
        primary: 'snyk',
        fallback: true,
        timeout: 300000, // 5 minutes
        retries: 3
    },
    fixes: {
        maxPerRun: 1,
        minSeverity: 'high',
        autoMerge: false,
        branchPrefix: 'warden/fix'
    },
    github: {
        assignees: [],
        labels: ['security', 'automated'],
        reviewers: [],
        autoAssign: true
    },
    notifications: {
        enabled: false
    },
    logging: {
        level: 'info',
        file: true,
        console: true
    },
    policy: {
        failOnSeverity: 'critical',
        failOnPosture: 'critical',
        requireApprovalAboveSeverity: 'critical'
    },
    exclude: {
        packages: [],
        vulnerabilities: [],
        severities: []
    }
};

export class ConfigManager {
    private config: WardenConfig;
    private configPath: string;

    constructor(customPath?: string) {
        this.configPath = customPath || this.findConfigFile();
        this.config = this.loadConfig();
    }

    /**
     * Find config file in multiple locations
     */
    private findConfigFile(): string {
        const possiblePaths = [
            path.join(process.cwd(), '.wardenrc.json'),
            path.join(process.cwd(), '.wardenrc'),
            path.join(process.cwd(), 'warden.config.json'),
            path.join(process.env.HOME || '~', '.wardenrc.json')
        ];

        for (const configPath of possiblePaths) {
            if (fs.existsSync(configPath)) {
                logger.debug(`Found config file: ${configPath}`);
                return configPath;
            }
        }

        logger.debug('No config file found, using defaults');
        return '';
    }

    /**
     * Load configuration from file or use defaults
     */
    private loadConfig(): WardenConfig {
        if (!this.configPath || !fs.existsSync(this.configPath)) {
            return { ...DEFAULT_CONFIG };
        }

        try {
            const fileContent = fs.readFileSync(this.configPath, 'utf-8');
            const userConfig = JSON.parse(fileContent);

            // Deep merge with defaults
            const merged = this.deepMerge(DEFAULT_CONFIG, userConfig);

            logger.info(`Loaded configuration from ${this.configPath}`);
            return merged;
        } catch (error: any) {
            logger.error(`Failed to load config file: ${error.message}`);
            logger.warn('Using default configuration');
            return { ...DEFAULT_CONFIG };
        }
    }

    /**
     * Deep merge two objects
     */
    private deepMerge(target: any, source: any): any {
        const output = { ...target };

        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        output[key] = source[key];
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    output[key] = source[key];
                }
            });
        }

        return output;
    }

    private isObject(item: any): boolean {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    /**
     * Get current configuration (returns a deep copy)
     */
    getConfig(): WardenConfig {
        return JSON.parse(JSON.stringify(this.config));
    }

    /**
     * Get specific config value
     */
    get<K extends keyof WardenConfig>(key: K): WardenConfig[K] {
        return this.config[key];
    }

    /**
     * Update configuration
     */
    set<K extends keyof WardenConfig>(key: K, value: WardenConfig[K]): void {
        this.config[key] = value;
    }

    /**
     * Save configuration to file
     */
    save(path?: string): void {
        const savePath = path || this.configPath || '.wardenrc.json';

        try {
            fs.writeFileSync(savePath, JSON.stringify(this.config, null, 2));
            logger.success(`Configuration saved to ${savePath}`);
        } catch (error: any) {
            logger.error(`Failed to save configuration: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create a new config file with defaults
     */
    static createDefault(targetPath: string = '.wardenrc.json'): void {
        const fullPath = path.resolve(process.cwd(), targetPath);

        if (fs.existsSync(fullPath)) {
            throw new Error(`Config file already exists: ${fullPath}`);
        }

        fs.writeFileSync(fullPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
        logger.success(`Created default configuration: ${fullPath}`);
    }

    /**
     * Validate configuration
     */
    validate(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Validate scanner settings
        if (!['snyk', 'npm-audit', 'all'].includes(this.config.scanner.primary)) {
            errors.push('Invalid scanner.primary value');
        }

        // Validate severity
        if (!['low', 'medium', 'high', 'critical'].includes(this.config.fixes.minSeverity)) {
            errors.push('Invalid fixes.minSeverity value');
        }

        // Validate maxPerRun
        if (this.config.fixes.maxPerRun < 1) {
            errors.push('fixes.maxPerRun must be at least 1');
        }

        // Validate logging level
        if (!['error', 'warn', 'info', 'debug'].includes(this.config.logging.level)) {
            errors.push('Invalid logging.level value');
        }

        if (
            this.config.policy.failOnSeverity &&
            !['low', 'medium', 'high', 'critical'].includes(this.config.policy.failOnSeverity)
        ) {
            errors.push('Invalid policy.failOnSeverity value');
        }

        if (
            this.config.policy.failOnPosture &&
            !['guarded', 'elevated', 'critical'].includes(this.config.policy.failOnPosture)
        ) {
            errors.push('Invalid policy.failOnPosture value');
        }

        if (
            this.config.policy.requireApprovalAboveSeverity &&
            !['low', 'medium', 'high', 'critical'].includes(this.config.policy.requireApprovalAboveSeverity)
        ) {
            errors.push('Invalid policy.requireApprovalAboveSeverity value');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Print current configuration
     */
    print(): void {
        logger.info('Current Configuration:');
        console.log(JSON.stringify(this.config, null, 2));
    }

    /**
     * Get DAST configuration
     */
    getDastConfig(): DastConfig | null {
        return this.config.dast || null;
    }

    /**
     * Get default DAST configuration
     */
    static getDefaultDastConfig(): DastConfig {
        return {
            enabled: false,
            targets: [],
            nmap: {
                enabled: true,
                scanType: 'standard',
                portRange: '1-1000',
                timing: 3,
                options: ['-sV'],
                outputFormat: 'xml'
            },
            metasploit: {
                enabled: false,
                mode: 'scan-only',
                modules: [],
                timeout: 60000
            },
            safety: {
                requireConfirmation: true,
                authorizedTargetsOnly: true,
                disableExploits: true,
                maxScanDuration: 1800000
            }
        };
    }

    /**
     * Validate DAST configuration
     */
    validateDastConfig(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        const dastConfig = this.config.dast;

        if (!dastConfig) {
            return { valid: true, errors: [] }; // DAST is optional
        }

        // Validate targets
        if (!Array.isArray(dastConfig.targets)) {
            errors.push('dast.targets must be an array');
        } else {
            dastConfig.targets.forEach((target, index) => {
                if (!target.url) {
                    errors.push(`dast.targets[${index}] missing required field: url`);
                }
                if (typeof target.authorized !== 'boolean') {
                    errors.push(`dast.targets[${index}] missing required field: authorized`);
                }
                if (target.authorized !== true) {
                    errors.push(`dast.targets[${index}] must have authorized: true to be scanned`);
                }
            });
        }

        // Validate Nmap config
        if (dastConfig.nmap) {
            const validScanTypes = ['quick', 'standard', 'comprehensive', 'stealth'];
            if (!validScanTypes.includes(dastConfig.nmap.scanType)) {
                errors.push('dast.nmap.scanType must be one of: quick, standard, comprehensive, stealth');
            }
        }

        // Validate Metasploit config
        if (dastConfig.metasploit) {
            const validModes = ['scan-only', 'safe-exploits', 'full'];
            if (!validModes.includes(dastConfig.metasploit.mode)) {
                errors.push('dast.metasploit.mode must be one of: scan-only, safe-exploits, full');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Find target configuration by URL
     */
    findDastTarget(targetUrl: string): DastTarget | null {
        const dastConfig = this.config.dast;
        if (!dastConfig || !dastConfig.targets) {
            return null;
        }

        return dastConfig.targets.find(t => t.url === targetUrl) || null;
    }
}

// Singleton instance
let configInstance: ConfigManager | null = null;

export function getConfig(customPath?: string): ConfigManager {
    if (!configInstance) {
        configInstance = new ConfigManager(customPath);
    }
    return configInstance;
}

export function resetConfig(): void {
    configInstance = null;
}
