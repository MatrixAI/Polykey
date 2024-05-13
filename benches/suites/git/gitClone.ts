import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import b from 'benny';
import { EncryptedFS } from 'encryptedfs';
import git from 'isomorphic-git';
import { summaryName, suiteCommon } from '../../utils';
import * as gitTestUtils from '../../../tests/git/utils';
import * as keysUtils from '../../../src/keys/utils';

async function main() {
  // Setting up repo
  const dataDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'polykey-test-'),
  );
  const testGitState = {
    author: 'tester',
    commits: [
      {
        message: 'commit1',
        files: [
          {
            name: 'file1',
            contents: 'this is a file',
          },
        ],
      },
      {
        message: 'commit2',
        files: [
          {
            name: 'file2',
            contents: 'this is another file',
          },
        ],
      },
      {
        message: 'commit3',
        files: [
          {
            name: 'file1',
            contents: 'this is a changed file',
          },
        ],
      },
    ],
  };

  // Creating state for fs
  const dirFs = path.join(dataDir, 'repository');
  const gitdirFs = path.join(dirFs, '.git');
  const gitDirsFs = {
    fs: fs as any,
    dir: dirFs,
    gitDir: gitdirFs,
    gitdir: gitdirFs,
  };
  // Creating simple state
  await gitTestUtils.createGitRepo({
    ...gitDirsFs,
    ...testGitState,
  });

  // Creating state for efs
  const logger = new Logger('generatePackRequest Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const dbKey = keysUtils.generateKey();
  const efs = await EncryptedFS.createEncryptedFS({
    dbKey,
    dbPath: dataDir,
    logger,
  });
  await efs.start();

  const dirEfs = path.join(efs.cwd, 'repository');
  const gitdirEfs = path.join(dirEfs, '.git');
  const gitDirsEfs = {
    fs: efs as any,
    dir: dirEfs,
    gitDir: gitdirEfs,
    gitdir: gitdirEfs,
  };
  await gitTestUtils.createGitRepo({
    ...gitDirsEfs,
    ...testGitState,
  });

  // Creating RPC

  const summary = await b.suite(
    summaryName(__filename),
    b.add('git clone with fs', async () => {
      await git.clone({
        fs,
        dir: gitDirsFs.dir,
        http: { request: gitTestUtils.request(gitDirsFs) },
        url: 'http://',
      });
    }),
    b.add('git clone with efs', async () => {
      await git.clone({
        fs: efs,
        dir: gitDirsEfs.dir,
        http: { request: gitTestUtils.request(gitDirsEfs) },
        url: 'http://',
      });
    }),
    b.add('git clone with rpc', async () => {
      // TODO: run test with request over RPC.
    }),
    ...suiteCommon,
  );
  return summary;
}

if (require.main === module) {
  void main();
}

export default main;
