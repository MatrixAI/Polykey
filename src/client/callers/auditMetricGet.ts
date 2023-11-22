import type { HandlerTypes } from '@matrixai/rpc';
import type { ContextTimedInput } from '@matrixai/contexts';
import type { AuditEventIdEncoded } from '../../ids';
import type { MetricPath, MetricPathToAuditMetric } from '../../audit/types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type AuditMetricGet from '../handlers/AuditMetricGet';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<AuditMetricGet>;

type AuditMetricGetTypeOverride = <T extends MetricPath>(
  input: ClientRPCRequestParams<{
    seek?: AuditEventIdEncoded | number;
    seekEnd?: AuditEventIdEncoded | number;
  }> & {
    path: T;
  },
  ctx?: ContextTimedInput,
) => Promise<ClientRPCResponseResult<MetricPathToAuditMetric<T>>>;

const auditMetricGet = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default auditMetricGet;

export type { AuditMetricGetTypeOverride };
