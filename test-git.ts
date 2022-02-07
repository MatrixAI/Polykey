import fs from 'fs';
import path from 'path';
import git from 'isomorphic-git';
import * as vaultsUtils from './src/vaults/utils';

/*

I'm going to need to test out how to use the tags and the branches.
When we are pulling the repo, we can checkout to a given version in the commit hash.
We need to switch the HEAD.
We're going to do this in the real FS. So we can see this being done, one step at a time
*/

  // // await git.checkout({
  // //   fs,
  // //   dir: vaultDir,
  // //   gitdir: vaultGitDir,
  // //   ref: 'master'
  // // });

  // // We never change branches anyway

  // try {
  //   const commits = await git.log({
  //     fs,
  //     dir: vaultDir,
  //     gitdir: vaultGitDir,
  //     depth: 1,
  //     ref: 'master',
  //   });

  //   console.log(commits);

  //   // if the comits is meant to be empty array

  // } catch (e) {
  //   if (e instanceof git.Errors.NotFoundError) {
  //     console.log('OH NO!');


async function main () {

  const vaultDataDir = './tmp/git/data';
  const vaultGitDir = './tmp/git/.git';

  await fs.promises.rm('./tmp/git', { recursive: true, force: true });

  await fs.promises.mkdir(vaultDataDir, { recursive: true });

  await git.init({
    fs,
    dir: vaultDataDir,
    gitdir: vaultGitDir,
    defaultBranch: 'master'
  });

  const firstCommit = await git.commit({
    fs,
    dir: vaultDataDir,
    gitdir: vaultGitDir,
    author: {
      name: 'this is the author',
      email: '',
    },
    message: 'Initial Commit',
    ref: 'HEAD',
  });

  await git.writeRef({
    fs,
    dir: vaultDataDir,
    gitdir: vaultGitDir,
    ref: 'refs/heads/master',
    value: firstCommit,
    force: true
  });

  console.log(firstCommit);

  console.log(vaultsUtils.validateCommitId(firstCommit.toUpperCase()));

  // what happens when you create .git inside?

  await git.checkout({
    fs,
    dir: vaultDataDir,
    gitdir: vaultGitDir,
    ref: firstCommit.toUpperCase(),
  });





  await fs.promises.writeFile(
    path.join(vaultDataDir, 'file'),
    'v2'
  );

  await git.add({
    fs,
    dir: vaultDataDir,
    gitdir: vaultGitDir,
    filepath: 'file'
  });

  const secondCommit = await git.commit({
    fs,
    dir: vaultDataDir,
    gitdir: vaultGitDir,
    author: {
      name: 'this is the author',
      email: '',
    },
    message: 'Second Commit',
    ref: 'HEAD',
  });

  await git.writeRef({
    fs,
    dir: vaultDataDir,
    gitdir: vaultGitDir,
    ref: 'refs/heads/master',
    value: secondCommit,
    force: true
  });

  await fs.promises.writeFile(
    path.join(vaultDataDir, 'file'),
    'v3'
  );

  await git.add({
    fs,
    dir: vaultDataDir,
    gitdir: vaultGitDir,
    filepath: 'file'
  });

  // This is comparing against the HEAD commit
  // the default ref is HEAD
  const status = await git.statusMatrix({
    fs,
    dir: vaultDataDir,
    gitdir: vaultGitDir,
  });

  console.log(status);

  const thirdCommit = await git.commit({
    fs,
    dir: vaultDataDir,
    gitdir: vaultGitDir,
    author: {
      name: 'this is the author',
      email: '',
    },
    message: 'Third Commit',
    ref: 'HEAD',
  });

  await git.writeRef({
    fs,
    dir: vaultDataDir,
    gitdir: vaultGitDir,
    ref: 'refs/heads/master',
    value: thirdCommit,
    force: true
  });

  // we alaways use the master branch
  // to find the log of canonical history
  // or we find it from where we are in HEAD
  const commits = await git.log({
    fs,
    dir: vaultDataDir,
    gitdir: vaultGitDir,
    ref: 'master',
  });

  console.log(commits);

  // this changed to the second commit
  // but the working tree isn't updated
  // wtf?

  // This changes it to a detached commit
  // But master still points to the original one
  await git.checkout({
    fs,
    dir: vaultDataDir,
    gitdir: vaultGitDir,
    ref: secondCommit
  });

  console.log('FROM HEAD', await git.log({
    fs,
    dir: vaultDataDir,
    gitdir: vaultGitDir,
  }));

  // the branch always points to the tip, and is considered canonical
  // we only change the branch point when we are making new commits
  // when making new commits, we want to change the branch pointer

  console.log('FROM MASTER', await git.log({
    fs,
    dir: vaultDataDir,
    gitdir: vaultGitDir,
    ref: 'master',
  }));

  // this changes it to ref: refs/heads/master
  // it also does a checkout of the working directory
  // if we want to checkout to the end, the `HEAD` points to `master`
  // that's fine too, it just means head is now attached
  await git.checkout({
    fs,
    dir: vaultDataDir,
    gitdir: vaultGitDir,
    // ref: 'master'
    ref: secondCommit
    // if this is thirdCommit, it's not the same
    // the branch pointer doesn't get updated
  });

  // interestingly enough
  // moving to the third commit keeps the head there
  // if the head is kept there, and we add a new commit here
  // what happens?

  await fs.promises.writeFile(
    path.join(vaultDataDir, 'file'),
    'v4'
  );

  await git.add({
    fs,
    dir: vaultDataDir,
    gitdir: vaultGitDir,
    filepath: 'file'
  });

  // const currentCommit = await git.resolveRef({
  //   fs,
  //   dir: vaultDataDir,
  //   gitdir: vaultGitDir,
  //   ref: 'HEAD'
  // });

  const fourthCommit = await git.commit({
    fs,
    dir: vaultDataDir,
    gitdir: vaultGitDir,
    author: {
      name: 'this is the author',
      email: '',
    },
    message: 'Fourth Commit',
    ref: 'HEAD'
    // ref: 'refs/heads/master',
    // parent: [currentCommit]
  });

  await git.writeRef({
    fs,
    dir: vaultDataDir,
    gitdir: vaultGitDir,
    // ref: 'HEAD',
    ref: 'refs/heads/master',
    value: fourthCommit,
    // value: 'refs/heads/master',
    // symbolic: true,
    force: true
  });

  // if ref is HEAD, it moves the HEAD pointer on the commit
  // if ref is master, it doesn't do anything...
  // oh shit, refs/heads/master works, but not master
  // the ref here has to be either HEAD or the full path
  // like refs/heads/master
  // if you don't pass anything, then it is assumed

  // undefined will update both HEAD and master
  // refs/heads/master will update both HEAD and master
  // HEAD will only update HEAD

  // ok so the issue is this
  // if i am in detached head state
  // by default NOTHING is updated, neither HEAD nor master
  // if HEAD is passed in, then HEAD gets updated
  // if refs/heads/master is passed in, then only the master branch is updated
  // it makes sense that we would want to update both
  // or at the very least update HEAD, then update the branch pointer in a different way




  // console.log(fourthCommit);

  // console.log('FROM HEAD', await git.log({
  //   fs,
  //   dir: vaultDataDir,
  //   gitdir: vaultGitDir,
  // }));

  // console.log('FROM MASTER', await git.log({
  //   fs,
  //   dir: vaultDataDir,
  //   gitdir: vaultGitDir,
  //   ref: 'master',
  // }));

  // console.log('FROM FOURTH', await git.log({
  //   fs,
  //   dir: vaultDataDir,
  //   gitdir: vaultGitDir,
  //   ref: fourthCommit,
  // }));

  // await git.checkout({
  //   fs,
  //   dir: vaultDataDir,
  //   gitdir: vaultGitDir,
  //   ref: fourthCommit
  // });



  // note the above is not transactional
  // so we have to be aware of this and "clean"
  // the state whenever we start using it


}

main();
