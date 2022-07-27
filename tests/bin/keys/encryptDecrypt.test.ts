import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as execUtils from '../../utils/exec';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';
import { runTestIfPlatforms } from '../../utils';

describe('encrypt-decrypt', () => {
  const logger = new Logger('encrypt-decrypt test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let agentDir;
  let agentPassword;
  let agentClose;
  beforeEach(async () => {
    ({ agentDir, agentPassword, agentClose } = await execUtils.setupTestAgent(
      globalRootKeyPems[0],
      logger,
    ));
  });
  afterEach(async () => {
    await agentClose();
  });
  runTestIfPlatforms('docker')('encrypts and decrypts data', async () => {
    let exitCode, stdout;
    const dataPath = path.join(agentDir, 'data');
    await fs.promises.writeFile(dataPath, 'abc', {
      encoding: 'binary',
    });
    ({ exitCode, stdout } = await execUtils.pkStdio(
      ['keys', 'encrypt', dataPath, '--format', 'json'],
      {
        PK_NODE_PATH: agentDir,
        PK_PASSWORD: agentPassword,
      },
      agentDir,
    ));
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      encryptedData: expect.any(String),
    });
    const encrypted = JSON.parse(stdout).encryptedData;
    await fs.promises.writeFile(dataPath, encrypted, {
      encoding: 'binary',
    });
    ({ exitCode, stdout } = await execUtils.pkStdio(
      ['keys', 'decrypt', dataPath, '--format', 'json'],
      {
        PK_NODE_PATH: agentDir,
        PK_PASSWORD: agentPassword,
      },
      agentDir,
    ));
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      decryptedData: 'abc',
    });
  });
});
