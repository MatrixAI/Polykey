import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  AuditIdMessage,
  AgentAuditMessage,
} from '../types';
import type Audit from '../../../audit/Audit';
import type { AuditEvent } from '../../../audit/types';
import { ServerHandler } from '@matrixai/rpc';
import * as auditUtils from '../../../audit/utils';

/**
 * Gets audit events from a node
 */
class NodesAuditEventsGet extends ServerHandler<
  {
    audit: Audit;
    db: DB;
  },
  AgentRPCRequestParams<AuditIdMessage>,
  AgentRPCResponseResult<AgentAuditMessage<AuditEvent>>
> {
  public handle = async function* (
    input: AgentRPCRequestParams<AuditIdMessage>,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): AsyncGenerator<AgentRPCResponseResult<AgentAuditMessage<AuditEvent>>> {
    let { seek, seekEnd, limit } = input;
    if (typeof seek !== 'number') {
      seek = auditUtils.decodeAuditEventId(seek);
    }
    if (typeof seekEnd !== 'number') {
      seekEnd = auditUtils.decodeAuditEventId(seekEnd);
    }

    const { audit, db }: { audit: Audit; db: DB } = this.container;

    yield* db.withTransactionG(async function* (tran): AsyncGenerator<
      AgentRPCResponseResult<AgentAuditMessage<AuditEvent>>
    > {
      for await (const auditEvent of audit.getAuditEvents(
        [],
        {
          seek,
          seekEnd,
          limit,
        },
        tran,
      )) {
        ctx.signal.throwIfAborted();
        // Skip the seek event to ensure exclusivity if given an AuditEventId
        // This assumes that ids are unique
        if (seek !== undefined) {
          if (typeof seek !== 'number' && auditEvent.id.equals(seek)) {
            continue;
          }
        }
        yield {
          id: auditUtils.encodeAuditEventId(auditEvent.id),
          path: auditEvent.path,
          data: auditEvent.data,
        };
      }
    });
  };
}

export default NodesAuditEventsGet;
