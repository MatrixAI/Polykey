import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testBinUtils from '../utils';
import { globalRootKeyPems } from '../../globalRootKeyPems';
import { runTestIfPlatforms } from '../../utils';

describe('cert', () => {
  const logger = new Logger('cert test', LogLevel.WARN, [new StreamHandler()]);
  let agentDir;
  let agentPassword;
  let agentClose;
  beforeEach(async () => {
    ({ agentDir, agentPassword, agentClose } =
      await testBinUtils.setupTestAgent(globalRootKeyPems[0], logger));
  });
  afterEach(async () => {
    await agentClose();
  });
  runTestIfPlatforms('linux', 'docker')(
    'cert gets the certificate',
    async () => {
      let { exitCode, stdout } = await testBinUtils.pkStdio(
        ['keys', 'cert', '--format', 'json'],
        {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        agentDir,
      );
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toEqual({
        cert: expect.any(String),
      });
      const certCommand = JSON.parse(stdout).cert;
      ({ exitCode, stdout } = await testBinUtils.pkStdio(
        ['agent', 'status', '--format', 'json'],
        {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        agentDir,
      ));
      expect(exitCode).toBe(0);
      const certStatus = JSON.parse(stdout).rootCertPem;
      expect(certCommand).toBe(certStatus);
    },
  );
});
