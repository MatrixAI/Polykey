import type {
  Ack,
  DeflatedObject,
  Identity,
  Pack,
  PackIndex,
  RawObject,
  Refs,
  SymRefs,
  WrappedObject,
} from './types';
import type {
  CommitObject,
  ReadCommitResult,
  TreeEntry,
  TreeObject,
} from 'isomorphic-git';

import type { EncryptedFS } from 'encryptedfs';
import path from 'path';
import pako from 'pako';
import Hash from 'sha.js/sha1';
import { PassThrough } from 'readable-stream';
import createHash from 'sha.js';
import { errors as gitErrors } from './';
import * as vaultsUtils from '../vaults/utils';

/**
 * List of paths to check for a specific ref.
 * @param ref Reference string
 */
const refpaths = (ref: string) => [
  `${ref}`,
  `refs/${ref}`,
  `refs/tags/${ref}`,
  `refs/heads/${ref}`,
  `refs/remotes/${ref}`,
  `refs/remotes/${ref}/HEAD`,
];

const types = {
  commit: 0b0010000,
  tree: 0b0100000,
  blob: 0b0110000,
  tag: 0b1000000,
  ofs_delta: 0b1100000,
  ref_delta: 0b1110000,
};

// @see https://git-scm.com/docs/gitrepository-layout
const GIT_FILES = ['config', 'description', 'index', 'shallow', 'commondir'];

/**
 * Converts a buffer into an iterator expected by isomorphic git.
 * @param data Data to be turned into an iterator
 */
function iteratorFromData(data: Uint8Array) {
  let ended = false;
  return {
    async next() {
      if (ended) {
        return { done: true };
      } else {
        ended = true;
        return { value: data, done: false };
      }
    },
  };
}

function createGitPacketLine(line: string): string {
  const hexPrefix = (4 + line.length).toString(16);
  return Array(4 - hexPrefix.length + 1).join('0') + hexPrefix + line;
}

async function writeRefsAdResponse({
  capabilities,
  refs,
  symrefs,
}: {
  capabilities: string[];
  refs: Refs;
  symrefs: SymRefs;
}): Promise<Array<Buffer>> {
  const stream: Buffer[] = [];
  // Compose capabilities string
  let syms = '';
  for (const [key, value] of Object.entries(symrefs)) {
    syms += `symref=${key}:${value} `;
  }
  let caps = `\x00${[...capabilities].join(
    ' ',
  )} ${syms}agent=git/isomorphic-git@1.8.1`;
  // Note: In the edge case of a brand new repo, zero refs (and zero capabilities)
  // are returned.
  for (const [key, value] of Object.entries(refs)) {
    stream.push(encode(`${value} ${key}${caps}\n`));
    // Stream.push(encode(`${value} ${a}\n`));
    caps = '';
  }
  stream.push(Buffer.from('0000', 'utf8'));
  return stream;
}

/**
 * Returns the hex encoded format of the input string
 */
function encode(line: string | Buffer): Buffer {
  if (typeof line === 'string') {
    line = Buffer.from(line);
  }
  const length = line.length + 4;
  const s = length.toString(16);
  const hexLength = '0'.repeat(4 - s.length) + s;
  return Buffer.concat([Buffer.from(hexLength, 'utf8'), line]);
}

function compareRefNames(refa: string, refb: string): number {
  // https://stackoverflow.com/a/40355107/2168416
  const _a = refa.replace(/\^\{\}$/, '');
  const _b = refb.replace(/\^\{\}$/, '');
  const tmp = -(_a < _b) || +(_a > _b);
  if (tmp === 0) {
    return refa.endsWith('^{}') ? 1 : -1;
  }
  return tmp;
}

/**
 * Parses the packed-refs file.
 * @param text - contents of the packed refs file.
 */
function textToPackedRefs(text: string): Refs {
  const refs: Refs = {};
  if (text) {
    let key: string;
    text
      .trim()
      .split('\n')
      .map((line) => {
        if (/^\s*#/.test(line)) {
          return { line: line, comment: true };
        }
        const i = line.indexOf(' ');
        if (line.startsWith('^')) {
          // This is a oid for the commit associated with the annotated tag immediately preceding this line.
          // Trim off the '^'
          const value = line.slice(1);
          // The tagname^{} syntax is based on the output of `git show-ref --tags -d`
          this.refs[key + '^{}'] = value;
          return { line: line, ref: key, peeled: value };
        } else {
          // This is an oid followed by the ref name
          const value = line.slice(0, i);
          key = line.slice(i + 1);
          this.refs[key] = value;
          return { line: line, ref: key, oid: value };
        }
      });
  }
  return refs;
}

/**
 * Reads and parses the packed-refs file.
 * @param fs Filesystem implementation
 * @param gitdir Git '.git' directory
 */
async function packedRefs(fs: EncryptedFS, gitdir: string): Promise<Refs> {
  let text: string | Buffer = '# pack-refs with: peeled fully-peeled sorted';
  try {
    text = await fs.promises.readFile(path.join(gitdir, 'packed-refs'), {
      encoding: 'utf8',
    });
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    // If no file then ignore and return default.
  }
  return textToPackedRefs(text!.toString());
}

/**
 * Obtains a list of all refs by recursively reading the FS.
 * @param fs Filesystem implementation
 * @param gitdir Git '.git' directory
 * @param filepath Path to start listing from.
 */
async function listRefs(
  fs: EncryptedFS,
  gitdir: string,
  filepath: string,
): Promise<string[]> {
  const packedMap = packedRefs(fs, gitdir);
  let files: string[] = [];
  try {
    for await (const file of vaultsUtils.readdirRecursively(
      fs,
      path.join(gitdir, filepath),
    )) {
      files.push(file);
    }
    files = files.map((x) => x.replace(path.join(gitdir, filepath, '/'), ''));
  } catch (err) {
    files = [];
  }
  for await (let key of Object.keys(packedMap)) {
    // Filter by prefix
    if (key.startsWith(filepath)) {
      // Remove prefix
      key = key.replace(filepath + '/', '');
      // Don't include duplicates; the loose files have precedence anyway
      if (!files.includes(key)) {
        files.push(key);
      }
    }
  }
  // Since we just appended things onto an array, we need to sort them now
  files.sort(compareRefNames);
  return files;
}

/**
 * Resolves a ref to it's sha hash by walking the fs and packed refs.
 * @param fs Filesystem implementation
 * @param dir Git working directory
 * @param gitdir Git '.git' directory
 * @param ref Ref we wish to resolve.
 * @param depth How deep to search.
 * @returns {String} the resolved sha hash.
 */
async function resolve({
  fs,
  dir = '.',
  gitdir = '.git',
  ref,
  depth,
}: {
  fs: EncryptedFS;
  dir?: string;
  gitdir?: string;
  ref: string;
  depth?: number;
}): Promise<string> {
  if (depth !== undefined) {
    depth--;
    if (depth === -1) {
      return ref;
    }
  }
  // Is it a ref pointer?
  if (ref.startsWith('ref: ')) {
    ref = ref.slice('ref: '.length);
    return resolve({ fs, dir, gitdir, ref, depth });
  }
  // Is it a complete and valid SHA?
  if (ref.length === 40 && /[0-9a-f]{40}/.test(ref)) {
    return ref;
  }
  // We need to alternate between the file system and the packed-refs
  const packedMap = await packedRefs(fs, gitdir);
  // Look in all the proper paths, in this order
  const allpaths = refpaths(ref).filter((p) => !GIT_FILES.includes(p)); // Exclude git system files (#709)
  for (const ref of allpaths) {
    let sha;
    try {
      sha =
        (
          await fs.promises.readFile(path.join(gitdir, ref), {
            encoding: 'utf8',
          })
        ).toString() || packedMap[ref].line;
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new gitErrors.ErrorGitUndefinedRefs(`Ref ${ref} cannot be found`);
      }
    }
    if (sha != null) {
      return resolve({ fs, dir, gitdir, ref: sha.trim(), depth });
    }
  }
  throw new gitErrors.ErrorGitUndefinedRefs(`ref ${ref} corrupted`);
}

/**
 * Obtains a list of all the refs in the repository and formats it.
 * @param fs Filesystem implementation
 * @param dir Git working directory
 * @param gitdir Git '.git' directory
 * @param advertiseRefs Bool to specify if we want to advertise the refs.
 */
async function uploadPack({
  fs,
  dir = '.',
  gitdir = '.git',
  advertiseRefs = false,
}: {
  fs: EncryptedFS;
  dir?: string;
  gitdir?: string;
  advertiseRefs: boolean;
}): Promise<Array<Buffer>> {
  try {
    if (advertiseRefs) {
      const capabilities = ['side-band-64k'];
      let keys = await listRefs(fs, gitdir, 'refs');
      keys = keys.map((ref) => path.join('refs', ref));
      const refs = {};
      keys.unshift('HEAD');
      for (const key of keys) {
        refs[key] = await resolve({ fs, dir, gitdir, ref: key });
      }
      const symrefs = {};
      symrefs['HEAD'] = await resolve({
        fs,
        dir,
        gitdir,
        ref: 'HEAD',
        depth: 2,
      });
      const write = {
        capabilities: capabilities,
        refs: refs,
        symrefs: symrefs,
      };
      return writeRefsAdResponse(write);
    } else {
      return [];
    }
  } catch (err) {
    err.caller = 'git.uploadPack';
    throw err;
  }
}

/**
 * This when given a list of refs works out the missing commits and sends them over as a stream.
 * @param fs Filesystem implementation
 * @param dir Git working directory
 * @param gitdir Git '.git' directory
 * @param refs List of refs we want.
 * @param depth How deep we want to search commits for.
 * @param haves list of oids we already have and can be excluded from the stream.
 */
async function packObjects({
  fs,
  dir = '.',
  gitdir = '.git',
  refs,
  depth = undefined,
  haves = undefined,
}: {
  fs: EncryptedFS;
  dir: string;
  gitdir: string;
  refs: string[];
  depth?: number;
  haves?: string[];
}): Promise<Pack> {
  const oids = new Set<string>(); // List of oids for commits we wish to send.
  const shallows = new Set<string>();
  const unshallows = new Set<string>();
  const acks: Ack[] = []; // A list of the commits that were found but already had.
  haves = haves ? haves : []; // The list of commits we already have.
  const since = undefined;
  // For each desired ref.
  for (const ref of refs) {
    // Obtain a list of the relevant commits
    const commits = await log({ fs, dir, gitdir, ref, depth, since });
    const oldshallows: string[] = []; // Never actually updated so I have no idea.
    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];
      if (haves.includes(commit.oid)) {
        acks.push({
          oid: ref,
        });
        break;
      }
      oids.add(commit.oid);
      if (i === commits.length - 1) {
        if (
          !oldshallows.includes(commit.oid) &&
          (depth !== undefined || since !== undefined)
        ) {
          shallows.add(commit.oid);
        }
      } else if (oldshallows.includes(commit.oid)) {
        unshallows.add(commit.oid);
      }
    }
  }
  // Getting all of the Oids within the tree of the desired Oids.
  const objects = await listObjects({
    fs,
    dir,
    gitdir,
    oids: Array.from(oids),
  });
  const packstream = new PassThrough();
  // Packing, gzipping and returning a stream of all the desired data through packstream.
  await pack({ fs, dir, gitdir, oids: [...objects], outputStream: packstream });
  return { packstream, shallows, unshallows, acks };
}

/**
 * Walks the git objects and returns a list of blobs, commits and trees.
 * @param fs Filesystem implementation
 * @param dir Git working directory
 * @param gitdir Git '.git' directory
 * @param oids List of starting oids.
 */
async function listObjects({
  fs,
  dir = '.',
  gitdir = '.git',
  oids,
}: {
  fs: EncryptedFS;
  dir: string;
  gitdir: string;
  oids: string[];
}): Promise<Array<string>> {
  const commits = new Set<string>();
  const trees = new Set<string>();
  const blobs = new Set<string>();

  // We don't do the purest simplest recursion, because we can
  // avoid reading Blob objects entirely since the Tree objects
  // tell us which oids are Blobs and which are Trees. And we
  // do not need to recurse through commit parents.
  async function walk(oid: string): Promise<void> {
    const gitObject = await readObject({ fs, dir, gitdir, oid });
    if (gitObject.type === 'commit') {
      commits.add(oid);
      const commit = commitFrom(Buffer.from(gitObject.object));
      const tree = parseHeaders(commit).tree;
      await walk(tree);
    } else if (gitObject.type === 'tree') {
      trees.add(oid);
      const tree = treeFrom(gitObject.object as Uint8Array);
      for (const entry of tree) {
        if (entry.type === 'blob') {
          blobs.add(entry.oid);
        }
        // Only recurse for trees
        if (entry.type === 'tree') {
          await walk(entry.oid);
        }
      }
    }
  }

  // Let's go walking!
  for (const oid of oids) {
    await walk(oid);
  }
  return [...commits, ...trees, ...blobs];
}

function treeFrom(entries: Uint8Array): TreeObject {
  let entriesa: TreeObject = [];
  if (Buffer.isBuffer(entries)) {
    entriesa = parseBuffer(entries);
  } else if (Array.isArray(entries)) {
    entriesa = entries.map(nudgeIntoShape);
  } else {
    throw new gitErrors.ErrorGitReadObject(
      'invalid type passed to GitTree constructor',
    );
  }
  return entriesa;
}

function nudgeIntoShape(entry: TreeEntry): TreeEntry {
  // It seems strange that this is needed, works without
  // if (!entry.oid && entry.sha) {
  //   entry.oid = entry.sha; // Github
  // }
  entry.mode = limitModeToAllowed(entry.mode); // Index
  if (!entry.type) {
    entry.type = 'blob'; // Index
  }
  return entry;
}

function limitModeToAllowed(mode: string | number): string {
  if (typeof mode === 'number') {
    mode = mode.toString(8);
  }
  // Tree
  if (mode.match(/^0?4.*/)) return '40000'; // Directory
  if (mode.match(/^1006.*/)) return '100644'; // Regular non-executable file
  if (mode.match(/^1007.*/)) return '100755'; // Regular executable file
  if (mode.match(/^120.*/)) return '120000'; // Symbolic link
  if (mode.match(/^160.*/)) return '160000'; // Commit (git submodule reference)
  throw new gitErrors.ErrorGitUndefinedType(
    `Could not understand file mode: ${mode}`,
  );
}

function parseBuffer(buffer: Buffer): TreeObject {
  const _entries: TreeObject = [];
  let cursor = 0;
  while (cursor < buffer.length) {
    const space = buffer.indexOf(32, cursor);
    if (space === -1) {
      throw new gitErrors.ErrorGitReadObject(
        `GitTree: Error parsing buffer at byte location ${cursor}: Could not find the next space character.`,
      );
    }
    const nullchar = buffer.indexOf(0, cursor);
    if (nullchar === -1) {
      throw new gitErrors.ErrorGitReadObject(
        `GitTree: Error parsing buffer at byte location ${cursor}: Could not find the next null character.`,
      );
    }
    let mode = buffer.slice(cursor, space).toString('utf8');
    if (mode === '40000') mode = '040000'; // Makes it line up neater in printed output
    const type = mode === '040000' ? 'tree' : 'blob';
    const path = buffer.slice(space + 1, nullchar).toString('utf8');
    const oid = buffer.slice(nullchar + 1, nullchar + 21).toString('hex');
    cursor = nullchar + 21;
    _entries.push({ mode, path, oid, type });
  }
  return _entries;
}

/**
 * Returns a commit lg for a given ref
 * @param fs Filesystem implementation
 * @param dir Git working directory
 * @param gitdir Git '.git' directory
 * @param ref Ref we're getting the commit long for.
 * @param depth How many commits to fetch
 * @param since Date to start from.
 * @param signing Bool to specify signing
 */
async function log({
  fs,
  dir = '.',
  gitdir = '.git',
  ref = 'HEAD',
  depth,
  since,
  signing = false,
}: {
  fs: EncryptedFS;
  dir: string;
  gitdir: string;
  ref: string;
  depth?: number;
  since?: number; // Date
  signing?: boolean;
}): Promise<ReadCommitResult[]> {
  try {
    const sinceTimestamp =
      since === undefined ? undefined : Math.floor(since.valueOf() / 1000);
    // TODO: In the future, we may want to have an API where we return a
    // async iterator that emits commits.
    const commits: ReadCommitResult[] = [];
    const oid = await resolve({ fs, dir, gitdir, ref });
    const tips = [await logCommit({ fs, dir, gitdir, oid, signing })];

    // eslint-disable-next-line
    while (true) {
      const commitResult = tips.pop();
      if (commitResult == null) {
        throw new gitErrors.ErrorGitReadObject('Commit history invalid');
      }
      const commit = commitResult.commit;

      // Stop the log if we've hit the age limit
      if (
        sinceTimestamp !== undefined &&
        commit.committer.timestamp <= sinceTimestamp
      ) {
        break;
      }

      commits.push(commitResult);

      // Stop the loop if we have enough commits now.
      if (depth !== undefined && commits.length === depth) break;

      // Add the parents of this commit to the queue
      // Note: for the case of a commit with no parents, it will concat an empty array, having no net effect.
      for (const oid of commit.parent) {
        const commitResult1 = await logCommit({
          fs,
          dir,
          gitdir,
          oid,
          signing,
        });
        if (!tips.map((commit) => commit.oid).includes(commitResult1.oid)) {
          tips.push(commitResult1);
        }
      }

      // Stop the loop if there are no more commit parents
      if (tips.length === 0) break;

      // Process tips in order by age
      tips.sort(compareAge);
    }
    return commits;
  } catch (err) {
    err.caller = 'git.log';
    throw err;
  }
}

function compareAge(a: ReadCommitResult, b: ReadCommitResult): number {
  return a.commit.committer.timestamp - b.commit.committer.timestamp;
}

async function logCommit({
  fs,
  dir = '.',
  gitdir = '.git',
  oid,
  signing,
}: {
  fs: EncryptedFS;
  dir: string;
  gitdir: string;
  oid: string;
  signing: boolean;
}): Promise<ReadCommitResult> {
  const gitObject = await readObject({ fs, dir, gitdir, oid });
  if (gitObject.type !== 'commit') {
    throw new gitErrors.ErrorGitUndefinedType(
      `Expected type to be commit, but instead found ${gitObject.type}`,
    );
  }
  const commit = commitFrom(gitObject.object as Buffer | string);
  const payload = signing ? withoutSignature(commit) : '';
  const result = { oid: oid, commit: parse(commit), payload: payload };
  return result;
}

function withoutSignature(commit: string): string {
  const commita = normalize(commit);
  if (commita.indexOf('\ngpgsig') === -1) return commita;
  const headers = commita.slice(0, commita.indexOf('\ngpgsig'));
  const message = commita.slice(
    commita.indexOf('-----END PGP SIGNATURE-----\n') +
      '-----END PGP SIGNATURE-----\n'.length,
  );
  return normalize(headers + '\n' + message);
}
function justMessage(commit: string): string {
  return normalize(commit.slice(commit.indexOf('\n\n') + 2));
}

function parse(commit: string): CommitObject {
  return { message: justMessage(commit), ...parseHeaders(commit) };
}

function render(obj: CommitObject): string {
  return renderHeaders(obj) + '\n' + normalize(obj.message);
}

function justHeaders(commit: string): string {
  return commit.slice(0, commit.indexOf('\n\n'));
}

function parseHeaders(commit: string): {
  parent: string[];
  tree: string;
  author: Identity;
  committer: Identity;
} {
  const headers = justHeaders(commit).split('\n');
  const hs: string[] = [];
  for (const h of headers) {
    if (h[0] === ' ') {
      // Combine with previous header (without space indent)
      hs[hs.length - 1] += '\n' + h.slice(1);
    } else {
      hs.push(h);
    }
  }
  const parent: string[] = [];
  const obj: {
    parent: string[];
    tree: string;
    author: Identity;
    committer: Identity;
  } = {
    parent: parent,
    tree: '',
    author: {
      name: '',
      email: '',
      timestamp: 0,
      timezoneOffset: 0,
    },
    committer: {
      name: '',
      email: '',
      timestamp: 0,
      timezoneOffset: 0,
    },
  };
  for (const h of hs) {
    const key = h.slice(0, h.indexOf(' '));
    const value = h.slice(h.indexOf(' ') + 1);
    if (key === 'author' || key === 'commiter') {
      obj[key] = parseAuthor(value);
    } else if (Array.isArray(obj[key])) {
      obj[key].push(value);
    } else {
      obj[key] = value;
    }
  }
  return { ...obj };
}

function parseAuthor(author: string): Identity {
  const identity = author.match(new RegExp(/^(.*) <(.*)> (.*) (.*)$/));
  let name: string, email: string, timestamp: number, offset: number;
  if (identity != null) {
    name = identity[1];
    email = identity[2];
    timestamp = Number(identity[3]);
    offset = parseTimezoneOffset(identity[4]);
  } else {
    throw new gitErrors.ErrorGitReadObject('Invalid Author');
  }
  return {
    name: name,
    email: email,
    timestamp: timestamp,
    timezoneOffset: offset,
  };
}

function parseTimezoneOffset(offset: string): number {
  const matches = offset.match(/(\+|-)(\d\d)(\d\d)/);
  if (matches == null) {
    throw new gitErrors.ErrorGitReadObject(
      'No timezone found on commit object',
    );
  }
  const sign = matches[1];
  const hours = matches[2];
  const minutes = matches[3];
  const mins = (sign === '+' ? 1 : -1) * (Number(hours) * 60 + Number(minutes));
  return mins === 0 ? mins : -mins;
}

function normalize(str: string): string {
  // Remove all <CR>
  str = str.replace(/\r/g, '');
  // No extra newlines up front
  str = str.replace(/^\n+/, '');
  // And a single newline at the end
  str = str.replace(/\n+$/, '') + '\n';
  return str;
}

function indent(str: string): string {
  return (
    str
      .trim()
      .split('\n')
      .map((x) => ' ' + x)
      .join('\n') + '\n'
  );
}

function renderHeaders(obj: CommitObject): string {
  let headers = '';
  if (obj.tree) {
    headers += `tree ${obj.tree}\n`;
  } else {
    headers += `tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904\n`; // The null tree
  }
  if (obj.parent) {
    for (const p of obj.parent) {
      headers += `parent ${p}\n`;
    }
  }
  const author = obj.author;
  headers += `author ${author.name} <${author.email}> ${
    author.timestamp
  } ${formatTimezoneOffset(author.timezoneOffset)}\n`;
  const committer = obj.committer || obj.author;
  headers += `committer ${committer.name} <${committer.email}> ${
    committer.timestamp
  } ${formatTimezoneOffset(committer.timezoneOffset)}\n`;
  if (obj.gpgsig) {
    headers += 'gpgsig' + indent(obj.gpgsig);
  }
  return headers;
}

function formatTimezoneOffset(minutes: number): string {
  const sign = simpleSign(minutes === 0 ? minutes : -minutes);
  minutes = Math.abs(minutes);
  const hours = Math.floor(minutes / 60);
  minutes -= hours * 60;
  let strHours = String(hours);
  let strMinutes = String(minutes);
  if (strHours.length < 2) strHours = '0' + strHours;
  if (strMinutes.length < 2) strMinutes = '0' + strMinutes;
  return (sign === -1 ? '-' : '+') + strHours + strMinutes;
}

function simpleSign(n: number): number {
  return Math.sign(n) || (Object.is(n, -0) ? -1 : 1);
}

function commitFrom(commit: string | Buffer): string {
  let commitRet: string;
  if (typeof commit === 'string') {
    commitRet = commit;
  } else if (Buffer.isBuffer(commit)) {
    commitRet = commit.toString('utf8');
  } else if (typeof commit === 'object') {
    commitRet = render(commit);
  } else {
    throw new gitErrors.ErrorGitReadObject(
      'invalid type passed to GitCommit constructor',
    );
  }
  return commitRet;
}

async function readObject({
  fs,
  dir,
  gitdir,
  oid,
  format,
  encoding,
}: {
  fs: EncryptedFS;
  dir: string;
  gitdir: string;
  oid: string;
  format?: 'parsed' | 'content';
  encoding?: BufferEncoding;
}): Promise<RawObject>;
async function readObject({
  fs,
  dir,
  gitdir,
  oid,
  format,
  encoding,
}: {
  fs: EncryptedFS;
  dir: string;
  gitdir: string;
  oid: string;
  format: 'deflated';
  encoding?: BufferEncoding;
}): Promise<DeflatedObject>;
async function readObject({
  fs,
  dir,
  gitdir,
  oid,
  format,
  encoding,
}: {
  fs: EncryptedFS;
  dir: string;
  gitdir: string;
  oid: string;
  format: 'wrapped';
  encoding?: BufferEncoding;
}): Promise<WrappedObject>;
async function readObject({
  fs,
  dir = '.',
  gitdir = '.git',
  oid,
  format = 'parsed',
  encoding,
}: {
  fs: EncryptedFS;
  dir: string;
  gitdir: string;
  oid: string;
  format?: 'wrapped' | 'parsed' | 'deflated' | 'content';
  encoding?: BufferEncoding;
}): Promise<DeflatedObject | WrappedObject | RawObject> {
  const _format = format === 'parsed' ? 'content' : format;
  // Curry the current read method so that the packfile un-deltification
  // process can acquire external ref-deltas.
  const getExternalRefDelta = (oid: string) =>
    readObject({ fs, dir, gitdir, oid });
  let result;
  // Empty tree - hard-coded so we can use it as a shorthand.
  // Note: I think the canonical git implementation must do this too because
  // `git cat-file -t 4b825dc642cb6eb9a060e54bf8d69288fbee4904` prints "tree" even in empty repos.
  if (oid === '4b825dc642cb6eb9a060e54bf8d69288fbee4904') {
    result = { format: 'wrapped', object: Buffer.from(`tree 0\x00`) };
  }
  const source = path.join('objects', oid.slice(0, 2), oid.slice(2));
  // Look for it in the loose object directory
  try {
    result = {
      object: await fs.promises.readFile(path.join(gitdir, source)),
      format: 'deflated',
      source: source,
    };
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Object was not in the loose object directory
    }
  }
  // Check to see if it's in a packfile.
  if (result == null) {
    // Iterate through all the .pack files
    const list = await fs.promises.readdir(
      path.join(gitdir, 'objects', 'pack'),
    );
    let stringList = list.map((x) => {
      return x.toString();
    });
    stringList = stringList.filter((x: string) => x.endsWith('.idx'));
    for (const filename of stringList) {
      const indexFile = path.join(gitdir, 'objects', 'pack', filename);
      const idx = await fs.promises.readFile(indexFile);
      const p = fromIdx(Buffer.from(idx), getExternalRefDelta);
      if (p == null) {
        break;
      }
      // If the packfile DOES have the oid we're looking for...
      if (p.offsets.has(oid)) {
        // Make sure the packfile is loaded in memory
        if (!p.pack) {
          const packFile = indexFile.replace(/idx$/, 'pack');
          const pack = await fs.promises.readFile(packFile);
          p.pack = Buffer.from(pack);
        }
        // Get the resolved git object from the packfile
        result = await readPack(p, oid);
        result.format = 'content';
        result.source = path.join(
          'objects',
          'pack',
          filename.replace(/idx$/, 'pack'),
        );
      }
    }
  }
  // If the object has not been found yet throw an error
  if (result == null) {
    throw new gitErrors.ErrorGitReadObject(`Failed to read object ${oid}`);
  }
  if (format === 'deflated') {
    result.oid = oid;
  } else if (
    result.format === 'deflated' ||
    result.format === 'wrapped' ||
    result.format === 'content'
  ) {
    if (result.format === 'deflated') {
      result.object = Buffer.from(pako.inflate(result.object));
      result.format = 'wrapped';
    }
    if (result.format === 'wrapped') {
      if (format === 'wrapped' && result.format === 'wrapped') {
        return {
          oid: oid,
          type: 'wrapped',
          format: result.format,
          object: result.object,
          source: result.source,
        };
      }
      const sha = new Hash().update(result.object).digest('hex');
      if (sha !== oid) {
        throw new gitErrors.ErrorGitReadObject(
          `SHA check failed! Expected ${oid}, computed ${sha}`,
        );
      }
      const { type, object } = unwrap(result.object);
      result.type = type;
      result.object = object;
      result.format = 'content';
    }
    if (result.format === 'content') {
      if (format === 'content') {
        return {
          oid: oid,
          type: result.type,
          format: result.format,
          object: result.object,
          source: result.source,
        };
      }
    }
  } else {
    throw new gitErrors.ErrorGitReadObject(
      `Unsupported format type: ${result.format}`,
    );
  }
  if (format === 'parsed') {
    result.format = 'parsed';
    switch (result.type) {
      case 'commit':
        result.object = commitFrom(result.object);
        break;
      case 'tree':
        // Result.object = treeFrom(result.object).entries();
        break;
      case 'blob':
        // Here we consider returning a raw Buffer as the 'content' format
        // and returning a string as the 'parsed' format
        if (encoding) {
          result.object = result.object.toString(encoding);
        } else {
          result.object = new Uint8Array(result.object);
          result.format = 'content';
        }
        break;
      default:
        throw new gitErrors.ErrorGitUndefinedType(
          `Object ${result.oid} type ${result.type} not recognised`,
        );
    }
  } else if (result.format === 'deflated' || result.format === 'wrapped') {
    result.type = result.format;
  }
  return result;
}

async function readPack(
  p: PackIndex,
  oid: string,
): Promise<DeflatedObject | WrappedObject | RawObject> {
  const start = p.offsets.get(oid);
  if (start == null) {
    if (p.getExternalRefDelta) {
      return p.getExternalRefDelta(oid);
    } else {
      throw new gitErrors.ErrorGitReadObject(
        `Could not read object ${oid} from packfile`,
      );
    }
  }
  return await readSlice(p, start, oid);
}

async function readSlice(
  p: PackIndex,
  start: number,
  oid: string,
): Promise<RawObject> {
  const types = {
    0b0010000: 'commit',
    0b0100000: 'tree',
    0b0110000: 'blob',
    0b1000000: 'tag',
    0b1100000: 'ofs_delta',
    0b1110000: 'ref_delta',
  };
  if (!p.pack) {
    throw new gitErrors.ErrorGitReadObject(
      'Tried to read from a GitPackIndex with no packfile loaded into memory',
    );
  }
  const raw = p.pack.slice(start);
  const reader = new BufferCursor(raw);
  const byte = reader.readUInt8();
  // Object type is encoded in bits 654
  const btype = byte & 0b1110000;
  let type = types[btype];
  if (type === undefined) {
    throw new gitErrors.ErrorGitUndefinedType(
      'Unrecognized type: 0b' + btype.toString(2),
    );
  }
  // The length encoding get complicated.
  // Last four bits of length is encoded in bits 3210
  const lastFour = byte & 0b1111;
  let length = lastFour;
  // Whether the next byte is part of the variable-length encoded number
  // is encoded in bit 7
  const multibyte = byte & 0b10000000;
  if (multibyte) {
    length = otherVarIntDecode(reader, lastFour);
  }
  let base;
  let object: Buffer;
  // Handle deltified objects
  if (type === 'ofs_delta') {
    const offset = decodeVarInt(reader);
    const baseOffset = start - offset;
    ({ object: base, type } = await readSlice(p, baseOffset, oid));
  }
  // Handle undeltified objects
  const buffer = raw.slice(reader.tell());
  object = Buffer.from(pako.inflate(buffer));
  // Assert that the object length is as expected.
  if (object.byteLength !== length) {
    throw new gitErrors.ErrorGitReadObject(
      `Packfile told us object would have length ${length} but it had length ${object.byteLength}`,
    );
  }
  if (base != null) {
    object = Buffer.from(applyDelta(object, base));
  }
  return { oid: oid, type: type, format: 'content', object: object };
}

function applyDelta(delta: Buffer, source: Buffer): Buffer {
  const reader = new BufferCursor(delta);
  const sourceSize = readVarIntLE(reader);

  if (sourceSize !== source.byteLength) {
    throw new gitErrors.ErrorGitReadObject(
      `applyDelta expected source buffer to be ${sourceSize} bytes but the provided buffer was ${source.length} bytes`,
    );
  }
  const targetSize = readVarIntLE(reader);
  let target: Buffer;

  const firstOp = readOp(reader, source);
  // Speed optimization - return raw buffer if it's just single simple copy
  if (firstOp.byteLength === targetSize) {
    target = firstOp;
  } else {
    // Otherwise, allocate a fresh buffer and slices
    target = Buffer.alloc(targetSize);
    const writer = new BufferCursor(target);
    writer.copy(firstOp);

    while (!reader.eof()) {
      writer.copy(readOp(reader, source));
    }

    const tell = writer.tell();
    if (targetSize !== tell) {
      throw new gitErrors.ErrorGitReadObject(
        `applyDelta expected target buffer to be ${targetSize} bytes but the resulting buffer was ${tell} bytes`,
      );
    }
  }
  return target;
}

function readVarIntLE(reader: BufferCursor): number {
  let result = 0;
  let shift = 0;
  let byte;
  do {
    byte = reader.readUInt8();
    result |= (byte & 0b01111111) << shift;
    shift += 7;
  } while (byte & 0b10000000);
  return result;
}

function readOp(reader: BufferCursor, source: Buffer): Buffer {
  const byte = reader.readUInt8();
  const COPY = 0b10000000;
  const OFFS = 0b00001111;
  const SIZE = 0b01110000;
  if (byte & COPY) {
    // Copy consists of 4 byte offset, 3 byte size (in LE order)
    const offset = readCompactLE(reader, byte & OFFS, 4);
    let size = readCompactLE(reader, (byte & SIZE) >> 4, 3);
    // Yup. They really did this optimization.
    if (size === 0) size = 0x10000;
    return source.slice(offset, offset + size);
  } else {
    // Insert
    return reader.slice(byte);
  }
}

function readCompactLE(
  reader: BufferCursor,
  flags: number,
  size: number,
): number {
  let result = 0;
  let shift = 0;
  while (size--) {
    if (flags & 0b00000001) {
      result |= reader.readUInt8() << shift;
    }
    flags >>= 1;
    shift += 8;
  }
  return result;
}

function decodeVarInt(reader: BufferCursor): number {
  const bytes: number[] = [];
  let byte = 0;
  let multibyte = 0;
  do {
    byte = reader.readUInt8();
    // We keep bits 6543210
    const lastSeven = byte & 0b01111111;
    bytes.push(lastSeven);
    // Whether the next byte is part of the variable-length encoded number
    // is encoded in bit 7
    multibyte = byte & 0b10000000;
  } while (multibyte);
  // Now that all the bytes are in big-endian order,
  // alternate shifting the bits left by 7 and OR-ing the next byte.
  // And... do a weird increment-by-one thing that I don't quite understand.
  return bytes.reduce((a, b) => ((a + 1) << 7) | b, -1);
}

function otherVarIntDecode(reader: BufferCursor, startWith: number): number {
  let result = startWith;
  let shift = 4;
  let byte;
  do {
    byte = reader.readUInt8();
    result |= (byte & 0b01111111) << shift;
    shift += 7;
  } while (byte & 0b10000000);
  return result;
}

function fromIdx(
  idx: Buffer,
  getExternalRefDelta?: (
    oid: string,
  ) => Promise<DeflatedObject | WrappedObject | RawObject>,
): PackIndex | undefined {
  const reader = new BufferCursor(idx);
  const magic = reader.slice(4).toString('hex');
  if (magic !== 'ff744f63') {
    return;
  }
  const version = reader.readUInt32BE();
  if (version !== 2) {
    throw new gitErrors.ErrorGitReadObject(
      `Unable to read version ${version} packfile IDX. (Only version 2 supported)`,
    );
  }
  if (idx.byteLength > 2048 * 1024 * 1024) {
    throw new gitErrors.ErrorGitReadObject(
      `To keep implementation simple, I haven't implemented the layer 5 feature needed to support packfiles > 2GB in size.`,
    );
  }
  // Skip over fanout table
  reader.seek(reader.tell() + 4 * 255);
  // Get hashes
  const size = reader.readUInt32BE();
  const hashes: string[] = [];
  for (let i = 0; i < size; i++) {
    const hash = reader.slice(20).toString('hex');
    hashes[i] = hash;
  }
  reader.seek(reader.tell() + 4 * size);
  // Skip over CRCs
  // Get offsets
  const offsets = new Map();
  for (let i = 0; i < size; i++) {
    offsets.set(hashes[i], reader.readUInt32BE());
  }
  const packfileSha = reader.slice(20).toString('hex');
  return {
    hashes,
    offsets,
    packfileSha,
    getExternalRefDelta,
  };
}

function unwrap(buffer: Buffer): {
  type: string;
  object: Buffer;
} {
  const s = buffer.indexOf(32); // First space
  const i = buffer.indexOf(0); // First null value
  const type = buffer.slice(0, s).toString('utf8'); // Get type of object
  // if (type !== 'commit' && type !== 'tree' && type !== 'blob')
  //   throw new gitErrors.ErrorGitUndefinedType(
  //     `Object of type ${type} not recognised`,
  //   );
  const length = buffer.slice(s + 1, i).toString('utf8'); // Get type of object
  const actualLength = buffer.length - (i + 1);
  // Verify length
  if (parseInt(length) !== actualLength) {
    throw new gitErrors.ErrorGitReadObject(
      `Length mismatch: expected ${length} bytes but got ${actualLength} instead.`,
    );
  }
  return {
    type: type,
    object: Buffer.from(buffer.slice(i + 1)),
  };
}

/**
 * Without getting to deep into it, it seems to be prepping and then sending all the required data through the output stream.
 * @param fs Filesystem implementation
 * @param dir Git working directory
 * @param gitdir Git '.git' directory
 * @param oids Desired Oids to be sent.
 * @param outputStream data output stream.
 */
async function pack({
  fs,
  dir = '.',
  gitdir = '.git',
  oids,
  outputStream,
}: {
  fs: EncryptedFS;
  dir: string;
  gitdir: string;
  oids: string[];
  outputStream: PassThrough;
}): Promise<PassThrough> {
  const hash = await createHash('sha1');
  function write(chunk: Buffer | string, enc?: BufferEncoding): void {
    if (enc != null) {
      outputStream.write(chunk, enc);
    } else {
      outputStream.write(chunk);
    }
    hash.update(chunk, enc);
  }
  function writeObject(object: Uint8Array, stype: string): void {
    // Object type is encoded in bits 654
    const type = types[stype];
    if (type === undefined) {
      throw new gitErrors.ErrorGitUndefinedType('Unrecognized type: ' + stype);
    }
    // The length encoding get complicated.
    let length = object.length;
    // Whether the next byte is part of the variable-length encoded number
    // is encoded in bit 7
    let multibyte = length > 0b1111 ? 0b10000000 : 0b0;
    // Last four bits of length is encoded in bits 3210
    const lastFour = length & 0b1111;
    // Discard those bits
    length = length >>> 4;
    // The first byte is then (1-bit multibyte?), (3-bit type), (4-bit least sig 4-bits of length)
    let byte: number | string = (multibyte | type | lastFour).toString(16);
    write(byte, 'hex');
    // Now we keep chopping away at length 7-bits at a time until its zero,
    // writing out the bytes in what amounts to little-endian order.
    while (multibyte) {
      multibyte = length > 0b01111111 ? 0b10000000 : 0b0;
      byte = multibyte | (length & 0b01111111);
      const unpaddedChunk = byte.toString(16);
      const paddedChunk = '0'.repeat(2 - unpaddedChunk.length) + unpaddedChunk;
      write(paddedChunk, 'hex');
      length = length >>> 7;
    }
    // Lastly, we can compress and write the object.
    write(Buffer.from(pako.deflate(object)));
  }

  write('PACK');
  write('00000002', 'hex');
  // Write a 4 byte (32-bit) int
  const unpaddedChunk = oids.length.toString(16);
  const paddedChunk = '0'.repeat(8 - unpaddedChunk.length) + unpaddedChunk;
  write(paddedChunk, 'hex');
  for (const oid of oids) {
    const { type, object } = await readObject({ fs, dir, gitdir, oid });
    writeObject(object as Uint8Array, type);
  }
  // Write SHA1 checksum
  const digest = hash.digest();
  outputStream.end(digest);
  return outputStream;
}

function mux(
  protocol: string, // 'side-band' or 'side-band-64k'
  packetlines: PassThrough,
  packfile: PassThrough,
  progress: PassThrough,
): PassThrough {
  const MAX_PACKET_LENGTH = protocol === 'side-band-64k' ? 999 : 65519;
  const output = new PassThrough();
  packetlines.on('data', (data: Buffer) => {
    if (data === null) {
      output.write(Buffer.from('0000', 'utf8'));
    } else {
      output.write(encode(data));
    }
  });
  let packfileWasEmpty = true;
  let packfileEnded = false;
  let progressEnded = false;
  const errorEnded = true;
  const goodbye = Buffer.concat([
    encode(Buffer.from('010A', 'hex')),
    Buffer.from('0000', 'utf8'),
  ]);
  packfile
    .on('data', (data: Buffer) => {
      packfileWasEmpty = false;
      const buffers = splitBuffer(data, MAX_PACKET_LENGTH);
      for (const buffer of buffers) {
        output.write(encode(Buffer.concat([Buffer.from('01', 'hex'), buffer])));
      }
    })
    .on('end', () => {
      packfileEnded = true;
      if (!packfileWasEmpty) output.write(goodbye);
      if (progressEnded && errorEnded) output.end();
    });
  progress
    .on('data', (data: Buffer) => {
      const buffers = splitBuffer(data, MAX_PACKET_LENGTH);
      for (const buffer of buffers) {
        output.write(encode(Buffer.concat([Buffer.from('02', 'hex'), buffer])));
      }
    })
    .on('end', () => {
      progressEnded = true;
      if (packfileEnded && errorEnded) output.end();
    });
  return output;
}

function splitBuffer(buffer: Buffer, maxBytes: number): Array<Buffer> {
  const result: Buffer[] = [];
  let index = 0;
  while (index < buffer.length) {
    const buf = buffer.slice(index, index + maxBytes);
    result.push(buf);
    index += buf.length;
  }
  result.push(buffer.slice(index));
  return result;
}

class BufferCursor {
  protected buffer: Buffer;
  protected _start: number;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
    this._start = 0;
  }

  eof(): boolean {
    return this._start >= this.buffer.length;
  }

  tell(): number {
    return this._start;
  }

  seek(n: number): void {
    this._start = n;
  }

  slice(n: number): Buffer {
    const r = this.buffer.slice(this._start, this._start + n);
    this._start += n;
    return r;
  }

  toString(enc: BufferEncoding, length: number) {
    const r = this.buffer.toString(enc, this._start, this._start + length);
    this._start += length;
    return r;
  }

  write(value: string, length: number, enc: BufferEncoding): number {
    const r = this.buffer.write(value, this._start, length, enc);
    this._start += length;
    return r;
  }

  copy(source: Buffer, start?: number, end?: number): number {
    const r = source.copy(this.buffer, this._start, start, end);
    this._start += r;
    return r;
  }

  readUInt8(): number {
    const r = this.buffer.readUInt8(this._start);
    this._start += 1;
    return r;
  }

  writeUInt8(value: number): number {
    const r = this.buffer.writeUInt8(value, this._start);
    this._start += 1;
    return r;
  }

  readUInt16BE(): number {
    const r = this.buffer.readUInt16BE(this._start);
    this._start += 2;
    return r;
  }

  writeUInt16BE(value: number): number {
    const r = this.buffer.writeUInt16BE(value, this._start);
    this._start += 2;
    return r;
  }

  readUInt32BE(): number {
    const r = this.buffer.readUInt32BE(this._start);
    this._start += 4;
    return r;
  }

  writeUInt32BE(value: number): number {
    const r = this.buffer.writeUInt32BE(value, this._start);
    this._start += 4;
    return r;
  }
}

export {
  createGitPacketLine,
  uploadPack,
  packObjects,
  pack,
  mux,
  iteratorFromData,
  encode,
  fromIdx,
  listRefs,
  resolve,
  readObject,
};
