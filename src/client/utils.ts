import type { Path } from 'globrex';

import fs from 'fs';
import path from 'path';
import globrex from 'globrex';
import globalyzer from 'globalyzer';
import * as grpc from '@grpc/grpc-js';
import { EncryptedFS } from 'encryptedfs';

import { SessionManager } from '../session';
import { VaultManager } from '../vaults';

import * as utils from '../utils';
import * as clientErrors from './errors';


const isHidden = /(^|[\\\/])\.[^\\\/\.]/g;
let CACHE = {};

async function checkPassword(
  meta: grpc.Metadata,
  sessionManager: SessionManager,
): Promise<void> {
  const passwordFile = meta.get('passwordFile').pop();
  let password: string;
  if (passwordFile) {
    password = await fs.promises.readFile(passwordFile, { encoding: 'utf-8' });
    await sessionManager.startSession(password.trim());
  } else if (!sessionManager.sessionStarted) {
    throw new clientErrors.ErrorClientPasswordNotProvided();
  }
}

function parseVaultInput(input: string, vaultManager: VaultManager): string {
  const id = vaultManager.getVaultId(input);
  if (id) {
    return id;
  } else {
    return input;
  }
}

async function walk(filesystem: typeof fs, output: string[], prefix: string, lexer, opts, dirname='', level=0) {
  const readdir = utils.promisify(filesystem.readdir).bind(filesystem);
  const lstat = utils.promisify(filesystem.lstat).bind(filesystem);

  const rgx = lexer.segments[level];
  const dir = path.resolve(opts.cwd, prefix, dirname);
  const files = await readdir(dir);
  const { dot, filesOnly } = opts;

  let i=0, len=files.length, file;
  let fullpath, relpath, stats, isMatch;

  for (; i < len; i++) {
    fullpath = path.join(dir, file=files[i]);
    relpath = dirname ? path.join(dirname, file) : file;
    // if (!dot && isHidden.test(relpath)) continue;
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

    await walk(filesystem, output, prefix, lexer, opts, relpath, rgx && rgx.toString() !== lexer.globstar && level + 1);
  }
}

async function glob(filesystem: typeof fs, str: string, opts={ cwd: '.', absolute: true, filesOnly: false, flush: true }) {
  const stat = utils.promisify(filesystem.stat).bind(filesystem);

  if (!str) return [];

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

  await walk(filesystem, matches, glob.base, globPath, opts, '.', 0);

  return opts.absolute ? matches.map(x => path.resolve(opts.cwd, x)) : matches;
}

export { checkPassword, parseVaultInput, glob };
