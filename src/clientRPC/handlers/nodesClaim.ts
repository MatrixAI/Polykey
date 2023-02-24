import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { NodeId } from '../../ids';
import type NodeManager from '../../nodes/NodeManager';
import type { DB } from '@matrixai/db';
import type { ClaimNodeMessage, SuccessMessage } from './types';
import { matchSync } from '../../utils/index';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import { UnaryHandler } from '../../RPC/handlers';
import { UnaryCaller } from '../../RPC/callers';

const nodesClaim = new UnaryCaller<
  RPCRequestParams<ClaimNodeMessage>,
  RPCResponseResult<SuccessMessage>
>();

class NodesClaimHandler extends UnaryHandler<
  {
    nodeManager: NodeManager;
    db: DB;
  },
  RPCRequestParams<ClaimNodeMessage>,
  RPCResponseResult<SuccessMessage>
> {
  public async handle(
    input: RPCRequestParams<ClaimNodeMessage>,
  ): Promise<RPCResponseResult<SuccessMessage>> {
    const { nodeManager, db } = this.container;

    const {
      nodeId,
    }: {
      nodeId: NodeId;
    } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['nodeId'], () => validationUtils.parseNodeId(value)],
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
    return {
      success: true,
    };
  }
}

export { nodesClaim, NodesClaimHandler };
