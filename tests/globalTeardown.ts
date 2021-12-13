/**
 * Global teardown for all jest tests
 * Side-effects are performed here
 * No variable context is inherited from test modules
 * Jest does not support `@/` imports here
 * @module
 */
import os from 'os';
import fs from 'fs';
import path from 'path';

async function teardown() {
  // eslint-disable-next-line no-console
  console.log('GLOBAL TEARDOWN');
  // Globals defined in setup.ts must be copied here
  const keyPairDir = path.join(os.tmpdir(), 'polykey-test-keypair');
  const binAgentDir = path.join(os.tmpdir(), 'polykey-test-bin');
  // eslint-disable-next-line no-console
  console.log(`Destroying global.keyPairDir: ${keyPairDir}`);
  await fs.promises.rm(keyPairDir, { force: true, recursive: true });
  // The global agent directory must be fresh
  // eslint-disable-next-line no-console
  console.log(`Destroying global.binAgentDir: ${binAgentDir}`);
  await fs.promises.rm(binAgentDir, { force: true, recursive: true });
}

export default teardown;
