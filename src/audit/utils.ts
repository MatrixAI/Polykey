import type {
  AuditEventNodeConnectionForward,
  AuditEventNodeConnectionReverse,
} from './types';
import type * as nodesEvents from '../nodes/events';
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

const nodeGraphTopicPath = ['node', 'graph'] as const;

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

export {
  extractFromSeek,
  createAuditEventIdGenerator,
  encodeAuditEventId,
  decodeAuditEventId,
  nodeConnectionReverseTopicPath,
  fromEventNodeConnectionManagerConnectionReverse,
  nodeConnectionForwardTopicPath,
  fromEventNodeConnectionManagerConnectionForward,
  nodeGraphTopicPath,
  nodeConnectionMetricPath,
  nodeConnectionInboundMetricPath,
  nodeConnectionOutboundMetricPath,
};
