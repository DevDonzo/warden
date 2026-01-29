module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/__tests__', '<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.test.ts',
        '!src/**/*.spec.ts',
        '!src/index.ts',
    ],
    moduleFileExtensions: ['ts', 'js', 'json'],
    verbose: true,
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/src/core/'],
    transformIgnorePatterns: [
        'node_modules/(?!(chalk|ora|@octokit)/)'
    ],
};
