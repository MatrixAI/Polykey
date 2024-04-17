import type {
  AuditEventNodeConnectionForward,
  AuditEventNodeConnectionReverse,
  AuditEventDiscoveryVertexQueued,
  AuditEventDiscoveryVertexProcessed,
  AuditEventDiscoveryVertexFailed,
  AuditEventDiscoveryVertexCulled,
  AuditEventDiscoveryVertexCancelled,
  AuditEventDiscoveryCheckRediscovery,
} from './types';
import type * as nodesEvents from '../nodes/events';
import type * as discoveryEvents from '../discovery/events';
import type { AuditEventId } from '../ids';
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
  nodeConnectionMetricPath,
  nodeConnectionInboundMetricPath,
  nodeConnectionOutboundMetricPath,
  metricPaths,
};
