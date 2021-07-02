import type { NodeId, NodeInfo } from '@/nodes/types';

import os from 'os';
import fs from 'fs';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { GitBackend } from '@/git';
import { KeyManager } from '@/keys';
import { VaultManager } from '@/vaults';
import { ACL } from '@/acl';
import { GestaltGraph } from '@/gestalts';
import { DB } from '@/db';

let dataDir: string;
let destDir: string;
let keyManager: KeyManager;
let vaultManager: VaultManager;
let acl: ACL;
let gestaltGraph: GestaltGraph;
let db: DB;

// let gitBackend: GitBackend;
// let gitRequest: GitRequest;
const logger = new Logger('GitBackend', LogLevel.WARN, [new StreamHandler()]);
const node1: NodeInfo = {
  id: '123' as NodeId,
  links: { nodes: {}, identities: {} },
};

beforeEach(async () => {
  dataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-'));
  destDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-'));
  keyManager = new KeyManager({
    keysPath: path.join(dataDir, 'keys'),
    logger: logger,
  });
  await keyManager.start({ password: 'password' });
  db = new DB({ dbPath: path.join(dataDir, 'db'), keyManager, logger });
  await db.start();
  acl = new ACL({
    db: db,
    logger: logger,
  });
  await acl.start();
  gestaltGraph = new GestaltGraph({
    db: db,
    acl: acl,
    logger: logger,
  });
  await gestaltGraph.start();
  await gestaltGraph.setNode(node1);
  vaultManager = new VaultManager({
    vaultsPath: dataDir,
    keyManager: keyManager,
    db: db,
    acl: acl,
    gestaltGraph: gestaltGraph,
    fs: fs,
    logger: logger,
  });
});

afterEach(async () => {
  await gestaltGraph.stop();
  await acl.stop();
  await db.stop();
  await keyManager.stop();
  await fs.promises.rm(dataDir, {
    force: true,
    recursive: true,
  });
  await fs.promises.rm(destDir, {
    force: true,
    recursive: true,
  });
});

describe('GitBackend is', () => {
  test('type correct', async () => {
    try {
      await vaultManager.start({});
      const gitBackend = new GitBackend({
        getVault: vaultManager.getVault.bind(vaultManager),
        getVaultNames: vaultManager.scanVaults.bind(vaultManager),
        logger: logger,
      });
      expect(gitBackend).toBeInstanceOf(GitBackend);
    } finally {
      await vaultManager.stop();
    }
  });
  test('returning correct info response', async () => {
    try {
      await vaultManager.start({});
      const gitBackend = new GitBackend({
        getVault: vaultManager.getVault.bind(vaultManager),
        getVaultNames: vaultManager.scanVaults.bind(vaultManager),
        logger: logger,
      });
      const vault = await vaultManager.createVault('MyTestVault');
      await vault.initializeVault();
      const vId = vaultManager.getVaultId('MyTestVault');
      expect(vId).toBeTruthy();
      const response = gitBackend.handleInfoRequest(vault.vaultId);
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
    }
  });
  test('able to scan vaults correctly', async () => {
    try {
      await vaultManager.start({});
      const gitBackend = new GitBackend({
        getVault: vaultManager.getVault.bind(vaultManager),
        getVaultNames: vaultManager.scanVaults.bind(vaultManager),
        logger: logger,
      });
      const vault = await vaultManager.createVault('MyTestVault');
      await vault.initializeVault();
      const vId = vaultManager.getVaultId('MyTestVault');
      expect(vId).toBeTruthy();
      let response = gitBackend.handleVaultNamesRequest('123');
      let data: string[] = [];
      for await (const vault of response) {
        data.push(vault.toString());
      }
      expect(data).toStrictEqual([]);

      await vaultManager.createVault('MySecondVault');
      const vault3 = await vaultManager.createVault('MyThirdVault');

      await vaultManager.setVaultPerm('123', vault3.vaultId);
      await vaultManager.setVaultPerm('123', vault.vaultId);

      response = gitBackend.handleVaultNamesRequest('123');
      data = [];
      for await (const vaults of response) {
        data.push(vaults.toString());
      }
      expect(data.sort()).toStrictEqual(
        [
          `${vault3.vaultId}\t${vault3.vaultName}`,
          `${vault.vaultId}\t${vault.vaultName}`,
        ].sort(),
      );
    } finally {
      await vaultManager.stop();
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
