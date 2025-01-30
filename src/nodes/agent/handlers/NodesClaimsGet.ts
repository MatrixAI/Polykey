import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
import type Sigchain from '../../../sigchain/Sigchain';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  ClaimIdMessage,
  AgentClaimMessage,
} from '../types';
import { ServerHandler } from '@matrixai/rpc';
import * as claimsUtils from '../../../claims/utils';

/**
 * Gets the sigchain claims of a node
 */
class NodesClaimsGet extends ServerHandler<
  {
    sigchain: Sigchain;
    db: DB;
  },
  AgentRPCRequestParams<ClaimIdMessage>,
  AgentRPCResponseResult<AgentClaimMessage>
> {
  public handle = async function* (
    _input: ClaimIdMessage,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): AsyncGenerator<AgentRPCResponseResult<AgentClaimMessage>> {
    const { sigchain, db }: { sigchain: Sigchain; db: DB } = this.container;
    yield* db.withTransactionG(async function* (tran): AsyncGenerator<
      AgentRPCResponseResult<AgentClaimMessage>
    > {
      for await (const [claimId, signedClaim] of sigchain.getSignedClaims(
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
