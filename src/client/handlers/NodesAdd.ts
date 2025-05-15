import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  NodesAddMessage,
} from '../types.js';
import type { NodeId } from '../../ids/index.js';
import type { Host, Port } from '../../network/types.js';
import type NodeManager from '../../nodes/NodeManager.js';
import type { AgentClientManifest } from '../../nodes/agent/callers/index.js';
import { UnaryHandler } from '@matrixai/rpc';
import { matchSync } from '../../utils/index.js';
import { validateSync } from '../../validation/index.js';
import * as ids from '../../ids/index.js';
import * as networkUtils from '../../network/utils.js';
import * as nodeErrors from '../../nodes/errors.js';

class NodesAdd extends UnaryHandler<
  {
    db: DB;
    nodeManager: NodeManager<AgentClientManifest>;
  },
  ClientRPCRequestParams<NodesAddMessage>,
  ClientRPCResponseResult
> {
  public handle = async (
    input: ClientRPCRequestParams<NodesAddMessage>,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue>,
    ctx: ContextTimed,
  ): Promise<ClientRPCResponseResult> => {
    const {
      db,
      nodeManager,
    }: { db: DB; nodeManager: NodeManager<AgentClientManifest> } =
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
        tran,
        ctx,
      ),
    );
    return {};
  };
}

export default NodesAdd;
