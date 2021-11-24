import type { VaultName } from '@/vaults/types';
import type { SessionToken } from '@/sessions/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import lock from 'fd-lock';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import { sleep } from '@/utils';
import * as testUtils from './utils';

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

describe('Session Token Refreshing', () => {
  const logger = new Logger('pkStdio Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let nodePath: string;
  let passwordFile: string;
  let sessionFile: string;
  let polykeyAgent: PolykeyAgent;

  let tokenBuffer: Buffer;
  let token: SessionToken;
  let command: string[];
  const vaultName = 'TestVault' as VaultName;

  beforeAll(async () => {
    // This handles the expensive setting up of the polykey agent.
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'keynode');
    command = ['vaults', 'list', '-np', nodePath];
    passwordFile = path.join(dataDir, 'passwordFile');
    sessionFile = path.join(nodePath, 'client', 'token');
    await fs.promises.writeFile(passwordFile, 'password');
    polykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password: 'password',
      nodePath: nodePath,
      logger: logger,
    });
    await polykeyAgent.vaultManager.createVault(vaultName);
  });

  afterAll(async () => {
    await polykeyAgent.stop();
    await polykeyAgent.destroy();
    await fs.promises.rmdir(dataDir, { recursive: true });
  });

  test('Process should store session token in session file', async () => {
    // Agent has not been unlocked yet
    const result = await testUtils.pkStdio(
      command,
      { PK_PASSWORD: 'password' },
      dataDir,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(vaultName);

    const buff = await fs.promises.readFile(sessionFile);
    const newToken = buff.toString() as SessionToken;
    expect(
      async () => await polykeyAgent.sessionManager.verifyToken(newToken),
    ).not.toThrow();
  });

  describe('After session has been unlocked', () => {
    beforeAll(async () => {
      // Authorize session
      await testUtils.pkStdio(
        ['agent', 'unlock', '-np', nodePath, '--password-file', passwordFile],
        {},
        dataDir,
      );
    }, global.polykeyStartupTimeout);

    test('Process should refresh the session token', async () => {
      tokenBuffer = await fs.promises.readFile(sessionFile);
      token = tokenBuffer.toString() as SessionToken;
      const prevToken = token;

      // At least 1 second of delay
      // Expiry time resolution is in seconds
      await sleep(1100);
      const result = await testUtils.pkStdio(command, {}, dataDir);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(vaultName);

      const buff = await fs.promises.readFile(sessionFile);
      const newToken = buff.toString() as SessionToken;
      expect(
        async () => await polykeyAgent.sessionManager.verifyToken(newToken),
      ).not.toThrow();
      // Make sure the first and second tokens are not the same
      expect(newToken).not.toEqual(prevToken);
    });

    test('Serial processes should refresh the session token', async () => {
      let result = await testUtils.pkStdio(command, {}, dataDir);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(vaultName);

      tokenBuffer = await fs.promises.readFile(sessionFile);
      const token1 = tokenBuffer.toString() as SessionToken;
      expect(
        async () => await polykeyAgent.sessionManager.verifyToken(token1),
      ).not.toThrow();

      // At least 1 second of delay
      // Expiry time resolution is in seconds
      await sleep(1100);
      result = await testUtils.pkStdio(command, {}, dataDir);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(vaultName);

      tokenBuffer = await fs.promises.readFile(sessionFile);
      const token2 = tokenBuffer.toString() as SessionToken;
      expect(
        async () => await polykeyAgent.sessionManager.verifyToken(token2),
      ).not.toThrow();

      // Make sure the first and second tokens are not the same
      expect(token1).not.toEqual(token2);
    });

    test(
      'Failing processes should unlock the session file',
      async () => {
        const result = await testUtils.pkStdio(
          ['vaults', 'delete', 'NotAVault', '-np', nodePath],
          {},
          dataDir,
        );
        expect(result.exitCode).not.toBe(0);

        tokenBuffer = await fs.promises.readFile(sessionFile);
        token = tokenBuffer.toString() as SessionToken;
        expect(
          async () => await polykeyAgent.sessionManager.verifyToken(token),
        ).not.toThrow();

        // Try to lock the session file to ensure it's unlocked
        const fd = fs.openSync(sessionFile, 'r');
        expect(lock(fd)).toBeTruthy();
        lock.unlock(fd);
        fs.closeSync(fd);
      },
      global.failedConnectionTimeout,
    );

    test('Parallel processes should not refresh the session token', async () => {
      let tokenP1 = 'token1' as SessionToken;
      let tokenP2 = 'token2' as SessionToken;

      tokenBuffer = await fs.promises.readFile(sessionFile);
      const prevTokenParallel = tokenBuffer.toString() as SessionToken;

      async function runListCommand(): Promise<SessionToken> {
        // At least 1 second of delay
        // Expiry time resolution is in seconds
        await sleep(1000);
        await testUtils.pkStdio(command, {}, dataDir);
        const buffer = await fs.promises.readFile(sessionFile);
        return buffer.toString() as SessionToken;
      }

      [tokenP1, tokenP2] = await Promise.all([
        runListCommand(),
        runListCommand(),
      ]);

      // Verify both tokens
      expect(
        async () => await polykeyAgent.sessionManager.verifyToken(tokenP1),
      ).not.toThrow();
      expect(
        async () => await polykeyAgent.sessionManager.verifyToken(tokenP2),
      ).not.toThrow();

      // Check that both commands were completed
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
