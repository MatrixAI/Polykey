import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as execUtils from '../../utils/exec';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';
import * as testUtils from '../../utils';

describe('certchain', () => {
  const logger = new Logger('certchain test', LogLevel.WARN, [
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
  testUtils.testIf(
    testUtils.isTestPlatformEmpty || testUtils.isTestPlatformDocker,
  )('certchain gets the certificate chain', async () => {
    let { exitCode, stdout } = await execUtils.pkStdio(
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
    ({ exitCode, stdout } = await execUtils.pkStdio(
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
