import type { NodeId } from '@/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import PolykeyAgent from '@/PolykeyAgent';
import * as nodesUtils from '@/nodes/utils';
import { sysexits } from '@/utils';
import * as keysUtils from '@/keys/utils';
import * as testBinUtils from '../utils';
import * as testUtils from '../../utils';

describe('add', () => {
  const password = 'password';
  const logger = new Logger('add test', LogLevel.WARN, [new StreamHandler()]);
  let dataDir: string;
  let nodePath: string;
  let passwordFile: string;
  let polykeyAgent: PolykeyAgent;

  const validNodeId = testUtils.generateRandomNodeId();
  const invalidNodeId = IdInternal.fromString<NodeId>('INVALIDID');
  const validHost = '0.0.0.0';
  const invalidHost = 'INVALIDHOST';
  const port = 55555;

  // Helper functions
  function genCommands(options: Array<string>) {
    return ['nodes', ...options, '-np', nodePath];
  }

  const mockedGenerateDeterministicKeyPair = jest.spyOn(
    keysUtils,
    'generateDeterministicKeyPair',
  );

  beforeEach(async () => {
    mockedGenerateDeterministicKeyPair.mockImplementation((bits, _) => {
      return keysUtils.generateKeyPair(bits);
    });

    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'keynode');
    passwordFile = path.join(dataDir, 'passwordFile');
    await fs.promises.writeFile(passwordFile, 'password');
    polykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: nodePath,
      logger: logger,
    });

    // Authorize session
    await testBinUtils.pkStdio(
      ['agent', 'unlock', '-np', nodePath, '--password-file', passwordFile],
      {},
      nodePath,
    );
  }, global.polykeyStartupTimeout);
  afterEach(async () => {
    await polykeyAgent.stop();
    await polykeyAgent.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('add a node', async () => {
    const commands = genCommands([
      'add',
      nodesUtils.encodeNodeId(validNodeId),
      validHost,
      port.toString(),
    ]);
    const result = await testBinUtils.pkStdio(commands, {}, dataDir);
    expect(result.exitCode).toBe(0);

    // Checking if node was added.
    const res = await polykeyAgent.nodeGraph.getNode(validNodeId);
    expect(res).toBeTruthy();
    expect(res!.host).toEqual(validHost);
    expect(res!.port).toEqual(port);
  });
  test(
    'fail to add a node (invalid node ID)',
    async () => {
      const commands = genCommands([
        'add',
        nodesUtils.encodeNodeId(invalidNodeId),
        validHost,
        port.toString(),
      ]);
      const result = await testBinUtils.pkStdio(commands, {}, dataDir);
      expect(result.exitCode).toBe(sysexits.USAGE);
    },
    global.failedConnectionTimeout,
  );
  test(
    'fail to add a node (invalid IP address)',
    async () => {
      const commands = genCommands([
        'add',
        nodesUtils.encodeNodeId(validNodeId),
        invalidHost,
        port.toString(),
      ]);
      const result = await testBinUtils.pkStdio(commands, {}, dataDir);
      expect(result.exitCode).toBe(sysexits.USAGE);

      // Checking if node was added.
      const res = await polykeyAgent.nodeGraph.getNode(validNodeId);
      expect(res).toBeUndefined();
    },
    global.failedConnectionTimeout,
  );
});
