import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  NodesAuthenticateConnectionMessage,
  SuccessMessage,
} from '../types';
import type NodeConnectionManager from '../../../nodes/NodeConnectionManager';
import type { JSONValue } from '../../../types';
import type { ContextTimed } from '@matrixai/contexts';
import { UnaryHandler } from '@matrixai/rpc';
import * as agentErrors from '../errors';
import * as agentUtils from '../utils';

class NodesAuthenticateConnection extends UnaryHandler<
  {
    nodeConnectionManager: NodeConnectionManager;
  },
  AgentRPCRequestParams<NodesAuthenticateConnectionMessage>,
  AgentRPCResponseResult<SuccessMessage>
> {
  public handle = async (
    input: AgentRPCRequestParams<NodesAuthenticateConnectionMessage>,
    _cancel,
    meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): Promise<AgentRPCResponseResult<SuccessMessage>> => {
    const { nodeConnectionManager } = this.container;
    // Connections should always be validated
    const requestingNodeId = agentUtils.nodeIdFromMeta(meta);
    if (requestingNodeId == null) {
      throw new agentErrors.ErrorAgentNodeIdMissing();
    }
    await nodeConnectionManager.handleReverseAuthenticate(
      requestingNodeId,
      input,
      ctx,
    );
    return {
      type: 'success',
      success: true,
    };
  };
}

export default NodesAuthenticateConnection;
