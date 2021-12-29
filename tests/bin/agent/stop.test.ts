import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Status } from '@/status';
import config from '@/config';
import * as binErrors from '@/bin/errors';
import * as clientErrors from '@/client/errors';
import { sleep } from '@/utils';
import * as testBinUtils from '../utils';

describe('stop', () => {
  const logger = new Logger('stop test', LogLevel.WARN, [new StreamHandler()]);
  let dataDir: string;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
  });
  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test(
    'stop LIVE agent',
    async () => {
      const password = 'abc123';
      const { exitCode } = await testBinUtils.pkStdio(
        [
          'agent',
          'start',
          // 1024 is the smallest size and is faster to start
          '--root-key-pair-bits',
          '1024',
          '--workers',
          '0',
        ],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: password,
        },
        dataDir,
      );
      expect(exitCode).toBe(0);
      const status = new Status({
        statusPath: path.join(dataDir, 'polykey', config.defaults.statusBase),
        fs,
        logger,
      });
      await testBinUtils.pkStdio(
        ['agent', 'stop'],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: password,
        },
        dataDir,
      );
      await status.waitFor('DEAD');
    },
    global.defaultTimeout * 2,
  );
  test(
    'stopping is idempotent during concurrent calls and STOPPING or DEAD status',
    async () => {
      const password = 'abc123';
      const passwordPath = path.join(dataDir, 'password');
      await fs.promises.writeFile(passwordPath, password);
      const status = new Status({
        statusPath: path.join(dataDir, 'polykey', config.defaults.statusBase),
        fs,
        logger,
      });
      const { exitCode } = await testBinUtils.pkStdio(
        [
          'agent',
          'start',
          // 1024 is the smallest size and is faster to start
          '--root-key-pair-bits',
          '1024',
          '--workers',
          '0',
        ],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: password,
        },
        dataDir,
      );
      expect(exitCode).toBe(0);
      await status.waitFor('LIVE');
      // Simultaneous calls to stop must use pkExec
      const [agentStop1, agentStop2] = await Promise.all([
        testBinUtils.pkExec(
          ['agent', 'stop', '--password-file', passwordPath],
          {
            PK_NODE_PATH: path.join(dataDir, 'polykey'),
          },
          dataDir,
        ),
        testBinUtils.pkExec(
          ['agent', 'stop', '--password-file', passwordPath],
          {
            PK_NODE_PATH: path.join(dataDir, 'polykey'),
          },
          dataDir,
        ),
      ]);
      // Cannot await for STOPPING
      // It's not reliable until file watching is implemented
      // So just 1 ms delay until sending another stop command
      await sleep(1);
      const agentStop3 = await testBinUtils.pkStdio(
        ['agent', 'stop', '--node-path', path.join(dataDir, 'polykey')],
        {
          PK_PASSWORD: password,
        },
        dataDir,
      );
      await status.waitFor('DEAD');
      const agentStop4 = await testBinUtils.pkStdio(
        ['agent', 'stop', '--password-file', passwordPath],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
        },
        dataDir,
      );
      // If the GRPC server gets closed after the GRPC connection is established
      // then it's possible that one of these exit codes is 1
      if (agentStop1.exitCode === 1) {
        expect(agentStop2.exitCode).toBe(0);
      } else if (agentStop2.exitCode === 1) {
        expect(agentStop1.exitCode).toBe(0);
      } else {
        expect(agentStop1.exitCode).toBe(0);
        expect(agentStop2.exitCode).toBe(0);
      }
      expect(agentStop3.exitCode).toBe(0);
      expect(agentStop4.exitCode).toBe(0);
    },
    global.defaultTimeout * 2,
  );
  test(
    'stopping starting agent results in error',
    async () => {
      const password = 'abc123';
      const status = new Status({
        statusPath: path.join(dataDir, 'polykey', config.defaults.statusBase),
        fs,
        logger,
      });
      await testBinUtils.pkSpawn(
        [
          'agent',
          'start',
          // 1024 is the smallest size and is faster to start
          '--root-key-pair-bits',
          '1024',
          '--workers',
          '0',
          '--verbose',
        ],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: password,
        },
        dataDir,
        logger,
      );
      await status.waitFor('STARTING');
      const { exitCode, stderr } = await testBinUtils.pkStdio(
        ['agent', 'stop'],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
        },
        dataDir,
      );
      testBinUtils.expectProcessError(
        exitCode,
        stderr,
        new binErrors.ErrorCLIStatusStarting(),
      );
      await status.waitFor('LIVE');
      await testBinUtils.pkStdio(
        ['agent', 'stop'],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: password,
        },
        dataDir,
      );
      await status.waitFor('DEAD');
    },
    global.defaultTimeout * 2,
  );
  test(
    'stopping while unauthenticated does not stop',
    async () => {
      const password = 'abc123';
      await testBinUtils.pkStdio(
        [
          'agent',
          'start',
          // 1024 is the smallest size and is faster to start
          '--root-key-pair-bits',
          '1024',
          '--workers',
          '0',
        ],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: password,
        },
        dataDir,
      );
      const status = new Status({
        statusPath: path.join(dataDir, 'polykey', config.defaults.statusBase),
        fs,
        logger,
      });
      const { exitCode, stderr } = await testBinUtils.pkStdio(
        ['agent', 'stop'],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: 'wrong password',
        },
        dataDir,
      );
      testBinUtils.expectProcessError(
        exitCode,
        stderr,
        new clientErrors.ErrorClientAuthDenied(),
      );
      // Should still be LIVE
      await sleep(500);
      const statusInfo = await status.readStatus();
      expect(statusInfo).toBeDefined();
      expect(statusInfo?.status).toBe('LIVE');
      await testBinUtils.pkStdio(
        ['agent', 'stop'],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: password,
        },
        dataDir,
      );
      await status.waitFor('DEAD');
    },
    global.defaultTimeout * 2,
  );
});
