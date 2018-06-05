// @flow

import * as git from 'isomorphic-git';
import vfs from 'virtualfs';
import tar from 'tar';

// the git module exposes a set of functions
// instead of a single object containing all of the functions
// a bit weird
// so it has no default module basically
// whereas we have vfs

// we havea singleton VirtualFSSingleton
// this is exposed automatically as default
// if we don't need it, we just use VirtualFS
// but there won't be stuff in /dev or /home... etc
// in most cases that's what we use
// then we unpack stuff into there

// remember we also need to use tar
// and we need to support encrypted tar archives
// that is also based on random access index
// so we need to index our tar archives

// console.log(git);

console.log(tar);


// we use vfs
// the default import of vfs is a already fully specified vfs

// console.log('haha');
// console.log(vfs);

// it says SyntaxError???
// what the hell?
// lol my node version is too low
// oh wait... see if I use babel
// it only translates my code
// it doesn't translate the other code
// so we have a problem
// it's as if the dependencies that were installed were incorrect
// note that cloning will need to use p2p system
// not sure about the rest
// note that node will use node targets

/*

  functions:

  init - we shall init a directory as a git repo
  add - add files into them
  utils
  branch
  checkout
  clone
  commit
  config
  currentBranch
  fetch
  findRoot
  getRemoteInfo
  indexPack
  listBranches
  listFiles
  listTags
  log
  merge
  pull
  push
  readObject
  remove
  resolveRef
  sign
  status
  verify
  version

*/
