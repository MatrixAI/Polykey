import type { DB } from '@matrixai/db';
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
  ): AsyncGenerator<AgentRPCResponseResult<AgentClaimMessage>> {
    const { sigchain, db } = this.container;
    yield* db.withTransactionG(async function* (tran): AsyncGenerator<
      AgentRPCResponseResult<AgentClaimMessage>
    > {
      for await (const [claimId, signedClaim] of sigchain.getSignedClaims(
        { /* seek: seekClaimId,*/ order: 'asc' },
        tran,
      )) {
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
