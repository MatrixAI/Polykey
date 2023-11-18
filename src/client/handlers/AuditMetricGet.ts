import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type {
  AuditMetric,
  MetricPath,
  MetricPathToAuditMetric,
} from '../../audit/types';
import type { Audit } from '../../audit';
import { UnaryHandler } from '@matrixai/rpc';

class AuditMetricGet extends UnaryHandler<
  {
    audit: Audit;
  },
  ClientRPCRequestParams<{
    path: MetricPath & Array<string>;
    from?: number;
    to?: number;
  }>,
  ClientRPCResponseResult<AuditMetric>
> {
  public handle = async <T extends MetricPath>(
    input: ClientRPCRequestParams<{
      from?: number;
      to?: number;
    }> & {
      path: T;
    },
    _cancel,
    _meta,
    _ctx,
  ): Promise<ClientRPCResponseResult<MetricPathToAuditMetric<T>>> => {
    const { audit } = this.container;
    return (await audit.getAuditMetric(input.path, {
      from: input.from,
      to: input.to,
    })) as any;
  };
}

export default AuditMetricGet;
