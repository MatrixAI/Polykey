import type { DB } from '@matrixai/db';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager';
import type KeyRing from '../../keys/KeyRing';
import type Logger from '@matrixai/logger';
import type { Host, Port } from '../../network/types';
import type NodeManager from '../../nodes/NodeManager';
import type { AgentRPCRequestParams, AgentRPCResponseResult } from '../types';
import type { NodeId } from '../../ids';
import type { HolePunchRelayMessage } from './types';
import * as agentErrors from '../errors';
import * as networkUtils from '../../network/utils';
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
    // Connections should always be validated
    const requestingNodeId = networkUtils.nodeIdFromMeta(meta);
    if (requestingNodeId == null) {
      throw new agentErrors.ErrorAgentNodeIdMissing();
    }
    const srcNodeId = nodesUtils.encodeNodeId(requestingNodeId);
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
        const agentAddress = {
          host: meta.remoteHost,
          port: meta.remotePort,
        };
        // Checking if the source and destination are the same
        if (sourceId?.equals(targetId)) {
          // Logging and silently dropping operation
          logger.warn('Signaling relay message requested signal to itself');
          return {};
        }
        logger.debug(
          `Relaying signaling message from ${srcNodeId}@${agentAddress.host}:${agentAddress.port} to ${targetNodeId} with information ${agentAddress}`,
        );
        await nodeConnectionManager.relaySignalingMessage(input, {
          host: meta.remoteHost,
          port: meta.remotePort,
        });
      }
    });
    return {};
  }
}

export { NodesHolePunchMessageSendHandler };
