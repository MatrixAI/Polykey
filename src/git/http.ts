/**
 * Reference discovery
 * Notes:
 *
 * Server SHOULD terminate each non-flush line using LF ("\n") terminator;
 * client MUST NOT complain if there is no terminator.
 *
 * The returned response is a pkt-line stream describing each ref and its current value.
 * The stream MUST be sorted by name according to the C locale ordering.
 *
 * If HEAD is a valid ref, HEAD MUST appear as the first advertised ref.
 * If HEAD is not a valid ref, HEAD MUST NOT appear in the advertisement list at all, but other refs may still appear.
 *
 * The stream MUST include capability declarations behind a NUL on the first ref.
 * The peeled value of a ref (that is "ref^{}") MUST be immediately after the ref itself, if presented.
 * A conforming server MUST peel the ref if it’s an annotated tag.
 *
 *   advertised-refs  =  (no-refs / list-of-refs)
 *                       *shallow
 *                       flush-pkt
 *
 *   no-refs          =  PKT-LINE(zero-id SP "capabilities^{}"
 *                       NUL capability-list LF)
 *
 *   list-of-refs     =  first-ref *other-ref
 *   first-ref        =  PKT-LINE(obj-id SP refname
 *                       NUL capability-list LF)
 *
 *   other-ref        =  PKT-LINE(other-tip / other-peeled)
 *   other-tip        =  obj-id SP refname LF
 *   other-peeled     =  obj-id SP refname "^{}" LF
 *
 *   shallow          =  PKT-LINE("shallow" SP obj-id)
 *
 *   capability-list  =  capability *(SP capability)
 *   capability       =  1*(LC_ALPHA / DIGIT / "-" / "_")
 *   LC_ALPHA         =  %x61-7A
 */

import type { CapabilityList, ObjectGenerator, ObjectId } from './types';
import type { EncryptedFS } from 'encryptedfs';
import { Buffer } from 'buffer';
import git from 'isomorphic-git';
import * as gitUtils from './utils';
import * as utils from '../utils';

/**
 * Smart ref discovery response looks like
 *
 * ```
 * S: 200 OK
 * S: Content-Type: application/x-git-upload-pack-advertisement
 * S: Cache-Control: no-cache
 * S:
 * S: 001e# service=git-upload-pack\n
 * S: 0000
 * S: 004895dcfa3633004da0049d3d0fa03f80589cbcaf31 refs/heads/maint\0multi_ack\n
 * S: 003fd049f6c27a2244e12041955e262a404c7faba355 refs/heads/master\n
 * S: 003c2cb58b79488a98d2721cea644875a8dd0026b115 refs/tags/v1.0\n
 * S: 003fa3c2e2402b99163d1d59756e5f207ae21cccba4c refs/tags/v1.0^{}\n
 * S: 0000
 * ```
 *
 * smart_reply     =  PKT-LINE("# service=$servicename" LF)
 *                    "0000"
 *                    *1("version 1")
 *                    ref_list
 *                    "0000"
 * ref_list        =  empty_list / non_empty_list
 * empty_list      =  PKT-LINE(zero-id SP "capabilities^{}" NUL cap-list LF)
 * non_empty_list  =  PKT-LINE(obj-id SP name NUL cap_list LF)
 *                    *ref_record
 * cap-list        =  capability *(SP capability)
 * capability      =  1*(LC_ALPHA / DIGIT / "-" / "_")
 * LC_ALPHA        =  %x61-7A
 * ref_record      =  any_ref / peeled_ref
 * any_ref         =  PKT-LINE(obj-id SP name LF)
 * peeled_ref      =  PKT-LINE(obj-id SP name LF)
 *                    PKT-LINE(obj-id SP name "^{}" LF
 *
 *   NUL       =  %x00
 *   zero-id   =  40*"0"
 *   obj-id    =  40*(HEXDIGIT)
 */

// Total number of bytes per pack line minus the 4 size bytes and 1 channel byte
const chunkSize = 65520 - 4 - 1;
const headRef = 'HEAD';
const sideBand64Capability = 'side-band-64k';
const agentCapability = 'agent=git/isomorphic-git@1.8.1';
const spaceString = ' ';
const channelData = 1;
const channelProgress = 2;
const channelError = 3;

// Initial string sent when doing a smart http discovery request
const referenceDiscoveryHeader = Buffer.from('# service=git-upload-pack');
// NUL       =  %x00
const nullBuffer = Buffer.from('\0');
// LF
const lineFeedBuffer = Buffer.from('\n');
// Zero-id   =  40*"0"
const zeroIdBuffer = Buffer.from('0'.repeat(40));
// Magic string used when no refs are provided
const emptyListCapabilitiesBuffer = Buffer.from('capabilities^{}');
// SP
const spaceBuffer = Buffer.from(spaceString);
// Flush-pkt    = "0000", used to indicate a special step or end of the stream.
// This will not be padded with the `PKT-LINE` delimiter. In essence, it's a special delimiter
// since a 0-len line would include the 4 bytes `0004` length delimiter which is explicitly not
// allowed.
const flushPacketBuffer = Buffer.from('0000');
// Used to indicate no common commits during ref negotiation phase.
const nakBuffer = Buffer.from('NAK\n');
const dummyProgressBuffer = Buffer.from('progress is at 50%');

/**
 * Smart_reply     =  PKT-LINE("# service=$servicename" LF)
 *                    "0000"
 *                    *1("version 1")
 *                    ref_list
 *                    "0000"
 */
async function* advertiseRefGenerator(
  fs: EncryptedFS,
  dir: string = '.',
  gitDir: string,
): AsyncGenerator<Buffer, void, void> {
  const capabilityList = [
    sideBand64Capability,
    await gitUtils.refCapability(fs, dir, gitDir, headRef),
    agentCapability,
  ];
  const objectGenerator = gitUtils.listReferencesGenerator(fs, dir, gitDir);

  yield packetLineBuffer(referenceDiscoveryHeader);
  yield flushPacketBuffer;
  yield* referenceList(objectGenerator, capabilityList);
  yield flushPacketBuffer;
}

/**
 *
 * Ref_list        =  empty_list / non_empty_list
 * empty_list      =  PKT-LINE(zero-id SP "capabilities^{}" NUL cap-list LF)
 * non_empty_list  =  PKT-LINE(obj-id SP name NUL cap_list LF)
 *                    *ref_record
 * ref_record      =  any_ref / peeled_ref
 * any_ref         =  PKT-LINE(obj-id SP name LF)
 * peeled_ref      =  PKT-LINE(obj-id SP name LF)
 *                    PKT-LINE(obj-id SP name "^{}" LF
 * cap-list        =  capability *(SP capability)
 */
async function* referenceList(
  objectGenerator: ObjectGenerator,
  capabilities: CapabilityList,
): AsyncGenerator<Buffer, void, void> {
  // Cap-list        =  capability *(SP capability)
  const capabilitiesListBuffer = Buffer.from(capabilities.join(spaceString));
  // Ref_list        =  empty_list / non_empty_list
  // Non_empty_list  =  PKT-LINE(obj-id SP name NUL cap_list LF)
  //                    *ref_record
  let first = true;
  for await (const [name, objectId] of objectGenerator) {
    if (first) {
      // PKT-LINE(obj-id SP name NUL cap_list LF)

      yield packetLineBuffer(
        Buffer.concat([
          Buffer.from(objectId),
          spaceBuffer,
          Buffer.from(name),
          nullBuffer,
          capabilitiesListBuffer,
          lineFeedBuffer,
        ]),
      );
      first = false;
    } else {
      // PKT-LINE(obj-id SP name LF)
      yield packetLineBuffer(
        Buffer.concat([
          Buffer.from(objectId),
          spaceBuffer,
          Buffer.from(name),
          lineFeedBuffer,
        ]),
      );
    }
  }
  if (first) {
    // If we yielded no objects then we need to yield the empty list
    // Empty_list      =  PKT-LINE(zero-id SP "capabilities^{}" NUL cap-list LF)
    yield packetLineBuffer(
      Buffer.concat([
        zeroIdBuffer,
        spaceBuffer,
        emptyListCapabilitiesBuffer,
        nullBuffer,
        capabilitiesListBuffer,
        lineFeedBuffer,
      ]),
    );
  }
}

/**
 * This will take a raw line and encode it as the pkt-line format.
 * It adds a 4 byte length indicator to the beginning of a line.
 * If the line is an empty string then a special flush packet is used.
 * If a chanel is specified a chanel byte is appended just after the length indicator.
 * Newlines are added to the end unless it is a flush packet.
 *
 *   pkt-line     =  data-pkt / flush-pkt
 *
 *   data-pkt     =  pkt-len pkt-payload
 *   pkt-len      =  4*(HEXDIG)
 *   pkt-payload  =  (pkt-len - 4)*(OCTET)
 *
 *   flush-pkt    = "0000"
 */
function packetLineBuffer(line: Buffer, channel?: 1 | 2 | 3): Buffer {
  let lineLength = line.byteLength;
  if (channel != null) {
    // Adding channel byte to length
    lineLength += 1;
    const channelByte = Buffer.from([channel]);
    return Buffer.concat([paddedLengthBuffer(lineLength), channelByte, line]);
  } else {
    return Buffer.concat([paddedLengthBuffer(lineLength), line]);
  }
}

/**
 * Creates a 4 byte length delimiter.
 * It is formatted as a left padded hex number of the length
 * @param length
 */
function paddedLengthBuffer(length: number) {
  // Hex formatted length as a string, add 4 to account for the length string
  const lengthBuffer = Buffer.from((length + 4).toString(16));
  // Left pad 4 bytes
  return Buffer.concat([
    Buffer.alloc(4 - lengthBuffer.byteLength, '0'),
    lengthBuffer,
  ]);
}

/**
 * Clients MUST NOT reuse or revalidate a cached response. Servers MUST include sufficient Cache-Control headers to
 * prevent caching of the response.
 *
 * Servers SHOULD support all capabilities defined here.
 *
 * Clients MUST send at least one "want" command in the request body. Clients MUST NOT reference an id in a "want"
 * command which did not appear in the response obtained through ref discovery unless the server advertises capability
 * allow-tip-sha1-in-want or allow-reachable-sha1-in-want.
 *
 * compute_request   =  want_list
 *                      have_list
 *                      request_end
 * request_end       =  "0000" / "done"
 * want_list         =  PKT-LINE(want SP cap_list LF)
 *                      *(want_pkt)
 * want_pkt          =  PKT-LINE(want LF)
 * want              =  "want" SP id
 * cap_list          =  capability *(SP capability)
 * have_list         =  *PKT-LINE("have" SP id LF)
 */
async function parsePackRequest(
  body: Array<Buffer>,
): Promise<[Array<ObjectId>, Array<ObjectId>, CapabilityList]> {
  let workingBuffer = Buffer.alloc(0, 0);
  const wants: Array<ObjectId> = [];
  const haves: Array<ObjectId> = [];
  const capabilities: CapabilityList = [];
  for (const bodyElement of body) {
    workingBuffer = Buffer.concat([workingBuffer, bodyElement]);
    let firstLine = true;
    while (true) {
      const parsedData = parseRequestLine(workingBuffer);
      if (parsedData == null) break;
      const [type, objectId, parsedCapabilities, rest] = parsedData;
      workingBuffer = rest;
      if (firstLine) {
        capabilities.push(...parsedCapabilities);
        firstLine = false;
      }
      switch (type) {
        case 'want':
          wants.push(objectId);
          break;
        case 'have':
          haves.push(objectId);
          break;
        case 'SEPARATOR':
          break;
        case 'done':
          return [wants, haves, capabilities];
        default:
          utils.never(
            `Type should be either 'want' or 'have', found '${type}'`,
          );
      }
    }
  }
  return [wants, haves, capabilities];
}

function parseRequestLine(
  workingBuffer: Buffer,
): [string, ObjectId, CapabilityList, Buffer] | undefined {
  const length = parseInt(workingBuffer.subarray(0, 4).toString(), 16);
  if (length > workingBuffer.byteLength) return;
  if (length === 0) return ['SEPARATOR', '', [], workingBuffer.subarray(4)];
  const rest = workingBuffer.subarray(length);
  const lineBuffer = workingBuffer.subarray(4, length);
  const lineString = lineBuffer.toString().trimEnd();
  const [type, id, ...capabilities] = lineString.split(spaceString);
  return [type, id, capabilities, rest];
}

/**
 *
 */
async function* generatePackRequest(
  fs: EncryptedFS,
  dir: string = '.',
  gitDir: string,
  body: Array<Buffer>,
): AsyncGenerator<Buffer, void, void> {
  const [wants, _haves, _capabilities] = await parsePackRequest(body);
  console.time('listObjects');
  const objectIds = await gitUtils.listObjects({
    fs,
    dir,
    gitdir: gitDir,
    oids: wants,
  });
  console.timeEnd('listObjects');
  // Reply that we have no common history and that we need to send everything
  yield packetLineBuffer(nakBuffer);
  // Send everything over in pack format
  yield* generatePackData(fs, dir, gitDir, objectIds);
  // Send dummy progress data
  yield packetLineBuffer(dummyProgressBuffer, channelProgress);
  // Send flush
  yield flushPacketBuffer;
}

/**
 * Generates the packFile data to be included within the response.
 * Iso-git provides the packFile for us, we just need to cut it into `chunkSize` bytes per line and multiplex on chanel 1.
 *
 */
async function* generatePackData(
  fs: EncryptedFS,
  dir: string = '.',
  gitDir: string,
  objectIds: Array<ObjectId>,
): AsyncGenerator<Buffer, void, void> {
  const packFile = await git.packObjects({
    fs,
    dir,
    gitdir: gitDir,
    oids: objectIds,
  });
  if (packFile.packfile == null) utils.never('packFile data was not found');
  let packFileBuffer = Buffer.from(packFile.packfile.buffer);

  do {
    const subBuffer = packFileBuffer.subarray(0, chunkSize);
    packFileBuffer = packFileBuffer.subarray(chunkSize);
    yield packetLineBuffer(subBuffer, channelData);
  } while (packFileBuffer.byteLength > chunkSize);
}

export {
  advertiseRefGenerator,
  packetLineBuffer,
  parsePackRequest,
  generatePackRequest,
  generatePackData,
};
