import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import * as utils from './utils';

import { PolykeyAgent } from '@';

const logger = new Logger('CLI Test', LogLevel.WARN, [new StreamHandler()]);
let dataDir: string;
let polykeyAgent: PolykeyAgent;
let passwordFile: string;
const jwtTokenExitCode = 77;

describe('CLI keys', () => {
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    passwordFile = path.join(dataDir, 'passwordFile');
    await fs.promises.writeFile(passwordFile, 'password');
    polykeyAgent = new PolykeyAgent({
      nodePath: dataDir,
      logger: logger,
    });
    await polykeyAgent.start({
      password: 'password',
    });

    // Authorize session
    await utils.pk([
      'agent',
      'unlock',
      '-np',
      dataDir,
      '--password-file',
      passwordFile,
    ]);
  });

  afterEach(async () => {
    await polykeyAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('should get the certificate chain', async () => {
    const result = await utils.pk([
      'keys',
      'certchain',
      '-np',
      dataDir,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);
  });
  test('should get the certificate', async () => {
    const result = await utils.pk([
      'keys',
      'cert',
      '-np',
      dataDir,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);
  });
  test('should get the root keypair', async () => {
    const result = await utils.pk([
      'keys',
      'root',
      '-np',
      dataDir,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);

    const result2 = await utils.pk([
      'keys',
      'root',
      '-np',
      dataDir,
      '-pk',
      '--password-file',
      passwordFile,
    ]);
    expect(result2).toBe(0);
  });
  test('should change the root password', async () => {
    const passPath = path.join(dataDir, 'passwordChange');
    await fs.promises.writeFile(passPath, 'password-change');

    await polykeyAgent.stop();
    await polykeyAgent.start({ password: 'password' });

    const result2 = await utils.pk([
      'keys',
      'password',
      '-np',
      dataDir,
      '-pp',
      passPath,
      '--password-file',
      passwordFile,
    ]);
    expect(result2).toBe(0);

    await polykeyAgent.stop();
    await polykeyAgent.start({ password: 'password-change' });
  });
  test('should encrypt data', async () => {
    const dataPath = path.join(dataDir, 'data');
    await fs.promises.writeFile(dataPath, 'encrypt-me', { encoding: 'binary' });
    const result = await utils.pk([
      'keys',
      'encrypt',
      '-np',
      dataDir,
      '-fp',
      dataPath,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);
  });
  test('should decrypt data', async () => {
    const dataPath = path.join(dataDir, 'data');
    const secret = Buffer.from('this is the secret', 'binary');
    const encrypted = await polykeyAgent.keys.encryptWithRootKeyPair(secret);
    await fs.promises.writeFile(dataPath, encrypted, { encoding: 'binary' });
    const result = await utils.pk([
      'keys',
      'decrypt',
      '-np',
      dataDir,
      '-fp',
      dataPath,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);
  });
  test('should renew the keypair', async () => {
    const rootKeypairOld = polykeyAgent.keys.getRootKeyPair();
    const passPath = path.join(dataDir, 'passwordNew');
    await fs.promises.writeFile(passPath, 'password-new');

    await polykeyAgent.stop();
    await polykeyAgent.start({ password: 'password' });

    const result2 = await utils.pk([
      'keys',
      'renew',
      '-np',
      dataDir,
      '-pp',
      passPath,
      '--password-file',
      passwordFile,
    ]);
    expect(result2).toBe(0);

    const rootKeypairNew = polykeyAgent.keys.getRootKeyPair();
    expect(rootKeypairNew.privateKey).not.toBe(rootKeypairOld.privateKey);
    expect(rootKeypairNew.publicKey).not.toBe(rootKeypairOld.publicKey);

    await polykeyAgent.stop();
    await polykeyAgent.start({ password: 'password-new' });
  });
  test('should reset the keypair', async () => {
    const rootKeypairOld = polykeyAgent.keys.getRootKeyPair();
    const passPath = path.join(dataDir, 'passwordNew');
    await fs.promises.writeFile(passPath, 'password-new');

    await polykeyAgent.stop();
    await polykeyAgent.start({ password: 'password' });

    const result2 = await utils.pk([
      'keys',
      'reset',
      '-np',
      dataDir,
      '-pp',
      passPath,
      '--password-file',
      passwordFile,
    ]);
    expect(result2).toBe(0);

    const rootKeypairNew = polykeyAgent.keys.getRootKeyPair();
    expect(rootKeypairNew.privateKey).not.toBe(rootKeypairOld.privateKey);
    expect(rootKeypairNew.publicKey).not.toBe(rootKeypairOld.publicKey);

    await polykeyAgent.stop();
    await polykeyAgent.start({ password: 'password-new' });
  });
  test('should sign a file', async () => {
    const dataPath = path.join(dataDir, 'data');
    await fs.promises.writeFile(dataPath, 'sign-me', { encoding: 'binary' });
    const result = await utils.pk([
      'keys',
      'sign',
      '-np',
      dataDir,
      '-fp',
      dataPath,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);
  });
  test('should verify a file', async () => {
    const dataPath = path.join(dataDir, 'data');
    await fs.promises.writeFile(dataPath, 'sign-me', { encoding: 'binary' });
    const signed = await polykeyAgent.keys.signWithRootKeyPair(
      Buffer.from('sign-me', 'binary'),
    );
    const signatureTrue = path.join(dataDir, 'data2');
    await fs.promises.writeFile(signatureTrue, signed, { encoding: 'binary' });
    const result = await utils.pk([
      'keys',
      'verify',
      '-np',
      dataDir,
      '-fp',
      dataPath,
      '-sp',
      signatureTrue,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(0);
  });
});

describe('CLI keys', () => {
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    passwordFile = path.join(dataDir, 'passwordFile');
    await fs.promises.writeFile(passwordFile, 'password');
    polykeyAgent = new PolykeyAgent({
      nodePath: dataDir,
      logger: logger,
    });
    await polykeyAgent.start({
      password: 'password',
    });
  });

  afterEach(async () => {
    await polykeyAgent.stop();
    await fs.promises.rmdir(dataDir, { recursive: true });
  });

  test('should not get the certificate chain without token', async () => {
    const result = await utils.pk([
      'keys',
      'certchain',
      '-np',
      dataDir,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(jwtTokenExitCode);
  });
  test('should not get the certificate without token', async () => {
    const result = await utils.pk([
      'keys',
      'cert',
      '-np',
      dataDir,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(jwtTokenExitCode);
  });
  test('should not get the root keypair without token', async () => {
    const result = await utils.pk([
      'keys',
      'root',
      '-np',
      dataDir,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(jwtTokenExitCode);
  });
  test('should not change the root password without token', async () => {
    const passPath = path.join(dataDir, 'passwordChange');
    await fs.promises.writeFile(passPath, 'password-change');

    await polykeyAgent.stop();
    await polykeyAgent.start({ password: 'password' });

    const result2 = await utils.pk([
      'keys',
      'password',
      '-np',
      dataDir,
      '-pp',
      passPath,
      '--password-file',
      passwordFile,
    ]);
    expect(result2).toBe(jwtTokenExitCode);
  });
  test('should not encrypt data without token', async () => {
    const dataPath = path.join(dataDir, 'data');
    await fs.promises.writeFile(dataPath, 'encrypt-me', { encoding: 'binary' });
    const result = await utils.pk([
      'keys',
      'encrypt',
      '-np',
      dataDir,
      '-fp',
      dataPath,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(jwtTokenExitCode);
  });
  test('should not decrypt data without token', async () => {
    const dataPath = path.join(dataDir, 'data');
    const secret = Buffer.from('this is the secret', 'binary');
    const encrypted = await polykeyAgent.keys.encryptWithRootKeyPair(secret);
    await fs.promises.writeFile(dataPath, encrypted, { encoding: 'binary' });
    const result = await utils.pk([
      'keys',
      'decrypt',
      '-np',
      dataDir,
      '-fp',
      dataPath,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(jwtTokenExitCode);
  });
  test('should not renew the keypair without token', async () => {
    const passPath = path.join(dataDir, 'passwordNew');
    await fs.promises.writeFile(passPath, 'password-new');

    await polykeyAgent.stop();
    await polykeyAgent.start({ password: 'password' });

    const result2 = await utils.pk([
      'keys',
      'renew',
      '-np',
      dataDir,
      '-pp',
      passPath,
      '--password-file',
      passwordFile,
    ]);
    expect(result2).toBe(jwtTokenExitCode);
  });
  test('should not reset the keypair without token', async () => {
    polykeyAgent.keys.getRootKeyPair();
    const passPath = path.join(dataDir, 'passwordNew');
    await fs.promises.writeFile(passPath, 'password-new');

    await polykeyAgent.stop();
    await polykeyAgent.start({ password: 'password' });

    const result2 = await utils.pk([
      'keys',
      'reset',
      '-np',
      dataDir,
      '-pp',
      passPath,
      '--password-file',
      passwordFile,
    ]);
    expect(result2).toBe(jwtTokenExitCode);
  });
  test('should not sign a file without token', async () => {
    const dataPath = path.join(dataDir, 'data');
    await fs.promises.writeFile(dataPath, 'sign-me', { encoding: 'binary' });
    const result = await utils.pk([
      'keys',
      'sign',
      '-np',
      dataDir,
      '-fp',
      dataPath,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(jwtTokenExitCode);
  });
  test('should not verify a file without token', async () => {
    const dataPath = path.join(dataDir, 'data');
    await fs.promises.writeFile(dataPath, 'sign-me', { encoding: 'binary' });
    const signed = await polykeyAgent.keys.signWithRootKeyPair(
      Buffer.from('sign-me', 'binary'),
    );
    const signatureTrue = path.join(dataDir, 'data2');
    await fs.promises.writeFile(signatureTrue, signed, { encoding: 'binary' });
    const result = await utils.pk([
      'keys',
      'verify',
      '-np',
      dataDir,
      '-fp',
      dataPath,
      '-sp',
      signatureTrue,
      '--password-file',
      passwordFile,
    ]);
    expect(result).toBe(jwtTokenExitCode);
  });
});
