import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
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
  )('certchain gets the certificate chain', async () => {
    let { exitCode, stdout } = await testUtils.pkExec(
      ['keys', 'certchain', '--format', 'json'],
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
      certchain: expect.any(Array),
    });
    const certChainCommand = JSON.parse(stdout).certchain.join('\n');
    ({ exitCode, stdout } = await testUtils.pkExec(
      ['agent', 'status', '--format', 'json'],
      {
        env: {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        cwd: agentDir,
        command: globalThis.testCmd,
      },
    ));
    expect(exitCode).toBe(0);
    const certChainStatus = JSON.parse(stdout).rootCertChainPem;
    expect(certChainCommand.rootPublicKeyPem).toBe(certChainStatus);
  });
});
