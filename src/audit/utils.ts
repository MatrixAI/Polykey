import type {
  AuditEventNodeConnectionForward,
  AuditEventNodeConnectionReverse,
  AuditEventDiscoveryVertexQueued,
  AuditEventDiscoveryVertexProcessed,
  AuditEventDiscoveryVertexFailed,
  AuditEventDiscoveryVertexCulled,
  AuditEventDiscoveryVertexCancelled,
  AuditEventDiscoveryCheckRediscovery,
  TopicPathTreeNode,
  TopicSubPath,
} from './types';
import type * as nodesEvents from '../nodes/events';
import type * as discoveryEvents from '../discovery/events';
import type { AuditEventId } from '../ids';
import type { TopicPath } from './types';
import { IdInternal } from '@matrixai/id';
import * as sortableIdUtils from '@matrixai/id/dist/IdSortable';
import * as nodesUtils from '../nodes/utils';
import {
  createAuditEventIdGenerator,
  encodeAuditEventId,
  decodeAuditEventId,
  generateAuditEventIdFromTimestamp,
} from '../ids';

// Events

function extractFromSeek(
  seek: AuditEventId | number | Date,
  randomSource?: (size: number) => Uint8Array,
): {
  auditEventId: AuditEventId;
  timestamp: number;
} {
  let auditEventId: AuditEventId;
  let timestamp: number | undefined;
  if (seek instanceof IdInternal) {
    auditEventId = seek;
    timestamp = sortableIdUtils.extractTs(seek.toBuffer()) * 1000;
  } else if (typeof seek === 'number') {
    timestamp = seek;
    auditEventId = generateAuditEventIdFromTimestamp(seek, randomSource);
  } else {
    timestamp = seek.getTime();
    auditEventId = generateAuditEventIdFromTimestamp(timestamp, randomSource);
  }
  return {
    auditEventId,
    timestamp,
  };
}

// Nodes

const nodeConnectionReverseTopicPath = [
  'node',
  'connection',
  'reverse',
] as const;

function fromEventNodeConnectionManagerConnectionReverse(
  evt: nodesEvents.EventNodeConnectionManagerConnectionReverse,
): AuditEventNodeConnectionReverse['data'] {
  return {
    remoteNodeId: nodesUtils.encodeNodeId(evt.detail.remoteNodeId),
    remoteHost: evt.detail.remoteHost,
    remotePort: evt.detail.remotePort,
    type: 'reverse',
  };
}

const nodeConnectionForwardTopicPath = [
  'node',
  'connection',
  'forward',
] as const;

function fromEventNodeConnectionManagerConnectionForward(
  evt: nodesEvents.EventNodeConnectionManagerConnectionForward,
): AuditEventNodeConnectionForward['data'] {
  return {
    remoteNodeId: nodesUtils.encodeNodeId(evt.detail.remoteNodeId),
    remoteHost: evt.detail.remoteHost,
    remotePort: evt.detail.remotePort,
    type: 'forward',
  };
}

// Discovery

const discoveryVertexQueuedTopicPath = [
  'discovery',
  'vertex',
  'queued',
] as const;

function fromEventDiscoveryVertexQueued(
  evt: discoveryEvents.EventDiscoveryVertexQueued,
): AuditEventDiscoveryVertexQueued['data'] {
  return {
    vertex: evt.detail.vertex,
    parent: evt.detail.parent,
  };
}

const discoveryVertexProcessedTopicPath = [
  'discovery',
  'vertex',
  'processed',
] as const;

function fromEventDiscoveryVertexProcessed(
  evt: discoveryEvents.EventDiscoveryVertexProcessed,
): AuditEventDiscoveryVertexProcessed['data'] {
  return {
    vertex: evt.detail.vertex,
    parent: evt.detail.parent,
  };
}

const discoveryVertexFailedTopicPath = [
  'discovery',
  'vertex',
  'failed',
] as const;

function fromEventDiscoveryVertexFailed(
  evt: discoveryEvents.EventDiscoveryVertexFailed,
): AuditEventDiscoveryVertexFailed['data'] {
  return {
    vertex: evt.detail.vertex,
    parent: evt.detail.parent,
    message: evt.detail.message,
    code: evt.detail.code,
  };
}

const discoveryVertexCulledTopicPath = [
  'discovery',
  'vertex',
  'culled',
] as const;

function fromEventDiscoveryVertexCulled(
  evt: discoveryEvents.EventDiscoveryVertexCulled,
): AuditEventDiscoveryVertexCulled['data'] {
  return {
    vertex: evt.detail.vertex,
    parent: evt.detail.parent,
  };
}

const discoveryVertexCancelledTopicPath = [
  'discovery',
  'vertex',
  'cancelled',
] as const;

function fromEventDiscoveryVertexCancelled(
  evt: discoveryEvents.EventDiscoveryVertexCancelled,
): AuditEventDiscoveryVertexCancelled['data'] {
  return {
    vertex: evt.detail.vertex,
    parent: evt.detail.parent,
  };
}

const discoveryCheckRediscoveryTopicPath = [
  'discovery',
  'checkRediscovery',
] as const;

function fromEventDiscoveryCheckRediscovery(
  _evt: discoveryEvents.EventDiscoveryCheckRediscovery,
): AuditEventDiscoveryCheckRediscovery['data'] {
  return {};
}

const nodeGraphTopicPath = ['node', 'graph'] as const;

const topicPaths = [
  nodeConnectionForwardTopicPath,
  nodeConnectionReverseTopicPath,
  discoveryVertexQueuedTopicPath,
  discoveryVertexProcessedTopicPath,
  discoveryVertexFailedTopicPath,
  discoveryVertexCulledTopicPath,
  discoveryVertexCancelledTopicPath,
  discoveryCheckRediscoveryTopicPath,
] as const;

/**
 * Takes the list of `topicPaths` and converts it to a tree structure.
 * This structure is much more efficient when checking if a path is a valid `TopicPath`.
 */
function generateTopicPathTree() {
  const tree: TopicPathTreeNode = {};
  for (const topicPath of topicPaths) {
    let node: TopicPathTreeNode = tree;
    for (const topicPathElement of topicPath) {
      if (node[topicPathElement] == null) node[topicPathElement] = {};
      node = node[topicPathElement];
    }
  }
  return tree;
}

/**
 * All the valid `topicPath`s condensed into a tree format.
 * Used to quickly check if a path is valid.
 */
const topicPathTree = generateTopicPathTree();

/**
 * TypeGuard used to assert if a value is a `TopicPath`.
 * Uses `topicPathTree` to quickly check if the path is valid.
 */
function isTopicPath(it: unknown): it is TopicPath {
  if (!Array.isArray(it)) return false;
  let node = topicPathTree;
  for (const pathElement of it) {
    if (typeof pathElement !== 'string') return false;
    if (node[pathElement] == null) return false;
    node = node[pathElement];
  }
  return true;
}

// Metrics

// Nodes

const nodeConnectionMetricPath = ['node', 'connection'] as const;

const nodeConnectionInboundMetricPath = [
  'node',
  'connection',
  'inbound',
] as const;

const nodeConnectionOutboundMetricPath = [
  'node',
  'connection',
  'outbound',
] as const;

const metricPaths = [
  nodeConnectionMetricPath,
  nodeConnectionInboundMetricPath,
  nodeConnectionOutboundMetricPath,
] as const;

/**
 * Will take an array of dot path sorted paths and return the minimal list common paths.
 * So sub-paths will be filtered out if we already contain a parent path E.G. `a.b` will be removed if we also include `a`.
 * Duplicate paths will be removed, so `a` will be removed if two `a`'s exist.
 */
function filterSubPaths(paths: Array<TopicSubPath>): Array<TopicSubPath> {
  let previous: string = '';
  return paths
    .map((v) => v.join('.'))
    .sort()
    .filter((value, index) => {
      // Checking if the current value is included within the previous
      if (index === 0 || !value.startsWith(previous)) {
        previous = value;
        return true;
      }
      return false;
    }, {})
    .map((v) => {
      // Empty array becomes '' from join, so we need to convert it back
      if (v === '') return [];
      return v.split('.') as TopicSubPath;
    });
}

/**
 * This takes N generators that yield data in a sorted order and combines their outputs in a fully sorted order.
 * This will only work on pre-sorted outputs from the generator.
 */
async function* genSort<T>(
  sortFn: (a: T, b: T) => number,
  ...gens: Array<AsyncGenerator<T, void, void>>
): AsyncGenerator<T, void, void> {
  const heads: Array<{
    value: T;
    gen: AsyncGenerator<T, void, void>;
    index: number;
  }> = [];
  // Seed the heads
  let i = 0;
  for (const gen of gens) {
    const head = await gen.next();
    if (!head.done) {
      heads.push({
        value: head.value,
        gen,
        index: i++,
      });
    }
  }
  if (heads.length === 0) return;

  // Yield from heads until all iterators are done
  let first = true;
  let previous: T;
  try {
    while (true) {
      // Sort them in order by the sortFn
      heads.sort(({ value: a }, { value: b }) => sortFn(a, b));
      // Yield the first in the order
      const head = heads[0];
      // Skip any duplicates
      if (first || sortFn(previous!, head.value) !== 0) yield head.value;
      first = false;
      previous = head.value;
      // Get the new head for that generator
      const next = await head.gen.next();
      // If the generator is done then we remove it from the heads, otherwise update the head value
      if (next.done) {
        heads.shift();
      } else {
        head.value = next.value;
      }
      // If the last head is done then we break
      if (heads.length === 0) return;
    }
  } finally {
    for (const { gen } of heads) {
      await gen.return();
    }
  }
}

export {
  extractFromSeek,
  createAuditEventIdGenerator,
  encodeAuditEventId,
  decodeAuditEventId,
  nodeConnectionReverseTopicPath,
  fromEventNodeConnectionManagerConnectionReverse,
  nodeConnectionForwardTopicPath,
  fromEventNodeConnectionManagerConnectionForward,
  discoveryVertexQueuedTopicPath,
  fromEventDiscoveryVertexQueued,
  discoveryVertexProcessedTopicPath,
  fromEventDiscoveryVertexProcessed,
  discoveryVertexFailedTopicPath,
  fromEventDiscoveryVertexFailed,
  discoveryVertexCulledTopicPath,
  fromEventDiscoveryVertexCulled,
  discoveryVertexCancelledTopicPath,
  fromEventDiscoveryVertexCancelled,
  discoveryCheckRediscoveryTopicPath,
  fromEventDiscoveryCheckRediscovery,
  nodeGraphTopicPath,
  topicPaths,
  topicPathTree,
  isTopicPath,
  nodeConnectionMetricPath,
  nodeConnectionInboundMetricPath,
  nodeConnectionOutboundMetricPath,
  metricPaths,
  filterSubPaths,
  genSort,
};
