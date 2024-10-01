import type { DB } from '@matrixai/db';
import type {
  ClaimNodeMessage,
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SuccessMessage,
} from '../types';
import type { NodeId } from '../../ids';
import type NodeManager from '../../nodes/NodeManager';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids';
import { matchSync } from '../../utils';
import { validateSync } from '../../validation';

class NodesClaim extends UnaryHandler<
  {
    db: DB;
    nodeManager: NodeManager;
  },
  ClientRPCRequestParams<ClaimNodeMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<ClaimNodeMessage>,
  ): Promise<ClientRPCResponseResult<SuccessMessage>> => {
    const { db, nodeManager }: { db: DB; nodeManager: NodeManager } =
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
      // Attempt to claim the node,
      // if there is no permission then we get an error
      await nodeManager.claimNode(nodeId, tran);
    });
    return { type: 'success', success: true };
  };
}

export default NodesClaim;
