import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testUtils from '../../utils';

describe('pair', () => {
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
  testUtils.testIf(
    testUtils.isTestPlatformEmpty || testUtils.isTestPlatformDocker,
  )('public gets public key', async () => {
    const { exitCode, stdout, stderr } = await testUtils.pkExec(
      ['keys', 'pair', 'password', '--format', 'json'],
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
      publicKey: {
        alg: expect.any(String),
          crv: expect.any(String),
        ext: expect.any(Boolean),
        key_ops: expect.any(Array<string>),
        kty: expect.any(String),
        x: expect.any(String),
      },
        privateKey: {
        ciphertext: expect.any(String),
        iv: expect.any(String),
        protected: expect.any(String),
        tag: expect.any(String),
      }
    });
  });
});
