import type { EncryptedFS } from 'encryptedfs';
import type { ReadCommitResult } from 'isomorphic-git';
import path from 'path';
import git from 'isomorphic-git';

async function createGitRepo({
  efs,
  packFile,
  indexFile,
}: {
  efs: EncryptedFS;
  packFile?: boolean;
  indexFile?: boolean;
}): Promise<ReadCommitResult[]> {
  await git.init({
    fs: efs,
    dir: '.',
  });
  await git.commit({
    fs: efs,
    dir: '.',
    author: {
      name: 'TestCommitter',
    },
    message: 'Initial Commit',
  });
  await efs.promises.writeFile(
    path.join('.git', 'packed-refs'),
    '# pack-refs with: peeled fully-peeled sorted',
  );
  for (let i = 0; i < 10; i++) {
    const fp = i.toString();
    await efs.promises.writeFile(fp, 'secret ' + i.toString());
    await git.commit({
      fs: efs,
      dir: '.',
      author: {
        name: 'TestCommitter ' + i.toString(),
      },
      message: 'Commit ' + i.toString(),
    });
  }
  const log = await git.log({
    fs: efs,
    dir: '.',
  });
  if (packFile) {
    const pack = await git.packObjects({
      fs: efs,
      dir: '.',
      oids: [...log.map((item) => item.oid)],
      write: true,
    });
    if (indexFile) {
      await git.indexPack({
        fs: efs,
        dir: '.',
        filepath: path.join('.git', 'objects', 'pack', pack.filename),
      });
    }
  }
  return log;
}

async function getPackID(efs: EncryptedFS): Promise<string> {
  const pack = (
    await efs.promises.readdir(path.join('.git', 'objects', 'pack'))
  )[0];
  return (pack as string).substring(5, 45);
}

export { createGitRepo, getPackID };
