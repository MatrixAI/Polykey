import os from 'os';
import path from 'path';

declare global {
  namespace NodeJS {
    interface Global {
      projectDir: string;
      testDir: string;
      binAgentDir: string;
      binAgentPassword: string;
      defaultTimeout: number;
      polykeyStartupTimeout: number;
      failedConnectionTimeout: number;
      maxTimeout: number;
    }
  }
}

/**
 * Absolute directory to the project root
 */
global.projectDir = path.join(__dirname, '../');

/**
 * Absolute directory to the test root
 */
global.testDir = __dirname;

/**
 * Absolute directory to a shared data directory used by bin tests
 * This has to be a static path
 * The setup.ts is copied into each test module
 */
global.binAgentDir = path.join(os.tmpdir(), 'polykey-test-bin');

/**
 * Shared password for agent used by for bin tests
 */
global.binAgentPassword = 'hello world';

/**
 * Default asynchronous test timeout
 */
global.defaultTimeout = 20000;
global.polykeyStartupTimeout = 30000;
global.failedConnectionTimeout = 50000;

/**
 * Timeouts rely on setTimeout which takes 32 bit numbers
 */
global.maxTimeout = Math.pow(2, 31) - 1;
