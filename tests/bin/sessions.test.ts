import * as testUtils from './utils';
import os from 'os';
import path from 'path';
import fs from 'fs';
import lock from 'fd-lock';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import * as utils from '@/utils';
import { SessionToken } from '@/sessions/types';

/**
 * This test file has been optimised to use only one instance of PolykeyAgent where posible.
 * Setting up the PolykeyAgent has been done in a beforeAll block.
 * Keep this in mind when adding or editing tests.
 * Any side effects need to be undone when the test has completed.
 * Preferably within a `afterEach()` since any cleanup will be skipped inside a failing test.
 *
 * - left over state can cause a test to fail in certain cases.
 * - left over state can cause similar tests to succeed when they should fail.
 * - starting or stopping the agent within tests should be done on a new instance of the polykey agent.
 * - when in doubt test each modified or added test on it's own as well as the whole file.
 * - Looking into adding a way to safely clear each domain's DB information with out breaking modules.
 */

// Promises to keep tests and checks in the right order due to the use of
// consurrent tests
const finishedSerialTests = utils.promise();
const finishedParallelSetup = utils.promise();
const finishedParallelTest1 = utils.promise();
const finishedParallelTest2 = utils.promise();

describe('Session Token Refreshing', () => {
  const logger = new Logger('pkWithStdio Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let nodePath: string;
  let passwordFile: string;
  let sessionFile: string;
  let polykeyAgent: PolykeyAgent;

  let tokenBuffer: Buffer;
  let token: SessionToken;

  beforeAll(async () => {
    //This handles the expensive setting up of the polykey agent.
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'keynode');
    passwordFile = path.join(dataDir, 'passwordFile');
    sessionFile = path.join(nodePath, 'client', 'token');
    await fs.promises.writeFile(passwordFile, 'password');
    polykeyAgent = await PolykeyAgent.createPolykey({
      password: 'password',
      nodePath: nodePath,
      logger: logger,
      cores: 1,
      workerManager: null
    });
    await polykeyAgent.start({});

    // Authorize session
    await testUtils.pkWithStdio([
      'agent',
      'unlock',
      '-np',
      nodePath,
      '--password-file',
      passwordFile,
    ]);
  }, global.polykeyStartupTimeout);

  afterAll(async () => {
    await polykeyAgent.stop();
    await polykeyAgent.destroy();
    await fs.promises.rmdir(dataDir, { recursive: true });
  });

  // Currently automatic retry upon session unlocking is not yet implemented
  // so this test won't work
  test.todo('Process should store session token in session file');

  test('Process should refresh the session token', async () => {
    tokenBuffer = await fs.promises.readFile(sessionFile);
    token = tokenBuffer.toString() as SessionToken;
    const prevToken = token;

    const message = 'HelloWorld!';
    const result = await testUtils.pkWithStdio([
      'echoes',
      'echo',
      message,
      '-np',
      nodePath,
    ]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(message);

    const buff = await fs.promises.readFile(sessionFile);
    const newToken = buff.toString() as SessionToken;
    expect(
      async () => await polykeyAgent.sessions.verifyToken(newToken),
    ).not.toThrow();

    // Make sure the first and second tokens are not the same
    expect(newToken).not.toEqual(prevToken);
  });

  test('Serial processes should refresh the session token', async () => {
    const message1 = 'First message';
    const result1 = await testUtils.pkWithStdio([
      'echoes',
      'echo',
      message1,
      '-np',
      nodePath,
    ]);
    expect(result1.code).toBe(0);
    expect(result1.stdout).toContain(message1);

    tokenBuffer = await fs.promises.readFile(sessionFile);
    const token1 = tokenBuffer.toString() as SessionToken;
    expect(
      async () => await polykeyAgent.sessions.verifyToken(token1),
    ).not.toThrow();

    const message2 = 'Second message';
    const result2 = await testUtils.pkWithStdio([
      'echoes',
      'echo',
      message2,
      '-np',
      nodePath,
    ]);
    expect(result2.code).toBe(0);
    expect(result2.stdout).toContain(message2);

    tokenBuffer = await fs.promises.readFile(sessionFile);
    const token2 = tokenBuffer.toString() as SessionToken;
    expect(
      async () => await polykeyAgent.sessions.verifyToken(token2),
    ).not.toThrow();

    // Make sure the first and second tokens are not the same
    expect(token1).not.toEqual(token2);
  });

  test(
    'Failing processes should unlock the session file',
    async () => {
      const message = 'ThrowAnError';
      const result = await testUtils.pkWithStdio([
        'echoes',
        'echo',
        message,
        '-np',
        nodePath,
      ]);
      expect(result.code).not.toBe(0);

      tokenBuffer = await fs.promises.readFile(sessionFile);
      token = tokenBuffer.toString() as SessionToken;
      expect(
        async () => await polykeyAgent.sessions.verifyToken(token),
      ).not.toThrow();

      // Try to lock the session file to ensure it's unlocked
      const fd = fs.openSync(sessionFile, 'r');
      expect(lock(fd)).toBeTruthy();
      lock.unlock(fd);
      fs.closeSync(fd);

      // Allow parallel tests to start now (so they don't interfere with
      // serial tests)
      finishedSerialTests.resolveP(null);
    },
    global.failedConnectionTimeout,
  );

  describe.skip('Parallel processes should not refresh the session token', () => {
    let prevTokenParallel: SessionToken;
    let tokenP1 = 'token1' as SessionToken;
    let tokenP2 = 'token2' as SessionToken;

    beforeAll(async () => {
      await finishedSerialTests.p;
      tokenBuffer = await fs.promises.readFile(sessionFile);
      prevTokenParallel = tokenBuffer.toString() as SessionToken;

      // Allow parallel tests to start now that setup is complete
      finishedParallelSetup.resolveP(null);
    });

    test.concurrent('Do process 1', async () => {
      await finishedParallelSetup.p;
      const messageP1 = 'Process 1';
      await testUtils.pk(['echoes', 'echo', messageP1, '-np', nodePath]);

      tokenBuffer = await fs.promises.readFile(sessionFile);
      tokenP1 = tokenBuffer.toString() as SessionToken;

      expect(
        async () => await polykeyAgent.sessions.verifyToken(tokenP1),
      ).not.toThrow();

      finishedParallelTest1.resolveP(null);
    });

    test.concurrent('Do process 2', async () => {
      await finishedParallelSetup.p;
      const messageP2 = 'Process 2';
      await testUtils.pk(['echoes', 'echo', messageP2, '-np', nodePath]);

      tokenBuffer = await fs.promises.readFile(sessionFile);
      tokenP2 = tokenBuffer.toString() as SessionToken;

      expect(
        async () => await polykeyAgent.sessions.verifyToken(tokenP2),
      ).not.toThrow();

      finishedParallelTest2.resolveP(null);
    });

    test('Check parallel token refreshing', async () => {
      await finishedParallelTest1.p;
      await finishedParallelTest2.p;

      // Check that the concurrent tests have both run
      expect(tokenP1).not.toEqual('token1');
      expect(tokenP2).not.toEqual('token2');

      // Check that the session token was refreshed exactly one time
      if (tokenP1 === prevTokenParallel) {
        expect(tokenP2).not.toEqual(prevTokenParallel);
      } else if (tokenP2 === prevTokenParallel) {
        expect(tokenP1).not.toEqual(prevTokenParallel);
      } else {
        expect(tokenP1).toEqual(tokenP2);
      }
    });
  });
});
