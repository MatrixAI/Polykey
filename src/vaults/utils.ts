import type { EncryptedFS, Stat } from 'encryptedfs';
import type {
  VaultId,
  VaultKey,
  VaultList,
  VaultName,
  FileSystemReadable,
  VaultIdPretty,
} from './types';
import type { FileSystem } from '../types';
import type { FileSystemWritable } from './types';
import type { NodeId } from '../nodes/types';

import type { GRPCClientAgent } from '../agent';
import path from 'path';
import { IdRandom } from '@matrixai/id';
import * as grpc from '@grpc/grpc-js';
import * as vaultsErrors from './errors';
import { promisify } from '../utils';
import * as vaultsPB from '../proto/js/polykey/v1/vaults/vaults_pb';
import * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';
import * as keysUtils from '../keys/utils';
import { isIdString, isId, makeIdString, makeId } from '../GenericIdTypes';

async function generateVaultKey(bits: number = 256): Promise<VaultKey> {
  return (await keysUtils.generateKey(bits)) as VaultKey;
}

function isVaultId(arg: any) {
  return isId<VaultId>(arg);
}

/**
 * This will return arg as a valid VaultId or throw an error if it can't be converted.
 * This will take a multibase string of the ID or the raw Buffer of the ID.
 * @param arg - The variable we wish to convert
 * @throws vaultsErrors.ErrorInvalidVaultId  if the arg can't be converted into a VaultId
 * @returns VaultId
 */
function makeVaultId(arg: any): VaultId {
  return makeId<VaultId>(arg);
}

function isVaultIdPretty(arg: any): arg is VaultIdPretty {
  return isIdString<VaultIdPretty>(arg);
}

function makeVaultIdPretty(arg: any): VaultIdPretty {
  return makeIdString<VaultIdPretty>(arg);
}

const randomIdGenerator = new IdRandom();
function generateVaultId(): VaultId {
  return makeVaultId(randomIdGenerator.get());
}

async function fileExists(fs: FileSystem, path: string): Promise<boolean> {
  try {
    const fh = await fs.promises.open(path, 'r');
    await fh.close();
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
  }
  return true;
}

async function* readdirRecursively(fs, dir: string) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* readdirRecursively(fs, res);
    } else if (dirent.isFile()) {
      yield res;
    }
  }
}

async function* readdirRecursivelyEFS(
  efs: FileSystemReadable,
  dir: string,
  dirs?: boolean,
) {
  const dirents = await efs.readdir(dir);
  let secretPath: string;
  for (const dirent of dirents) {
    const res = dirent.toString(); // Makes string | buffer a string.
    secretPath = path.join(dir, res);
    if ((await efs.stat(secretPath)).isDirectory() && dirent !== '.git') {
      if (dirs === true) {
        yield secretPath;
      }
      yield* readdirRecursivelyEFS(efs, secretPath, dirs);
    } else if ((await efs.stat(secretPath)).isFile()) {
      yield secretPath;
    }
  }
}

async function* readdirRecursivelyEFS2(
  fs: EncryptedFS,
  dir: string,
  dirs?: boolean,
): AsyncGenerator<string> {
  const dirents = await fs.readdir(dir);
  let secretPath: string;
  for (const dirent of dirents) {
    const res = dirent.toString();
    secretPath = path.join(dir, res);
    if (dirent !== '.git') {
      try {
        await fs.readdir(secretPath);
        if (dirs === true) {
          yield secretPath;
        }
        yield* readdirRecursivelyEFS2(fs, secretPath, dirs);
      } catch (err) {
        if (err.code === 'ENOTDIR') {
          yield secretPath;
        }
      }
    }
  }
}

const isHidden = /(^|[\\\/])\.[^\\\/\.]/g;
let CACHE = {};

async function walk(filesystem: FileSystemGlob, output: string[], prefix: string, lexer, opts, dirname='', level=0) {
  const rgx = lexer.segments[level];
  const dir = path.join(prefix, dirname);
  const files = await filesystem.promises.readdir(dir, { encoding: 'utf8' }) as string[];
  const { dot, filesOnly } = opts;

  let i=0, len=files.length, file;
  let fullpath, relpath, stats, isMatch;

  for (; i < len; i++) {
    fullpath = path.join(dir, file=files[i]);
    relpath = dirname ? path.join(dirname, file) : file;
    if (!dot && isHidden.test(relpath)) continue;
    isMatch = lexer.regex.test(relpath);

    if ((stats=CACHE[relpath]) === void 0) {
      CACHE[relpath] = stats = await filesystem.promises.lstat(fullpath);
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

interface FileSystemGlob {
  promises: {
    stat: typeof EncryptedFS.prototype.stat;
    lstat: typeof EncryptedFS.prototype.lstat;
    readdir: typeof EncryptedFS.prototype.readdir;
  };
}

async function glob(filesystem: FileSystemGlob, str: string, { cwd = '.', filesOnly = true, flush = true, dot = true }) {
  if (!str) return [];

  let glob = globalyzer(str);

  if (!glob.isGlob) {
    try {
      let dirent = await filesystem.promises.stat(str);
      if (filesOnly && !dirent.isFile()) return [];
      return [str];
    } catch (err) {
      if (err.code != 'ENOENT') throw err;
      return [];
    }
  }

  if (flush) CACHE = {};

  let matches: string[] = [];
  const res = globrex(glob.glob, { filepath:true, globstar:true, extended:true });
  const globPath = res.path;

  await walk(filesystem, matches, glob.base, globPath, { cwd, filesOnly, flush, dot }, '.', 0);
  return matches;
}

const CHARS = { '{': '}', '(': ')', '[': ']'};
const STRICT = /\\(.)|(^!|\*|[\].+)]\?|\[[^\\\]]+\]|\{[^\\}]+\}|\(\?[:!=][^\\)]+\)|\([^|]+\|[^\\)]+\)|(\\).|([@?!+*]\(.*\)))/;
const RELAXED = /\\(.)|(^!|[*?{}()[\]]|\(\?)/;

function isglob(str: string, { strict = true } = {}): boolean {
  if (str === '') return false;
  let match, rgx = strict ? STRICT : RELAXED;
  while ((match = rgx.exec(str))) {
    if (match[2]) return true;
    let idx = match.index + match[0].length;

    // if an open bracket/brace/paren is escaped,
    // set the index to the next closing character
    let open = match[1];
    let close = open ? CHARS[open] : null;
    if (open && close) {
      let n = str.indexOf(close, idx);
      if (n !== -1)  idx = n + 1;
    }

    str = str.slice(idx);
  }
  return false;
}

function parent(str: string, { strict = false } = {}): string {
  str = path.normalize(str).replace(/\/|\\/, '/');
  // special case for strings ending in enclosure containing path separator
  if (/[\{\[].*[\/]*.*[\}\]]$/.test(str)) str += '/';

  // preserves full path in case of trailing path separator
  str += 'a';

  do {str = path.dirname(str)}
  while (isglob(str, {strict}) || /(^|[^\\])([\{\[]|\([^\)]+$)/.test(str));
  // remove escape chars and return result
  return str.replace(/\\([\*\?\|\[\]\(\)\{\}])/g, '$1');
};

function globalyzer(pattern: string, opts = {}) {
  let base = parent(pattern, opts);
  let isGlob = isglob(pattern, opts);
  let glob;
  if (base != '.') {
    glob = pattern.substr(base.length);
    if (glob.startsWith('/')) glob = glob.substr(1);
  } else {
    glob = pattern;
  }

  if (!isGlob) {
    base = path.dirname(pattern);
    glob = base !== '.' ? pattern.substr(base.length) : pattern;
  }
  if (glob.startsWith('./')) glob = glob.substr(2);
  if (glob.startsWith('/')) glob = glob.substr(1);

  return { base, glob, isGlob };
}

const isWin = process.platform === 'win32';
const SEP = isWin ? `\\\\+` : `\\/`;
const SEP_ESC = isWin ? `\\\\` : `/`;
const GLOBSTAR = `((?:[^/]*(?:/|$))*)`;
const WILDCARD = `([^/]*)`;
const GLOBSTAR_SEGMENT = `((?:[^${SEP_ESC}]*(?:${SEP_ESC}|$))*)`;
const WILDCARD_SEGMENT = `([^${SEP_ESC}]*)`;

function globrex(glob: string, { extended = false, globstar = false, strict = false, filepath = false, flags = ''} = {}) {
    let regex = '';
    let segment = '';
    let path: {regex: RegExp | string, segments: RegExp[], globstar?: RegExp } = { regex: '', segments: [] };

    // If we are doing extended matching, this boolean is true when we are inside
    // a group (eg {*.html,*.js}), and false otherwise.
    let inGroup = false;
    let inRange = false;

    // extglob stack. Keep track of scope
    const ext: string[] = [];

    // Helper function to build string and segments
    function add(str: string, { split, last, only }: { split?: boolean, last?: boolean, only?: string} = {}) {
        if (only !== 'path') regex += str;
        if (filepath && only !== 'regex') {
            path.regex += (str === '\\/' ? SEP : str);
            if (split) {
                if (last) segment += str;
                if (segment !== '') {
                    if (!flags.includes('g')) segment = `^${segment}$`; // change it 'includes'
                    path.segments.push(new RegExp(segment, flags));
                }
                segment = '';
            } else {
                segment += str;
            }
        }
    }

    let c, n;
    for (let i = 0; i < glob.length; i++) {
        c = glob[i];
        n = glob[i + 1];

        if (['\\', '$', '^', '.', '='].includes(c)) {
            add(`\\${c}`);
            continue;
        }

        if (c === '/') {
            add(`\\${c}`, {split: true});
            if (n === '/' && !strict) regex += '?';
            continue;
        }

        if (c === '(') {
            if (ext.length) {
                add(c);
                continue;
            }
            add(`\\${c}`);
            continue;
        }

        if (c === ')') {
            if (ext.length) {
                add(c);
                let type = ext.pop();
                if (type === '@') {
                    add('{1}');
                } else if (type === '!') {
                    add('([^\/]*)');
                } else {
                    add(type!);
                }
                continue;
            }
            add(`\\${c}`);
            continue;
        }

        if (c === '|') {
            if (ext.length) {
                add(c);
                continue;
            }
            add(`\\${c}`);
            continue;
        }

        if (c === '+') {
            if (n === '(' && extended) {
                ext.push(c);
                continue;
            }
            add(`\\${c}`);
            continue;
        }

        if (c === '@' && extended) {
            if (n === '(') {
                ext.push(c);
                continue;
            }
        }

        if (c === '!') {
            if (extended) {
                if (inRange) {
                    add('^');
                    continue
                }
                if (n === '(') {
                    ext.push(c);
                    add('(?!');
                    i++;
                    continue;
                }
                add(`\\${c}`);
                continue;
            }
            add(`\\${c}`);
            continue;
        }

        if (c === '?') {
            if (extended) {
                if (n === '(') {
                    ext.push(c);
                } else {
                    add('.');
                }
                continue;
            }
            add(`\\${c}`);
            continue;
        }

        if (c === '[') {
            if (inRange && n === ':') {
                i++; // skip [
                let value = '';
                while(glob[++i] !== ':') value += glob[i];
                if (value === 'alnum') add('(\\w|\\d)');
                else if (value === 'space') add('\\s');
                else if (value === 'digit') add('\\d');
                i++; // skip last ]
                continue;
            }
            if (extended) {
                inRange = true;
                add(c);
                continue;
            }
            add(`\\${c}`);
            continue;
        }

        if (c === ']') {
            if (extended) {
                inRange = false;
                add(c);
                continue;
            }
            add(`\\${c}`);
            continue;
        }

        if (c === '{') {
            if (extended) {
                inGroup = true;
                add('(');
                continue;
            }
            add(`\\${c}`);
            continue;
        }

        if (c === '}') {
            if (extended) {
                inGroup = false;
                add(')');
                continue;
            }
            add(`\\${c}`);
            continue;
        }

        if (c === ',') {
            if (inGroup) {
                add('|');
                continue;
            }
            add(`\\${c}`);
            continue;
        }

        if (c === '*') {
            if (n === '(' && extended) {
                ext.push(c);
                continue;
            }
            // Move over all consecutive "*"'s.
            // Also store the previous and next characters
            let prevChar = glob[i - 1];
            let starCount = 1;
            while (glob[i + 1] === '*') {
                starCount++;
                i++;
            }
            let nextChar = glob[i + 1];
            if (!globstar) {
                // globstar is disabled, so treat any number of "*" as one
                add('.*');
            } else {
                // globstar is enabled, so determine if this is a globstar segment
                let isGlobstar =
                    starCount > 1 && // multiple "*"'s
                    (prevChar === '/' || prevChar === undefined) && // from the start of the segment
                    (nextChar === '/' || nextChar === undefined); // to the end of the segment
                if (isGlobstar) {
                    // it's a globstar, so match zero or more path segments
                    add(GLOBSTAR, {only:'regex'});
                    add(GLOBSTAR_SEGMENT, {only:'path', last:true, split:true});
                    i++; // move over the "/"
                } else {
                    // it's not a globstar, so only match one path segment
                    add(WILDCARD, {only:'regex'});
                    add(WILDCARD_SEGMENT, {only:'path'});
                }
            }
            continue;
        }

        add(c);
    }


    // When regexp 'g' flag is specified don't
    // constrain the regular expression with ^ & $
    if (!flags.includes('g')) {
        regex = `^${regex}$`;
        segment = `^${segment}$`;
        if (filepath) path.regex = `^${path.regex}$`;
    }
    let result;
    result = { regex: new RegExp(regex, flags) };

    // Push the last segment
    if (filepath) {
        path.segments.push(new RegExp(segment, flags));
        path.regex = new RegExp(path.regex, flags);
        path.globstar = new RegExp(!flags.includes('g') ? `^${GLOBSTAR_SEGMENT}$` : GLOBSTAR_SEGMENT, flags);
        result.path = path;
    }

    return result;
}

export {
  isVaultId,
  isVaultIdPretty,
  makeVaultId,
  makeVaultIdPretty,
  generateVaultKey,
  generateVaultId,
  fileExists,
  readdirRecursively,
  readdirRecursivelyEFS,
  readdirRecursivelyEFS2,
  glob,
};
