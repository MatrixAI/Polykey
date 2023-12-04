import type { NodeId, NodeIdString, NodeIdEncoded } from '../ids/types';
import type { Host, Hostname, Port } from '../network/types';
import type { Opaque } from '../types';

/**
 * Key indicating which space the NodeGraph is in
 */
type NodeGraphSpace = '0' | '1';

/**
 * Node address scopes allows the classification of the address.
 * Local means that the address is locally routable.
 * Global means that the address is globally routable.
 */
type NodeAddressScope = 'local' | 'global';

type NodeAddress = [Host | Hostname, Port];

type NodeBucketIndex = number;

type NodeBucket = Array<[NodeId, NodeContact]>;

type NodeBucketMeta = {
  count: number;
};

/**
 * Record of `NodeAddress` to `NodeData` for a single `NodeId`.
 * Use `nodesUtils.parseNodeAddressKey` to parse
 * `NodeAddressKey` to `NodeAddress`.
 * Note that records don't have inherent order.
 */
type NodeContact = Record<NodeContactAddress, NodeContactAddressData>;

type NodeContactAddress = Opaque<'NodeContactAddress', string>;

/**
 * This is the record value stored in the NodeGraph.
 */
type NodeContactAddressData = {
  /**
   * Indicates how the contact address was connected on its
   * last connection establishment. The ICE procedure concurrently
   * uses all methods to try to connect, however, whichever one
   * succeeded first should be indicated here. When sharing this
   * information to other nodes, it can hint towards whether a
   * contact does not require signalling or relaying.
   */
  mode: 'direct' | 'signal' | 'relay';
  /**
   * Unix timestamp of when the connection was last active.
   * This property should be set when the connection is first
   * established, but it should also be updated as long as the
   * connection is active.
   */
  connectedTime: number;
  /**
   * Scopes can be used to classify the address.
   * Multiple scopes is understood as set-union.
   */
  scopes: Array<NodeAddressScope>;
};

type SeedNodes = Record<NodeIdEncoded, NodeAddress>;

enum ConnectionErrorCode {
  ForceClose = 1,
}

enum ConnectionErrorReason {
  ForceClose = 'NodeConnection is forcing destruction',
}

export type {
  NodeId,
  NodeIdString,
  NodeIdEncoded,
  NodeAddressScope,
  NodeAddress,
  NodeContact,
  NodeContactAddress,
  NodeContactAddressData,
  SeedNodes,
  NodeBucketIndex,
  NodeBucketMeta,
  NodeBucket,
  NodeGraphSpace,
};

export { ConnectionErrorCode, ConnectionErrorReason };
