import type { ContextTimed } from '@matrixai/contexts';
import type { JSONValue } from '@matrixai/rpc';
import type NodeManager from '../../nodes/NodeManager.js';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodesSyncGraphMessage,
} from '../types.js';
import type { AgentClientManifest } from '../../nodes/agent/callers/index.js';
import { UnaryHandler } from '@matrixai/rpc';

class NodesSyncGraph extends UnaryHandler<
  {
    nodeManager: NodeManager<AgentClientManifest>;
  },
  ClientRPCRequestParams<NodesSyncGraphMessage>,
  ClientRPCResponseResult
> {
  public handle = async (
    input: ClientRPCRequestParams<NodesSyncGraphMessage>,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): Promise<ClientRPCResponseResult> => {
    const {
      nodeManager,
    }: {
      nodeManager: NodeManager<AgentClientManifest>;
    } = this.container;
    await nodeManager.syncNodeGraph(
      input.network,
      input.initialNodes,
      input.connectionTimeout,
      true,
      ctx,
    );
    return {};
  };
}

export default NodesSyncGraph;
