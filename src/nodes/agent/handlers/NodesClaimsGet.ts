import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
import type Sigchain from '../../../sigchain/Sigchain';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  AgentClaimMessage,
  NodesClaimsGetMessage,
} from '../types';
import { ServerHandler } from '@matrixai/rpc';
import * as claimsUtils from '../../../claims/utils';
import * as ids from '../../../ids';


/**
 * Gets the sigchain claims of a node
 */
class NodesClaimsGet extends ServerHandler<
  {
    sigchain: Sigchain;
    db: DB;
  },
  AgentRPCRequestParams<NodesClaimsGetMessage>,
  AgentRPCResponseResult<AgentClaimMessage>
> {
  public handle = async function* (
    input: NodesClaimsGetMessage,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): AsyncGenerator<AgentRPCResponseResult<AgentClaimMessage>> {
    const { seek, order, limit } = input;
    const { sigchain, db }: { sigchain: Sigchain; db: DB } = this.container;

    const decodedClaimId = ids.decodeClaimId(seek);

    yield* db.withTransactionG(async function* (tran): AsyncGenerator<
      AgentRPCResponseResult<AgentClaimMessage>
    > {
      for await (const [claimId, signedClaim] of sigchain.getSignedClaims(
        { 
          seek: decodedClaimId,
          order: order,
          limit: limit,
         },
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
