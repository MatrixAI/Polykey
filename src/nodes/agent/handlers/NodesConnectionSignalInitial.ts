import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  HolePunchSignalMessage,
  AddressMessage,
} from '../types.js';
import type { NodeId } from '../../../ids/index.js';
import type NodeConnectionManager from '../../../nodes/NodeConnectionManager.js';
import type { Host, Port } from '../../../network/types.js';
import type { JSONValue } from '../../../types.js';
import { UnaryHandler } from '@matrixai/rpc';
import { validateSync } from '../../../validation/index.js';
import { matchSync } from '../../../utils/index.js';
import { never } from '../../../utils/index.js';
import * as agentErrors from '../errors.js';
import * as agentUtils from '../utils.js';
import * as nodesErrors from '../../errors.js';
import * as keysUtils from '../../../keys/utils/index.js';
import * as ids from '../../../ids/index.js';

class NodesConnectionSignalInitial extends UnaryHandler<
  {
    nodeConnectionManager: NodeConnectionManager;
  },
  AgentRPCRequestParams<HolePunchSignalMessage>,
  AgentRPCResponseResult<AddressMessage>
> {
  public handle = async (
    input: AgentRPCRequestParams<HolePunchSignalMessage>,
    _cancel: (reason?: any) => void,
    meta: Record<string, JSONValue> | undefined,
  ): Promise<AgentRPCResponseResult<AddressMessage>> => {
    const {
      nodeConnectionManager,
    }: {
      nodeConnectionManager: NodeConnectionManager;
    } = this.container;
    // Connections should always be validated
    const requestingNodeId = agentUtils.nodeIdFromMeta(meta);
    if (requestingNodeId == null) {
      throw new agentErrors.ErrorAgentNodeIdMissing();
    }
    const { targetNodeId }: { targetNodeId: NodeId } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['targetNodeId'], () => ids.parseNodeId(value)],
          () => value,
        );
      },
      {
        targetNodeId: input.targetNodeIdEncoded,
      },
    );
    const signature = Buffer.from(input.signature, 'base64url');
    // Checking signature, data is just `<sourceNodeId><targetNodeId>` concatenated
    const data = Buffer.concat([requestingNodeId, targetNodeId]);
    const sourcePublicKey = keysUtils.publicKeyFromNodeId(requestingNodeId);
    if (!keysUtils.verifyWithPublicKey(sourcePublicKey, data, signature)) {
      throw new nodesErrors.ErrorNodeConnectionSignalRelayVerificationFailed();
    }
    if (meta == null) never('Missing metadata from stream');
    const remoteHost = meta.remoteHost;
    const remotePort = meta.remotePort;
    if (remoteHost == null || typeof remoteHost !== 'string') {
      never('Missing or invalid remoteHost');
    }
    if (remotePort == null || typeof remotePort !== 'number') {
      never('Missing or invalid remotePort');
    }
    const targetAddress =
      await nodeConnectionManager.handleNodesConnectionSignalInitial(
        requestingNodeId,
        targetNodeId,
        {
          host: remoteHost as Host,
          port: remotePort as Port,
        },
        input.signature,
      );
    return {
      host: targetAddress.host,
      port: targetAddress.port,
    };
  };
}

export default NodesConnectionSignalInitial;
