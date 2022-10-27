import path from 'path';
import fs from 'fs';
// Import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

describe('testnet trust', () => {
  // Const logger = new Logger('testnet trust test', LogLevel.WARN, [
  //   new StreamHandler(),
  // ]);
  let dataDir: string;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(globalThis.tmpDir, 'polykey-test-'),
    );
  });
  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test.todo('can trust `testnet.polykey.io` seed node', async () => {
    // After starting a local agent with the testnet as a seed node, this test
    // should call `identities trust` to trust the testnet
    //
    // This trust establishment should be checked by running `identities list`
  });
});
