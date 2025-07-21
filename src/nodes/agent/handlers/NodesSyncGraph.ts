import type { ContextTimed } from '@matrixai/contexts';
import type { JSONValue } from '@matrixai/rpc';
import type NodeManager from '../../NodeManager.js';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  NodesSyncGraphMessage,
} from '../types.js';
import type { AgentClientManifest } from '../callers/index.js';
import { UnaryHandler } from '@matrixai/rpc';

class NodesSyncGraph extends UnaryHandler<
  {
    nodeManager: NodeManager<AgentClientManifest>;
  },
  AgentRPCRequestParams<NodesSyncGraphMessage>,
  AgentRPCResponseResult
> {
  public handle = async (
    input: AgentRPCRequestParams<NodesSyncGraphMessage>,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): Promise<AgentRPCResponseResult> => {
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
