import type { StateVersion } from '@/schema/types';
import type { CertManagerChangeData } from '@/keys/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import { Status } from '@/status';
import { Schema } from '@/schema';
import * as errors from '@/errors';
import config from '@/config';
import { promise } from '@/utils';
import * as keysUtils from '@/keys/utils';
import * as keysEvents from '@/keys/events';

describe('PolykeyAgent', () => {
  const password = 'password';
  const localhost = '127.0.0.1';
  const logger = new Logger('PolykeyAgent Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
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
  test('PolykeyAgent readiness', async () => {
    const nodePath = path.join(dataDir, 'polykey');
    const pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      options: {
        nodePath,
        agentServiceHost: localhost,
        clientServiceHost: localhost,
        keys: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      },
      logger,
    });
    await expect(pkAgent.destroy(password)).rejects.toThrow(
      errors.ErrorPolykeyAgentRunning,
    );
    // Should be a noop
    await pkAgent.start({ password });
    await pkAgent.stop();
    await pkAgent.destroy(password);
    await expect(pkAgent.start({ password })).rejects.toThrow(
      errors.ErrorPolykeyAgentDestroyed,
    );
  });
  test('start creates, stop leaves, and destroy destroys the node path', async () => {
    const nodePath = `${dataDir}/polykey`;
    const pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      options: {
        nodePath,
        workers: 0,
        agentServiceHost: localhost,
        clientServiceHost: localhost,
        keys: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      },
      logger,
    });
    let nodePathContents = await fs.promises.readdir(nodePath);
    expect(nodePathContents).toContain(config.paths.statusBase);
    expect(nodePathContents).toContain(config.paths.stateBase);
    let stateContents = await fs.promises.readdir(
      path.join(nodePath, config.paths.stateBase),
    );
    expect(stateContents).toContain(config.paths.keysBase);
    expect(stateContents).toContain(config.paths.dbBase);
    expect(stateContents).toContain(config.paths.vaultsBase);
    await pkAgent.stop();
    nodePathContents = await fs.promises.readdir(nodePath);
    expect(nodePathContents).toContain(config.paths.statusBase);
    expect(nodePathContents).toContain(config.paths.stateBase);
    stateContents = await fs.promises.readdir(
      path.join(nodePath, config.paths.stateBase),
    );
    expect(stateContents).toContain(config.paths.keysBase);
    expect(stateContents).toContain(config.paths.dbBase);
    expect(stateContents).toContain(config.paths.vaultsBase);
    await pkAgent.destroy(password);
    nodePathContents = await fs.promises.readdir(nodePath);
    // The status will be the only file left over
    expect(nodePathContents).toHaveLength(1);
    expect(nodePathContents).toContain(config.paths.statusBase);
  });
  test('start after stop', async () => {
    const nodePath = `${dataDir}/polykey`;
    const statusPath = path.join(nodePath, config.paths.statusBase);
    const statusLockPath = path.join(nodePath, config.paths.statusLockBase);
    const pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      options: {
        nodePath,
        agentServiceHost: localhost,
        clientServiceHost: localhost,
        keys: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      },
      logger,
    });
    const status = new Status({
      statusPath,
      statusLockPath,
      fs,
      logger,
    });
    await pkAgent.stop();
    expect(await status.readStatus()).toMatchObject({ status: 'DEAD' });
    await expect(pkAgent.start({ password })).resolves.not.toThrowError();
    expect(await status.readStatus()).toMatchObject({ status: 'LIVE' });
    await pkAgent.stop();
    expect(await status.readStatus()).toMatchObject({ status: 'DEAD' });
    await expect(
      pkAgent.start({ password: 'wrong password' }),
    ).rejects.toThrowError(errors.ErrorKeyPairParse);
    expect(await status.readStatus()).toMatchObject({ status: 'DEAD' });
    await pkAgent.destroy(password);
    expect(await status.readStatus()).toMatchObject({ status: 'DEAD' });
  });
  test('schema state version is maintained after start and stop', async () => {
    const nodePath = path.join(dataDir, 'polykey');
    const statePath = path.join(nodePath, config.paths.stateBase);
    const schema = new Schema({
      statePath,
    });
    const pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      options: {
        nodePath,
        agentServiceHost: localhost,
        clientServiceHost: localhost,
        keys: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      },
      logger,
    });
    expect(await schema.readVersion()).toBe(config.stateVersion);
    await pkAgent.stop();
    // Still exists after being stopped
    expect(await schema.readVersion()).toBe(config.stateVersion);
  });
  test('cannot start during state version mismatch', async () => {
    const nodePath = path.join(dataDir, 'polykey');
    const statePath = path.join(nodePath, config.paths.stateBase);
    await fs.promises.mkdir(nodePath);
    let schema = await Schema.createSchema({
      statePath,
      stateVersion: (config.stateVersion + 1) as StateVersion,
      logger,
      fresh: true,
    });
    await schema.stop();
    await expect(
      PolykeyAgent.createPolykeyAgent({
        password,
        options: {
          nodePath,
          agentServiceHost: localhost,
          clientServiceHost: localhost,
          keys: {
            passwordOpsLimit: keysUtils.passwordOpsLimits.min,
            passwordMemLimit: keysUtils.passwordMemLimits.min,
            strictMemoryLock: false,
          },
        },
        logger,
      }),
    ).rejects.toThrow(errors.ErrorSchemaVersionTooNew);
    // The 0 version will always be too old
    // Because we started our PK's state version as 1
    schema = await Schema.createSchema({
      statePath,
      stateVersion: 0 as StateVersion,
      logger,
      fresh: true,
    });
    await schema.stop();
    await expect(
      PolykeyAgent.createPolykeyAgent({
        password,
        options: {
          nodePath,
          agentServiceHost: localhost,
          clientServiceHost: localhost,
          keys: {
            passwordOpsLimit: keysUtils.passwordOpsLimits.min,
            passwordMemLimit: keysUtils.passwordMemLimits.min,
            strictMemoryLock: false,
          },
        },
        logger,
      }),
    ).rejects.toThrow(errors.ErrorSchemaVersionTooOld);
  });
  test('renewRootKeyPair change event propagates', async () => {
    const nodePath = `${dataDir}/polykey`;
    let pkAgent: PolykeyAgent | undefined;
    try {
      pkAgent = await PolykeyAgent.createPolykeyAgent({
        password,
        options: {
          nodePath,
          agentServiceHost: localhost,
          clientServiceHost: localhost,
          keys: {
            passwordOpsLimit: keysUtils.passwordOpsLimits.min,
            passwordMemLimit: keysUtils.passwordMemLimits.min,
            strictMemoryLock: false,
          },
        },
        logger,
      });
      const prom = promise<CertManagerChangeData>();
      pkAgent.certManager.addEventListener(
        keysEvents.EventCertManagerCertChange.name,
        async (evt: keysEvents.EventCertManagerCertChange) => {
          const data = evt.detail;
          prom.resolveP(data);
        },
        { once: true },
      );
      await pkAgent.certManager.renewCertWithNewKeyPair(password);

      await expect(prom.p).resolves.toBeDefined();
    } finally {
      await pkAgent?.stop();
      await pkAgent?.destroy(password);
    }
  });
  test('resetRootKeyPair change event propagates', async () => {
    const nodePath = `${dataDir}/polykey`;
    let pkAgent: PolykeyAgent | undefined;
    try {
      pkAgent = await PolykeyAgent.createPolykeyAgent({
        password,
        options: {
          nodePath,
          agentServiceHost: localhost,
          clientServiceHost: localhost,
          keys: {
            passwordOpsLimit: keysUtils.passwordOpsLimits.min,
            passwordMemLimit: keysUtils.passwordMemLimits.min,
            strictMemoryLock: false,
          },
        },
        logger,
      });
      const prom = promise<CertManagerChangeData>();
      pkAgent.certManager.addEventListener(
        keysEvents.EventCertManagerCertChange.name,
        async (evt: keysEvents.EventCertManagerCertChange) => {
          const data = evt.detail;
          prom.resolveP(data);
        },
        { once: true },
      );
      await pkAgent.certManager.resetCertWithNewKeyPair(password);

      await expect(prom.p).resolves.toBeDefined();
    } finally {
      await pkAgent?.stop();
      await pkAgent?.destroy(password);
    }
  });
  test('resetRootCert change event propagates', async () => {
    const nodePath = `${dataDir}/polykey`;
    let pkAgent: PolykeyAgent | undefined;
    try {
      pkAgent = await PolykeyAgent.createPolykeyAgent({
        password,
        options: {
          nodePath,
          agentServiceHost: localhost,
          clientServiceHost: localhost,
          keys: {
            passwordOpsLimit: keysUtils.passwordOpsLimits.min,
            passwordMemLimit: keysUtils.passwordMemLimits.min,
            strictMemoryLock: false,
          },
        },
        logger,
      });
      const prom = promise<CertManagerChangeData>();
      pkAgent.certManager.addEventListener(
        keysEvents.EventCertManagerCertChange.name,
        async (evt: keysEvents.EventCertManagerCertChange) => {
          const data = evt.detail;
          prom.resolveP(data);
        },
        { once: true },
      );
      await pkAgent.certManager.resetCertWithCurrentKeyPair();

      await expect(prom.p).resolves.toBeDefined();
    } finally {
      await pkAgent?.stop();
      await pkAgent?.destroy(password);
    }
  });
});
