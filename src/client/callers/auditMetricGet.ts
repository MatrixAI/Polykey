import type { HandlerTypes } from '@matrixai/rpc';
import type { ContextTimedInput } from '@matrixai/contexts';
import type { AuditEventIdEncoded } from '../../ids/index.js';
import type { MetricPath, MetricPathToAuditMetric } from '../../audit/types.js';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
} from '../types.js';
import type AuditMetricGet from '../handlers/AuditMetricGet.js';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<AuditMetricGet>;

type AuditMetricGetTypeOverride = <T extends MetricPath>(
  input: ClientRPCRequestParams<{
    seek?: AuditEventIdEncoded | number;
    seekEnd?: AuditEventIdEncoded | number;
  }> & {
    path: T;
  },
  ctx?: Partial<ContextTimedInput>,
) => Promise<ClientRPCResponseResult<MetricPathToAuditMetric<T>>>;

const auditMetricGet = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default auditMetricGet;

export type { AuditMetricGetTypeOverride };
