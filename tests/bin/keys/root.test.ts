import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testBinUtils from '../utils';
import { globalRootKeyPems } from '../../globalRootKeyPems';
import { runTestIfPlatforms } from '../../utils';

describe('root', () => {
  const logger = new Logger('root test', LogLevel.WARN, [new StreamHandler()]);
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
  runTestIfPlatforms('linux', 'docker')(
    'root gets the public key',
    async () => {
      const { exitCode, stdout } = await testBinUtils.pkStdioSwitch(
        global.testCmd,
      )(
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
    },
  );
  runTestIfPlatforms('linux', 'docker')(
    'root gets public and private keys',
    async () => {
      const { exitCode, stdout } = await testBinUtils.pkStdioSwitch(
        global.testCmd,
      )(
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
