import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testBinUtils from '../utils';
import * as testUtils from '../../utils';

describe('cert', () => {
  const logger = new Logger('cert test', LogLevel.WARN, [new StreamHandler()]);
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
  test('cert gets the certificate', async () => {
    let { exitCode, stdout } = await testBinUtils.pkStdio(
      ['keys', 'cert', '--format', 'json'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    );
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      cert: expect.any(String),
    });
    const certCommand = JSON.parse(stdout).cert;
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['agent', 'status', '--format', 'json'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    ));
    expect(exitCode).toBe(0);
    const certStatus = JSON.parse(stdout).rootCertPem;
    expect(certCommand).toBe(certStatus);
  });
});
