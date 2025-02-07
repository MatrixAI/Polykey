import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
import type Sigchain from '../../../sigchain/Sigchain';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  AuditIdMessage,
  AgentAuditMessage,
} from '../types';
import type Audit from '../../../audit/Audit';
import type { AuditEventIdEncoded, AuditEventId} from '../../../ids/types';
import { ServerHandler } from '@matrixai/rpc';

/**
 * Gets audit events from a node
 */
class NodesAuditEventsGet extends ServerHandler<
  {
    sigchain: Sigchain;
    db: DB;
  },
  AgentRPCRequestParams<AuditIdMessage>,
  AgentRPCResponseResult<AgentAuditMessage>
> {
  public handle = async function* (
    input: AgentRPCRequestParams<AuditIdMessage>,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): AsyncGenerator<AgentRPCResponseResult<AgentAuditMessage>> {
    const { seek, seekEnd, limit } = input;
    const { audit, db }: { audit: Audit; db: DB } = this.container;

    yield* db.withTransactionG(async function* (tran): AsyncGenerator<
      AgentRPCResponseResult<AgentAuditMessage>
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
        yield {
          auditIdEncoded: auditEvent.id.toString() as AuditEventIdEncoded,
        };
      }
    });
  };
}

export default NodesAuditEventsGet;
