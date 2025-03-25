import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
} from '../types.js';
import type {
  AuditMetric,
  MetricPath,
  MetricPathToAuditMetric,
} from '../../audit/types.js';
import type { Audit } from '../../audit/index.js';
import type { AuditEventId, AuditEventIdEncoded } from '../../ids/index.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as auditUtils from '../../audit/utils.js';

class AuditMetricGet extends UnaryHandler<
  {
    audit: Audit;
  },
  ClientRPCRequestParams<{
    path: MetricPath & Array<string>;
    seek?: AuditEventIdEncoded | number;
    seekEnd?: AuditEventIdEncoded | number;
  }>,
  ClientRPCResponseResult<AuditMetric>
> {
  public handle = async <T extends MetricPath>(
    {
      path,
      seek,
      seekEnd,
    }: ClientRPCRequestParams<{
      seek?: AuditEventIdEncoded | number;
      seekEnd?: AuditEventIdEncoded | number;
    }> & {
      path: T;
    },
    _cancel,
    _meta,
    _ctx,
  ): Promise<ClientRPCResponseResult<MetricPathToAuditMetric<T>>> => {
    const { audit }: { audit: Audit } = this.container;
    let seek_: AuditEventId | number | undefined;
    if (seek != null) {
      seek_ =
        typeof seek === 'string' ? auditUtils.decodeAuditEventId(seek) : seek;
    }
    let seekEnd_: AuditEventId | number | undefined;
    if (seekEnd != null) {
      seekEnd_ =
        typeof seekEnd === 'string'
          ? auditUtils.decodeAuditEventId(seekEnd)
          : seekEnd;
    }
    return (await audit.getAuditMetric(path, {
      seek: seek_,
      seekEnd: seekEnd_,
    })) as any;
  };
}

export default AuditMetricGet;
