import type Logger from '@matrixai/logger';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  HolePunchRequestMessage,
} from '../types';
import type NodeConnectionManager from '../../NodeConnectionManager';
import type { Host, Port } from '../../../network/types';
import { UnaryHandler } from '@matrixai/rpc';
import * as keysUtils from '../../../keys/utils';
import * as ids from '../../../ids';
import * as agentErrors from '../errors';
import * as agentUtils from '../utils';

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
    _cancel,
    meta,
  ): Promise<AgentRPCResponseResult> => {
    const { nodeConnectionManager, logger } = this.container;
    // Connections should always be validated
    const sourceNodeId = ids.parseNodeId(input.sourceNodeIdEncoded);
    const targetNodeId = ids.parseNodeId(input.targetNodeIdEncoded);
    const relayingNodeId = agentUtils.nodeIdFromMeta(meta);
    if (relayingNodeId == null) {
      throw new agentErrors.ErrorAgentNodeIdMissing();
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
      throw new agentErrors.ErrorNodesConnectionSignalRequestVerificationFailed();
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
      throw new agentErrors.ErrorNodesConnectionSignalRelayVerificationFailed();
    }

    const host = input.address.host as Host;
    const port = input.address.port as Port;
    logger.debug(`Received signaling message to target ${host}:${port}`);
    nodeConnectionManager.handleNodesConnectionSignalFinal(host, port);
    return {};
  };
}

export default NodesConnectionSignalFinal;
