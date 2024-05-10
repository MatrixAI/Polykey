import type {
  Capability,
  CapabilityList,
  ObjectId,
  ObjectIdList,
  ObjectType,
  Reference,
  RequestType,
} from './types';
import type { EncryptedFS } from 'encryptedfs';
import git from 'isomorphic-git';
import { requestTypes } from './types';
import { never } from '../utils';
import * as validationErrors from '../validation/errors';

// Constants
// Total number of bytes per pack line minus the 4 size bytes and 1 channel byte
const PACK_CHUNK_SIZE = 65520 - 4 - 1;
// Ref identifier for the HEAD commit
const HEAD_REFERENCE = 'HEAD';
// Used to construct to full path for head references
const REFERENCES_STRING = 'refs/heads/';
// Used to specify the sideband with 3 channels, data, progress and error
const SIDE_BAND_64_CAPABILITY = 'side-band-64k';
// Specifies the agent name, Only used for logging output by the client
const AGENT_CAPABILITY = 'agent=git/isomorphic-git@1.8.1';
// Space separator
const SPACE_STRING = ' ';
// Specifies the
const CHANNEL_DATA = 1;
const CHANNEL_PROGRESS = 2;
const CHANNEL_ERROR = 3;
const BUFFER_FORMAT = 'utf-8';
// Initial string sent when doing a smart http discovery request
const REFERENCE_DISCOVERY_HEADER = Buffer.from(
  '# service=git-upload-pack\n',
  BUFFER_FORMAT,
);
// NUL       =  %x00
const NULL_BUFFER = Buffer.from('\0', BUFFER_FORMAT);
// LF
const LINE_FEED_BUFFER = Buffer.from('\n', BUFFER_FORMAT);
// Zero-id   =  40*"0"
const ZERO_ID_BUFFER = Buffer.from('0'.repeat(40), BUFFER_FORMAT);
// Magic string used when no refs are provided
const EMPTY_LIST_CAPABILITIES_BUFFER = Buffer.from(
  'capabilities^{}',
  BUFFER_FORMAT,
);
// SP
const SPACE_BUFFER = Buffer.from(SPACE_STRING, BUFFER_FORMAT);
// Flush-pkt    = "0000",
// used to indicate a special step or end of the stream.
// This will not be padded with the `PKT-LINE` delimiter. In essence, it's a special delimiter
// since a 0-len line would include the 4 bytes `0004` length delimiter which is explicitly not
// allowed.
const FLUSH_PACKET_BUFFER = Buffer.from('0000', BUFFER_FORMAT);
// Used to indicate no common commits during ref negotiation phase.
const NAK_BUFFER = Buffer.from('NAK\n', BUFFER_FORMAT);
// Used to provide some progress information on `channelProgress`, not sure if it's actually required
const DUMMY_PROGRESS_BUFFER = Buffer.from('progress is at 50%', BUFFER_FORMAT);

// Functions

/**
 *
 */
async function* listReferencesGenerator({
  fs,
  dir,
  gitDir,
}: {
  fs: EncryptedFS;
  dir: string;
  gitDir: string;
}): AsyncGenerator<[Reference, ObjectId], void, void> {
  const refs: Array<[string, Promise<string>]> = await git
    .listBranches({
      fs,
      dir,
      gitdir: gitDir,
    })
    .then((refs) => {
      return refs.map((ref) => {
        return [
          `${REFERENCES_STRING}${ref}`,
          git.resolveRef({ fs, dir, gitdir: gitDir, ref: ref }),
        ];
      });
    });
  // HEAD always comes first
  const resolvedHead = await git.resolveRef({
    fs,
    dir,
    gitdir: gitDir,
    ref: HEAD_REFERENCE,
  });
  yield [HEAD_REFERENCE, resolvedHead];
  for (const [key, refP] of refs) {
    yield [key, await refP];
  }
}

/**
 * Reads the provided reference and formats it as a `symref` capability
 */
async function referenceCapability({
  fs,
  dir,
  gitDir,
  reference,
}: {
  fs: EncryptedFS;
  dir: string;
  gitDir: string;
  reference: Reference;
}): Promise<Capability> {
  try {
    const resolvedHead = await git.resolveRef({
      fs,
      dir,
      gitdir: gitDir,
      ref: reference,
      depth: 2,
    });
    return `symref=${reference}:${resolvedHead}`;
  } catch (e) {
    if (e.code === 'ENOENT') throw e;
    return '';
  }
}

/**
 * Walks the git objects and returns a list of blobs, commits and trees.
 */
async function listObjects({
  fs,
  dir,
  gitDir,
  wants,
  haves,
}: {
  fs: EncryptedFS;
  dir: string;
  gitDir: string;
  wants: ObjectIdList;
  haves: ObjectIdList;
}): Promise<ObjectIdList> {
  const commits = new Set<string>();
  const trees = new Set<string>();
  const blobs = new Set<string>();
  const tags = new Set<string>();
  const havesSet: Set<string> = new Set(haves);

  async function walk(objectId: ObjectId, type: ObjectType): Promise<void> {
    // If object was listed as a have then we don't need to walk over it
    if (havesSet.has(objectId)) return;
    switch (type) {
      case 'commit':
        {
          commits.add(objectId);
          const readCommitResult = await git.readCommit({
            fs,
            dir,
            gitdir: gitDir,
            oid: objectId,
          });
          const tree = readCommitResult.commit.tree;
          const parents = readCommitResult.commit.parent;
          await Promise.all([
            walk(tree, 'tree'),
            ...parents.map((parent) => walk(parent, 'commit')),
          ]);
        }
        return;
      case 'tree':
        {
          trees.add(objectId);
          const readTreeResult = await git.readTree({
            fs,
            dir,
            gitdir: gitDir,
            oid: objectId,
          });
          const walkPs: Array<Promise<void>> = [];
          for (const { oid, type } of readTreeResult.tree) {
            walkPs.push(walk(oid, type));
          }
          await Promise.all(walkPs);
        }
        return;
      case 'blob':
        {
          blobs.add(objectId);
        }
        return;
      case 'tag':
        {
          tags.add(objectId);
          const readTagResult = await git.readTag({
            fs,
            dir,
            gitdir: gitDir,
            oid: objectId,
          });
          const { object, type } = readTagResult.tag;
          await walk(object, type);
        }
        return;
      default:
        never();
    }
  }

  // Let's go walking!
  const walkPs: Array<Promise<void>> = [];
  for (const oid of wants) {
    walkPs.push(walk(oid, 'commit'));
  }
  await Promise.all(walkPs);
  return [...commits, ...trees, ...blobs, ...tags];
}

/**
 * Parses a want/has line from ref negotiation phase.
 */
function parseRequestLine(
  workingBuffer: Buffer,
): [RequestType, ObjectId, CapabilityList, Buffer] | undefined {
  if (workingBuffer.byteLength === 0) return;
  const lengthBuffer = workingBuffer.subarray(0, 4).toString();
  if (!/^[0-9a-f]{4}$/.test(lengthBuffer)) {
    throw new validationErrors.ErrorParse(
      'expected a 4-length hex number length indicator',
    );
  }
  const length = parseInt(lengthBuffer, 16);
  if (length > workingBuffer.byteLength) return;
  if (length === 0) return ['SEPARATOR', '', [], workingBuffer.subarray(4)];
  const rest = workingBuffer.subarray(length);
  const lineBuffer = workingBuffer.subarray(4, length);
  const lineString = lineBuffer.toString().trimEnd();
  const [requestType, id, ...capabilities] = lineString.split(SPACE_STRING);
  assertRequestType(requestType);
  if (id != null) assertObjectId(id);
  return [requestType, id ?? '', capabilities, rest];
}

// Type guards

function isObjectId(objectId: unknown): objectId is ObjectId {
  if (typeof objectId !== 'string') return false;
  return /[0-9a-f]{40}/.test(objectId);
}

function assertObjectId(objectId: unknown): asserts objectId is ObjectId {
  if (!isObjectId(objectId)) {
    throw new validationErrors.ErrorParse(
      `\`objectId\` must be a 40-digit hex number lowercase string, received (${objectId})`,
    );
  }
}

function isRequestType(requestType: unknown): requestType is RequestType {
  if (typeof requestType !== 'string') return false;
  // Forcing conversion here just to do the check
  return requestTypes.includes(requestType as RequestType);
}

function assertRequestType(
  requestType: unknown,
): asserts requestType is RequestType {
  if (!isRequestType(requestType)) {
    throw new validationErrors.ErrorParse(
      `\`requestType\` must be a string of \`want\`, \`have\`, \`SEPARATOR\`, or \`done\`, received (${requestType})`,
    );
  }
}

export {
  PACK_CHUNK_SIZE,
  HEAD_REFERENCE,
  REFERENCES_STRING,
  SIDE_BAND_64_CAPABILITY,
  AGENT_CAPABILITY,
  SPACE_STRING,
  CHANNEL_DATA,
  CHANNEL_PROGRESS,
  CHANNEL_ERROR,
  BUFFER_FORMAT,
  REFERENCE_DISCOVERY_HEADER,
  NULL_BUFFER,
  LINE_FEED_BUFFER,
  ZERO_ID_BUFFER,
  EMPTY_LIST_CAPABILITIES_BUFFER,
  SPACE_BUFFER,
  FLUSH_PACKET_BUFFER,
  NAK_BUFFER,
  DUMMY_PROGRESS_BUFFER,
  listReferencesGenerator,
  referenceCapability,
  listObjects,
  parseRequestLine,
  isObjectId,
  assertObjectId,
  isRequestType,
  assertRequestType,
};
