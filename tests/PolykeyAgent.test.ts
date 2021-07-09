import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import * as utils from '@/utils';

describe('Polykey', () => {
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
  test('construction', () => {
    const pk = new PolykeyAgent({ logger });
    expect(pk).toBeInstanceOf(PolykeyAgent);
    expect(pk.nodePath).toBe(utils.getDefaultNodePath());
  });
  test('construction has no side effects', async () => {
    const nodePath = `${dataDir}/polykey`;
    new PolykeyAgent({ nodePath, logger });
    await expect(fs.promises.stat(nodePath)).rejects.toThrow(/ENOENT/);
  });
  test('async start constructs node path', async () => {
    const nodePath = `${dataDir}/polykey`;
    const pk = new PolykeyAgent({ nodePath, logger });
    await pk.start({ password: 'password' });
    const nodePathContents = await fs.promises.readdir(nodePath);
    expect(nodePathContents).toContain('keys');
    expect(nodePathContents).toContain('vaults');
    expect(nodePathContents).toContain('db');
    expect(nodePathContents).toContain('nodes');
    expect(nodePathContents).toContain('identities');
    await pk.stop();
  });
  test('async stop leaves the node path', async () => {
    const nodePath = `${dataDir}/polykey`;
    const pk = new PolykeyAgent({ nodePath, logger });
    await pk.start({ password: 'password' });
    await pk.stop();
    const nodePathContents = await fs.promises.readdir(nodePath);
    expect(nodePathContents).toContain('keys');
    expect(nodePathContents).toContain('vaults');
    expect(nodePathContents).toContain('db');
    expect(nodePathContents).toContain('nodes');
    expect(nodePathContents).toContain('identities');
    await fs.promises.rm(dataDir, { force: true, recursive: true });
  });
});
