import type {
  CapabilityList,
  Reference,
  ObjectId,
  ObjectIdList,
} from './types';
import type { EncryptedFS } from 'encryptedfs';
import { Buffer } from 'buffer';
import git from 'isomorphic-git';
import * as gitUtils from './utils';
import * as utils from '../utils';

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

/*
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
 * ```
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
 * NUL             =  %x00
 * zero-id         =  40*"0"
 * obj-id          =  40*(HEXDIGIT)
 * ```
 */

/**
 * this is the main method for generating the smart HTTP response for the reference discovery phase.
 * The server advertises the available references
 *
 * Servers MUST terminate the response with the magic 0000 end pkt-line marker.
 *
 * The returned response is a pkt-line stream describing each ref and its known value. The stream SHOULD be sorted by
 * name according to the C locale ordering. The stream SHOULD include the default ref named HEAD as the first ref.
 * The stream MUST include capability declarations behind a NUL on the first ref.
 *
 * ```
 * Smart_reply     =  PKT-LINE("# service=$servicename" LF)
 *                    "0000"
 *                    *1("version 1")
 *                    ref_list
 *                    "0000"
 * ```
 *
 * `referenceList` is called for generating the `ref_list` stage.
 */
async function* advertiseRefGenerator({
  efs,
  dir,
  gitDir,
}: {
  efs: EncryptedFS;
  dir: string;
  gitDir: string;
}): AsyncGenerator<Buffer, void, void> {
  // Providing side-band-64, symref for the HEAD and agent name capabilities
  const capabilityList = [
    gitUtils.SIDE_BAND_64_CAPABILITY,
    await gitUtils.referenceCapability({
      efs: efs,
      dir,
      gitDir,
      reference: gitUtils.HEAD_REFERENCE,
    }),
    gitUtils.AGENT_CAPABILITY,
  ];
  const objectGenerator = gitUtils.listReferencesGenerator({
    efs,
    dir,
    gitDir,
  });

  // PKT-LINE("# service=$servicename" LF)
  yield packetLineBuffer(gitUtils.REFERENCE_DISCOVERY_HEADER);
  // "0000"
  yield gitUtils.FLUSH_PACKET_BUFFER;
  // Ref_list
  yield* referenceList(objectGenerator, capabilityList);
  // "0000"
  yield gitUtils.FLUSH_PACKET_BUFFER;
}

/**
 * Generates `Ref_list` lines from resolved references streamed from the `objectGenerator`.
 * This is called by `advertiseRefGenerator` for generating each reference line in the reference discovery response.
 *
 * ```
 * Ref_list        =  empty_list / non_empty_list
 * empty_list      =  PKT-LINE(zero-id SP "capabilities^{}" NUL cap-list LF)
 * non_empty_list  =  PKT-LINE(obj-id SP name NUL cap_list LF)
 *                    *ref_record
 * ref_record      =  any_ref / peeled_ref
 * any_ref         =  PKT-LINE(obj-id SP name LF)
 * peeled_ref      =  PKT-LINE(obj-id SP name LF)
 *                    PKT-LINE(obj-id SP name "^{}" LF
 * cap-list        =  capability *(SP capability)
 * ```
 */
async function* referenceList(
  objectGenerator: AsyncGenerator<[Reference, ObjectId], void, void>,
  capabilities: CapabilityList,
): AsyncGenerator<Buffer, void, void> {
  // Cap-list        =  capability *(SP capability)
  const capabilitiesListBuffer = Buffer.from(
    capabilities.join(gitUtils.SPACE_STRING),
  );
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
          gitUtils.SPACE_BUFFER,
          Buffer.from(name),
          gitUtils.NULL_BUFFER,
          capabilitiesListBuffer,
          gitUtils.LINE_FEED_BUFFER,
        ]),
      );
      first = false;
    } else {
      // PKT-LINE(obj-id SP name LF)
      yield packetLineBuffer(
        Buffer.concat([
          Buffer.from(objectId),
          gitUtils.SPACE_BUFFER,
          Buffer.from(name),
          gitUtils.LINE_FEED_BUFFER,
        ]),
      );
    }
  }
  if (first) {
    // If we yielded no objects then we need to yield the empty list
    // Empty_list      =  PKT-LINE(zero-id SP "capabilities^{}" NUL cap-list LF)
    yield packetLineBuffer(
      Buffer.concat([
        gitUtils.ZERO_ID_BUFFER,
        gitUtils.SPACE_BUFFER,
        gitUtils.EMPTY_LIST_CAPABILITIES_BUFFER,
        gitUtils.NULL_BUFFER,
        capabilitiesListBuffer,
        gitUtils.LINE_FEED_BUFFER,
      ]),
    );
  }
}

/**
 * This will take a raw line and encode it as the pkt-line format.
 * It adds a 4 byte length indicator to the beginning of a line.
 * If a chanel is specified a chanel byte is appended just after the length indicator.
 *
 * ```
 *   pkt-line     =  data-pkt / flush-pkt
 *   data-pkt     =  pkt-len pkt-payload
 *   pkt-len      =  4*(HEXDIG)
 *   pkt-payload  =  (pkt-len - 4)*(OCTET)
 * ```
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
 *
 * ```
 *   data-pkt     =  pkt-len pkt-payload
 *   pkt-len      =  4*(HEXDIG)
 * ```
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
 * This parses the clients request into a list of `wants', 'haves', and capabilities.
 * 'wants' indicate objects that the client found and wants from the reference discovery phase. Generally this will be
 * list of objects that references point to. It will not include all objects within that reference's branch.
 * 'haves' indicate objects that the client has and doesn't need sent over by the server. It's used by the sever to
 * decide which objects to send.
 * `capabilities` is a list of features the client wants. In our simplified implementation, none of these are really
 * used since we default to just handling `side-band-64k` for sending data. In the future we'll have to support the
 * capability for the client to push data.
 *
 * Clients MUST NOT reuse or revalidate a cached response. Servers MUST include sufficient Cache-Control headers to
 * prevent caching of the response.
 *
 * Servers SHOULD support all capabilities defined here.
 *
 * Clients MUST send at least one "want" command in the request body. Clients MUST NOT reference an id in a "want"
 * command which did not appear in the response obtained through ref discovery unless the server advertises capability
 * allow-tip-sha1-in-want or allow-reachable-sha1-in-want.
 *
 * ```
 *   compute_request   =  want_list
 *                        have_list
 *                        request_end
 *   request_end       =  "0000" / "done"
 *   want_list         =  PKT-LINE(want SP cap_list LF)
 *                        *(want_pkt)
 *   want_pkt          =  PKT-LINE(want LF)
 *   want              =  "want" SP id
 *   cap_list          =  capability *(SP capability)
 *   have_list         =  *PKT-LINE("have" SP id LF)
 * ```
 *
 * @returns [wants, haves, capabilities]
 */
async function parsePackRequest(
  body: Array<Buffer>,
): Promise<[ObjectIdList, ObjectIdList, CapabilityList]> {
  let workingBuffer = Buffer.alloc(0, 0);
  const wants: Array<ObjectId> = [];
  const haves: Array<ObjectId> = [];
  const capabilities: CapabilityList = [];
  for (const bodyElement of body) {
    workingBuffer = Buffer.concat([workingBuffer, bodyElement]);
    let firstLine = true;
    while (true) {
      const parsedData = gitUtils.parseRequestLine(workingBuffer);
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

/**
 * This is the main method for handing the packfile-send stage of the http protocol.
 * It parses the http body send by the client into a list of `wants` and `haves` using `parsePackRequest`. It then
 * uses these lists to walk the git datastructures to decide which objects to send back to the client.
 * It does this by using `listObjects` to get all the relevant objects and `generatePackData` to generate the packfile
 * part of the response.
 *
 * It will respond with the `PKT-LINE(NAK_BUFFER)` and then the `packFile` data chunked into lines for the stream.
 *
 */
async function* generatePackRequest({
  efs,
  dir,
  gitDir,
  body,
}: {
  efs: EncryptedFS;
  dir: string;
  gitDir: string;
  body: Array<Buffer>;
}): AsyncGenerator<Buffer, void, void> {
  const [wants, haves, _capabilities] = await parsePackRequest(body);
  const objectIds = await gitUtils.listObjects({
    efs: efs,
    dir,
    gitDir: gitDir,
    wants,
    haves,
  });
  // Reply that we have no common history and that we need to send everything
  yield packetLineBuffer(gitUtils.NAK_BUFFER);
  // Send everything over in pack format
  yield* generatePackData({
    efs: efs,
    dir,
    gitDir,
    objectIds,
  });
  // Send dummy progress data
  yield packetLineBuffer(
    gitUtils.DUMMY_PROGRESS_BUFFER,
    gitUtils.CHANNEL_PROGRESS,
  );
  // Send flush
  yield gitUtils.FLUSH_PACKET_BUFFER;
}

/**
 * Called by `generatePackRequest` to generate the `PackFile` data lines as part of the pack response stage.
 * Uses `isomorphic-git` to generate the `packFile` data using the provided list of `ObjectIds`.
 * The `packFile` is chunked into the `packetLineBuffer` with the size defined by `chunkSize`.
 *
 */
async function* generatePackData({
  efs,
  dir,
  gitDir,
  objectIds,
  chunkSize = gitUtils.PACK_CHUNK_SIZE,
}: {
  efs: EncryptedFS;
  dir: string;
  gitDir: string;
  objectIds: Array<ObjectId>;
  chunkSize?: number;
}): AsyncGenerator<Buffer, void, void> {
  const packFile = await git.packObjects({
    fs: efs,
    dir,
    gitdir: gitDir,
    oids: objectIds,
  });
  if (packFile.packfile == null) utils.never('failed to create packFile data');
  let packFileBuffer = Buffer.from(packFile.packfile.buffer);

  // Streaming the packFile as chunks of the length specified by the `chunkSize`.
  // Each line is formatted as a `PKT-LINE`
  do {
    const subBuffer = packFileBuffer.subarray(0, chunkSize);
    packFileBuffer = packFileBuffer.subarray(chunkSize);
    yield packetLineBuffer(subBuffer, gitUtils.CHANNEL_DATA);
  } while (packFileBuffer.byteLength > chunkSize);
}

export {
  advertiseRefGenerator,
  packetLineBuffer,
  parsePackRequest,
  generatePackRequest,
  generatePackData,
};
