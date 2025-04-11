import type { ContextTimed } from '@matrixai/contexts';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  NodesAuthenticateConnectionMessage,
  SuccessMessage,
} from '../types.js';
import type NodeConnectionManager from '../../../nodes/NodeConnectionManager.js';
import type { JSONValue } from '../../../types.js';
import { DuplexHandler } from '@matrixai/rpc';
import * as agentErrors from '../errors.js';
import * as agentUtils from '../utils.js';

class NodesAuthenticateConnection extends DuplexHandler<
  {
    nodeConnectionManager: NodeConnectionManager;
  },
  AgentRPCRequestParams<SuccessMessage | NodesAuthenticateConnectionMessage>,
  AgentRPCResponseResult<SuccessMessage | NodesAuthenticateConnectionMessage>
> {
  public handle = async function* (
    input: AsyncIterableIterator<
      AgentRPCRequestParams<SuccessMessage | NodesAuthenticateConnectionMessage>
    >,
    _cancel: (reason?: any) => void,
    meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): AsyncGenerator<
    AgentRPCResponseResult<SuccessMessage | NodesAuthenticateConnectionMessage>,
    void,
    void
  > {
    const {
      nodeConnectionManager,
    }: {
      nodeConnectionManager: NodeConnectionManager;
    } = this.container;

    // Connections should always be validated
    const requestingNodeId = agentUtils.nodeIdFromMeta(meta);
    if (requestingNodeId == null) {
      throw new agentErrors.ErrorAgentNodeIdMissing();
    }

    // This async generator handles the back-and-forth communication to
    // authenticate a connection.
    yield* nodeConnectionManager.handleAuthentication(
      requestingNodeId,
      input,
      ctx,
    );
  };
}

export default NodesAuthenticateConnection;
