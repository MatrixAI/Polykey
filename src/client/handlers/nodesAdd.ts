import type { DB } from '@matrixai/db';
import type { NodesAddMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { NodeId } from '../../ids';
import type { Host, Hostname, Port } from '../../network/types';
import type { NodeAddress } from '../../nodes/types';
import type NodeManager from '../../nodes/NodeManager';
import { matchSync } from '../../utils/index';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import * as nodeErrors from '../../nodes/errors';
import { UnaryHandler } from '../../rpc/handlers';

class NodesAddHandler extends UnaryHandler<
  {
    nodeManager: NodeManager;
    db: DB;
  },
  ClientRPCRequestParams<NodesAddMessage>,
  ClientRPCResponseResult
> {
  public async handle(
    input: ClientRPCRequestParams<NodesAddMessage>,
  ): Promise<ClientRPCResponseResult> {
    const { nodeManager, db } = this.container;
    const {
      nodeId,
      host,
      port,
    }: {
      nodeId: NodeId;
      host: Host | Hostname;
      port: Port;
    } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['nodeId'], () => validationUtils.parseNodeId(value)],
          [['host'], () => validationUtils.parseHostOrHostname(value)],
          [['port'], () => validationUtils.parsePort(value)],
          () => value,
        );
      },
      {
        nodeId: input.nodeIdEncoded,
        host: input.host,
        port: input.port,
      },
    );
    // Pinging to authenticate the node
    if (
      (input.ping ?? false) &&
      !(await nodeManager.pingNode(nodeId, { host, port }))
    ) {
      throw new nodeErrors.ErrorNodePingFailed(
        'Failed to authenticate target node',
      );
    }

    await db.withTransactionF((tran) =>
      nodeManager.setNode(
        nodeId,
        {
          host,
          port,
        } as NodeAddress,
        true,
        input.force ?? false,
        1500,
        undefined,
        tran,
      ),
    );
    return {};
  }
}

export { NodesAddHandler };
