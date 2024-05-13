import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import b from 'benny';
import { EncryptedFS } from 'encryptedfs';
import git from 'isomorphic-git';
import { summaryName, suiteCommon } from '../../utils';
import * as gitTestUtils from '../../../tests/git/utils';
import * as gitHttp from '../../../src/git/http';
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

  const headFs = (
    await git.log({
      ...gitDirsFs,
      depth: 1,
    })
  )[0].oid;
  const headEfs = (
    await git.log({
      ...gitDirsEfs,
      depth: 1,
    })
  )[0].oid;
  function generateBody(id: string) {
    return Buffer.from(
      `0060want ${id} side-band-64k agent=git/isomorphic-git@1.24.5\n00000009done\n`,
    );
  }
  const bodyFs: Array<Buffer> = [generateBody(headFs)];
  const bodyEfs: Array<Buffer> = [generateBody(headEfs)];

  const summary = await b.suite(
    summaryName(__filename),
    b.add('generatePackRequest with fs', async () => {
      for await (const _ of gitHttp.generatePackRequest({
        ...gitDirsFs,
        body: bodyFs,
      })) {
        // We just want to iterate to test the speed of listReferencesGenerator
      }
    }),
    b.add('generatePackRequest with efs', async () => {
      for await (const _ of gitHttp.generatePackRequest({
        ...gitDirsEfs,
        body: bodyEfs,
      })) {
        // We just want to iterate to test the speed of listReferencesGenerator
      }
    }),
    ...suiteCommon,
  );
  return summary;
}

if (require.main === module) {
  void main();
}

export default main;
