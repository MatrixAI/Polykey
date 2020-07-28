import pako from 'pako';
import path from 'path';
import log from './log';
import GitTree from './GitTree';
import createHash from 'sha.js';
import GitCommit from './GitCommit';
import { EncryptedFS } from 'encryptedfs';
import { PassThrough } from 'readable-stream';
import GitObjectManager from './GitObjectManager';

const types = {
  commit: 0b0010000,
  tree: 0b0100000,
  blob: 0b0110000,
  tag: 0b1000000,
  ofs_delta: 0b1100000,
  ref_delta: 0b1110000,
};

type Ack = {
  oid: string;
};
/**
 * Create a packfile stream
 *
 * @link https://isomorphic-git.github.io/docs/packObjects.html
 */
async function packObjects(fileSystem: EncryptedFS, dir: string, refs: string[], depth?: number, haves?: string[]) {
  const gitdir = path.join(dir, '.git');
  let oids = new Set<string>();
  let shallows = new Set<string>();
  let unshallows = new Set();
  let acks: Ack[] = [];

  haves = haves ? haves : [];

  const emitter = undefined;
  const since = undefined;
  for (const ref of refs) {
    try {
      let commits = await log(fileSystem, dir, gitdir, emitter, ref, depth, since);

      let oldshallows: string[] = [];

      for (let i = 0; i < commits.length; i++) {
        let commit = commits[i];
        if (haves.includes(commit.oid)) {
          acks.push({
            oid: ref,
          });
          break;
        }
        oids.add(commit.oid);
        if (i === commits.length - 1) {
          if (!oldshallows.includes(commit.oid) && (depth !== undefined || since !== undefined)) {
            console.log('make it shallow', commit.oid);
            shallows.add(commit.oid);
          }
        } else if (oldshallows.includes(commit.oid)) {
          console.log('make it unshallow', commit.oid);
          unshallows.add(commit.oid);
        }
      }
    } catch (err) {
      console.log(err);
      // oh well.
    }
  }
  let objects = await listObjects(fileSystem, dir, gitdir, Array.from(oids));

  let packstream = new PassThrough();
  pack(fileSystem, dir, undefined, [...objects], packstream);
  return { packstream, shallows, unshallows, acks };
}

async function listObjects(
  fileSystem: EncryptedFS,
  dir: string,
  gitdir: string = path.join(dir, '.git'),
  oids: string[],
) {
  let commits = new Set<string>();
  let trees = new Set<string>();
  let blobs = new Set<string>();

  // We don't do the purest simplest recursion, because we can
  // avoid reading Blob objects entirely since the Tree objects
  // tell us which oids are Blobs and which are Trees. And we
  // do not need to recurse through commit parents.
  async function walk(oid) {
    let { type, object } = await GitObjectManager.read(fileSystem, gitdir, oid);
    if (type === 'commit') {
      commits.add(oid);
      let commit = GitCommit.from(object);
      let tree = commit.headers().tree;
      await walk(tree);
    } else if (type === 'tree') {
      trees.add(oid);
      let tree = GitTree.from(object);
      for (let entry of tree) {
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
  for (let oid of oids) {
    await walk(oid);
  }
  return [...commits, ...trees, ...blobs];
}

async function pack(
  fileSystem: EncryptedFS,
  dir: string,
  gitdir: string = path.join(dir, '.git'),
  oids: string[],
  outputStream: PassThrough,
) {
  let hash = createHash('sha1');
  function write(chunk: any, enc: string | undefined = undefined) {
    if (enc) {
      outputStream.write(chunk, enc);
    } else {
      outputStream.write(chunk);
    }
    hash.update(chunk, enc);
  }
  function writeObject(object, stype) {
    let lastFour;
    let multibyte;
    let length;
    // Object type is encoded in bits 654
    let type = types[stype];
    if (type === undefined) throw Error('Unrecognized type: ' + stype);
    // The length encoding get complicated.
    length = object.length;
    // Whether the next byte is part of the variable-length encoded number
    // is encoded in bit 7
    multibyte = length > 0b1111 ? 0b10000000 : 0b0;
    // Last four bits of length is encoded in bits 3210
    lastFour = length & 0b1111;
    // Discard those bits
    length = length >>> 4;
    // The first byte is then (1-bit multibyte?), (3-bit type), (4-bit least sig 4-bits of length)
    let byte: any = (multibyte | type | lastFour).toString(16);
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
  for (let oid of oids) {
    let { type, object } = await GitObjectManager.read(fileSystem, gitdir, oid);
    writeObject(object, type);
  }
  // Write SHA1 checksum
  let digest = hash.digest();
  outputStream.end(digest);
  return outputStream;
}

export default packObjects;
export { listObjects, pack };
