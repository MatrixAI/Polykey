import path from 'path';
import fs from 'fs';
// Import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

describe('testnet ping', () => {
  // Const logger = new Logger('testnet ping test', LogLevel.WARN, [
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
  test.todo('can ping testnet.polykey.io', async () => {
    // After starting a local agent with the testnet as a seed node, this test
    // should call `nodes ping` to ping the testnet
  });
  test.todo('can signal via testnet.polykey.io', async () => {
    // This test should create two local agents, each adding the testnet as a
    // seed node
    // One agent should be able to ping the other without directly adding its
    // details (using the testnet as a signaller)
  });
  test.todo('can fail to signal via testnet.polykey.io', async () => {
    // This test should do the same as above, but the second agent should be
    // offline
    // The ping should fail but both the local agent and seed node should
    // remain running
  });
});
