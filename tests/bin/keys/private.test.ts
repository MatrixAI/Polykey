import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testUtils from '../../utils';

describe('private', () => {
  const logger = new Logger('private test', LogLevel.WARN, [new StreamHandler()]);
  let agentDir;
  let agentPassword;
  let agentClose;
  beforeEach(async () => {
    ({ agentDir, agentPassword, agentClose } = await testUtils.setupTestAgent(
      logger,
    ));
  });
  afterEach(async () => {
    await agentClose();
  });
  testUtils.testIf(
    testUtils.isTestPlatformEmpty || testUtils.isTestPlatformDocker,
  )('private gets private key', async () => {
    const { exitCode, stdout } = await testUtils.pkExec(
      ['keys', 'private', '--format', 'json'],
      {
        env: {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
          PK_PASSWORD_NEW: 'newPassword'
        },
        cwd: agentDir,
        command: globalThis.testCmd,
      },
    );
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      ciphertext: expect.any(String),
      iv: expect.any(String),
      protected: expect.any(String),
      tag: expect.any(String),
    });
  });
});
