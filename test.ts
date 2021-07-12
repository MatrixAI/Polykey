import git, { init } from 'isomorphic-git';
import fs from 'fs';
import path from 'path';
import { Vault } from './src/vaults';
import { GitRequest, GitBackend } from './src/git';
import { generateVaultKey } from './src/vaults/utils';
import fg from 'fast-glob';
import glob from 'glob';
import { VirtualFS } from 'virtualfs';

import globrex from 'globrex';
import { promisify } from 'util';
import globalyzer from 'globalyzer';
const isHidden = /(^|[\\\/])\.[^\\\/\.]/g;
let CACHE = {};
const vfs = new VirtualFS();
const readdir = promisify(vfs.readdir).bind(vfs);
const stat = promisify(vfs.stat).bind(vfs);
const lstat = promisify(vfs.lstat).bind(vfs);

async function walk(output, prefix, lexer, opts, dirname='', level=0) {
  const rgx = lexer.segments[level];
  const dir = path.resolve(opts.cwd, prefix, dirname);
  const files = await readdir(dir);
  const { dot, filesOnly } = opts;

  let i=0, len=files.length, file;
  let fullpath, relpath, stats, isMatch;

  for (; i < len; i++) {
    fullpath = path.join(dir, file=files[i]);
    relpath = dirname ? path.join(dirname, file) : file;
    if (!dot && isHidden.test(relpath)) continue;
    isMatch = lexer.regex.test(relpath);

    if ((stats=CACHE[relpath]) === void 0) {
      CACHE[relpath] = stats = await lstat(fullpath);
    }

    if (!stats.isDirectory()) {
      isMatch && output.push(path.relative(opts.cwd, fullpath));
      continue;
    }

    if (rgx && !rgx.test(file)) continue;
    !filesOnly && isMatch && output.push(path.join(prefix, relpath));

    await walk(output, prefix, lexer, opts, relpath, rgx && rgx.toString() !== lexer.globstar && level + 1);
  }
}

const main = async (vfs) => {

  vfs.mkdirSync('/dir1');
  vfs.writeFileSync('/dir1/hello', 'hi');
  vfs.writeFileSync('meep', 'morp');
  console.log(vfs.readdirSync('/dir1'));

  let opts = { cwd: '.', filesOnly: false, absolute: true, flush: true };

  let str = '/**';

  let glob = globalyzer(str);

  opts.cwd = opts.cwd || '.';

  if (!glob.isGlob) {
    try {
      let resolved = path.resolve(opts.cwd, str);
      let dirent = await stat(resolved);
      if (opts.filesOnly && !dirent.isFile()) return [];

      return opts.absolute ? [resolved] : [str];
    } catch (err) {
      if (err.code != 'ENOENT') throw err;

      return [];
    }
  }

  if (opts.flush) CACHE = {};

  let matches = [];
  const res = globrex(glob.glob, { filepath:true, globstar:true, extended:true });
  const globPath = res.path;

  // path.globstar = path.globstar.toString();
  await walk(matches, glob.base, globPath, opts, '.', 0);

  const ret = opts.absolute ? matches.map(x => path.resolve(opts.cwd, x)) : matches;
  console.log(ret);
  // console.log(await fg('/*', {
  //   fs: {
  //         lstat: vfs.lstat.bind(vfs),
  //         stat: vfs.stat.bind(vfs),
  //         lstatSync: vfs.lstatSync.bind(vfs),
  //         statSync: vfs.statSync.bind(vfs),
  //         readdir: vfs.readdir.bind(vfs),
  //         readdirSync: vfs.readdirSync.bind(vfs),
  //       },
  //   // cwd: '',
  //   })
  // );
  // console.log(await fg('**', {
  //   cwd: '/dir1',
  //   })
  // );
}

main(vfs);
