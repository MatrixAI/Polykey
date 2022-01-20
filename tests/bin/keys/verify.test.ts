import type { PrivateKey } from '@/keys/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as keysUtils from '@/keys/utils';
import * as testBinUtils from '../utils';
import * as testUtils from '../../utils';

describe('verify', () => {
  const logger = new Logger('verify test', LogLevel.WARN, [
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
  test('verifies a file', async () => {
    const dataPath = path.join(globalAgentDir, 'data');
    await fs.promises.writeFile(dataPath, 'sign-me', { encoding: 'binary' });
    const { stdout } = await testBinUtils.pkStdio(
      ['keys', 'root', '-pk'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    );
    const keyPair = stdout.split('\t\t');
    const privKey = keysUtils.privateKeyFromPem(keyPair[2]) as PrivateKey;
    const signed = keysUtils.signWithPrivateKey(
      privKey,
      Buffer.from('sign-me', 'binary'),
    );
    const signatureTrue = path.join(globalAgentDir, 'data2');
    await fs.promises.writeFile(signatureTrue, signed, {
      encoding: 'binary',
    });
    const res = await testBinUtils.pkStdio(
      ['keys', 'verify', dataPath, signatureTrue, '--format', 'json'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    );
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('Signature verification:');
  });
});
