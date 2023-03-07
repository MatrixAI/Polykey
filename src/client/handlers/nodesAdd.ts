import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { NodeId } from '../../ids';
import type { Host, Hostname, Port } from '../../network/types';
import type { NodeAddress } from '../../nodes/types';
import type NodeManager from '../../nodes/NodeManager';
import type { DB } from '@matrixai/db';
import type { NodesAddMessage } from './types';
import { matchSync } from '../../utils/index';
import { validateSync } from '../../validation';
import * as nodeErrors from '../../nodes/errors';
import * as validationUtils from '../../validation/utils';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const nodesAdd = new UnaryCaller<
  RPCRequestParams<NodesAddMessage>,
  RPCResponseResult
>();

class NodesAddHandler extends UnaryHandler<
  {
    nodeManager: NodeManager;
    db: DB;
  },
  RPCRequestParams<NodesAddMessage>,
  RPCResponseResult
> {
  public async handle(
    input: RPCRequestParams<NodesAddMessage>,
  ): Promise<RPCResponseResult> {
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

export { nodesAdd, NodesAddHandler };
