import path from 'path';

declare global {
  namespace NodeJS {
    interface Global {
      projectDir: string;
      testDir: string;
      defaultTimeout: number;
      polykeyStartupTimeout: number;
      failedConnectionTimeout: number;
    }
  }
}

global.projectDir = path.join(__dirname, '../');
global.testDir = __dirname;
global.defaultTimeout = 20000;
global.polykeyStartupTimeout = 30000;
global.failedConnectionTimeout = 50000;
