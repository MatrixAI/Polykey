import os from 'os';
import fs from 'fs';
import path from 'path';

async function teardown() {
  // eslint-disable-next-line no-console
  console.log('GLOBAL TEARDOWN');
  // Globals defined in setup.ts is not available here
  const binAgentDir = path.join(os.tmpdir(), 'polykey-test-bin');
  // The global agent directory must be fresh
  console.log(`Destroying global.binAgentDir: ${binAgentDir}`);
  await fs.promises.rm(binAgentDir, { force: true, recursive: true});
}

export default teardown;
