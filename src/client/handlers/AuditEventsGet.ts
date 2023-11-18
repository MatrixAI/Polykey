import type { ContextTimed } from '@matrixai/contexts';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type {
  AuditEventSerialized,
  AuditEventToAuditEventSerialized,
  TopicSubPath,
  TopicSubPathToAuditEvent,
} from '../../audit/types';
import type { Audit } from '../../audit';
import type { AuditEventIdEncoded } from '../../ids';
import { ServerHandler } from '@matrixai/rpc';
import * as auditUtils from '../../audit/utils';

class AuditEventsGet extends ServerHandler<
  {
    audit: Audit;
  },
  ClientRPCRequestParams<{
    path: TopicSubPath & Array<string>;
    seek?: AuditEventIdEncoded;
    order?: 'asc' | 'desc';
    limit?: number;
  }>,
  ClientRPCResponseResult<AuditEventSerialized>
> {
  public async *handle<T extends TopicSubPath>(
    input: ClientRPCRequestParams<{
      seek?: AuditEventIdEncoded;
      order?: 'asc' | 'desc';
      limit?: number;
    }> & {
      path: T;
    },
    _cancel,
    _meta,
    ctx: ContextTimed,
  ): AsyncGenerator<
    ClientRPCResponseResult<
      AuditEventToAuditEventSerialized<TopicSubPathToAuditEvent<T>>
    >
  > {
    const { audit } = this.container;
    const iterator = audit.getAuditEvents(input.path, {
      seek:
        input.seek != null
          ? auditUtils.decodeAuditEventId(input.seek)
          : undefined,
      order: input.order,
      limit: input.limit,
    });
    ctx.signal.addEventListener('abort', async () => {
      await iterator.return(ctx.signal.reason);
    });
    for await (const auditEvent of iterator) {
      (auditEvent.id as any) = auditUtils.encodeAuditEventId(auditEvent.id);
      yield auditEvent as any;
    }
  }
}

export default AuditEventsGet;
