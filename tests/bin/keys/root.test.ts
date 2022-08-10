import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';
import * as testUtils from '../../utils';

describe('root', () => {
  const logger = new Logger('root test', LogLevel.WARN, [new StreamHandler()]);
  let agentDir;
  let agentPassword;
  let agentClose;
  beforeEach(async () => {
    ({ agentDir, agentPassword, agentClose } = await testUtils.setupTestAgent(
      globalRootKeyPems[0],
      logger,
    ));
  });
  afterEach(async () => {
    await agentClose();
  });
  testUtils.testIf(
    testUtils.isTestPlatformEmpty || testUtils.isTestPlatformDocker,
  )('root gets the public key', async () => {
    const { exitCode, stdout } = await testUtils.pkExec(
      ['keys', 'root', '--format', 'json'],
      {
        env: {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        cwd: agentDir,
      },
    );
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      publicKey: expect.any(String),
    });
  });
  testUtils.testIf(
    testUtils.isTestPlatformEmpty || testUtils.isTestPlatformDocker,
  )('root gets public and private keys', async () => {
    const { exitCode, stdout } = await testUtils.pkExec(
      ['keys', 'root', '--private-key', '--format', 'json'],
      {
        env: {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        cwd: agentDir,
      },
    );
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      publicKey: expect.any(String),
      privateKey: expect.any(String),
    });
  });
});
