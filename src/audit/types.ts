import type { AuditEventId, AuditEventIdEncoded } from '../ids';
import type { POJO } from '../types';
import type {
  nodeConnectionInboundMetricPath,
  nodeConnectionReverseTopicPath,
  nodeConnectionOutboundMetricPath,
  nodeConnectionForwardTopicPath,
  nodeConnectionMetricPath,
  topicPaths,
  metricPaths,
} from './utils';

// Events

type IsSubpath<
  T extends readonly any[],
  U extends readonly any[],
> = U extends readonly [...T, ...infer _] ? true : false;

type InferTypeFromSubpath<
  T extends readonly any[],
  U extends readonly any[],
  E,
> = IsSubpath<T, U> extends true ? E : never;

/**
 * Represents a capture of an event.
 */
type AuditEventBase<T extends POJO = POJO> = {
  id: AuditEventId;
  data: T;
};

/**
 * Represents a capture of an event.
 */
type AuditEvent =
  | AuditEventNodeConnectionForward
  | AuditEventNodeConnectionReverse;

/**
 * Represents a capture of an event stored in the database.
 */
type AuditEventDB = AuditEventToAuditEventDB<AuditEvent>;

/**
 * Represents a capture of an event for transmission over network.
 */
type AuditEventSerialized = AuditEventToAuditEventSerialized<AuditEvent>;

type AuditEventToAuditEventDB<T extends AuditEvent> = Omit<T, 'id'>;

type AuditEventToAuditEventSerialized<T extends AuditEvent> = Omit<T, 'id'> & {
  id: AuditEventIdEncoded;
};

type TopicPath = (typeof topicPaths)[number];

type TopicSubPath<T = TopicPath> =
  | (T extends readonly [...infer Head, infer Tail]
      ? [...Head, Tail] | TopicSubPath<Head>
      : [])
  | TopicPath;

type TopicSubPathToAuditEvent<T extends TopicSubPath> =
  // Nodes
  | InferTypeFromSubpath<
      T,
      typeof nodeConnectionReverseTopicPath,
      AuditEventNodeConnectionReverse
    >
  | InferTypeFromSubpath<
      T,
      typeof nodeConnectionForwardTopicPath,
      AuditEventNodeConnectionForward
    >;

// Nodes

type AuditEventNodeConnectionBase = AuditEventBase<{
  remoteNodeId: string;
  remoteHost: string;
  remotePort: number;
}>;

type AuditEventNodeConnection =
  | AuditEventNodeConnectionReverse
  | AuditEventNodeConnectionForward;

type AuditEventNodeConnectionReverse = AuditEventNodeConnectionBase &
  AuditEventBase<{
    type: 'reverse';
  }>;

type AuditEventNodeConnectionForward = AuditEventNodeConnectionBase &
  AuditEventBase<{
    type: 'forward';
  }>;

// Metrics

type MetricPath = (typeof metricPaths)[number];

type MetricPathToAuditMetric<T extends MetricPath> =
  // Nodes
  T extends
    | typeof nodeConnectionMetricPath
    | typeof nodeConnectionInboundMetricPath
    | typeof nodeConnectionOutboundMetricPath
    ? AuditMetricNodeConnection
    : never;

type AuditMetric = AuditMetricNodeConnection;

/**
 * Represents a capture of an event.
 */
type AuditMetricBase<T extends POJO = POJO> = {
  data: T;
};

type AuditMetricNodeConnection = AuditMetricBase<{
  total: number;
  averagePerMinute: number;
  averagePerHour: number;
  averagePerDay: number;
}>;

export type {
  // Event
  IsSubpath,
  InferTypeFromSubpath,
  AuditEventBase,
  AuditEvent,
  AuditEventDB,
  AuditEventToAuditEventDB,
  AuditEventSerialized,
  AuditEventToAuditEventSerialized,
  TopicPath,
  TopicSubPathToAuditEvent,
  TopicSubPath,
  AuditEventNodeConnectionBase,
  AuditEventNodeConnection,
  AuditEventNodeConnectionReverse,
  AuditEventNodeConnectionForward,
  // Metric
  MetricPath,
  MetricPathToAuditMetric,
  AuditMetric,
  AuditMetricBase,
  AuditMetricNodeConnection,
};
