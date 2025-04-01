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

    // Forward authentication message processing
    const {
      value: forwardMessageIn,
    }: {
      value: NodesAuthenticateConnectionMessage | SuccessMessage;
    } = await input.next();
    if (forwardMessageIn.type === 'success') throw new Error('exit');
    const forwardMessageOut = await nodeConnectionManager.handleAuthentication(
      requestingNodeId,
      forwardMessageIn,
      ctx,
    );
    yield {
      type: 'success',
      success: true,
    };

    // Sending authentication message
    yield forwardMessageOut;
    const {
      value: reverseMessageIn,
    }: {
      value: NodesAuthenticateConnectionMessage | SuccessMessage;
    } = await input.next();
    if (reverseMessageIn.type !== 'success') throw new Error('exit');

    nodeConnectionManager.finalizeAuthentication(
      requestingNodeId,
      reverseMessageIn.success,
    );
    yield {
      type: 'success',
      success: true,
    }
    // success: true
    // fire authentication events before final ack
  };
}

export default NodesAuthenticateConnection;
