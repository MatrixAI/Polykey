import type { DB } from '@matrixai/db';
import type {
  ClaimNodeMessage,
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SuccessMessage,
} from '../types.js';
import type { NodeId } from '../../ids/index.js';
import type NodeManager from '../../nodes/NodeManager.js';
import type { AgentClientManifest } from '../../nodes/agent/callers/index.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids/index.js';
import { matchSync } from '../../utils/index.js';
import { validateSync } from '../../validation/index.js';

class NodesClaim extends UnaryHandler<
  {
    db: DB;
    nodeManager: NodeManager<AgentClientManifest>;
  },
  ClientRPCRequestParams<ClaimNodeMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<ClaimNodeMessage>,
  ): Promise<ClientRPCResponseResult<SuccessMessage>> => {
    const {
      db,
      nodeManager,
    }: { db: DB; nodeManager: NodeManager<AgentClientManifest> } =
      this.container;
    const {
      nodeId,
    }: {
      nodeId: NodeId;
    } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['nodeId'], () => ids.parseNodeId(value)],
          () => value,
        );
      },
      {
        nodeId: input.nodeIdEncoded,
      },
    );
    await db.withTransactionF(async (tran) => {
      // Attempt to claim the node. If there is no permission then we get an
      // error.
      await nodeManager.claimNode(nodeId, tran);
    });
    return { success: true };
  };
}

export default NodesClaim;
