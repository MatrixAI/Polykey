import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  HolePunchSignalMessage,
  AddressMessage,
} from '../types';
import type { NodeId } from '../../../ids';
import type NodeConnectionManager from '../../../nodes/NodeConnectionManager';
import type { Host, Port } from '../../../network/types';
import type { JSONValue } from '../../../types';
import { UnaryHandler } from '@matrixai/rpc';
import { validateSync } from '../../../validation';
import { matchSync } from '../../../utils';
import { never } from '../../../utils';
import * as agentErrors from '../errors';
import * as agentUtils from '../utils';
import * as keysUtils from '../../../keys/utils';
import * as ids from '../../../ids';

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
      throw new agentErrors.ErrorNodesConnectionSignalRelayVerificationFailed();
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
