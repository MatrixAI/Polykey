/**
 * Global setup for all jest tests
 * Side-effects are performed here
 * No variable context is passed to the test modules
 * Jest does not support `@/` imports here
 * @module
 */
import os from 'os';
import fs from 'fs';
import path from 'path';
import * as keysUtils from '../src/keys/utils';

async function setup() {
  // eslint-disable-next-line no-console
  console.log('\nGLOBAL SETUP');
  // Globals defined in setup.ts must be copied here
  const keyPairDir = path.join(os.tmpdir(), 'polykey-test-keypair');
  const binAgentDir = path.join(os.tmpdir(), 'polykey-test-bin');
  // Setup global root key pair
  // eslint-disable-next-line no-console
  console.log(`Creating global.keyPairDir: ${keyPairDir}`);
  await fs.promises.rm(keyPairDir, { force: true, recursive: true });
  await fs.promises.mkdir(keyPairDir);
  const rootKeyPair = await keysUtils.generateKeyPair(4096);
  const rootKeyPairPem = keysUtils.keyPairToPem(rootKeyPair);
  await Promise.all([
    fs.promises.writeFile(
      path.join(keyPairDir, 'root.pub'),
      rootKeyPairPem.publicKey,
      'utf-8',
    ),
    fs.promises.writeFile(
      path.join(keyPairDir, 'root.key'),
      rootKeyPairPem.privateKey,
      'utf-8',
    ),
  ]);
  // Setup global agent directory
  // eslint-disable-next-line no-console
  console.log(`Creating global.binAgentDir: ${binAgentDir}`);
  await fs.promises.rm(binAgentDir, { force: true, recursive: true });
  await fs.promises.mkdir(binAgentDir);
}

export default setup;
