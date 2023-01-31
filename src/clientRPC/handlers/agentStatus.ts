import type { UnaryHandler } from '../../RPC/types';
import type KeyRing from '../../keys/KeyRing';
import type CertManager from '../../keys/CertManager';
import type Logger from '@matrixai/logger';
import type { NodeIdEncoded } from '../../ids';
import type RPCClient from '../../RPC/RPCClient';
import type { POJO } from '../../types';
import * as nodesUtils from '../../nodes/utils';
import * as keysUtils from '../../keys/utils';

type StatusResult = {
  pid: number;
  nodeId: NodeIdEncoded;
  publicJwk: string;
};
const agentStatusName = 'agentStatus';
const agentStatusHandler: UnaryHandler<null, StatusResult> = async (
  input,
  container: {
    keyRing: KeyRing;
    certManager: CertManager;
    logger: Logger;
  },
  _connectionInfo,
  _ctx,
) => {
  return {
    pid: process.pid,
    nodeId: nodesUtils.encodeNodeId(container.keyRing.getNodeId()),
    publicJwk: JSON.stringify(
      keysUtils.publicKeyToJWK(container.keyRing.keyPair.publicKey),
    ),
  };
};

const agentStatusCaller = async (metadata: POJO, rpcClient: RPCClient) => {
  const result = await rpcClient.unaryCaller<null, StatusResult>(
    agentStatusName,
    null,
  );
  return {
    pid: result.pid,
    nodeId: nodesUtils.decodeNodeId(result.nodeId),
    publicJwk: result.publicJwk,
  };
};

export { agentStatusName, agentStatusHandler, agentStatusCaller };
