const path = require('path');
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig');

const moduleNameMapper = pathsToModuleNameMapper(compilerOptions.paths, {
  prefix: '<rootDir>/src/',
});

// Global variables that are shared across the jest worker pool
// These variables must be static and serializable
const globals = {
  // Absolute directory to the project root
  projectDir: __dirname,
  // Absolute directory to the test root
  testDir: path.join(__dirname, 'tests'),
  // Default asynchronous test timeout
  defaultTimeout: 20000,
  failedConnectionTimeout: 50000,
  // Timeouts rely on setTimeout which takes 32 bit numbers
  maxTimeout: Math.pow(2, 31) - 1,
};

// The `globalSetup` and `globalTeardown` cannot access the `globals`
// They run in their own process context
// They can however receive the process environment
// Use `process.env` to set variables

module.exports = {
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: false,
  cacheDirectory: '<rootDir>/tmp/jest',
  coverageDirectory: '<rootDir>/tmp/coverage',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/?(*.)+(spec|test|unit.test).+(ts|tsx|js|jsx)'],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        "jsc": {
          "parser": {
            "syntax": "typescript",
            "dynamicImport": true,
            "tsx": true,
            "decorators": compilerOptions.experimentalDecorators,
          },
          "target": compilerOptions.target.toLowerCase(),
          "keepClassNames": true,
        },
      }
    ],
  },
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/tmp/junit',
      classNameTemplate: '{classname}',
      ancestorSeparator: ' > ',
      titleTemplate: '{title}',
      addFileAttribute: 'true',
      reportTestSuiteErrors: 'true',
    }],
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx,js,jsx}', '!src/**/*.d.ts', '!src/proto/**'],
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
  setupFilesAfterEnv: [
    'jest-extended/all',
    '<rootDir>/tests/setupAfterEnv.ts'
  ],
  moduleNameMapper: moduleNameMapper,
};
