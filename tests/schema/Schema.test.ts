import type { StateVersion } from '@/schema/types';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import Schema from '@/schema/Schema';
import * as schemaErrors from '@/schema/errors';
import config from '@/config';

describe('Schema', () => {
  const logger = new Logger(`${Schema.name} Test`, LogLevel.INFO, [
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
  test('schema readiness', async () => {
    const schema = await Schema.createSchema({
      statePath: path.join(dataDir, 'state'),
      logger,
    });
    await expect(schema.destroy()).rejects.toThrow(
      schemaErrors.ErrorSchemaRunning,
    );
    // Should be a noop
    await schema.start();
    await schema.stop();
    await schema.destroy();
    await expect(schema.start()).rejects.toThrow(
      schemaErrors.ErrorSchemaDestroyed,
    );
    // Version can be read without being started
    expect(await schema.readVersion()).toBeUndefined();
  });
  test('creating schema', async () => {
    const schema = await Schema.createSchema({
      statePath: path.join(dataDir, 'state'),
      logger,
    });
    expect(await schema.readVersion()).toBe(config.stateVersion);
    await schema.stop();
  });
  test('creating schema with specific version and fresh', async () => {
    // Set the current version to 1
    const schema1 = await Schema.createSchema({
      statePath: path.join(dataDir, 'state'),
      stateVersion: 0 as StateVersion,
      logger,
    });
    expect(await schema1.readVersion()).toBe(0);
    await schema1.stop();
    // Can be read again
    const schema2 = await Schema.createSchema({
      statePath: path.join(dataDir, 'state'),
      stateVersion: 0 as StateVersion,
      logger,
    });
    expect(await schema2.readVersion()).toBe(0);
    await schema2.stop();
    // If current version is -1, then 0 is too new
    await expect(
      Schema.createSchema({
        statePath: path.join(dataDir, 'state'),
        stateVersion: -1 as StateVersion,
        logger,
      }),
    ).rejects.toThrow(schemaErrors.ErrorSchemaVersionTooNew);
    // If the current version is 1, then 0 should be upgradable
    // however there is no migration for version 1
    // so the version is too old
    await expect(
      Schema.createSchema({
        statePath: path.join(dataDir, 'state'),
        stateVersion: 1 as StateVersion,
        logger,
      }),
    ).rejects.toThrow(schemaErrors.ErrorSchemaVersionTooOld);
    // Fresh discards the exising state
    const schema3 = await Schema.createSchema({
      statePath: path.join(dataDir, 'state'),
      stateVersion: 100 as StateVersion,
      fresh: true,
      logger,
    });
    expect(await schema3.readVersion()).toBe(100);
    await schema3.stop();
  });
  test('destroying schema destroys underlying state', async () => {
    const schema1 = await Schema.createSchema({
      statePath: path.join(dataDir, 'state'),
      stateVersion: 100 as StateVersion,
      logger,
    });
    expect(await schema1.readVersion()).toBe(100);
    await schema1.stop();
    await schema1.destroy();
    await expect(
      fs.promises.access(path.join(dataDir, 'state')),
    ).rejects.toThrow(/ENOENT/);
    const schema2 = await Schema.createSchema({
      statePath: path.join(dataDir, 'state'),
      stateVersion: 200 as StateVersion,
      logger,
    });
    expect(await schema2.readVersion()).toBe(200);
    await schema2.stop();
  });
  test('concurrent version reads', async () => {
    const schema = await Schema.createSchema({
      statePath: path.join(dataDir, 'state'),
      logger,
    });
    const versions = await Promise.all([
      schema.readVersion(),
      schema.readVersion(),
      schema.readVersion(),
    ]);
    logger.info('VERSIONS: ' + versions.toString());
    expect(versions).toEqual([
      config.stateVersion,
      config.stateVersion,
      config.stateVersion,
    ]);
    await schema.stop();
  });
});
