import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testBinUtils from '../utils';
import * as testUtils from '../../utils';

describe('root', () => {
  const logger = new Logger('root test', LogLevel.WARN, [new StreamHandler()]);
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
  test('root gets the public key', async () => {
    const { exitCode, stdout } = await testBinUtils.pkStdio(
      ['keys', 'root', '--format', 'json'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    );
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      publicKey: expect.any(String),
    });
  });
  test('root gets public and private keys', async () => {
    const { exitCode, stdout } = await testBinUtils.pkStdio(
      ['keys', 'root', '--private-key', '--format', 'json'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    );
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      publicKey: expect.any(String),
      privateKey: expect.any(String),
    });
  });
});
