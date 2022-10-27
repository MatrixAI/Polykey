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
  test.todo('EIM to testnet.polykey.io', async () => {
    // Local agent behind EIM NAT can ping testnet.polykey.io
  });
  test.todo('EDM to testnet.polykey.io', async () => {
    // Local agent behind EDM NAT can ping testnet.polykey.io
  });
  test.todo('DMZ to EIM via testnet.polykey.io', async () => {
    // Local agent behind DMZ can ping local agent behind EIM NAT using seed
    // node signaller (and can ping back)
  });
  test.todo('DMZ to EDM via testnet.polykey.io', async () => {
    // Local agent behind DMZ cannot ping local agent behind EDM NAT using seed
    // node signaller (but can using relay) (and can ping back)
  });
  test.todo('EIM to EIM via testnet.polykey.io', async () => {
    // Local agent behind EIM can ping local agent behind EIM NAT using seed
    // node signaller (and can ping back)
  });
  test.todo('EIM to EDM via testnet.polykey.io', async () => {
    // Local agent behind EIM cannot ping local agent behind EDM NAT using seed
    // node signaller (but can using relay) (and can ping back)
  });
  test.todo('EDM to EDM via testnet.polykey.io', async () => {
    // Local agent behind EDM cannot ping local agent behind EDM NAT using seed
    // node signaller (but can using relay) (and can ping back)
  });
});
