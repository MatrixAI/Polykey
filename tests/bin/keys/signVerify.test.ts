import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as execUtils from '../../utils/exec';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';
import { testIf } from '../../utils';
import {
  isTestPlatformEmpty,
  isTestPlatformDocker,
} from '../../utils/platform';

describe('sign-verify', () => {
  const logger = new Logger('sign-verify test', LogLevel.WARN, [
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
  testIf(isTestPlatformEmpty || isTestPlatformDocker)(
    'signs and verifies a file',
    async () => {
      let exitCode, stdout;
      const dataPath = path.join(agentDir, 'data');
      await fs.promises.writeFile(dataPath, 'sign-me', {
        encoding: 'binary',
      });
      ({ exitCode, stdout } = await execUtils.pkStdio(
        ['keys', 'sign', dataPath, '--format', 'json'],
        {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        agentDir,
      ));
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toEqual({
        signature: expect.any(String),
      });
      const signed = JSON.parse(stdout).signature;
      const signaturePath = path.join(agentDir, 'data2');
      await fs.promises.writeFile(signaturePath, signed, {
        encoding: 'binary',
      });
      ({ exitCode, stdout } = await execUtils.pkStdio(
        ['keys', 'verify', dataPath, signaturePath, '--format', 'json'],
        {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        agentDir,
      ));
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toEqual({
        signatureVerified: true,
      });
    },
  );
});
