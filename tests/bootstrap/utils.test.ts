import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as bootstrapUtils from '@/bootstrap/utils';
import * as bootstrapErrors from '@/bootstrap/errors';
import { errors as statusErrors } from '@/status';
import config from '@/config';

describe('bootstrap/utils', () => {
  const logger = new Logger('bootstrap/utils test', LogLevel.WARN, [
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
  test('bootstraps new node path', async () => {
    const nodePath = path.join(dataDir, 'polykey');
    const password = 'password';
    const recoveryCode = await bootstrapUtils.bootstrapState({
      password,
      nodePath,
      fs,
      logger,
    });
    expect(typeof recoveryCode).toBe('string');
    expect(
      recoveryCode!.split(' ').length === 12 ||
        recoveryCode!.split(' ').length === 24,
    ).toBe(true);
    const nodePathContents = await fs.promises.readdir(nodePath);
    expect(nodePathContents.length > 0).toBe(true);
    expect(nodePathContents).toContain(config.paths.statusBase);
    expect(nodePathContents).toContain(config.paths.stateBase);
    const stateContents = await fs.promises.readdir(
      path.join(nodePath, config.paths.stateBase),
    );
    expect(stateContents).toContain(config.paths.keysBase);
    expect(stateContents).toContain(config.paths.dbBase);
    expect(stateContents).toContain(config.paths.vaultsBase);
  });
  test('bootstraps existing but empty node path', async () => {
    const nodePath = path.join(dataDir, 'polykey');
    await fs.promises.mkdir(nodePath);
    const password = 'password';
    const recoveryCode = await bootstrapUtils.bootstrapState({
      password,
      nodePath,
      fs,
      logger,
    });
    expect(typeof recoveryCode).toBe('string');
    expect(
      recoveryCode!.split(' ').length === 12 ||
        recoveryCode!.split(' ').length === 24,
    ).toBe(true);
    const nodePathContents = await fs.promises.readdir(nodePath);
    expect(nodePathContents.length > 0).toBe(true);
    expect(nodePathContents).toContain(config.paths.statusBase);
    expect(nodePathContents).toContain(config.paths.stateBase);
    const stateContents = await fs.promises.readdir(
      path.join(nodePath, config.paths.stateBase),
    );
    expect(stateContents).toContain(config.paths.keysBase);
    expect(stateContents).toContain(config.paths.dbBase);
    expect(stateContents).toContain(config.paths.vaultsBase);
  });
  test('bootstrap fails if non-empty node path', async () => {
    // Normal file
    const nodePath1 = path.join(dataDir, 'polykey1');
    await fs.promises.mkdir(nodePath1);
    await fs.promises.writeFile(
      path.join(nodePath1, 'random'),
      'normal file',
      'utf-8',
    );
    const password = 'password';
    await expect(
      bootstrapUtils.bootstrapState({
        password,
        nodePath: nodePath1,
        fs,
        logger,
      }),
    ).rejects.toThrowError(bootstrapErrors.ErrorBootstrapExistingState);
    // Hidden file
    const nodePath2 = path.join(dataDir, 'polykey2');
    await fs.promises.mkdir(nodePath2);
    await fs.promises.writeFile(
      path.join(nodePath2, '.random'),
      'hidden file',
      'utf-8',
    );
    await expect(
      bootstrapUtils.bootstrapState({
        password,
        nodePath: nodePath2,
        fs,
        logger,
      }),
    ).rejects.toThrowError(bootstrapErrors.ErrorBootstrapExistingState);
    // Directory
    const nodePath3 = path.join(dataDir, 'polykey3');
    await fs.promises.mkdir(nodePath3);
    await fs.promises.mkdir(path.join(nodePath3, 'random'));
    await expect(
      bootstrapUtils.bootstrapState({
        password,
        nodePath: nodePath3,
        fs,
        logger,
      }),
    ).rejects.toThrowError(bootstrapErrors.ErrorBootstrapExistingState);
  });
  test('concurrent bootstrapping results in 1 success', async () => {
    const nodePath = path.join(dataDir, 'polykey');
    const password = 'password';
    const [result1, result2] = await Promise.allSettled([
      bootstrapUtils.bootstrapState({
        password,
        nodePath,
        fs,
        logger,
      }),
      bootstrapUtils.bootstrapState({
        password,
        nodePath,
        fs,
        logger,
      }),
    ]);
    expect(
      (result1.status === 'rejected' &&
        result1.reason instanceof statusErrors.ErrorStatusLocked) ||
        (result2.status === 'rejected' &&
          result2.reason instanceof statusErrors.ErrorStatusLocked),
    ).toBe(true);
    expect(
      (result1.status === 'fulfilled' && typeof result1.value === 'string') ||
        (result2.status === 'fulfilled' && typeof result2.value === 'string'),
    ).toBe(true);
  });
});
