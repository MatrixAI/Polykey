import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { NodeId } from '../../ids';
import type NodeManager from '../../nodes/NodeManager';
import type { DB } from '@matrixai/db';
import type { ClaimNodeMessage, SuccessMessage } from './types';
import { matchSync } from '../../utils/index';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import { UnaryHandler } from '../../rpc/handlers';
import { UnaryCaller } from '../../rpc/callers';

const nodesClaim = new UnaryCaller<
  ClientRPCRequestParams<ClaimNodeMessage>,
  ClientRPCResponseResult<SuccessMessage>
>();

class NodesClaimHandler extends UnaryHandler<
  {
    nodeManager: NodeManager;
    db: DB;
  },
  ClientRPCRequestParams<ClaimNodeMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public async handle(
    input: ClientRPCRequestParams<ClaimNodeMessage>,
  ): Promise<ClientRPCResponseResult<SuccessMessage>> {
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
