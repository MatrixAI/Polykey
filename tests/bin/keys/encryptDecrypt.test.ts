import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testBinUtils from '../utils';
import * as testUtils from '../../utils';

describe('encrypt-decrypt', () => {
  const logger = new Logger('encrypt-decrypt test', LogLevel.WARN, [
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
  test('encrypts and decrypts data', async () => {
    let exitCode, stdout;
    const dataPath = path.join(globalAgentDir, 'data');
    await fs.promises.writeFile(dataPath, 'abc', {
      encoding: 'binary',
    });
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['keys', 'encrypt', dataPath, '--format', 'json'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    ));
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      encryptedData: expect.any(String),
    });
    const encrypted = JSON.parse(stdout).encryptedData;
    await fs.promises.writeFile(dataPath, encrypted, {
      encoding: 'binary',
    });
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['keys', 'decrypt', dataPath, '--format', 'json'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    ));
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      decryptedData: 'abc',
    });
  });
});
