import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

export interface SentinelConfig {
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

    // Exclusions
    exclude: {
        packages: string[];
        vulnerabilities: string[];
        severities: string[];
    };
}

const DEFAULT_CONFIG: SentinelConfig = {
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
    exclude: {
        packages: [],
        vulnerabilities: [],
        severities: []
    }
};

export class ConfigManager {
    private config: SentinelConfig;
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
    private loadConfig(): SentinelConfig {
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
     * Get current configuration
     */
    getConfig(): SentinelConfig {
        return { ...this.config };
    }

    /**
     * Get specific config value
     */
    get<K extends keyof SentinelConfig>(key: K): SentinelConfig[K] {
        return this.config[key];
    }

    /**
     * Update configuration
     */
    set<K extends keyof SentinelConfig>(key: K, value: SentinelConfig[K]): void {
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
