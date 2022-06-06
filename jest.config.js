const os = require('os');
const path = require('path');
const fs = require('fs');
const process = require('process');
const { pathsToModuleNameMapper } = require('ts-jest/utils');
const { compilerOptions } = require('./tsconfig');

const moduleNameMapper = pathsToModuleNameMapper(compilerOptions.paths, {
  prefix: '<rootDir>/src/',
});

// using panva/jose with jest requires subpath exports
// https://github.com/panva/jose/discussions/105
moduleNameMapper['^jose/(.*)$'] = "<rootDir>/node_modules/jose/dist/node/cjs/$1";

// Global variables that are shared across the jest worker pool
// These variables must be static and serialisable
const globals = {
  // Absolute directory to the project root
  projectDir: __dirname,
  // Absolute directory to the test root
  testDir: path.join(__dirname, 'tests'),
  // Default global data directory
  dataDir: fs.mkdtempSync(
    path.join(os.tmpdir(), 'polykey-test-global-'),
  ),
  // Default asynchronous test timeout
  defaultTimeout: 20000,
  polykeyStartupTimeout: 30000,
  failedConnectionTimeout: 50000,
  // Timeouts rely on setTimeout which takes 32 bit numbers
  maxTimeout: Math.pow(2, 31) - 1,
};

// The `globalSetup` and `globalTeardown` cannot access the `globals`
// They run in their own process context
// They can receive process environment
process.env['GLOBAL_DATA_DIR'] = globals.dataDir;

module.exports = {
  testEnvironment: "node",
  verbose: true,
  collectCoverage: false,
  cacheDirectory: '<rootDir>/tmp/jest',
  coverageDirectory: '<rootDir>/tmp/coverage',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/?(*.)+(spec|test|unit.test).+(ts|tsx|js|jsx)'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': 'babel-jest',
  },
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: '<rootDir>/tmp/junit' }],
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx,js,jsx}', '!src/**/*.d.ts'],
  coverageReporters: ['text', 'cobertura'],
  globals,
  // Global setup script executed once before all test files
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  // Global teardown script executed once after all test files
  globalTeardown: '<rootDir>/tests/globalTeardown.ts',
  // Setup files are executed before each test file
  // Can access globals
  setupFiles: ['<rootDir>/tests/setup.ts'],
  // Setup files after env are executed before each test file
  // after the jest test environment is installed
  // Can access globals
  setupFilesAfterEnv: ['<rootDir>/tests/setupAfterEnv.ts'],
  moduleNameMapper: moduleNameMapper,
};
