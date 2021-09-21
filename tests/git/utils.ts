import git, { ReadCommitResult } from 'isomorphic-git';
import fs from 'fs';
import path from 'path';

async function createGitRepo({
  basePath,
  packFile,
  indexFile,
}: {
  basePath: string;
  packFile?: boolean;
  indexFile?: boolean;
}): Promise<ReadCommitResult[]> {
  const repoPath = path.join(basePath);
  await fs.promises.mkdir(repoPath, { recursive: true });
  await git.init({
    fs: fs,
    dir: repoPath,
  });
  await git.commit({
    fs: fs,
    dir: repoPath,
    author: {
      name: 'TestCommitter',
    },
    message: 'Initial Commit',
  });
  await fs.promises.writeFile(
    path.join(repoPath, '.git', 'packed-refs'),
    '# pack-refs with: peeled fully-peeled sorted',
  );
  for (let i = 0; i < 10; i++) {
    const fp = path.join(repoPath, i.toString());
    await fs.promises.writeFile(fp, 'secret ' + i.toString());
    await git.commit({
      fs: fs,
      dir: repoPath,
      author: {
        name: 'TestCommitter ' + i.toString(),
      },
      message: 'Commit ' + i.toString(),
    });
  }
  const log = await git.log({
    fs: fs,
    dir: repoPath,
  });
  if (packFile) {
    const pack = await git.packObjects({
      fs: fs,
      dir: repoPath,
      oids: [...log.map((item) => item.oid)],
      write: true,
    });
    if (indexFile) {
      await git.indexPack({
        fs: fs,
        dir: repoPath,
        filepath: path.join('.git', 'objects', 'pack', pack.filename),
      });
    }
  }
  return log;
}

async function getPackID(dataDir: string): Promise<string> {
  const pack = (
    await fs.promises.readdir(path.join(dataDir, '.git', 'objects', 'pack'))
  )[0];
  return pack.substring(5, 45);
}

export { createGitRepo, getPackID };
