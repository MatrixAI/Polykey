import os from 'os';
import fs from 'fs';
import path from 'path';

async function setup() {
  // eslint-disable-next-line no-console
  console.log('\nGLOBAL SETUP');
  // Globals defined in setup.ts is not available here
  const binAgentDir = path.join(os.tmpdir(), 'polykey-test-bin');
  // The global agent directory must be fresh
  // eslint-disable-next-line no-console
  console.log(`Creating global.binAgentDir: ${binAgentDir}`);
  await fs.promises.rm(binAgentDir, { force: true, recursive: true });
  await fs.promises.mkdir(binAgentDir);
}

export default setup;
