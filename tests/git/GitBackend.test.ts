import os from 'os';
import path from 'path';
import fsPromises from 'fs/promises';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { KeyManager } from '../../src/keys';
import { VaultManager } from '../../src/vaults';
import { GitBackend } from '../../src/git';

let dataDir: string;
let destDir: string;
let keyManager: KeyManager;
let vaultManager: VaultManager;
// let gitBackend: GitBackend;
// let gitRequest: GitRequest;
const logger = new Logger('GitBackend', LogLevel.WARN, [new StreamHandler()]);

beforeEach(async () => {
  dataDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-'));
  destDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-'));
  keyManager = new KeyManager({
    keysPath: `${dataDir}/keys`,
    logger: logger,
  });
  vaultManager = new VaultManager({
    vaultsPath: dataDir,
    keyManager: keyManager,
    fs: fsPromises,
    logger: logger,
  });
  // gitBackend = new GitBackend({
  //   getVault: vaultManager.getVault.bind(vaultManager),
  //   getVaultID: vaultManager.getVaultIds.bind(vaultManager),
  //   getVaultNames: vaultManager.listVaults.bind(vaultManager),
  //   logger: logger,
  // });
  // gitRequest = new GitRequest(
  //   gitBackend.handleInfoRequest.bind(gitBackend),
  //   gitBackend.handlePackRequest.bind(gitBackend),
  //   gitBackend.handleVaultNamesRequest.bind(gitBackend),
  // );
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
      const gitBackend = new GitBackend({
        getVault: vaultManager.getVault.bind(vaultManager),
        getVaultID: vaultManager.getVaultIds.bind(vaultManager),
        getVaultNames: vaultManager.listVaults.bind(vaultManager),
        logger: logger,
      });
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
      const gitBackend = new GitBackend({
        getVault: vaultManager.getVault.bind(vaultManager),
        getVaultID: vaultManager.getVaultIds.bind(vaultManager),
        getVaultNames: vaultManager.listVaults.bind(vaultManager),
        logger: logger,
      });
      const vault = await vaultManager.createVault('MyTestVault');
      await vault.initializeVault();
      const vId = vaultManager.getVaultIds('MyTestVault').pop();
      expect(vId).toBeTruthy();
      const response = gitBackend.handleInfoRequest('MyTestVault');
      const data: Array<Buffer> = [];
      for await (const byte of response) {
        if (byte !== null) {
          data.push(byte);
        }
      }
      // response should be similar to 001e# service=git-upload-pack\n0000007dec36c2af9201e3ba466b73086ac6e09dff3c6f99 HEADside-band-64k symref=HEAD:refs/heads/master agent=git/isomorphic-git../../src1.4.0\n003fec36c2af9201e3ba466b73086ac6e09dff3c6f99 refs/heads/master\n0000
      expect(Buffer.concat(data).toString().length).toBe(226);
    } finally {
      await vaultManager.stop();
      await keyManager.stop();
    }
  });
  // test('returning correct pack response', async () => {
  //   try {
  //     await keyManager.start({ password: 'password' });
  //     await vaultManager.start({});
  //     const gitBackend = new GitBackend({
  //       getVault: vaultManager.getVault.bind(vaultManager),
  //       getVaultID: vaultManager.getVaultIds.bind(vaultManager),
  //       getVaultNames: vaultManager.listVaults.bind(vaultManager),
  //       logger: logger,
  //     });
  //     const vault = await vaultManager.createVault('MyTestVault');
  //     await vault.initializeVault();
  //     const vId = vaultManager.getVaultIds('MyTestVault').pop();
  //     expect(vId).toBeTruthy();
  //     const response = await gitBackend.handlePackRequest(
  //       vId!,
  //       Buffer.from(
  //         '0054want 74730d410fcb6603ace96f1dc55ea6196122532d multi_ackside-band-64k ofs-delta\n',
  //       ),
  //     );
  //     // response should be similar to 001e# service=git-upload-pack\n0000007dec36c2af9201e3ba466b73086ac6e09dff3c6f99 HEADside-band-64k symref=HEAD:refs/heads/master agent=git/isomorphic-git../../src1.4.0\n003fec36c2af9201e3ba466b73086ac6e09dff3c6f99 refs/heads/master\n0000
  //     expect(response.toString()).toContain('progress is at');
  //     expect(response.toString()).toContain('PACK');
  //     // The above were inferred to be in the message by logging the response.toString() itself.
  //   } finally {
  //     await keyManager.stop();
  //     await vaultManager.stop();
  //   }
  // });
  // test.only('can clone an empty repo', async () => {
  //   try {
  //     await keyManager.start({ password: 'password' });
  //     await vaultManager.start({});
  //     const vault = await vaultManager.createVault('vault-1');
  //     await vault.initializeVault();
  //     await git.clone({
  //       fs: { promises: fsPromises },
  //       http: gitRequest,
  //       dir: path.join(destDir, vault.vaultId),
  //       url: `http://0.0.0.0/${vault.vaultId}`,
  //     });
  //     expect(fs.existsSync(path.join(destDir, vault.vaultId))).toBe(true);
  //   } finally {
  //     await vaultManager.stop();
  //     await keyManager.stop();
  //   }
  // });
  // test('can clone a repo', async () => {
  //   try {
  //     await keyManager.start({ password: 'password' });
  //     await vaultManager.start({});
  //     const vault = await vaultManager.createVault('vault-1');
  //     await vault.initializeVault();
  //     await vault.addSecret('secret-1', Buffer.from('secret-content'));
  //     await git.clone({
  //       fs: { promises: fsPromises },
  //       http: gitRequest,
  //       dir: path.join(destDir, vault.vaultId),
  //       url: `http://0.0.0.0/${vault.vaultId}`,
  //     });
  //     expect(fs.existsSync(path.join(destDir, vault.vaultId, 'secret-1'))).toBe(
  //       true,
  //     );
  //     expect(
  //       fs.readFileSync(path.join(destDir, vault.vaultId, 'secret-1')),
  //     ).toStrictEqual(Buffer.from('secret-content'));
  //   } finally {
  //     await vaultManager.stop();
  //     await keyManager.stop();
  //   }
  // });
  // test('can clone a repo with directories', async () => {
  //   try {
  //     await keyManager.start({ password: 'password' });
  //     await vaultManager.start({});
  //     const vault = await vaultManager.createVault('vault-1');
  //     await vault.initializeVault();
  //     await vault.mkdir('dir-1', { recursive: true });
  //     await vault.mkdir('dir-2', { recursive: true });
  //     await vault.mkdir(path.join('dir-3', 'dir-4'), { recursive: true });
  //     await vault.addSecret(
  //       path.join('dir-3', 'dir-4', 'secret-1'),
  //       Buffer.from('secret-content'),
  //     );
  //     await vault.addSecret('secret-2', Buffer.from('secret-content-2'));
  //     await git.clone({
  //       fs: { promises: fsPromises },
  //       http: gitRequest,
  //       dir: path.join(destDir, vault.vaultId),
  //       url: `http://0.0.0.0/${vault.vaultId}`,
  //     });
  //     expect(
  //       fs.readFileSync(path.join(destDir, vault.vaultId, 'secret-2')),
  //     ).toStrictEqual(Buffer.from('secret-content-2'));
  //     expect(
  //       fs.readFileSync(
  //         path.join(destDir, vault.vaultId, 'dir-3', 'dir-4', 'secret-1'),
  //       ),
  //     ).toStrictEqual(Buffer.from('secret-content'));
  //   } finally {
  //     await vaultManager.stop();
  //     await keyManager.stop();
  //   }
  // });
  // test('can pull a repo', async () => {
  //   try {
  //     await keyManager.start({ password: 'password' });
  //     await vaultManager.start({});
  //     const vault = await vaultManager.createVault('vault-1');
  //     await vault.initializeVault();
  //     await vault.addSecret('secret-1', Buffer.from('secret-content'));
  //     await git.clone({
  //       fs: { promises: fsPromises },
  //       http: gitRequest,
  //       dir: path.join(destDir, vault.vaultId),
  //       url: `http://0.0.0.0/${vault.vaultId}`,
  //     });
  //     await git.setConfig({
  //       fs,
  //       dir: path.join(destDir, vault.vaultId),
  //       path: 'user.name',
  //       value: vault.vaultId,
  //     });
  //     await vault.updateSecret('secret-1', Buffer.from('content-change'));
  //     await git.pull({
  //       fs: { promises: fsPromises },
  //       http: gitRequest,
  //       dir: path.join(destDir, vault.vaultId),
  //     });
  //     // expect(
  //     //   fs.readFileSync(path.join(destDir, vault.vaultId, 'secret-1')),
  //     // ).toStrictEqual(Buffer.from('content-change'));
  //   } finally {
  //     await vaultManager.stop();
  //     await keyManager.stop();
  //   }
  // });
  // test('can pull a repo with directories', async () => {
  //   try {
  //     await keyManager.start({ password: 'password' });
  //     await vaultManager.start({});
  //     const vault = await vaultManager.createVault('vault-1');
  //     await vault.initializeVault();
  //     await vault.mkdir('dir-1', { recursive: true });
  //     await vault.mkdir('dir-2', { recursive: true });
  //     await vault.mkdir(path.join('dir-3', 'dir-4'), { recursive: true });
  //     await vault.addSecret(
  //       path.join('dir-3', 'dir-4', 'secret-1'),
  //       Buffer.from('secret-content'),
  //     );
  //     await vault.addSecret('secret-2', Buffer.from('secret-content-2'));
  //     await git.clone({
  //       fs: { promises: fsPromises },
  //       http: gitRequest,
  //       dir: path.join(destDir, vault.vaultId),
  //       url: `http://0.0.0.0/${vault.vaultId}`,
  //     });
  //     await git.setConfig({
  //       fs,
  //       dir: path.join(destDir, vault.vaultId),
  //       path: 'user.name',
  //       value: vault.vaultId,
  //     });
  //     await vault.updateSecret('secret-2', Buffer.from('content-change'));
  //     await vault.updateSecret(
  //       path.join('dir-3', 'dir-4', 'secret-1'),
  //       Buffer.from('content-change-2'),
  //     );
  //     await git.pull({
  //       fs: { promises: fsPromises },
  //       http: gitRequest,
  //       dir: path.join(destDir, vault.vaultId),
  //     });
  //     expect(
  //       fs.readFileSync(path.join(destDir, vault.vaultId, 'secret-2')),
  //     ).toStrictEqual(Buffer.from('content-change'));
  //     expect(
  //       fs.readFileSync(
  //         path.join(destDir, vault.vaultId, 'dir-3', 'dir-4', 'secret-1'),
  //       ),
  //     ).toStrictEqual(Buffer.from('content-change-2'));
  //   } finally {
  //     await vaultManager.stop();
  //     await keyManager.stop();
  //   }
  // });
  // test('can pull a repo when a directory has been added after cloning', async () => {
  //   try {
  //     await keyManager.start({ password: 'password' });
  //     await vaultManager.start({});
  //     const vault = await vaultManager.createVault('vault-1');
  //     await vault.initializeVault();
  //     await vault.mkdir('dir-1', { recursive: true });
  //     await vault.mkdir('dir-2', { recursive: true });
  //     await vault.mkdir(path.join('dir-3', 'dir-4'), { recursive: true });
  //     await vault.addSecret(
  //       path.join('dir-3', 'dir-4', 'secret-1'),
  //       Buffer.from('secret-content'),
  //     );
  //     await vault.addSecret('secret-2', Buffer.from('secret-content-2'));
  //     await git.clone({
  //       fs: { promises: fsPromises },
  //       http: gitRequest,
  //       dir: path.join(destDir, vault.vaultId),
  //       url: `http://0.0.0.0/${vault.vaultId}`,
  //     });
  //     await git.setConfig({
  //       fs,
  //       dir: path.join(destDir, vault.vaultId),
  //       path: 'user.name',
  //       value: vault.vaultId,
  //     });
  //     await vault.updateSecret('secret-2', Buffer.from('content-change'));
  //     await vault.updateSecret(
  //       path.join('dir-3', 'dir-4', 'secret-1'),
  //       Buffer.from('content-change-2'),
  //     );
  //     await vault.mkdir(path.join('dir-5'), { recursive: true });
  //     await vault.addSecret(
  //       path.join('dir-5', 'secret-3'),
  //       Buffer.from('secret-content-3'),
  //     );
  //     await git.pull({
  //       fs: { promises: fsPromises },
  //       http: gitRequest,
  //       dir: path.join(destDir, vault.vaultId),
  //     });
  //     expect(
  //       fs.readFileSync(path.join(destDir, vault.vaultId, 'secret-2')),
  //     ).toStrictEqual(Buffer.from('content-change'));
  //     expect(
  //       fs.readFileSync(
  //         path.join(destDir, vault.vaultId, 'dir-3', 'dir-4', 'secret-1'),
  //       ),
  //     ).toStrictEqual(Buffer.from('content-change-2'));
  //     expect(
  //       fs.readFileSync(path.join(destDir, vault.vaultId, 'dir-5', 'secret-3')),
  //     ).toStrictEqual(Buffer.from('secret-content-3'));
  //   } finally {
  //     await vaultManager.stop();
  //     await keyManager.stop();
  //   }
  // });
});
