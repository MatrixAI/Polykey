import os from 'os';
import path from 'path';
import fsPromises from 'fs/promises';
import fs from 'fs';
import git from 'isomorphic-git';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { KeyManager } from '@/keys';
import { VaultManager } from '@/vaults';
import { GitBackend } from '@/git';
import { GitRequest } from '@/git';

let dataDir: string;
let destDir: string;
let keyManager: KeyManager;
let vaultManager: VaultManager;
let gitBackend: GitBackend;
let gitRequest: GitRequest;
const logger = new Logger('GitBackend', LogLevel.WARN, [new StreamHandler()]);

beforeEach(async () => {
  dataDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-'));
  destDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-'));
  keyManager = new KeyManager({
    keysPath: `${dataDir}/keys`,
    logger: logger,
  });
  vaultManager = new VaultManager({
    baseDir: dataDir,
    keyManager: keyManager,
    fs: fsPromises,
    logger: logger,
  });
  gitBackend = new GitBackend(
    dataDir,
    ((repoName: string) => vaultManager.getVault(repoName).EncryptedFS).bind(
      this,
    ),
    vaultManager.listVaults.bind(this),
    new Logger(),
  );
  gitRequest = new GitRequest(
    gitBackend.handleInfoRequest.bind(gitBackend),
    gitBackend.handlePackRequest.bind(gitBackend),
    gitBackend.handleVaultNamesRequest.bind(gitBackend),
  );
});

afterEach(async () => {
  await fsPromises.rm(dataDir, {
    force: true,
    recursive: true,
  });
  await fsPromises.rm(destDir, {
    force: true,
    recursive: true,
  });
});

describe('GitBackend is', () => {
  test('type correct', async () => {
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      const gitBackend = new GitBackend(
        dataDir,
        ((repoName: string) =>
          vaultManager.getVault(repoName).EncryptedFS).bind(this),
        vaultManager.listVaults.bind(this),
        new Logger(),
      );
      expect(gitBackend).toBeInstanceOf(GitBackend);
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
  });
  test('returning correct info response', async () => {
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      const gitBackend = new GitBackend(
        dataDir,
        ((repoName: string) =>
          vaultManager.getVault(repoName).EncryptedFS).bind(this),
        vaultManager.listVaults.bind(this),
        new Logger(),
      );
      const vault = await vaultManager.addVault('MyTestVault');
      await vault.initializeVault();
      const response = await gitBackend.handleInfoRequest('MyTestVault');
      // response should be similar to 001e# service=git-upload-pack\n0000007dec36c2af9201e3ba466b73086ac6e09dff3c6f99 HEADside-band-64k symref=HEAD:refs/heads/master agent=git/isomorphic-git@1.4.0\n003fec36c2af9201e3ba466b73086ac6e09dff3c6f99 refs/heads/master\n0000
      expect(response.toString().length).toBe(226);
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
  });
  test('returning correct pack response', async () => {
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      const gitBackend = new GitBackend(
        dataDir,
        ((repoName: string) =>
          vaultManager.getVault(repoName).EncryptedFS).bind(this),
        vaultManager.listVaults.bind(this),
        new Logger(),
      );
      const vault = await vaultManager.addVault('MyTestVault');
      await vault.initializeVault();
      const response = await gitBackend.handlePackRequest(
        'MyTestVault',
        Buffer.from(
          '0054want 74730d410fcb6603ace96f1dc55ea6196122532d multi_ackside-band-64k ofs-delta\n',
        ),
      );
      // response should be similar to 001e# service=git-upload-pack\n0000007dec36c2af9201e3ba466b73086ac6e09dff3c6f99 HEADside-band-64k symref=HEAD:refs/heads/master agent=git/isomorphic-git@1.4.0\n003fec36c2af9201e3ba466b73086ac6e09dff3c6f99 refs/heads/master\n0000
      expect(response.toString()).toContain('progress is at');
      expect(response.toString()).toContain('PACK');
      // The above were inferred to be in the message by logging the response.toString() itself.
    } finally {
      await keyManager.stop();
      await vaultManager.stop();
    }
  });
  test('can clone an empty repo', async () => {
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      const vault = await vaultManager.addVault('vault-1');
      await vault.initializeVault();
      await git.clone({
        fs: { promises: fsPromises },
        http: gitRequest,
        dir: path.join(destDir, vault.vaultName),
        url: `http://0.0.0.0/${vault.vaultName}`,
      });
      expect(fs.existsSync(path.join(destDir, vault.vaultName))).toBe(true);
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
  });
  test('can clone a repo', async () => {
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      const vault = await vaultManager.addVault('vault-1');
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));
      await git.clone({
        fs: { promises: fsPromises },
        http: gitRequest,
        dir: path.join(destDir, vault.vaultName),
        url: `http://0.0.0.0/${vault.vaultName}`,
      });
      expect(
        fs.existsSync(path.join(destDir, vault.vaultName, 'secret-1')),
      ).toBe(true);
      expect(
        fs.readFileSync(path.join(destDir, vault.vaultName, 'secret-1')),
      ).toStrictEqual(Buffer.from('secret-content'));
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
  });
  test('can clone a repo with directories', async () => {
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      const vault = await vaultManager.addVault('vault-1');
      await vault.initializeVault();
      await vault.mkdir('dir-1', { recursive: true });
      await vault.mkdir('dir-2', { recursive: true });
      await vault.mkdir(path.join('dir-3', 'dir-4'), { recursive: true });
      await vault.addSecret(
        path.join('dir-3', 'dir-4', 'secret-1'),
        Buffer.from('secret-content'),
      );
      await vault.addSecret('secret-2', Buffer.from('secret-content-2'));
      await git.clone({
        fs: { promises: fsPromises },
        http: gitRequest,
        dir: path.join(destDir, vault.vaultName),
        url: `http://0.0.0.0/${vault.vaultName}`,
      });
      expect(
        fs.readFileSync(path.join(destDir, vault.vaultName, 'secret-2')),
      ).toStrictEqual(Buffer.from('secret-content-2'));
      expect(
        fs.readFileSync(
          path.join(destDir, vault.vaultName, 'dir-3', 'dir-4', 'secret-1'),
        ),
      ).toStrictEqual(Buffer.from('secret-content'));
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
  });
  test('can pull a repo', async () => {
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      const vault = await vaultManager.addVault('vault-1');
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));
      await git.clone({
        fs: { promises: fsPromises },
        http: gitRequest,
        dir: path.join(destDir, vault.vaultName),
        url: `http://0.0.0.0/${vault.vaultName}`,
      });
      await git.setConfig({
        fs,
        dir: path.join(destDir, vault.vaultName),
        path: 'user.name',
        value: vault.vaultName,
      });
      await vault.updateSecret('secret-1', Buffer.from('content-change'));
      await git.pull({
        fs: { promises: fsPromises },
        http: gitRequest,
        dir: path.join(destDir, vault.vaultName),
      });
      expect(
        fs.readFileSync(path.join(destDir, vault.vaultName, 'secret-1')),
      ).toStrictEqual(Buffer.from('content-change'));
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
  });
  test('can pull a repo with directories', async () => {
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      const vault = await vaultManager.addVault('vault-1');
      await vault.initializeVault();
      await vault.mkdir('dir-1', { recursive: true });
      await vault.mkdir('dir-2', { recursive: true });
      await vault.mkdir(path.join('dir-3', 'dir-4'), { recursive: true });
      await vault.addSecret(
        path.join('dir-3', 'dir-4', 'secret-1'),
        Buffer.from('secret-content'),
      );
      await vault.addSecret('secret-2', Buffer.from('secret-content-2'));
      await git.clone({
        fs: { promises: fsPromises },
        http: gitRequest,
        dir: path.join(destDir, vault.vaultName),
        url: `http://0.0.0.0/${vault.vaultName}`,
      });
      await git.setConfig({
        fs,
        dir: path.join(destDir, vault.vaultName),
        path: 'user.name',
        value: vault.vaultName,
      });
      await vault.updateSecret('secret-2', Buffer.from('content-change'));
      await vault.updateSecret(
        path.join('dir-3', 'dir-4', 'secret-1'),
        Buffer.from('content-change-2'),
      );
      await git.pull({
        fs: { promises: fsPromises },
        http: gitRequest,
        dir: path.join(destDir, vault.vaultName),
      });
      expect(
        fs.readFileSync(path.join(destDir, vault.vaultName, 'secret-2')),
      ).toStrictEqual(Buffer.from('content-change'));
      expect(
        fs.readFileSync(
          path.join(destDir, vault.vaultName, 'dir-3', 'dir-4', 'secret-1'),
        ),
      ).toStrictEqual(Buffer.from('content-change-2'));
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
  });
  test('can pull a repo when a directory has been added after cloning', async () => {
    try {
      await keyManager.start({ password: 'password' });
      await vaultManager.start({});
      const vault = await vaultManager.addVault('vault-1');
      await vault.initializeVault();
      await vault.mkdir('dir-1', { recursive: true });
      await vault.mkdir('dir-2', { recursive: true });
      await vault.mkdir(path.join('dir-3', 'dir-4'), { recursive: true });
      await vault.addSecret(
        path.join('dir-3', 'dir-4', 'secret-1'),
        Buffer.from('secret-content'),
      );
      await vault.addSecret('secret-2', Buffer.from('secret-content-2'));
      await git.clone({
        fs: { promises: fsPromises },
        http: gitRequest,
        dir: path.join(destDir, vault.vaultName),
        url: `http://0.0.0.0/${vault.vaultName}`,
      });
      await git.setConfig({
        fs,
        dir: path.join(destDir, vault.vaultName),
        path: 'user.name',
        value: vault.vaultName,
      });
      await vault.updateSecret('secret-2', Buffer.from('content-change'));
      await vault.updateSecret(
        path.join('dir-3', 'dir-4', 'secret-1'),
        Buffer.from('content-change-2'),
      );
      await vault.mkdir(path.join('dir-5'), { recursive: true });
      await vault.addSecret(
        path.join('dir-5', 'secret-3'),
        Buffer.from('secret-content-3'),
      );
      await git.pull({
        fs: { promises: fsPromises },
        http: gitRequest,
        dir: path.join(destDir, vault.vaultName),
      });
      expect(
        fs.readFileSync(path.join(destDir, vault.vaultName, 'secret-2')),
      ).toStrictEqual(Buffer.from('content-change'));
      expect(
        fs.readFileSync(
          path.join(destDir, vault.vaultName, 'dir-3', 'dir-4', 'secret-1'),
        ),
      ).toStrictEqual(Buffer.from('content-change-2'));
      expect(
        fs.readFileSync(
          path.join(destDir, vault.vaultName, 'dir-5', 'secret-3'),
        ),
      ).toStrictEqual(Buffer.from('secret-content-3'));
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
  });
});
