import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
} from '../types.js';
import type { AgentClientManifest } from '../callers/index.js';
import type NodeManager from '../../NodeManager.js';
import type { SignedTokenEncoded } from '../../../tokens/types.js';
import { UnaryHandler } from '@matrixai/rpc';

/**
 * Sends a notification to a node
 */
class NodesClaimNetworkAuthorityGet extends UnaryHandler<
  {
    nodeManager: NodeManager<AgentClientManifest>;
  },
  AgentRPCRequestParams,
  AgentRPCResponseResult<SignedTokenEncoded>
> {
  public handle = async (
    _input: AgentRPCRequestParams,
  ): Promise<AgentRPCResponseResult<SignedTokenEncoded>> => {
    const {
      nodeManager,
    }: {
      nodeManager: NodeManager<AgentClientManifest>;
    } = this.container;
    return await nodeManager.handleClaimNetworkAuthorityGet();
  };
}

export default NodesClaimNetworkAuthorityGet;
