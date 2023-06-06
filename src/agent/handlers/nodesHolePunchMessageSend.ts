import type { DB } from '@matrixai/db';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager';
import type KeyRing from '../../keys/KeyRing';
import type Logger from '@matrixai/logger';
import type { Host, Port } from '../../network/types';
import type NodeManager from '../../nodes/NodeManager';
import type { AgentRPCRequestParams, AgentRPCResponseResult } from '../types';
import type { NodeId } from '../../ids';
import type { HolePunchRelayMessage } from './types';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as validationUtils from '../../validation/utils';
import * as nodesUtils from '../../nodes/utils';
import { UnaryHandler } from '../../rpc/handlers';

class NodesHolePunchMessageSendHandler extends UnaryHandler<
  {
    db: DB;
    nodeConnectionManager: NodeConnectionManager;
    keyRing: KeyRing;
    nodeManager: NodeManager;
    logger: Logger;
  },
  AgentRPCRequestParams<HolePunchRelayMessage>,
  AgentRPCResponseResult
> {
  public async handle(
    input: AgentRPCRequestParams<HolePunchRelayMessage>,
    _,
    meta,
  ): Promise<AgentRPCResponseResult> {
    const { db, nodeConnectionManager, keyRing, nodeManager, logger } =
      this.container;
    const {
      targetId,
      sourceId,
    }: {
      targetId: NodeId;
      sourceId: NodeId;
    } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [
            ['targetId'],
            ['sourceId'],
            () => validationUtils.parseNodeId(value),
          ],
          () => value,
        );
      },
      {
        targetId: input.dstIdEncoded,
        sourceId: input.srcIdEncoded,
      },
    );
    // FIXME: Need a utility for getting the NodeId from the connection info.
    //  We only have the remote certificates if that. Should throw if certs are missing but in practice this should
    //  never happen given the custom verification logic checks this.
    const connectionInfo = meta;
    throw Error('TMP IMP cant currently get the remote node info, need to fix');
    const srcNodeId = nodesUtils.encodeNodeId(connectionInfo!.remoteNodeId);
    // Firstly, check if this node is the desired node
    // If so, then we want to make this node start sending hole punching packets
    // back to the source node.
    await db.withTransactionF(async (tran) => {
      if (keyRing.getNodeId().equals(targetId)) {
        if (input.address != null) {
          const host = input.address.host as Host;
          const port = input.address.port as Port;
          logger.debug(
            `Received signaling message to target ${input.srcIdEncoded}@${host}:${port}`,
          );
          // Ignore failure
          await nodeConnectionManager
            .holePunchReverse(host, port)
            .catch(() => {});
        } else {
          logger.error(
            'Received signaling message, target information was missing, skipping reverse hole punch',
          );
        }
      } else if (await nodeManager.knowsNode(sourceId, tran)) {
        // Otherwise, find if node in table
        // If so, ask the nodeManager to relay to the node
        const targetNodeId = input.dstIdEncoded;
        const proxyAddress = {
          host: connectionInfo!.remoteHost,
          port: connectionInfo!.remotePort,
        };
        // Checking if the source and destination are the same
        if (sourceId?.equals(targetId)) {
          // Logging and silently dropping operation
          logger.warn('Signaling relay message requested signal to itself');
          return {};
        }
        logger.debug(
          `Relaying signaling message from ${srcNodeId}@${proxyAddress.host}:${proxyAddress.port} to ${targetNodeId} with information ${proxyAddress}`,
        );
        await nodeConnectionManager.relaySignalingMessage(input, {
          host: connectionInfo!.remoteHost,
          port: connectionInfo!.remotePort,
        });
      }
    });
    return {};
  }
}

export { NodesHolePunchMessageSendHandler };
