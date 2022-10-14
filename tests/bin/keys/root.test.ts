import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testUtils from '../../utils';

describe('privateKey', () => {
  const logger = new Logger('root test', LogLevel.WARN, [new StreamHandler()]);
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
  // testUtils.testIf(
  //   testUtils.isTestPlatformEmpty || testUtils.isTestPlatformDocker,
  // )
  test('root gets the public key', async () => {
    const { exitCode, stdout, stderr } = await testUtils.pkExec(
      ['keys', 'privateKey', 'password', '--format', 'json'],
      {
        env: {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
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
        command: globalThis.testCmd,
      },
    );
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      publicKey: expect.any(String),
      privateKey: expect.any(String),
    });
  });
});
