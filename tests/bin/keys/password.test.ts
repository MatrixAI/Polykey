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

describe('password', () => {
  const logger = new Logger('password test', LogLevel.WARN, [
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
    'password changes the root password',
    async () => {
      const passPath = path.join(agentDir, 'passwordChange');
      await fs.promises.writeFile(passPath, 'password-change');
      let { exitCode } = await execUtils.pkStdio(
        ['keys', 'password', '--password-new-file', passPath],
        {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        agentDir,
      );
      expect(exitCode).toBe(0);
      // Old password should no longer work
      ({ exitCode } = await execUtils.pkStdio(
        ['keys', 'root'],
        {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        agentDir,
      ));
      expect(exitCode).not.toBe(0);
      // Revert side effects using new password
      await fs.promises.writeFile(passPath, agentPassword);
      ({ exitCode } = await execUtils.pkStdio(
        ['keys', 'password', '--password-new-file', passPath],
        {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: 'password-change',
        },
        agentDir,
      ));
    },
  );
});
