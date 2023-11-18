import type {
  AuditEventNodeConnectionForward,
  AuditEventNodeConnectionReverse,
} from './types';
import type * as nodesEvents from '../nodes/events';
import * as nodesUtils from '../nodes/utils';
import {
  createAuditEventIdGenerator,
  encodeAuditEventId,
  decodeAuditEventId,
} from '../ids';

// Events

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
