import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testBinUtils from '../utils';
import * as testUtils from '../../utils';

describe('sign-verify', () => {
  const logger = new Logger('sign-verify test', LogLevel.WARN, [
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
  test('signs and verifies a file', async () => {
    let exitCode, stdout;
    const dataPath = path.join(globalAgentDir, 'data');
    await fs.promises.writeFile(dataPath, 'sign-me', {
      encoding: 'binary',
    });
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['keys', 'sign', dataPath, '--format', 'json'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    ));
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      signature: expect.any(String),
    });
    const signed = JSON.parse(stdout).signature;
    const signaturePath = path.join(globalAgentDir, 'data2');
    await fs.promises.writeFile(signaturePath, signed, {
      encoding: 'binary',
    });
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['keys', 'verify', dataPath, signaturePath, '--format', 'json'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    ));
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      signatureVerified: true,
    });
  });
});
