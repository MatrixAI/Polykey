import type { KeyPath } from '@matrixai/db';
import type { X509Certificate } from '@peculiar/x509';
import type { QUICClientCrypto, QUICServerCrypto } from '@matrixai/quic';
import type {
  NodeAddress,
  NodeAddressKey,
  NodeBucket,
  NodeBucketIndex,
  NodeId,
  SeedNodes,
} from './types';
import type { Key, Certificate, CertificatePEM } from '../keys/types';
import type { Host, Hostname, Port } from '../network/types';
import dns from 'dns';
import { utils as dbUtils } from '@matrixai/db';
import { IdInternal } from '@matrixai/id';
import { CryptoError } from '@matrixai/quic/dist/native';
import { utils as quicUtils, errors as quicErrors } from '@matrixai/quic';
import { errors as rpcErrors } from '@matrixai/rpc';
import lexi from 'lexicographic-integer';
import * as nodesErrors from './errors';
import * as ids from '../ids';
import * as keysUtils from '../keys/utils';
import * as networkUtils from '../network/utils';
import * as validationErrors from '../validation/errors';
import config from '../config';
import * as utils from '../utils';

const sepBuffer = dbUtils.sep;

/**
 * Calculate the bucket index that the target node should be located in
 * A node's k-buckets are organised such that for the ith k-bucket where
 * 0 <= i < nodeIdBits, the contacts in this ith bucket are known to adhere to
 * the following inequality:
 * 2^i <= distance (from current node) < 2^(i+1)
 * This means lower buckets will have less nodes then the upper buckets.
 * The highest bucket will contain half of all possible nodes.
 * The lowest bucket will only contain 1 node.
 *
 * NOTE: because XOR is a commutative operation (i.e. a XOR b = b XOR a), the
 * order of the passed parameters is actually irrelevant. These variables are
 * purely named for communicating function purpose.
 *
 * NOTE: Kademlia literature generally talks about buckets with 1-based indexing
 * and that the buckets are ordered from largest to smallest. This means the first
 * 1th-bucket is far & large bucket, and the last 255th-bucket is the close bucket.
 * This is reversed in our `NodeBucketIndex` encoding. This is so that lexicographic
 * sort orders our buckets from closest bucket to farthest bucket.
 *
 * To convert from `NodeBucketIndex` to nth-bucket in Kademlia literature:
 *
 *   | NodeBucketIndex | Nth-Bucket |
 *   | --------------- | ---------- |
 *   | 255             | 1          |  farthest & largest
 *   | 254             | 2          |
 *   | ...             | ...        |
 *   | 1               | 254        |
 *   | 0               | 256        |  closest & smallest
 */
function bucketIndex(sourceNode: NodeId, targetNode: NodeId): NodeBucketIndex {
  const distance = sourceNode.map((byte, i) => byte ^ targetNode[i]);
  const MSByteIndex = distance.findIndex((byte) => byte !== 0);
  if (MSByteIndex === -1) {
    throw new RangeError('NodeIds cannot be the same');
  }
  const MSByte = distance[MSByteIndex];
  const MSBitIndex = Math.trunc(Math.log2(MSByte));
  const bytesLeft = distance.byteLength - MSByteIndex - 1;
  const bucketIndex = MSBitIndex + bytesLeft * 8;
  return bucketIndex;
}

/**
 * Encodes NodeAddress to NodeAddressKey
 */
function nodeAddressKey({ host, port }: NodeAddress): NodeAddressKey {
  if (networkUtils.isHost(host)) {
    const host_ = networkUtils.toCanonicalHost(host);
    return `${host_}-${port}` as NodeAddressKey;
  } else {
    const hostname = networkUtils.toCanonicalHostname(host);
    return `${hostname}-${port}` as NodeAddressKey;
  }
}

/**
 * Encodes bucket index to bucket sublevel key
 */
function bucketKey(bucketIndex: NodeBucketIndex): string {
  return lexi.pack(bucketIndex, 'hex');
}

/**
 * Creates key for buckets sublevel
 */
function bucketsDbKey(bucketIndex: NodeBucketIndex, nodeId: NodeId): Buffer {
  return Buffer.concat([
    sepBuffer,
    Buffer.from(bucketKey(bucketIndex)),
    sepBuffer,
    bucketDbKey(nodeId),
  ]);
}

/**
 * Creates key for single bucket sublevel
 */
function bucketDbKey(nodeId: NodeId): Buffer {
  return nodeId.toBuffer();
}

/**
 * Creates key for buckets indexed by lastUpdated sublevel
 */
function lastUpdatedBucketsDbKey(
  bucketIndex: NodeBucketIndex,
  lastUpdated: number,
  nodeId: NodeId,
): Buffer {
  return Buffer.concat([
    sepBuffer,
    Buffer.from(bucketKey(bucketIndex)),
    sepBuffer,
    lastUpdatedBucketDbKey(lastUpdated, nodeId),
  ]);
}

/**
 * Creates key for single bucket indexed by lastUpdated sublevel
 */
function lastUpdatedBucketDbKey(lastUpdated: number, nodeId: NodeId): Buffer {
  return Buffer.concat([
    Buffer.from(lexi.pack(lastUpdated, 'hex')),
    Buffer.from('-'),
    nodeId.toBuffer(),
  ]);
}

function lastUpdatedKey(lastUpdated: number): Buffer {
  return Buffer.from(lexi.pack(lastUpdated, 'hex'));
}

function parseNodeAddressKey(keyBuffer: Buffer): NodeAddress {
  const key = keyBuffer.toString();
  // Take the last occurrence of `-` because the hostname may contain `-`
  const lastDashIndex = key.lastIndexOf('-');
  const hostOrHostname = key.slice(0, lastDashIndex);
  const port = key.slice(lastDashIndex + 1);
  return { host: hostOrHostname, port: parseInt(port, 10) } as NodeAddress;
}

/**
 * Parse the NodeGraph buckets sublevel key
 * The keys look like `!<lexi<NodeBucketIndex, 'hex')>!<NodeId>`
 * It is assumed that the `!` is the sublevel prefix.
 */
function parseBucketsDbKey(keyPath: KeyPath): {
  bucketIndex: NodeBucketIndex;
  bucketKey: string;
  nodeId: NodeId;
} {
  const [bucketKeyPath, nodeIdKey] = keyPath;
  if (bucketKeyPath == null || nodeIdKey == null) {
    throw new TypeError('Buffer is not an NodeGraph buckets key');
  }
  const bucketKey = bucketKeyPath.toString();
  const bucketIndex = lexi.unpack(bucketKey);
  const nodeId = IdInternal.fromBuffer<NodeId>(Buffer.from(nodeIdKey));
  return {
    bucketIndex,
    bucketKey,
    nodeId,
  };
}

/**
 * Parse the NodeGraph bucket key
 * The keys look like `<NodeId>`
 */
function parseBucketDbKey(keyBuffer: Buffer): NodeId {
  return IdInternal.fromBuffer<NodeId>(keyBuffer);
}

/**
 * Parse the NodeGraph index sublevel key
 * The keys look like `!<lexi<NodeBucketIndex, 'hex')>!<lexi(lastUpdated, 'hex')>-<NodeIdString>`
 * It is assumed that the `!` is the sublevel prefix.
 */
function parseLastUpdatedBucketsDbKey(keyPath: KeyPath): {
  bucketIndex: NodeBucketIndex;
  bucketKey: string;
  lastUpdated: number;
  nodeId: NodeId;
} {
  const [bucketLevel, ...lastUpdatedKeyPath] = keyPath;
  if (bucketLevel == null || lastUpdatedKeyPath == null) {
    throw new TypeError('Buffer is not an NodeGraph index key');
  }
  const bucketKey = bucketLevel.toString();
  const bucketIndex = lexi.unpack(bucketKey);
  if (bucketIndex == null) {
    throw new TypeError('Buffer is not an NodeGraph index key');
  }
  const { lastUpdated, nodeId } =
    parseLastUpdatedBucketDbKey(lastUpdatedKeyPath);
  return {
    bucketIndex,
    bucketKey,
    lastUpdated,
    nodeId,
  };
}

/**
 * Parse the NodeGraph index bucket sublevel key
 * The keys look like `<lexi(lastUpdated, 'hex')>-<NodeIdString>`
 * It is assumed that the `!` is the sublevel prefix.
 */
function parseLastUpdatedBucketDbKey(keyPath: KeyPath): {
  lastUpdated: number;
  nodeId: NodeId;
} {
  const [lastUpdatedLevel, nodeIdKey] = keyPath;
  if (lastUpdatedLevel == null || nodeIdKey == null) {
    throw new TypeError('Buffer is not an NodeGraph index bucket key');
  }
  const lastUpdated = lexi.unpack(lastUpdatedLevel.toString());
  if (lastUpdated == null) {
    throw new TypeError('Buffer is not an NodeGraph index bucket key');
  }
  const nodeId = IdInternal.fromBuffer<NodeId>(Buffer.from(nodeIdKey));
  return {
    lastUpdated,
    nodeId,
  };
}

/**
 * Compute the distance between two nodes.
 * distance = nodeId1 ^ nodeId2
 * where ^ = bitwise XOR operator
 */
function nodeDistance(nodeId1: NodeId, nodeId2: NodeId): bigint {
  const distance = nodeId1.map((byte, i) => byte ^ nodeId2[i]);
  return utils.bytes2BigInt(distance);
}

function bucketSortByDistance(
  bucket: NodeBucket,
  nodeId: NodeId,
  order: 'asc' | 'desc' = 'asc',
): void {
  const distances = {};
  if (order === 'asc') {
    bucket.sort(([nodeId1], [nodeId2]) => {
      const d1 = (distances[nodeId1] =
        distances[nodeId1] ?? nodeDistance(nodeId, nodeId1));
      const d2 = (distances[nodeId2] =
        distances[nodeId2] ?? nodeDistance(nodeId, nodeId2));
      if (d1 < d2) {
        return -1;
      } else if (d1 > d2) {
        return 1;
      } else {
        return 0;
      }
    });
  } else {
    bucket.sort(([nodeId1], [nodeId2]) => {
      const d1 = (distances[nodeId1] =
        distances[nodeId1] ?? nodeDistance(nodeId, nodeId1));
      const d2 = (distances[nodeId2] =
        distances[nodeId2] ?? nodeDistance(nodeId, nodeId2));
      if (d1 > d2) {
        return -1;
      } else if (d1 < d2) {
        return 1;
      } else {
        return 0;
      }
    });
  }
}

function generateRandomDistanceForBucket(bucketIndex: NodeBucketIndex): NodeId {
  const buffer = keysUtils.getRandomBytes(32);
  // Calculate the most significant byte for bucket
  const base = bucketIndex / 8;
  const mSigByte = Math.floor(base);
  const mSigBit = (base - mSigByte) * 8 + 1;
  const mSigByteIndex = buffer.length - mSigByte - 1;
  // Creating masks
  // AND mask should look like 0b00011111
  // OR mask should look like  0b00010000
  const shift = 8 - mSigBit;
  const andMask = 0b11111111 >>> shift;
  const orMask = 0b10000000 >>> shift;
  let byte = buffer[mSigByteIndex];
  byte = byte & andMask; // Forces 0 for bits above bucket bit
  byte = byte | orMask; // Forces 1 in the desired bucket bit
  buffer[mSigByteIndex] = byte;
  // Zero out byte 'above' mSigByte
  for (let byteIndex = 0; byteIndex < mSigByteIndex; byteIndex++) {
    buffer[byteIndex] = 0;
  }
  return IdInternal.fromBuffer<NodeId>(buffer);
}

function xOrNodeId(node1: NodeId, node2: NodeId): NodeId {
  const xOrNodeArray = node1.map((byte, i) => byte ^ node2[i]);
  const xOrNodeBuffer = Buffer.from(xOrNodeArray);
  return IdInternal.fromBuffer<NodeId>(xOrNodeBuffer);
}

function generateRandomNodeIdForBucket(
  nodeId: NodeId,
  bucket: NodeBucketIndex,
): NodeId {
  const randomDistanceForBucket = generateRandomDistanceForBucket(bucket);
  return xOrNodeId(nodeId, randomDistanceForBucket);
}

/**
 * This is used to check if the given error is the result of a connection failure.
 * Connection failures can happen due to the following.
 * Failure to establish a connection,
 * an existing connection fails,
 * the RPC client has been destroyed,
 * or the NodeConnection has been destroyed.
 * This is generally used to check the connection has failed
 * before cleaning it up.
 */
function isConnectionError(e): boolean {
  return (
    e instanceof nodesErrors.ErrorNodeConnectionDestroyed ||
    e instanceof nodesErrors.ErrorNodeConnectionTimeout ||
    e instanceof nodesErrors.ErrorNodeConnectionMultiConnectionFailed ||
    e instanceof quicErrors.ErrorQUICConnectionPeer ||
    e instanceof quicErrors.ErrorQUICConnectionLocal
  );
}

/**
 * This generates a random delay based on the given delay and jitter multiplier.
 * For example, a delay of 100 and multiplier of 0.5 would result in a delay
 * randomly between 50 and 150.
 * @param delay - base delay to 'jitter' around
 * @param jitterMultiplier - jitter amount as a multiple of the delay
 */
function refreshBucketsDelayJitter(
  delay: number,
  jitterMultiplier: number,
): number {
  return (Math.random() - 0.5) * delay * jitterMultiplier;
}

/**
 * Converts transport level error reasons to codes for the quic system.
 *
 * Any unknown reasons default to code 0.
 *
 */
const reasonToCode = (_type: 'read' | 'write', reason?: any): number => {
  // We're only going to handle RPC errors for now, these include
  // ErrorRPCHandlerFailed
  // ErrorRPCMessageLength
  // ErrorRPCMissingResponse
  // ErrorRPCOutputStreamError
  // ErrorPolykeyRemote
  // ErrorRPCStreamEnded
  // ErrorRPCTimedOut
  if (reason instanceof rpcErrors.ErrorRPCHandlerFailed) return 1;
  if (reason instanceof rpcErrors.ErrorRPCMessageLength) return 2;
  if (reason instanceof rpcErrors.ErrorRPCMissingResponse) return 3;
  if (reason instanceof rpcErrors.ErrorRPCOutputStreamError) return 4;
  if (reason instanceof rpcErrors.ErrorRPCRemote) return 5;
  if (reason instanceof rpcErrors.ErrorRPCStreamEnded) return 6;
  if (reason instanceof rpcErrors.ErrorRPCTimedOut) return 7;
  return 0;
};

/**
 * Converts any codes from the quic system back to reasons
 * @param _type
 * @param code
 */
const codeToReason = (_type: 'read' | 'write', code: number): any => {
  switch (code) {
    // Rpc errors
    case 1:
      return new rpcErrors.ErrorRPCHandlerFailed();
    case 2:
      return new rpcErrors.ErrorRPCMessageLength();
    case 3:
      return new rpcErrors.ErrorRPCMissingResponse();
    case 4:
      return new rpcErrors.ErrorRPCOutputStreamError();
    case 5:
      return new rpcErrors.ErrorRPCRemote({});
    case 6:
      return new rpcErrors.ErrorRPCStreamEnded();
    case 7:
      return new rpcErrors.ErrorRPCTimedOut();
    // Base cases
    case 0:
      return new nodesErrors.ErrorNodeConnectionTransportGenericError();
    default:
      return new nodesErrors.ErrorNodeConnectionTransportUnknownError();
  }
};

function parseRemoteCertsChain(remoteCertChain: Array<Uint8Array>) {
  const certChain = remoteCertChain.map((der) => {
    const cert = keysUtils.certFromPEM(
      quicUtils.derToPEM(der) as CertificatePEM,
    );
    if (cert == null) utils.never();
    return cert;
  });
  const nodeId = keysUtils.certNodeId(certChain[0]);
  if (nodeId == null) utils.never();
  return { nodeId, certChain };
}

/**
 * Returns the associated hostname for a network. (`testnet.polykey.com`, etc.)
 */
function parseNetwork(data: any): Hostname {
  if (typeof data !== 'string' || !(data in config.network)) {
    throw new validationErrors.ErrorParse(
      `Network must be one of ${Object.keys(config.network).join(', ')}`,
    );
  }
  return config.network[data];
}

/**
 * Takes in a hostname/domain and performs a DNS resolution for related seednode services.
 */
async function resolveSeednodes(
  hostname: Hostname,
  resolveSrv: (
    hostname: string,
  ) => Promise<Array<{ name: string; port: number }>> = dns.promises.resolveSrv,
): Promise<SeedNodes> {
  const seednodes: SeedNodes = {};
  try {
    const seednodeRecords = await resolveSrv(`_polykey_agent._udp.${hostname}`);
    for (const seednodeRecord of seednodeRecords) {
      // NodeId is apart of the name: $(nodeId).${hostname}
      const nodeId = seednodeRecord.name.replace(
        /\..*/g,
        '',
      ) as ids.NodeIdEncoded;
      seednodes[nodeId] = {
        host: seednodeRecord.name as Hostname,
        port: seednodeRecord.port as Port,
        scopes: ['global'],
      };
    }
  } catch (e) {
    throw new nodesErrors.ErrorNodeLookupNotFound(
      `No seednodes could be found for for ${hostname}`,
      {
        cause: e,
      },
    );
  }
  return seednodes;
}

/**
 * Seed nodes expected to be of form 'nodeId1@host:port;nodeId2@host:port;...'
 * By default, any specified seed nodes (in CLI option, or environment variable)
 * will overwrite the default nodes in src/config.ts.
 * Special flag `<defaults>` indicates that the default seed
 * nodes should be added to the starting seed nodes instead of being overwritten
 */
function parseSeedNodes(data: any): [SeedNodes, boolean] {
  if (typeof data !== 'string') {
    throw new validationErrors.ErrorParse(
      'Seed nodes must be of format `nodeId@host:port;...`',
    );
  }
  const seedNodes: SeedNodes = {};
  // Determines whether the defaults flag is set or not
  let defaults = false;
  // If explicitly set to an empty string, then no seed nodes and no defaults
  if (data === '') return [seedNodes, defaults];
  for (const seedNodeString of data.split(';')) {
    // Empty string will occur if there's an extraneous ';' (e.g. at end of env)
    if (seedNodeString === '') continue;
    if (seedNodeString === '<defaults>') {
      defaults = true;
      continue;
    }
    let seedNodeUrl: URL;
    try {
      const seedNodeStringProtocol = /^pk:\/\//.test(seedNodeString)
        ? seedNodeString
        : `pk://${seedNodeString}`;
      seedNodeUrl = new URL(seedNodeStringProtocol);
    } catch (e) {
      throw new validationErrors.ErrorParse(
        'Seed nodes must be of format `nodeId@host:port;...`',
      );
    }
    const nodeIdEncoded = seedNodeUrl.username;
    // Remove square braces for IPv6
    const nodeHostOrHostname = seedNodeUrl.hostname.replace(/[\[\]]/g, '');
    const nodePort = seedNodeUrl.port;
    try {
      ids.parseNodeId(nodeIdEncoded);
      seedNodes[nodeIdEncoded] = {
        host: networkUtils.parseHostOrHostname(nodeHostOrHostname),
        port: networkUtils.parsePort(nodePort),
      };
    } catch (e) {
      if (e instanceof validationErrors.ErrorParse) {
        throw new validationErrors.ErrorParse(
          'Seed nodes must be of format `nodeId@host:port;...`',
        );
      }
      throw e;
    }
  }
  return [seedNodes, defaults];
}

/**
 * Verify the server certificate chain when connecting to it from a client
 * This is a custom verification intended to verify that the server owned
 * the relevant NodeId.
 * It is possible that the server has a new NodeId. In that case we will
 * verify that the new NodeId is the true descendant of the target NodeId.
 */
async function verifyServerCertificateChain(
  nodeIds: Array<NodeId>,
  certs: Array<Uint8Array>,
): Promise<
  | {
      result: 'success';
      nodeId: NodeId;
    }
  | {
      result: 'fail';
      value: CryptoError;
    }
> {
  const certPEMChain = certs.map((v) => quicUtils.derToPEM(v));
  if (certPEMChain.length === 0) {
    return {
      result: 'fail',
      value: CryptoError.CertificateRequired,
    };
  }
  if (nodeIds.length === 0) {
    throw new nodesErrors.ErrorConnectionNodesEmpty();
  }
  const certChain: Array<Readonly<X509Certificate>> = [];
  for (const certPEM of certPEMChain) {
    const cert = keysUtils.certFromPEM(certPEM as CertificatePEM);
    if (cert == null) {
      return {
        result: 'fail',
        value: CryptoError.BadCertificate,
      };
    }
    certChain.push(cert);
  }
  const now = new Date();
  let certClaim: Certificate | null = null;
  let certClaimIndex: number | null = null;
  let verifiedNodeId: NodeId | null = null;
  for (let certIndex = 0; certIndex < certChain.length; certIndex++) {
    const cert = certChain[certIndex];
    if (now < cert.notBefore || now > cert.notAfter) {
      return {
        result: 'fail',
        value: CryptoError.CertificateExpired,
      };
    }
    const certNodeId = keysUtils.certNodeId(cert);
    if (certNodeId == null) {
      return {
        result: 'fail',
        value: CryptoError.BadCertificate,
      };
    }
    const certPublicKey = keysUtils.certPublicKey(cert);
    if (certPublicKey == null) {
      return {
        result: 'fail',
        value: CryptoError.BadCertificate,
      };
    }
    if (!(await keysUtils.certNodeSigned(cert))) {
      return {
        result: 'fail',
        value: CryptoError.BadCertificate,
      };
    }
    for (const nodeId of nodeIds) {
      if (certNodeId.equals(nodeId)) {
        // Found the certificate claiming the nodeId
        certClaim = cert;
        certClaimIndex = certIndex;
        verifiedNodeId = nodeId;
      }
    }
    // If cert is found then break out of loop
    if (verifiedNodeId != null) break;
  }
  if (certClaimIndex == null || certClaim == null || verifiedNodeId == null) {
    return {
      result: 'fail',
      value: CryptoError.BadCertificate,
    };
  }
  if (certClaimIndex > 0) {
    let certParent: Certificate;
    let certChild: Certificate;
    for (let certIndex = 0; certIndex < certClaimIndex; certIndex++) {
      certParent = certChain[certIndex];
      certChild = certChain[certIndex + 1];
      if (
        !keysUtils.certIssuedBy(certParent, certChild) ||
        !(await keysUtils.certSignedBy(
          certParent,
          keysUtils.certPublicKey(certChild)!,
        ))
      ) {
        return {
          result: 'fail',
          value: CryptoError.BadCertificate,
        };
      }
    }
  }
  return {
    result: 'success',
    nodeId: verifiedNodeId,
  };
}

/**
 * Verify the client certificate chain when it connects to the server.
 * The server does have a target NodeId. This means we verify the entire chain.
 */
async function verifyClientCertificateChain(
  certs: Array<Uint8Array>,
): Promise<CryptoError | undefined> {
  const certPEMChain = certs.map((v) => quicUtils.derToPEM(v));
  if (certPEMChain.length === 0) {
    return CryptoError.CertificateRequired;
  }
  const certChain: Array<Readonly<X509Certificate>> = [];
  for (const certPEM of certPEMChain) {
    const cert = keysUtils.certFromPEM(certPEM as CertificatePEM);
    if (cert == null) return CryptoError.BadCertificate;
    certChain.push(cert);
  }
  const now = new Date();
  for (let certIndex = 0; certIndex < certChain.length; certIndex++) {
    const cert = certChain[certIndex];
    const certNext = certChain[certIndex + 1];
    if (now < cert.notBefore || now > cert.notAfter) {
      return CryptoError.CertificateExpired;
    }
    const certNodeId = keysUtils.certNodeId(cert);
    if (certNodeId == null) {
      return CryptoError.BadCertificate;
    }
    const certPublicKey = keysUtils.certPublicKey(cert);
    if (certPublicKey == null) {
      return CryptoError.BadCertificate;
    }
    if (!(await keysUtils.certNodeSigned(cert))) {
      return CryptoError.BadCertificate;
    }
    if (certNext != null) {
      if (
        !keysUtils.certIssuedBy(cert, certNext) ||
        !(await keysUtils.certSignedBy(
          cert,
          keysUtils.certPublicKey(certNext)!,
        ))
      ) {
        return CryptoError.BadCertificate;
      }
    }
  }
  // Undefined means success
  return undefined;
}

/**
 * QUIC Client Crypto
 * This uses the keys utilities which uses `allocUnsafeSlow`.
 * This ensures that the underlying buffer is not shared.
 * Also all node buffers satisfy the `ArrayBuffer` interface.
 */
const quicClientCrypto: QUICClientCrypto = {
  ops: {
    async randomBytes(data: ArrayBuffer): Promise<void> {
      const randomBytes = keysUtils.getRandomBytes(data.byteLength);
      randomBytes.copy(utils.bufferWrap(data));
    },
  },
};

/**
 * QUIC Server Crypto
 * This uses the keys utilities which uses `allocUnsafeSlow`.
 * This ensures that the underlying buffer is not shared.
 * Also all node buffers satisfy the `ArrayBuffer` interface.
 */
const quicServerCrypto: QUICServerCrypto = {
  key: keysUtils.generateKey(),
  ops: {
    async sign(key: ArrayBuffer, data: ArrayBuffer): Promise<ArrayBuffer> {
      return keysUtils.macWithKey(
        utils.bufferWrap(key) as Key,
        utils.bufferWrap(data),
      ).buffer;
    },
    async verify(
      key: ArrayBuffer,
      data: ArrayBuffer,
      sig: ArrayBuffer,
    ): Promise<boolean> {
      return keysUtils.authWithKey(
        utils.bufferWrap(key) as Key,
        utils.bufferWrap(data),
        utils.bufferWrap(sig),
      );
    },
  },
};

export {
  sepBuffer,
  nodeAddressKey,
  bucketIndex,
  bucketKey,
  bucketsDbKey,
  bucketDbKey,
  lastUpdatedBucketsDbKey,
  lastUpdatedBucketDbKey,
  lastUpdatedKey,
  parseNodeAddressKey,
  parseBucketsDbKey,
  parseBucketDbKey,
  parseLastUpdatedBucketsDbKey,
  parseLastUpdatedBucketDbKey,
  nodeDistance,
  bucketSortByDistance,
  generateRandomDistanceForBucket,
  xOrNodeId,
  generateRandomNodeIdForBucket,
  isConnectionError,
  refreshBucketsDelayJitter,
  reasonToCode,
  codeToReason,
  parseRemoteCertsChain,
  parseNetwork,
  resolveSeednodes,
  parseSeedNodes,
  verifyServerCertificateChain,
  verifyClientCertificateChain,
  quicClientCrypto,
  quicServerCrypto,
};

export { encodeNodeId, decodeNodeId } from '../ids';
