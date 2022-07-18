import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testBinUtils from '../utils';
import { globalRootKeyPems } from '../../globalRootKeyPems';

describe('certchain', () => {
  const logger = new Logger('certchain test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let agentDir;
  let agentPassword;
  let agentClose;
  beforeEach(async () => {
    ({ agentDir, agentPassword, agentClose } =
      await testBinUtils.setupTestAgent(
        global.testCmd,
        globalRootKeyPems[0],
        logger,
      ));
  });
  afterEach(async () => {
    await agentClose();
  });
  test('certchain gets the certificate chain', async () => {
    let { exitCode, stdout } = await testBinUtils.pkStdio(
      ['keys', 'certchain', '--format', 'json'],
      {
        PK_NODE_PATH: agentDir,
        PK_PASSWORD: agentPassword,
      },
      agentDir,
    );
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      certchain: expect.any(Array),
    });
    const certChainCommand = JSON.parse(stdout).certchain.join('\n');
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['agent', 'status', '--format', 'json'],
      {
        PK_NODE_PATH: agentDir,
        PK_PASSWORD: agentPassword,
      },
      agentDir,
    ));
    expect(exitCode).toBe(0);
    const certChainStatus = JSON.parse(stdout).rootCertChainPem;
    expect(certChainCommand.rootPublicKeyPem).toBe(certChainStatus);
  });
});
