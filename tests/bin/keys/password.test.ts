import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testBinUtils from '../utils';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';
import { runTestIfPlatforms } from '../../utils';

describe('password', () => {
  const logger = new Logger('password test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let agentDir;
  let agentPassword;
  let agentClose;
  beforeEach(async () => {
    ({ agentDir, agentPassword, agentClose } =
      await testBinUtils.setupTestAgent(globalRootKeyPems[0], logger));
  });
  afterEach(async () => {
    await agentClose();
  });
  runTestIfPlatforms('docker')(
    'password changes the root password',
    async () => {
      const passPath = path.join(agentDir, 'passwordChange');
      await fs.promises.writeFile(passPath, 'password-change');
      let { exitCode } = await testBinUtils.pkStdio(
        ['keys', 'password', '--password-new-file', passPath],
        {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        agentDir,
      );
      expect(exitCode).toBe(0);
      // Old password should no longer work
      ({ exitCode } = await testBinUtils.pkStdio(
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
      ({ exitCode } = await testBinUtils.pkStdio(
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
