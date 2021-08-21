import type {
  Refs,
  RefsAdResponse,
  Ack,
  BufferEncoding,
  Identity,
  Pack,
  PackIndex,
} from './types';
import type {
  ReadCommitResult,
  CommitObject,
  TreeEntry,
  TreeObject,
  DeflatedObject,
  WrappedObject,
  RawObject,
} from 'isomorphic-git';
import type { EncryptedFS } from 'encryptedfs';

import path from 'path';
import pako from 'pako';
import Hash from 'sha.js/sha1';
import { PassThrough } from 'readable-stream';
import createHash from 'sha.js';

import * as utils from '../utils';
import * as vaultUtils from '../vaults/utils';
import { errors as gitErrors } from './';

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

async function writeRefsAdResponse(
  info: RefsAdResponse,
): Promise<Array<Buffer>> {
  const stream: Buffer[] = [];
  // Compose capabilities string
  let syms = '';
  let a = '';
  for (const [key, value] of Object.entries(info.symrefs)) {
    syms += `symref=${key}:${value} `;
    a = value;
  }
  let caps = `\x00${[...info.capabilities].join(
    ' ',
  )} ${syms}agent=git/isomorphic-git@1.8.1`;
  // Note: In the edge case of a brand new repo, zero refs (and zero capabilities)
  // are returned.
  for (const [key, value] of Object.entries(info.refs)) {
    stream.push(encode(`${value} ${key}${caps}\n`));
    stream.push(encode(`${value} ${a}\n`));
    caps = '';
  }
  stream.push(Buffer.from('0000', 'utf8'));
  return stream;
}

function encode(line: string | Buffer): Buffer {
  if (typeof line === 'string') {
    line = Buffer.from(line);
  }
  const length = line.length + 4;
  const hexlength = padHex(4, length);
  return Buffer.concat([Buffer.from(hexlength, 'utf8'), line]);
}

function padHex(bytes: number, length: number): string {
  const s = length.toString(16);
  return '0'.repeat(bytes - s.length) + s;
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

async function packedRefs(fs: EncryptedFS, gitdir: string): Promise<Refs> {
  const readFile = utils.promisify(fs.readFile).bind(fs);
  const text = await readFile(path.join(gitdir, 'packed-refs'), {
    encoding: 'utf8',
  });
  const refs = textToPackedRefs(text);
  return refs;
}

async function listRefs(
  fs: EncryptedFS,
  gitdir: string,
  filepath: string,
): Promise<string[]> {
  const packedMap = packedRefs(fs, gitdir);
  let files: string[] = [];
  try {
    for (const file of await vaultUtils.readdirRecursivelyEFS(
      fs,
      path.join(gitdir, filepath),
    )) {
      files.push(file);
    }
    files = files.map((x) => x.replace(path.join(gitdir, filepath, '/'), ''));
  } catch (err) {
    files = [];
  }

  for (let key of Object.keys(await packedMap)) {
    // filter by prefix
    if (key.startsWith(filepath)) {
      // remove prefix
      key = key.replace(filepath + '/', '');
      // Don't include duplicates; the loose files have precedence anyway
      if (!files.includes(key)) {
        files.push(key);
      }
    }
  }
  // since we just appended things onto an array, we need to sort them now
  files.sort(compareRefNames);
  return files;
}

async function resolve(
  fs: EncryptedFS,
  gitdir: string,
  ref: string,
  depth?: number,
): Promise<string> {
  const readFile = utils.promisify(fs.readFile).bind(fs);
  if (depth !== undefined) {
    depth--;
    if (depth === -1) {
      return ref;
    }
  }
  // Is it a ref pointer?
  if (ref.startsWith('ref: ')) {
    ref = ref.slice('ref: '.length);
    return resolve(fs, gitdir, ref, depth);
  }
  // Is it a complete and valid SHA?
  if (ref.length === 40 && /[0-9a-f]{40}/.test(ref)) {
    return ref;
  }
  // We need to alternate between the file system and the packed-refs
  const packedMap = await packedRefs(fs, gitdir);
  // Look in all the proper paths, in this order
  const allpaths = refpaths(ref).filter((p) => !GIT_FILES.includes(p)); // exclude git system files (#709)
  for (const ref of allpaths) {
    const sha =
      (
        await readFile(path.join(gitdir, ref), { encoding: 'utf8' })
      ).toString() || packedMap[ref];
    if (sha != null) {
      return resolve(fs, gitdir, sha.trim(), depth);
    }
  }
  throw new gitErrors.ErrorGitUndefinedRefs('Refs not found');
}

async function uploadPack(
  fs: EncryptedFS,
  gitdir: string = '.git',
  advertiseRefs = false,
): Promise<Array<Buffer> | undefined> {
  try {
    if (advertiseRefs) {
      const capabilities = ['side-band-64k'];
      let keys = await listRefs(fs, gitdir, 'refs');
      keys = keys.map((ref) => path.join('refs', ref));
      const refs = {};
      keys.unshift('HEAD');
      for (const key of keys) {
        refs[key] = await resolve(fs, gitdir, key);
      }
      const symrefs = {};
      symrefs['HEAD'] = await resolve(fs, gitdir, 'HEAD', 2);
      const write: RefsAdResponse = {
        capabilities: capabilities,
        refs: refs,
        symrefs: symrefs,
      };
      return writeRefsAdResponse(write);
    }
  } catch (err) {
    err.caller = 'git.uploadPack';
    throw err;
  }
}

async function packObjects(
  fs: EncryptedFS,
  gitdir: string = '.git',
  refs: string[],
  depth?: number,
  haves?: string[],
): Promise<Pack> {
  const oids = new Set<string>();
  const shallows = new Set<string>();
  const unshallows = new Set<string>();
  const acks: Ack[] = [];
  haves = haves ? haves : [];
  const since = undefined;
  for (const ref of refs) {
    const commits = await log(fs, gitdir, ref, depth, since);
    const oldshallows: string[] = [];
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
  const objects = await listObjects(fs, gitdir, Array.from(oids));
  const packstream = new PassThrough();
  pack(fs, gitdir, [...objects], packstream);
  return { packstream, shallows, unshallows, acks };
}

async function listObjects(
  fs: EncryptedFS,
  gitdir = '.git',
  oids: string[],
): Promise<Array<string>> {
  const commits = new Set<string>();
  const trees = new Set<string>();
  const blobs = new Set<string>();

  // We don't do the purest simplest recursion, because we can
  // avoid reading Blob objects entirely since the Tree objects
  // tell us which oids are Blobs and which are Trees. And we
  // do not need to recurse through commit parents.
  async function walk(oid: string): Promise<void> {
    const gitObject = await read(fs, gitdir, oid);
    if (gitObject.type === 'commit') {
      commits.add(oid);
      const commit = commitFrom(Buffer.from(gitObject.object));
      const tree = parseHeaders(commit).tree;
      await walk(tree);
    } else if (gitObject.type === 'tree') {
      trees.add(oid);
      const tree = treeFrom(gitObject.object);
      for (const entry of tree) {
        if (entry.type === 'blob') {
          blobs.add(entry.oid);
        }
        // only recurse for trees
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
  entry.mode = limitModeToAllowed(entry.mode); // index
  if (!entry.type) {
    entry.type = 'blob'; // index
  }
  return entry;
}

function limitModeToAllowed(mode: string | number): string {
  if (typeof mode === 'number') {
    mode = mode.toString(8);
  }
  // tree
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
    if (mode === '40000') mode = '040000'; // makes it line up neater in printed output
    const type = mode === '040000' ? 'tree' : 'blob';
    const path = buffer.slice(space + 1, nullchar).toString('utf8');
    const oid = buffer.slice(nullchar + 1, nullchar + 21).toString('hex');
    cursor = nullchar + 21;
    _entries.push({ mode, path, oid, type });
  }
  return _entries;
}

async function log(
  fs: EncryptedFS,
  gitdir = '.git',
  ref = 'HEAD',
  depth: number | undefined,
  since: number | undefined, // Date
  signing = false,
): Promise<ReadCommitResult[]> {
  try {
    const sinceTimestamp =
      since === undefined ? undefined : Math.floor(since.valueOf() / 1000);
    // TODO: In the future, we may want to have an API where we return a
    // async iterator that emits commits.
    const commits: ReadCommitResult[] = [];
    const oid = await resolve(fs, gitdir, ref);
    const tips = [await logCommit(fs, gitdir, oid, signing)];

    // eslint-disable-next-line
    while (true) {
      const Commit = tips.pop();
      if (Commit == null) {
        throw new gitErrors.ErrorCommit('Commit history invalid');
      }
      const commit = Commit.commit;

      // Stop the log if we've hit the age limit
      if (
        sinceTimestamp !== undefined &&
        commit.committer.timestamp <= sinceTimestamp
      ) {
        break;
      }

      commits.push(Commit);

      // Stop the loop if we have enough commits now.
      if (depth !== undefined && commits.length === depth) break;

      // Add the parents of this commit to the queue
      // Note: for the case of a commit with no parents, it will concat an empty array, having no net effect.
      for (const oid of commit.parent) {
        const Commit = await logCommit(fs, gitdir, oid, signing);
        if (!tips.map((commit) => commit.oid).includes(Commit.oid)) {
          tips.push(Commit);
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

async function logCommit(
  fs: EncryptedFS,
  gitdir: string,
  oid: string,
  signing: boolean,
): Promise<ReadCommitResult> {
  const gitObject = await read(fs, gitdir, oid);
  if (gitObject.type !== 'commit') {
    throw new gitErrors.ErrorGitUndefinedType(
      `Expected type to be commit, but instead found ${gitObject.type}`,
    );
  }
  const commit = commitFrom(Buffer.from(gitObject.object));
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
      // combine with previous header (without space indent)
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
  if (matches == null)
    throw new gitErrors.ErrorCommit('No timezone found on commit object');
  const sign = matches[1];
  const hours = matches[2];
  const minutes = matches[3];
  const mins = (sign === '+' ? 1 : -1) * (Number(hours) * 60 + Number(minutes));
  return mins === 0 ? mins : -mins;
}

function normalize(str: string): string {
  // remove all <CR>
  str = str.replace(/\r/g, '');
  // no extra newlines up front
  str = str.replace(/^\n+/, '');
  // and a single newline at the end
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
    headers += `tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904\n`; // the null tree
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

function commitFrom(commit: string | Buffer | CommitObject): string {
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

async function read(
  fs: EncryptedFS,
  gitdir: string,
  oid: string,
  format = 'content',
): Promise<DeflatedObject | WrappedObject | RawObject> {
  const readFile = utils.promisify(fs.readFile).bind(fs);
  const readdir = utils.promisify(fs.readdir).bind(fs);
  let file;
  // Look for it in the loose object directory.
  try {
    file = await readFile(
      path.join(gitdir, 'objects', oid.slice(0, 2), oid.slice(2)),
    );
  } catch (err) {
    if (err.code === 'ENOENT') {
      // empty
    }
  }
  const source = path.join('objects', oid.slice(0, 2), oid.slice(2));
  // Check to see if it's in a packfile.
  if (file == null) {
    // Curry the current read method so that the packfile un-deltification
    // process can acquire external ref-deltas.
    const getExternalRefDelta = (oid: string) => read(fs, gitdir, oid);
    // Iterate through all the .pack files
    let list: Array<string> = await readdir(path.join(gitdir, '/objects/pack'));
    list = list.filter((x: string) => x.endsWith('.idx'));
    for (const filename of list) {
      const indexFile = path.join(gitdir, 'objects', 'pack', filename);
      const idx = await readFile(indexFile);
      const p = fromIdx(idx, getExternalRefDelta);
      if (p == null) {
        break;
      }
      // const p = PackfileCache[filename];
      // If the packfile DOES have the oid we're looking for...
      if (p.offsets.has(oid)) {
        // Make sure the packfile is loaded in memory
        if (!p.pack) {
          const packFile = indexFile.replace(/idx$/, 'pack');
          const pack = await readFile(packFile);
          p.pack = pack;
        }
        // Get the resolved git object from the packfile
        const result = await readPack(p, oid);
        result.format = 'content';
        result.source = `objects/pack/${filename.replace(/idx$/, 'pack')}`;
        return result;
      }
    }
  }
  // Check to see if it's in shallow commits.
  if (file == null) {
    try {
      const text: string = await readFile(path.join(gitdir, 'shallow'), {
        encoding: 'utf8',
      });
      if (text !== null && text.includes(oid)) {
        throw new gitErrors.ErrorGitReadObject(`ReadShallowObjectFail: ${oid}`);
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new gitErrors.ErrorGitReadObject(`ReadObjectFail: ${oid}`);
      }
    }
  }

  if (format === 'deflated') {
    return {
      oid: oid,
      type: 'deflated',
      format: 'deflated',
      object: file,
      source: source,
    };
  }
  const buffer = Buffer.from(pako.inflate(file));
  if (format === 'wrapped') {
    return {
      oid: oid,
      type: 'wrapped',
      format: 'wrapped',
      object: buffer,
      source: source,
    };
  }
  const { type, object } = unwrap({
    oid: oid,
    type: 'wrapped',
    format: 'wrapped',
    object: buffer,
  });
  if (format === 'content')
    return {
      oid: oid,
      type: type,
      format: 'content',
      object: object,
      source: source,
    };
  throw new gitErrors.ErrorGitReadObject(`Unsupported format type: ${format}`);
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
    // copy consists of 4 byte offset, 3 byte size (in LE order)
    const offset = readCompactLE(reader, byte & OFFS, 4);
    let size = readCompactLE(reader, (byte & SIZE) >> 4, 3);
    // Yup. They really did this optimization.
    if (size === 0) size = 0x10000;
    return source.slice(offset, offset + size);
  } else {
    // insert
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
  getExternalRefDelta: (
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

function unwrap(wrap: WrappedObject): {
  type: 'commit' | 'blob' | 'tree';
  object: Buffer;
} {
  if (wrap.oid) {
    const sha = new Hash().update(wrap.object).digest('hex');
    if (sha !== wrap.oid) {
      throw new gitErrors.ErrorGitReadObject(
        `SHA check failed! Expected ${wrap.oid}, computed ${sha}`,
      );
    }
  }
  const s = wrap.object.indexOf(32); // first space
  const i = wrap.object.indexOf(0); // first null value
  const type = wrap.object.slice(0, s).toString(); // get type of object
  if (type !== 'commit' && type !== 'tree' && type !== 'blob')
    throw new gitErrors.ErrorGitUndefinedType(
      `Object of type ${type} not recognised`,
    );
  const length = wrap.object.slice(s + 1, i).toString(); // get type of object
  const actualLength = wrap.object.length - (i + 1);
  // verify length
  if (parseInt(length) !== actualLength) {
    throw new gitErrors.ErrorGitReadObject(
      `Length mismatch: expected ${length} bytes but got ${actualLength} instead.`,
    );
  }
  return {
    type: type,
    object: Buffer.from(wrap.object.slice(i + 1)),
  };
}

async function pack(
  fs: EncryptedFS,
  gitdir: string = '.git',
  oids: string[],
  outputStream: PassThrough,
): Promise<PassThrough> {
  const hash = createHash('sha1');
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
    if (type === undefined)
      throw new gitErrors.ErrorGitUndefinedType('Unrecognized type: ' + stype);
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
    // console.log(Buffer.from(object).toString());
    write(Buffer.from(pako.deflate(object)));
  }

  write('PACK');
  write('00000002', 'hex');
  // Write a 4 byte (32-bit) int
  const unpaddedChunk = oids.length.toString(16);
  const paddedChunk = '0'.repeat(8 - unpaddedChunk.length) + unpaddedChunk;
  write(paddedChunk, 'hex');
  for (const oid of oids) {
    const { type, object } = await read(fs, gitdir, oid);
    writeObject(object, type);
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

export { createGitPacketLine, uploadPack, packObjects, mux, iteratorFromData };
