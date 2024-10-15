import type { ContextTimed } from '@matrixai/contexts';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type {
  AuditEvent,
  AuditEventSerialized,
  TopicPath,
  TopicSubPath,
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
    paths: Array<TopicSubPath>;
    seek?: AuditEventIdEncoded | number;
    seekEnd?: AuditEventIdEncoded | number;
    order?: 'asc' | 'desc';
    limit?: number;
    awaitFutureEvents?: boolean;
  }>,
  ClientRPCResponseResult<AuditEventSerialized>
> {
  public handle = async function* (
    {
      paths,
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
      paths: Array<TopicSubPath>;
    },
    _cancel,
    _meta,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<AuditEventSerialized>> {
    const { audit }: { audit: Audit } = this.container;
    const iterators: Array<AsyncGenerator<AuditEvent>> = [];
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

    // Convert the paths
    const topicPaths: Array<TopicPath> = [];
    for (const topicPath of auditUtils.filterSubPaths(paths)) {
      if (auditUtils.isTopicPath(topicPath)) topicPaths.push(topicPath);
    }

    // Creating iterators for each `topicPath`
    for (const topicPath of topicPaths) {
      if (awaitFutureEvents) {
        // If we're awaiting future events then we call `getAuditEventsLongRunning`, order is forced to `asc` in this case
        const iterator = audit.getAuditEventsLongRunning(topicPath, {
          seek: seek_,
          seekEnd: seekEnd_,
          limit: limit,
        });
        iterators.push(iterator);
      } else {
        // Otherwise we use the normal `getAuditEvents`
        const iterator = audit.getAuditEvents(topicPath, {
          seek: seek_,
          seekEnd: seekEnd_,
          order: order,
          limit: limit,
        });
        iterators.push(iterator);
      }
    }

    // We need to reverse the compare if we are descending in time
    const orderSwitchMultiplier = awaitFutureEvents || order === 'asc' ? 1 : -1;
    function sortFn(a: AuditEvent, b: AuditEvent) {
      return Buffer.compare(a.id, b.id) * orderSwitchMultiplier;
    }

    const combinedIterator = auditUtils.genSort<AuditEvent>(
      sortFn,
      ...iterators,
    );
    ctx.signal.addEventListener('abort', async () => {
      await combinedIterator.return(ctx.signal.reason);
    });
    for await (const auditEvent of combinedIterator) {
      yield {
        id: auditUtils.encodeAuditEventId(auditEvent.id),
        path: auditEvent.path,
        data: auditEvent.data,
      };
    }
  };
}

export default AuditEventsGet;
