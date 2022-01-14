import type { PublicKey } from '@/keys/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as keysUtils from '@/keys/utils';
import * as testBinUtils from '../utils';
import * as testUtils from '../../utils';

describe('decrypt', () => {
  const logger = new Logger('decrypt test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let globalAgentDir;
  let globalAgentPassword;
  let globalAgentClose;
  beforeAll(async () => {
    ({ globalAgentDir, globalAgentPassword, globalAgentClose } =
      await testUtils.setupGlobalAgent(logger));
  }, globalThis.maxTimeout);
  afterAll(async () => {
    await globalAgentClose();
  });
  let dataDir: string;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
  });
  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('decrypts data', async () => {
    const dataPath = path.join(globalAgentDir, 'data');
    const secret = Buffer.from('this is the secret', 'binary');
    const { stdout } = await testBinUtils.pkStdio(
      ['keys', 'root'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    );
    const pubKey = keysUtils.publicKeyFromPem(stdout.slice(13)) as PublicKey;
    const encrypted = keysUtils.encryptWithPublicKey(pubKey, secret);
    await fs.promises.writeFile(dataPath, encrypted, { encoding: 'binary' });
    const res = await testBinUtils.pkStdio(
      ['keys', 'decrypt', dataPath, '--format', 'json'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    );
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('Decrypted data:');
  });
});
