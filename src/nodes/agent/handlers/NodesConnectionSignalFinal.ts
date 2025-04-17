import type Logger from '@matrixai/logger';
import type { JSONValue } from '@matrixai/rpc';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  HolePunchRequestMessage,
} from '../types.js';
import type { NodeId } from '../../../ids/index.js';
import type NodeConnectionManager from '../../NodeConnectionManager.js';
import type { Host, Port } from '../../../network/types.js';
import { UnaryHandler } from '@matrixai/rpc';
import { validateSync } from '../../../validation/index.js';
import { matchSync } from '../../../utils/index.js';
import * as keysUtils from '../../../keys/utils/index.js';
import * as ids from '../../../ids/index.js';
import * as agentUtils from '../utils.js';
import * as nodesErrors from '../../errors.js';

class NodesConnectionSignalFinal extends UnaryHandler<
  {
    nodeConnectionManager: NodeConnectionManager;
    logger: Logger;
  },
  AgentRPCRequestParams<HolePunchRequestMessage>,
  AgentRPCResponseResult
> {
  public handle = async (
    input: AgentRPCRequestParams<HolePunchRequestMessage>,
    _cancel: (reason?: any) => void,
    meta: Record<string, JSONValue> | undefined,
  ): Promise<AgentRPCResponseResult> => {
    const {
      nodeConnectionManager,
      logger,
    }: {
      nodeConnectionManager: NodeConnectionManager;
      logger: Logger;
    } = this.container;
    // Connections should always be validated
    const {
      sourceNodeId,
      targetNodeId,
    }: { sourceNodeId: NodeId; targetNodeId: NodeId } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['sourceNodeId'], () => ids.parseNodeId(value)],
          [['targetNodeId'], () => ids.parseNodeId(value)],
          () => value,
        );
      },
      {
        sourceNodeId: input.sourceNodeIdEncoded,
        targetNodeId: input.targetNodeIdEncoded,
      },
    );
    const relayingNodeId = agentUtils.nodeIdFromMeta(meta);
    if (relayingNodeId == null) {
      throw new nodesErrors.ErrorNodeConnectionInvalidIdentity();
    }
    const requestSignature = Buffer.from(input.requestSignature, 'base64url');
    // Checking request requestSignature, requestData is just `<sourceNodeId><targetNodeId>` concatenated
    const requestData = Buffer.concat([sourceNodeId, targetNodeId]);
    const sourcePublicKey = keysUtils.publicKeyFromNodeId(sourceNodeId);
    if (
      !keysUtils.verifyWithPublicKey(
        sourcePublicKey,
        requestData,
        requestSignature,
      )
    ) {
      throw new nodesErrors.ErrorNodeConnectionSignalRequestVerificationFailed();
    }
    // Checking relay message relaySignature.
    // relayData is just `<sourceNodeId><targetNodeId><Address><requestSignature>` concatenated.
    const relayData = Buffer.concat([
      sourceNodeId,
      targetNodeId,
      Buffer.from(JSON.stringify(input.address), 'utf-8'),
      requestSignature,
    ]);
    const relayPublicKey = keysUtils.publicKeyFromNodeId(relayingNodeId);
    const relaySignature = Buffer.from(input.relaySignature, 'base64url');
    if (
      !keysUtils.verifyWithPublicKey(relayPublicKey, relayData, relaySignature)
    ) {
      throw new nodesErrors.ErrorNodeConnectionSignalRelayVerificationFailed();
    }

    const host = input.address.host as Host;
    const port = input.address.port as Port;
    logger.debug(`Received signaling message to target ${host}:${port}`);
    nodeConnectionManager.handleNodesConnectionSignalFinal(host, port);
    return {};
  };
}

export default NodesConnectionSignalFinal;
