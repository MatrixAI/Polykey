import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testBinUtils from '../utils';
import * as testUtils from '../../utils';

describe('password', () => {
  const logger = new Logger('password test', LogLevel.WARN, [
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
  test.skip('password changes the root password', async () => {
    const passPath = path.join(globalAgentDir, 'passwordChange');
    await fs.promises.writeFile(passPath, 'password-change');
    let { exitCode } = await testBinUtils.pkStdio(
      ['keys', 'password', '--password-new-file', passPath],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    );
    expect(exitCode).toBe(0);
    // Old password should no longer work
    ({ exitCode } = await testBinUtils.pkStdio(
      ['keys', 'root'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    ));
    expect(exitCode).not.toBe(0);
    // Revert side effects using new password
    await fs.promises.writeFile(passPath, globalAgentPassword);
    ({ exitCode } = await testBinUtils.pkStdio(
      ['keys', 'password', '--password-new-file', passPath],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: 'password-change',
      },
      globalAgentDir,
    ));
  });
});
