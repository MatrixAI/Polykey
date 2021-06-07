import os from 'os';
import path from 'path';
import fs from 'fs';

import { checkKeynodeState } from '@/bootstrap';

import * as utils from './utils';

let dataDir: string;
let passwordFile: string;
let nodePath: string;

describe('CLI bootstrap', () => {
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

  test("Should create state if directory doesn't exist.", async () => {
    const result = await utils.pk([
      'bootstrap',
      '-np',
      nodePath,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);

    expect(await checkKeynodeState(nodePath)).toBe('KEYNODE_EXISTS');
  });
  test('Should create state if directory is empty.', async () => {
    await fs.promises.mkdir(nodePath);
    const result = await utils.pk([
      'bootstrap',
      '-np',
      nodePath,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);

    expect(await checkKeynodeState(nodePath)).toBe('KEYNODE_EXISTS');
  });
  test('Should fail if keynode exists.', async () => {
    const result = await utils.pk([
      'bootstrap',
      '-np',
      nodePath,
      '--password-file',
      passwordFile,
    ]);
    expect(result === 0).toBeTruthy();
    expect(await checkKeynodeState(nodePath)).toBe('KEYNODE_EXISTS');

    const result2 = await utils.pk([
      'bootstrap',
      '-np',
      nodePath,
      '--password-file',
      passwordFile,
    ]);
    expect(result2 === 0).toBeFalsy();

    expect(await checkKeynodeState(nodePath)).toBe('KEYNODE_EXISTS');
  });
  test('Should fail if files exists.', async () => {
    await fs.promises.mkdir(path.join(nodePath, 'NOTAKEYNODEDIR'), {
      recursive: true,
    });
    const result = await utils.pk([
      'bootstrap',
      '-np',
      nodePath,
      '--password-file',
      passwordFile,
    ]);
    expect(result === 0).toBeFalsy();
    expect(await checkKeynodeState(nodePath)).toBe('OTHER_EXISTS');
  });
});
