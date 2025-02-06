import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
import type Sigchain from '../../../sigchain/Sigchain';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  ClaimIdMessage,
  AgentClaimMessage,
  AuditIdMessage,
  AgentAuditMessage,
} from '../types';
import { ServerHandler } from '@matrixai/rpc';
import * as claimsUtils from '../../../claims/utils';
import type Audit from '../../../audit/Audit';
import { AuditEventId } from '@/ids';

/**
 * Gets the sigchain claims of a node
 */
class NodesClaimsGet extends ServerHandler<
  {
    sigchain: Sigchain;
    db: DB;
    seek?: AuditEventId | number;
    seekTo?: AuditEventId | number;
    limit?: number;
  },
  AgentRPCRequestParams<AuditIdMessage>,
  AgentRPCResponseResult<AgentAuditMessage>
> {
  public handle = async function* (
    _input: AuditIdMessage,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): AsyncGenerator<AgentRPCResponseResult<AgentAuditMessage>> {
    const { audit, db }: { audit: Audit; db: DB } = this.container;
    yield* db.withTransactionG(async function* (tran): AsyncGenerator<
      AgentRPCResponseResult<AgentClaimMessage>
    > {
      for await (const [claimId, signedClaim] of audit.getAuditEvents(
        { order: 'asc' },
        tran,
      )) {
        ctx.signal.throwIfAborted();
        const encodedClaim = claimsUtils.generateSignedClaim(signedClaim);
        const response: AgentClaimMessage = {
          claimIdEncoded: claimsUtils.encodeClaimId(claimId),
          signedTokenEncoded: encodedClaim,
        };
        yield response;
      }
    });
  };
}

export default NodesClaimsGet;
