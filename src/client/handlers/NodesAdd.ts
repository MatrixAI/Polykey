import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodesAddMessage,
} from '../types';
import type { NodeId } from '../../ids';
import type { Host, Port } from '../../network/types';
import type NodeManager from '../../nodes/NodeManager';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids';
import * as networkUtils from '../../network/utils';
import * as nodeErrors from '../../nodes/errors';
import { matchSync } from '../../utils';
import { validateSync } from '../../validation';

class NodesAdd extends UnaryHandler<
  {
    db: DB;
    nodeManager: NodeManager;
  },
  ClientRPCRequestParams<NodesAddMessage>,
  ClientRPCResponseResult
> {
  public handle = async (
    input: ClientRPCRequestParams<NodesAddMessage>,
  ): Promise<ClientRPCResponseResult> => {
    const { db, nodeManager }: { db: DB; nodeManager: NodeManager } =
      this.container;
    const {
      nodeId,
      host,
      port,
    }: {
      nodeId: NodeId;
      host: Host;
      port: Port;
    } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['nodeId'], () => ids.parseNodeId(value)],
          [['host'], () => networkUtils.parseHost(value)],
          [['port'], () => networkUtils.parsePort(value)],
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
      !(await nodeManager.pingNodeAddress(nodeId, host, port))
    ) {
      throw new nodeErrors.ErrorNodePingFailed(
        'Failed to authenticate target node',
      );
    }

    await db.withTransactionF((tran) =>
      nodeManager.setNode(
        nodeId,
        [host, port],
        {
          mode: 'direct',
          connectedTime: Date.now(),
          scopes: ['global'],
        },
        true,
        input.force ?? false,
        1500,
        undefined,
        tran,
      ),
    );
    return {};
  };
}

export default NodesAdd;
