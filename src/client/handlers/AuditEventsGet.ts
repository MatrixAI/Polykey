import type { ContextTimed } from '@matrixai/contexts';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type {
  AuditEventSerialized,
  AuditEventToAuditEventSerialized,
  TopicSubPath,
  TopicSubPathToAuditEvent,
} from '../../audit/types';
import type { Audit } from '../../audit';
import type { AuditEventId, AuditEventIdEncoded } from '../../ids';
import { ServerHandler } from '@matrixai/rpc';
import * as auditUtils from '../../audit/utils';

class AuditEventsGet extends ServerHandler<
  {
    audit: Audit;
  },
  ClientRPCRequestParams<{
    path: TopicSubPath & Array<string>;
    seek?: AuditEventIdEncoded | number;
    seekEnd?: AuditEventIdEncoded | number;
    order?: 'asc' | 'desc';
    limit?: number;
    awaitFutureEvents?: boolean;
  }>,
  ClientRPCResponseResult<AuditEventSerialized>
> {
  public async *handle<T extends TopicSubPath>(
    {
      path,
      seek,
      seekEnd,
      order = 'asc',
      limit,
      awaitFutureEvents = false,
    }: ClientRPCRequestParams<{
      seek?: AuditEventIdEncoded | number;
      seekEnd?: AuditEventIdEncoded | number;
      order?: 'asc' | 'desc';
      limit?: number;
      awaitFutureEvents?: boolean;
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
    let iterator: AsyncGenerator<TopicSubPathToAuditEvent<T>>;
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
    // If the call is descending chronologically, or does not want to await future events,
    // it should not await future events.
    if (!awaitFutureEvents || order === 'desc') {
      iterator = audit.getAuditEvents(path, {
        seek: seek_,
        seekEnd: seekEnd_,
        order: order,
        limit: limit,
      });
    } else {
      iterator = audit.getAuditEventsLongRunning(path, {
        seek: seek_,
        seekEnd: seekEnd_,
        limit: limit,
      });
    }
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
