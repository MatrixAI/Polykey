import type {
  NodeAddressScope,
  NodeContactAddressData,
  NodeId,
} from '@/nodes/types';
import type PolykeyAgent from '@/PolykeyAgent';
import type Logger from '@matrixai/logger';
import type { KeyRing } from '@/keys';
import type { Host, Port } from '@/network/types';
import type { AgentServerManifest } from '@/nodes/agent/handlers';
import { webcrypto } from 'crypto';
import { IdInternal } from '@matrixai/id';
import * as fc from 'fast-check';
import * as keysUtils from '@/keys/utils';
import * as utils from '@/utils';
import * as nodesUtils from '@/nodes/utils';
import { hostArb, hostnameArb, portArb } from '../network/utils';
import NodeConnectionManager from '../../src/nodes/NodeConnectionManager';
import * as testsUtils from '../utils';

/**
 * Generate random `NodeId`
 * If `readable` is `true`, then it will generate a `NodeId` where
 * its binary string form will only contain hex characters
 * However the `NodeId` will not be uniformly random as it will not cover
 * the full space of possible node IDs
 * Prefer to keep `readable` `false` if possible to ensure tests are robust
 */
function generateRandomNodeId(readable: boolean = false): NodeId {
  if (readable) {
    const random = keysUtils.getRandomBytes(16).toString('hex');
    return IdInternal.fromString<NodeId>(random);
  } else {
    const random = keysUtils.getRandomBytes(32);
    return IdInternal.fromBuffer<NodeId>(random);
  }
}

/**
 * Generates a random unix timestamp between 0 and now.
 */
function generateRandomUnixtime() {
  const now = utils.getUnixtime() + 1;
  return Math.random() * (now - 0) + now;
}

/**
 * Generate a deterministic NodeId for a specific bucket given an existing NodeId
 * This requires solving the bucket index (`i`) and distance equation:
 * `2^i <= distance < 2^(i+1)`
 * Where `distance` is: `New NodeId XOR Given NodeId`
 * The XOR operation `a XOR b = c` means `a XOR c = b` and `b XOR c = a`
 * The new NodeId that starts with a bucket offset of 0 would be:
 * `New NodeId = 2^i XOR Given NodeId`
 * To get the next NodeId within the same bucket, increment the `bucketOffset`
 * The `bucketOffset` is limited by the size of each bucket `2^(i+1) - 2^i`
 * @param nodeId NodeId that distance is measured from
 * @param bucketIndex Desired bucket index for new NodeId
 * @param bucketOffset Offset position for new NodeId from the bucket index
 */
function generateNodeIdForBucket(
  nodeId: NodeId,
  bucketIndex: number,
  bucketOffset: number = 0,
): NodeId {
  const lowerBoundDistance = BigInt(2) ** BigInt(bucketIndex);
  const upperBoundDistance = BigInt(2) ** BigInt(bucketIndex + 1);
  if (bucketOffset >= upperBoundDistance - lowerBoundDistance) {
    throw new RangeError('bucketOffset is beyond bucket size');
  }
  // Offset position within the bucket
  const distance = utils.bigInt2Bytes(
    lowerBoundDistance + BigInt(bucketOffset),
    nodeId.byteLength,
  );
  // XOR the nodeIdBuffer with distance
  const nodeIdBufferNew = nodeId.map((byte, i) => {
    return byte ^ distance[i];
  });
  // Zero-copy the new NodeId
  return IdInternal.create<NodeId>(
    nodeIdBufferNew,
    nodeIdBufferNew.byteOffset,
    nodeIdBufferNew.byteLength,
  );
}

/**
 * Adds each node's details to the other
 */
async function nodesConnect(localNode: PolykeyAgent, remoteNode: PolykeyAgent) {
  // Add remote node's details to local node
  await localNode.nodeManager.setNode(
    remoteNode.keyRing.getNodeId(),
    [remoteNode.agentServiceHost, remoteNode.agentServicePort],
    {
      mode: 'direct',
      connectedTime: Date.now(),
      scopes: ['local'],
    },
  );
  // Add local node's details to remote node
  await remoteNode.nodeManager.setNode(
    localNode.keyRing.getNodeId(),
    [localNode.agentServiceHost, localNode.agentServicePort],
    {
      mode: 'direct',
      connectedTime: Date.now(),
      scopes: ['local'],
    },
  );
}

const nodeIdArb = fc
  .int8Array({ minLength: 32, maxLength: 32 })
  .map((value) => IdInternal.fromBuffer<NodeId>(Buffer.from(value)))
  .noShrink();

const nodeIdArrayArb = (length: number) =>
  fc.array(nodeIdArb, { maxLength: length, minLength: length }).noShrink();

const uniqueNodeIdArb = (length: number) =>
  fc
    .array(nodeIdArb, { maxLength: length, minLength: length })
    .noShrink()
    .filter((values) => {
      for (let i = 0; i < values.length; i++) {
        for (let j = i; j < values.length; j++) {
          if (values[i].equals(values[j])) return true;
        }
      }
      return false;
    });

const nodeAddressArb = fc.tuple(fc.oneof(hostArb, hostnameArb), portArb);

const nodeContactAddressArb = nodeAddressArb.map((value) =>
  nodesUtils.nodeContactAddress(value),
);

const scopeArb = fc.constantFrom(
  'global',
  'local',
) as fc.Arbitrary<NodeAddressScope>;

const scopesArb = fc.uniqueArray(scopeArb);

const nodeContactAddressDataArb = fc.record({
  mode: fc.constantFrom('direct', 'signal', 'relay'),
  connectedTime: fc.integer({ min: 0 }),
  scopes: scopesArb,
}) as fc.Arbitrary<NodeContactAddressData>;

const nodeContactPairArb = fc.record({
  nodeContactAddress: nodeContactAddressArb,
  nodeContactAddressData: nodeContactAddressDataArb,
});

const nodeContactArb = fc
  .dictionary(nodeContactAddressArb, nodeContactAddressDataArb, {
    minKeys: 1,
    maxKeys: 5,
  })
  .noShrink();

const nodeIdContactPairArb = fc
  .record({
    nodeId: nodeIdArb,
    nodeContact: nodeContactArb,
  })
  .noShrink();

/**
 * Signs using the 256-bit HMAC key
 * Web Crypto has to use the `CryptoKey` type.
 * But to be fully generic, we use the `ArrayBuffer` type.
 * In production, prefer to use libsodium as it would be faster.
 */
async function sign(key: ArrayBuffer, data: ArrayBuffer) {
  const cryptoKey = await webcrypto.subtle.importKey(
    'raw',
    key,
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
  return webcrypto.subtle.sign('HMAC', cryptoKey, data);
}

/**
 * Verifies using 256-bit HMAC key
 * Web Crypto prefers using the `CryptoKey` type.
 * But to be fully generic, we use the `ArrayBuffer` type.
 * In production, prefer to use libsodium as it would be faster.
 */
async function verify(key: ArrayBuffer, data: ArrayBuffer, sig: ArrayBuffer) {
  const cryptoKey = await webcrypto.subtle.importKey(
    'raw',
    key,
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
  return webcrypto.subtle.verify('HMAC', cryptoKey, sig, data);
}

/**
 * This will create a `reasonToCode` and `codeToReason` functions that will
 * allow errors to "jump" the network boundary. It does this by mapping the
 * errors to an incrementing code and returning them on the other end of the
 * connection.
 *
 * Note: this should ONLY be used for testing as it requires the client and
 * server to share the same instance of `reasonToCode` and `codeToReason`.
 */
function createReasonConverters() {
  const reasonMap = new Map<number, any>();
  let code = 0;

  const reasonToCode = (_type, reason) => {
    code++;
    reasonMap.set(code, reason);
    return code;
  };

  const codeToReason = (_type, code) => {
    return reasonMap.get(code) ?? new Error('Reason not found');
  };

  return {
    reasonToCode,
    codeToReason,
  };
}

type NCMState = {
  nodeId: NodeId;
  nodeConnectionManager: NodeConnectionManager;
  port: Port;
};

async function nodeConnectionManagerFactory({
  keyRing,
  createOptions: {
    connectionFindConcurrencyLimit,
    connectionFindLocalTimeoutTime,
    connectionIdleTimeoutTime,
    connectionConnectTimeoutTime,
    connectionKeepAliveTimeoutTime,
    connectionKeepAliveIntervalTime,
    connectionHolePunchIntervalTime,
    rpcParserBufferSize,
    rpcCallTimeoutTime,
  } = {},
  startOptions: { host, port, agentService },
  logger,
}: {
  keyRing: KeyRing;
  createOptions?: {
    connectionFindConcurrencyLimit?: number;
    connectionFindLocalTimeoutTime?: number;
    connectionIdleTimeoutTime?: number;
    connectionConnectTimeoutTime?: number;
    connectionKeepAliveTimeoutTime?: number;
    connectionKeepAliveIntervalTime?: number;
    connectionHolePunchIntervalTime?: number;
    rpcParserBufferSize?: number;
    rpcCallTimeoutTime?: number;
  };
  startOptions: {
    host?: Host;
    port?: Port;
    agentService: (nodeConnectionManager) => AgentServerManifest;
  };
  logger: Logger;
}): Promise<NCMState> {
  const nodeId = keyRing.getNodeId();
  const tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
  const nodeConnectionManager = new NodeConnectionManager({
    keyRing: keyRing,
    logger: logger,
    tlsConfig: tlsConfig,
    connectionFindConcurrencyLimit,
    connectionFindLocalTimeoutTime,
    connectionIdleTimeoutTime,
    connectionConnectTimeoutTime,
    connectionKeepAliveTimeoutTime,
    connectionKeepAliveIntervalTime,
    connectionHolePunchIntervalTime,
    rpcParserBufferSize,
    rpcCallTimeoutTime,
  });

  await nodeConnectionManager.start({
    agentService: agentService(nodeConnectionManager),
    host,
    port,
  });

  return {
    nodeId,
    nodeConnectionManager,
    port: nodeConnectionManager.port,
  };
}

export type { NCMState };

export {
  generateRandomNodeId,
  generateRandomUnixtime,
  generateNodeIdForBucket,
  nodesConnect,
  nodeIdArb,
  nodeIdArrayArb,
  uniqueNodeIdArb,
  nodeAddressArb,
  nodeContactAddressArb,
  scopeArb,
  scopesArb,
  nodeContactAddressDataArb,
  nodeContactPairArb,
  nodeContactArb,
  nodeIdContactPairArb,
  sign,
  verify,
  createReasonConverters,
  nodeConnectionManagerFactory,
};
