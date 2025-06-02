import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  AuditIdMessage,
  AgentAuditMessage,
} from '../types.js';
import type Audit from '../../../audit/Audit.js';
import type { AuditEvent } from '../../../audit/types.js';
import type { AuditEventId } from '../../../ids/index.js';
import { ServerHandler } from '@matrixai/rpc';
import * as auditUtils from '../../../audit/utils.js';

// This is currently not used until security is built into it. It will require some way to verify that the requesting
//  node should have access to the information. For that we need a claim that we can verify.
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
    let seek_: AuditEventId | number | undefined;
    let seekEnd_: AuditEventId | number | undefined;

    const { seek, seekEnd, limit } = input;

    if (typeof seek !== 'number') {
      seek_ = auditUtils.decodeAuditEventId(seek);
    }
    if (typeof seekEnd !== 'number') {
      seekEnd_ = auditUtils.decodeAuditEventId(seekEnd);
    }

    const { audit, db }: { audit: Audit; db: DB } = this.container;

    yield* db.withTransactionG(async function* (tran): AsyncGenerator<
      AgentRPCResponseResult<AgentAuditMessage<AuditEvent>>
    > {
      for await (const auditEvent of audit.getAuditEvents(
        [],
        {
          seek: seek_,
          seekEnd: seekEnd_,
          limit,
        },
        tran,
      )) {
        ctx.signal.throwIfAborted();
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
