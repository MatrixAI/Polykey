import fs from 'fs';
import os from 'os';
import path from 'path';

import * as gitUtils from '@/git/utils';
import * as gitTestUtils from './utils';
import * as gitErrors from '@/git/errors';
import {  PackIndex } from '@/git/types';
import { ReadCommitResult } from 'isomorphic-git';
import { EncryptedFS } from "encryptedfs";
import { KeyManager } from "@/keys";
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

describe('Git utils', () => {
  const logger = new Logger('VaultManager Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let commits: ReadCommitResult[];
  let firstCommit: ReadCommitResult;
  let objectsPath: string;
  let efs: EncryptedFS;
  let keyManager: KeyManager;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    objectsPath = path.join('.git', 'objects');
    const keysPath = path.join(dataDir, 'KEYS');
    keyManager = await KeyManager.createKeyManager({
      keysPath,
      password: 'password',
      logger,
    });
    efs = await EncryptedFS.createEncryptedFS({
      dbKey: keyManager.dbKey,
      dbPath: dataDir,
      logger,
    });
    await efs.start();
    commits = await gitTestUtils.createGitRepo({
      efs,
      packFile: true,
      indexFile: true,
    });
    firstCommit = commits[0];
  });

  afterEach(async () => {
    await efs.stop();
    await efs.destroy();
    await keyManager.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  describe('Git Pack Index', () => {
    test('from .idx', async () => {
      const packDir = path.join('.git', 'objects', 'pack');
      const packfile = (await efs.promises.readdir(packDir))[0] as string;
      const idx = await efs.promises.readFile(path.join(packDir, packfile)) as Buffer;
      const p = gitUtils.fromIdx(idx) as PackIndex;
      expect(p).not.toBeUndefined();
      const packSha = packfile.substring(5, 45);
      expect(p.packfileSha).toBe(packSha);
      const oids = commits.map((commit) => commit.oid);
      for (const oid of oids) {
        expect(p.offsets.has(oid)).toBeTruthy();
      }
    });
  });
  describe('Git Ref Manager', () => {
    test('listRefs', async () => {
      const refs = await gitUtils.listRefs(
        efs,
        '.git',
        'refs/heads',
      );
      expect(refs).toEqual(['master']);
    });
  });
  test('encode string', async () => {
    const foo = gitUtils.encode('hello world\n');
    expect(foo).toBeTruthy();
    expect(Buffer.compare(foo, Buffer.from('0010hello world\n')) === 0).toBe(
      true,
    );
  });
  test('encode empty string', async () => {
    const foo = gitUtils.encode('');
    expect(foo).toBeTruthy();
    expect(Buffer.compare(foo, Buffer.from('0004')) === 0).toBe(true);
  });
  test('upload pack', async () => {
    const res = (await gitUtils.uploadPack(
      efs,
      '.git',
      true,
    )) as Buffer[];
    const buffer = Buffer.concat(res);
    expect(buffer.toString('utf8')).toBe(
      `007d${firstCommit.oid} HEAD\0side-band-64k symref=HEAD:refs/heads/master agent=git/isomorphic-git@1.8.1
003f${firstCommit.oid} refs/heads/master
0000`,
    );
  });
  describe('Resolve refs', () => {
    test('resolving a commit oid', async () => {
      const ref = await gitUtils.resolve(
        efs,
        '.git',
        commits[0].oid,
      );
      expect(ref).toBe(firstCommit.oid);
    });
    test('HEAD', async () => {
      const ref = await gitUtils.resolve(
        efs,
        '.git',
        'HEAD',
      );
      expect(ref).toBe(firstCommit.oid);
    });
    test('HEAD depth', async () => {
      const ref = await gitUtils.resolve(
        efs,
        '.git',
        'HEAD',
        2,
      );
      expect(ref).toBe('refs/heads/master');
    });
    test('non-existant refs', async () => {
      await expect(() =>
        gitUtils.resolve(efs, '.git', 'this-is-not-a-ref'),
      ).rejects.toThrow(gitErrors.ErrorGitUndefinedRefs);
    });
  });
  describe('read object', () => {
    test('object missing', async () => {
      await expect(() =>
        gitUtils.readObject({
          fs: efs,
          gitdir: '.git',
          oid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        }),
      ).rejects.toThrow(gitErrors.ErrorGitReadObject);
    });
    test('parsed', async () => {
      const ref = await gitUtils.readObject({
        fs: efs,
        gitdir: '.git',
        oid: firstCommit.oid,
      });
      expect(ref.format).toEqual('parsed');
      expect(ref.type).toEqual('commit');
    });
    test('content', async () => {
      const ref = await gitUtils.readObject({
        fs: efs,
        gitdir: '.git',
        oid: firstCommit.oid,
        format: 'content',
      });
      expect(ref.format).toEqual('content');
      expect(ref.type).toEqual('commit');
      expect(ref.source).toBe(
        path.join(
          'objects',
          firstCommit.oid.substring(0, 2),
          firstCommit.oid.substring(2),
        ),
      );
      const object = ref.object.toString();
      expect(object).toContain(firstCommit.commit.tree);
      expect(object).toContain(firstCommit.commit.parent[0]);
      expect(object).toContain(firstCommit.commit.author.name);
      expect(object).toContain(firstCommit.commit.author.timestamp);
      expect(object).toContain(firstCommit.commit.committer.name);
      expect(object).toContain(firstCommit.commit.committer.timestamp);
    });
    test('wrapped', async () => {
      const ref = await gitUtils.readObject({
        fs: efs,
        gitdir: '.git',
        oid: firstCommit.oid,
        format: 'wrapped',
      });
      expect(ref.format).toEqual('wrapped');
      expect(ref.type).toEqual('wrapped');
      expect(ref.source).toBe(
        path.join(
          'objects',
          firstCommit.oid.substring(0, 2),
          firstCommit.oid.substring(2),
        ),
      );
      const object = ref.object.toString();
      expect(object).toContain(firstCommit.commit.tree);
      expect(object).toContain(firstCommit.commit.parent[0]);
      expect(object).toContain(firstCommit.commit.author.name);
      expect(object).toContain(firstCommit.commit.author.timestamp);
      expect(object).toContain(firstCommit.commit.committer.name);
      expect(object).toContain(firstCommit.commit.committer.timestamp);
    });
    test('deflated', async () => {
      const ref = await gitUtils.readObject({
        fs: efs,
        gitdir: '.git',
        oid: firstCommit.oid,
        format: 'deflated',
      });
      expect(ref.format).toEqual('deflated');
      expect(ref.type).toEqual('deflated');
      expect(ref.source).toBe(
        path.join(
          'objects',
          firstCommit.oid.substring(0, 2),
          firstCommit.oid.substring(2),
        ),
      );
    });
    test('from packfile', async () => {
      const packName = await gitTestUtils.getPackID(efs);
      await efs.promises.rename(
        path.join(objectsPath, firstCommit.oid.substring(0, 2)),
        path.join(objectsPath, 'TEST'),
      );
      const ref = await gitUtils.readObject({
        fs: efs,
        gitdir: '.git',
        oid: firstCommit.oid,
        format: 'deflated',
      });
      expect(ref.format).toEqual('content');
      expect(ref.type).toEqual('commit');
      expect(ref.source).toBe(
        path.join('objects', 'pack', `pack-${packName}.pack`),
      );
      const object = ref.object.toString();
      expect(object).toContain(firstCommit.commit.tree);
      expect(object).toContain(firstCommit.commit.parent[0]);
      expect(object).toContain(firstCommit.commit.author.name);
      expect(object).toContain(firstCommit.commit.author.timestamp);
      expect(object).toContain(firstCommit.commit.committer.name);
      expect(object).toContain(firstCommit.commit.committer.timestamp);
    });
  });
});
