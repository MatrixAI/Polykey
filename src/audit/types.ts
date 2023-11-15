import type { POJO } from '../types';
import type {
  nodeConnectionInboundMetricPath,
  nodeConnectionReverseTopicPath,
  nodeConnectionOutboundMetricPath,
  nodeConnectionForwardTopicPath,
  nodeConnectionMetricPath,
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
type AuditEvent<T extends POJO = POJO> = {
  data: T;
};

type TopicPath =
  // Nodes
  typeof nodeConnectionReverseTopicPath | typeof nodeConnectionForwardTopicPath;

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

type AuditEventNodeConnectionBase = AuditEvent<{
  remoteNodeId: string;
  remoteHost: string;
  remotePort: number;
}>;

type AuditEventNodeConnection =
  | AuditEventNodeConnectionReverse
  | AuditEventNodeConnectionForward;

type AuditEventNodeConnectionReverse = AuditEventNodeConnectionBase &
  AuditEvent<{
    type: 'reverse';
  }>;

type AuditEventNodeConnectionForward = AuditEventNodeConnectionBase &
  AuditEvent<{
    type: 'forward';
  }>;

// Metrics

type MetricPath =
  | typeof nodeConnectionMetricPath
  | typeof nodeConnectionInboundMetricPath
  | typeof nodeConnectionOutboundMetricPath;

type MetricPathToAuditMetric<T extends MetricPath> =
  // Nodes
  T extends
    | typeof nodeConnectionMetricPath
    | typeof nodeConnectionInboundMetricPath
    | typeof nodeConnectionOutboundMetricPath
    ? AuditMetricNodeConnection
    : never;

/**
 * Represents a capture of an event.
 */
type AuditMetric<T extends POJO = POJO> = {
  data: T;
};

type AuditMetricNodeConnection = AuditMetric<{
  total: number;
  averagePerMinute: number;
  averagePerHour: number;
  averagePerDay: number;
}>;

export type {
  // Event
  IsSubpath,
  InferTypeFromSubpath,
  AuditEvent,
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
  AuditMetricNodeConnection,
};
