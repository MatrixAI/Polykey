import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import Polykey from '@/PolykeyAgent';
import * as utils from '@/utils';

describe('Polykey', () => {
  const logger = new Logger('Polykey Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  beforeEach(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'polykey-test-'));
  });
  afterEach(async () => {
    await fs.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('construction', () => {
    const pk = new Polykey({ logger });
    expect(pk).toBeInstanceOf(Polykey);
    expect(pk.nodePath).toBe(utils.getDefaultNodePath());
  });
  test('construction has no side effects', async () => {
    const nodePath = `${dataDir}/polykey`;
    new Polykey({ nodePath, logger });
    await expect(fs.stat(nodePath)).rejects.toThrow(/ENOENT/);
  });
  test('async start constructs node path', async () => {
    const nodePath = `${dataDir}/polykey`;
    const pk = new Polykey({ nodePath, logger });
    await pk.start({ password: 'password' });
    const nodePathContents = await fs.readdir(nodePath);
    expect(nodePathContents).toContain('keys');
    expect(nodePathContents).toContain('vaults');
    expect(nodePathContents).toContain('gestalts');
    expect(nodePathContents).toContain('identities');
    await pk.stop();
  });
  test('async stop leaves the node path', async () => {
    const nodePath = `${dataDir}/polykey`;
    const pk = new Polykey({ nodePath, logger });
    await pk.start({ password: 'password' });
    await pk.stop();
    const nodePathContents = await fs.readdir(nodePath);
    expect(nodePathContents).toContain('keys');
    expect(nodePathContents).toContain('vaults');
    expect(nodePathContents).toContain('gestalts');
    expect(nodePathContents).toContain('identities');
    await fs.rm(dataDir, { force: true, recursive: true });
  });
});
