import path from 'path';

declare global {
  namespace NodeJS {
    interface Global {
      projectDir: string;
      testDir: string;
    }
  }
}

global.projectDir = path.join(__dirname, '../');
global.testDir = __dirname;
