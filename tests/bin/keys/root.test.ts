import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as execUtils from '../../utils/exec';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';
import { runTestIfPlatforms } from '../../utils';

describe('root', () => {
  const logger = new Logger('root test', LogLevel.WARN, [new StreamHandler()]);
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
  runTestIfPlatforms('docker')('root gets the public key', async () => {
    const { exitCode, stdout } = await execUtils.pkStdio(
      ['keys', 'root', '--format', 'json'],
      {
        PK_NODE_PATH: agentDir,
        PK_PASSWORD: agentPassword,
      },
      agentDir,
    );
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      publicKey: expect.any(String),
    });
  });
  runTestIfPlatforms('docker')(
    'root gets public and private keys',
    async () => {
      const { exitCode, stdout } = await execUtils.pkStdio(
        ['keys', 'root', '--private-key', '--format', 'json'],
        {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        agentDir,
      );
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toEqual({
        publicKey: expect.any(String),
        privateKey: expect.any(String),
      });
    },
  );
});
