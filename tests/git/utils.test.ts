import type { ReadCommitResult } from 'isomorphic-git';
import type { PackIndex } from '@/git/types';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { EncryptedFS } from 'encryptedfs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as gitErrors from '@/git/errors';
import * as keysUtils from '@/keys/utils';
import * as gitUtils from '@/git/utils';
import * as gitTestUtils from './utils';

describe('Git utils', () => {
  const logger = new Logger('VaultManager Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let commits: ReadCommitResult[];
  let firstCommit: ReadCommitResult;
  let objectsPath: string;
  let efs: EncryptedFS;
  let dbKey: Buffer;

  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    objectsPath = path.join('.git', 'objects');
    dbKey = await keysUtils.generateKey(256);
    efs = await EncryptedFS.createEncryptedFS({
      dbKey,
      dbPath: dataDir,
      // @ts-ignore - version of js-logger is incompatible (remove when EFS logger updates to 3.*)
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

  afterAll(async () => {
    await efs.stop();
    await efs.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  describe('read index', () => {
    test('of a packfile', async () => {
      const packDir = path.join('.git', 'objects', 'pack');
      const packfile = (await efs.promises.readdir(packDir))[0] as string;
      const idx = (await efs.promises.readFile(
        path.join(packDir, packfile),
      )) as Buffer;
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
  describe('list refs', () => {
    test('on master', async () => {
      const refs = await gitUtils.listRefs(
        efs,
        '.git',
        path.join('refs', 'heads'),
      );
      expect(refs).toEqual(['master']);
    });
  });
  describe('encoding', () => {
    test('a string', async () => {
      const gitEncodedString = gitUtils.encode('hello world\n');
      expect(gitEncodedString.equals(Buffer.from('0010hello world\n'))).toBe(
        true,
      );
    });
    test('an empty string', async () => {
      const gitEncodedString = gitUtils.encode('');
      expect(gitEncodedString.equals(Buffer.from('0004'))).toBe(true);
    });
    test('an upload pack', async () => {
      const uploadPackBuffers = (await gitUtils.uploadPack({
        fs: efs,
        advertiseRefs: true,
      })) as Buffer[];
      const uploadPack = Buffer.concat(uploadPackBuffers);
      expect(uploadPack.toString('utf8')).toBe(
        `007d${firstCommit.oid} HEAD\0side-band-64k symref=HEAD:refs/heads/master agent=git/isomorphic-git@1.8.1
003f${firstCommit.oid} refs/heads/master
0000`,
      );
    });
  });
  describe('resolve refs', () => {
    test('to a commit oid', async () => {
      const ref = await gitUtils.resolve({
        fs: efs,
        ref: commits[0].oid,
      });
      expect(ref).toBe(firstCommit.oid);
    });
    test('to HEAD', async () => {
      const ref = await gitUtils.resolve({ fs: efs, ref: 'HEAD' });
      expect(ref).toBe(firstCommit.oid);
    });
    test('to HEAD including depth', async () => {
      const ref = await gitUtils.resolve({ fs: efs, ref: 'HEAD', depth: 2 });
      expect(ref).toBe('refs/heads/master');
    });
    test('to non-existant refs', async () => {
      await expect(() =>
        gitUtils.resolve({ fs: efs, ref: 'this-is-not-a-ref' }),
      ).rejects.toThrow(gitErrors.ErrorGitUndefinedRefs);
    });
  });
  describe('read an object', () => {
    test('missing', async () => {
      await expect(() =>
        gitUtils.readObject({
          fs: efs,
          dir: '.',
          gitdir: '.git',
          oid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        }),
      ).rejects.toThrow(gitErrors.ErrorGitReadObject);
    });
    test('parsed', async () => {
      const ref = await gitUtils.readObject({
        fs: efs,
        dir: '.',
        gitdir: '.git',
        oid: firstCommit.oid,
      });
      expect(ref.format).toEqual('parsed');
      expect(ref.type).toEqual('commit');
    });
    test('content', async () => {
      const ref = await gitUtils.readObject({
        fs: efs,
        dir: '.',
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
      expect(object).toContain(firstCommit.commit.author.timestamp.toString());
      expect(object).toContain(firstCommit.commit.committer.name);
      expect(object).toContain(
        firstCommit.commit.committer.timestamp.toString(),
      );
    });
    test('wrapped', async () => {
      const ref = await gitUtils.readObject({
        fs: efs,
        dir: '.',
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
      expect(object).toContain(firstCommit.commit.author.timestamp.toString());
      expect(object).toContain(firstCommit.commit.committer.name);
      expect(object).toContain(
        firstCommit.commit.committer.timestamp.toString(),
      );
    });
    test('deflated', async () => {
      const ref = await gitUtils.readObject({
        fs: efs,
        dir: '.',
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
        dir: '.',
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
      expect(object).toContain(firstCommit.commit.author.timestamp.toString());
      expect(object).toContain(firstCommit.commit.committer.name);
      expect(object).toContain(
        firstCommit.commit.committer.timestamp.toString(),
      );
    });
  });
});
