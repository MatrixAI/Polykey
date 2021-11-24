import os from 'os';
import path from 'path';
import fs from 'fs';

import { checkKeynodeState } from '@/bootstrap';

import * as utils from './utils';

describe.skip('CLI bootstrap', () => {
  let dataDir: string;
  let passwordFile: string;
  let nodePath: string;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    passwordFile = path.join(dataDir, 'passwordFile');
    nodePath = path.join(dataDir, 'testnode');
    await fs.promises.writeFile(passwordFile, 'password');
  });
  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test("Should create keynode state if directory doesn't exist.", async () => {
    const result = await utils.pkStdio(
      ['bootstrap', '-np', nodePath, '--password-file', passwordFile],
      {},
      dataDir,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Polykey bootstrapped at Node Path:');
    expect(result.stdout).toContain(nodePath);
    expect(await checkKeynodeState(nodePath)).toBe('KEYNODE_EXISTS');
  });
  test('Should create keynode state if directory is empty.', async () => {
    await fs.promises.mkdir(nodePath);
    const result = await utils.pkStdio(
      ['bootstrap', '-np', nodePath, '--password-file', passwordFile],
      {},
      dataDir,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Polykey bootstrapped at Node Path:');
    expect(result.stdout).toContain(nodePath);
    expect(await checkKeynodeState(nodePath)).toBe('KEYNODE_EXISTS');
  });
  test('Should fail to create keynode state if keynode exists.', async () => {
    const result = await utils.pkStdio(
      ['bootstrap', '-np', nodePath, '--password-file', passwordFile],
      {},
      dataDir,
    );
    expect(result.exitCode).toBe(0);
    expect(await checkKeynodeState(nodePath)).toBe('KEYNODE_EXISTS');

    // Should fail here.
    const result2 = await utils.pkStdio(
      ['bootstrap', '-np', nodePath, '--password-file', passwordFile],
      {},
      dataDir,
    );
    expect(result2.exitCode).not.toBe(0);
    expect(result2.stdout).toContain('Error:');
    expect(result2.stdout).toContain('Files already exist at node path');
    expect(await checkKeynodeState(nodePath)).toBe('KEYNODE_EXISTS');
  });
  test('Should fail to create keynode state if other files exists.', async () => {
    await fs.promises.mkdir(path.join(nodePath, 'NOTAKEYNODEDIR'), {
      recursive: true,
    });
    const result = await utils.pkStdio(
      ['bootstrap', '-np', nodePath, '--password-file', passwordFile],
      {},
      dataDir,
    );
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toContain('Error:');
    expect(result.stdout).toContain('Files already exist at node path');
    expect(await checkKeynodeState(nodePath)).toBe('OTHER_EXISTS');
  });
});
