import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { logger } from './utils/logger';
import { validator } from './utils/validator';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer.trim());
        });
    });
}

/**
 * Interactive setup wizard
 */
export async function runSetup(): Promise<void> {
    logger.info('Welcome to The Sentinel setup wizard!');
    logger.info('This will help you configure your environment.\n');

    const envPath = path.resolve(process.cwd(), '.env');
    const envExamplePath = path.resolve(__dirname, '../.env.example');

    // Check if .env already exists
    if (fs.existsSync(envPath)) {
        const overwrite = await question('.env file already exists. Overwrite? (y/N): ');
        if (overwrite.toLowerCase() !== 'y') {
            logger.info('Setup cancelled.');
            rl.close();
            return;
        }
    }

    const config: Record<string, string> = {};

    // GitHub Token
    logger.section('GitHub Configuration');
    config.GITHUB_TOKEN = await question('Enter your GitHub Personal Access Token (required): ');

    if (!config.GITHUB_TOKEN) {
        logger.error('GitHub token is required for The Sentinel to function.');
        rl.close();
        return;
    }

    config.GITHUB_OWNER = await question('Enter your GitHub username or organization (optional): ');
    config.GITHUB_REPO = await question('Enter your repository name (optional): ');
    config.GITHUB_ASSIGNEE = await question('Enter GitHub username for PR assignment (optional): ');

    // Snyk Token
    logger.section('Snyk Configuration');
    logger.info('Snyk token is optional but recommended for better scanning.');
    config.SNYK_TOKEN = await question('Enter your Snyk API token (optional): ');

    // Write .env file
    const envContent = Object.entries(config)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    fs.writeFileSync(envPath, envContent + '\n');
    logger.success('.env file created successfully!');

    // Validate setup
    logger.section('Validating Configuration');
    const validationResult = validator.validateAll();
    validator.printValidationResults(validationResult);

    if (validationResult.valid) {
        logger.success('\n🎉 Setup complete! You can now run: sentinel scan');
    } else {
        logger.warn('\n⚠️  Setup complete with warnings. Review the messages above.');
    }

    rl.close();
}

/**
 * Initialize Sentinel in a repository
 */
export async function initializeSentinel(): Promise<void> {
    const cwd = process.cwd();

    logger.info('Initializing The Sentinel in current directory...');

    // Create necessary directories
    const dirs = ['scan-results', 'logs', 'SPEC'];

    for (const dir of dirs) {
        const dirPath = path.join(cwd, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            logger.success(`Created directory: ${dir}/`);
        } else {
            logger.info(`Directory already exists: ${dir}/`);
        }
    }

    // Create SENTINEL_CORE.md if it doesn't exist
    const sentinelCorePath = path.join(cwd, 'SENTINEL_CORE.md');
    if (!fs.existsSync(sentinelCorePath)) {
        const coreContent = `# SENTINEL RULES OF ENGAGEMENT

## Core Directives
1. **Safety First**: Never merge to \`main\` or \`master\` without explicit human approval.
2. **Sensitive Files**: Do not read, write, or modify \`.env\` files or any file containing "secret", "key", or "token" in its name unless explicitly authorized for a specific rotation task.
3. **Verification**: No fix is to be proposed without first passing a regression test (\`npm test\`) and a secondary security scan.

## Operating Logic
- **Read-First**: Before any execution, the agent must read the \`SPEC/\` directory to ensure alignment.
- **Spec-Driven**: All tasks are defined by specifications in the \`SPEC/\` folder.

## Branches
- All automated fixes must be performed on a feature/bugfix branch.
- Branch naming convention: \`sentinel/fix-<vulnerability-id>-<short-description>\`.
`;
        fs.writeFileSync(sentinelCorePath, coreContent);
        logger.success('Created SENTINEL_CORE.md');
    }

    // Create a sample spec
    const sampleSpecPath = path.join(cwd, 'SPEC', '001-baseline.md');
    if (!fs.existsSync(sampleSpecPath)) {
        const specContent = `# Baseline Security Patrol

## Objective
Identify and remediate critical and high-severity vulnerabilities in dependencies.

## Scope
- Scan all dependencies in package.json
- Prioritize Critical and High severity issues
- Create automated fixes where possible

## Success Criteria
- All Critical vulnerabilities addressed
- Pull requests created for each fix
- Tests pass after applying fixes
`;
        fs.writeFileSync(sampleSpecPath, specContent);
        logger.success('Created sample specification: SPEC/001-baseline.md');
    }

    // Update .gitignore
    const gitignorePath = path.join(cwd, '.gitignore');
    const gitignoreEntries = [
        'node_modules/',
        'dist/',
        '.env',
        '.DS_Store',
        'coverage/',
        'scan-results/',
        'workspaces/',
        'logs/',
        '*.log'
    ];

    if (fs.existsSync(gitignorePath)) {
        const existing = fs.readFileSync(gitignorePath, 'utf-8');
        const missing = gitignoreEntries.filter(entry => !existing.includes(entry));

        if (missing.length > 0) {
            fs.appendFileSync(gitignorePath, '\n# The Sentinel\n' + missing.join('\n') + '\n');
            logger.success('Updated .gitignore');
        }
    } else {
        fs.writeFileSync(gitignorePath, gitignoreEntries.join('\n') + '\n');
        logger.success('Created .gitignore');
    }

    logger.success('\n✅ The Sentinel initialized successfully!');
    logger.info('Next steps:');
    logger.info('  1. Run: sentinel setup (to configure environment)');
    logger.info('  2. Run: sentinel validate (to check your setup)');
    logger.info('  3. Run: sentinel scan (to start scanning)');

    rl.close();
}
