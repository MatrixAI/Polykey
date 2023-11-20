import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type {
  AuditMetric,
  MetricPath,
  MetricPathToAuditMetric,
} from '../../audit/types';
import type { Audit } from '../../audit';
import type { AuditEventId, AuditEventIdEncoded } from '../../ids';
import { UnaryHandler } from '@matrixai/rpc';
import * as auditUtils from '../../audit/utils';

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
    const { audit } = this.container;
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
