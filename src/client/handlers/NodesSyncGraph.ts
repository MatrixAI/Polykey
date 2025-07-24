import type { ContextTimed } from '@matrixai/contexts';
import type { JSONValue } from '@matrixai/rpc';
import type NodeManager from '../../nodes/NodeManager.js';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodesSyncGraphMessage,
} from '../types.js';
import type { AgentClientManifest } from '../../nodes/agent/callers/index.js';
import type { NodeId, NodeAddress } from '../../nodes/types.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as nodesUtils from '../../nodes/utils.js';

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
    // Convert the encoded node id to the binary one we expect
    const parsedInitialNodes = input.initialNodes.map(
      (value) =>
        [nodesUtils.decodeNodeId(value[0]), value[1]] as [NodeId, NodeAddress],
    );
    await nodeManager.syncNodeGraph(
      input.network,
      parsedInitialNodes,
      input.connectionTimeout,
      true,
      ctx,
    );
    return {};
  };
}

export default NodesSyncGraph;
