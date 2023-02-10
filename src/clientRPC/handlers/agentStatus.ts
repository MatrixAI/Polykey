import type KeyRing from '../../keys/KeyRing';
import type CertManager from '../../keys/CertManager';
import type Logger from '@matrixai/logger';
import type { NodeIdEncoded } from '../../ids';
import type { RPCRequestParams, RPCResponseResult } from '../types';
import * as nodesUtils from '../../nodes/utils';
import * as keysUtils from '../../keys/utils';
import { UnaryHandler } from '../../RPC/handlers';
import { UnaryCaller } from '../../RPC/callers';

type StatusResult = {
  pid: number;
  nodeId: NodeIdEncoded;
  publicJwk: string;
};

const agentStatusCaller = new UnaryCaller<
  RPCRequestParams,
  RPCResponseResult<StatusResult>
>();

class AgentStatusHandler extends UnaryHandler<
  {
    keyRing: KeyRing;
    certManager: CertManager;
    logger: Logger;
  },
  RPCRequestParams,
  RPCResponseResult<StatusResult>
> {
  public async handle(): Promise<RPCResponseResult<StatusResult>> {
    return {
      pid: process.pid,
      nodeId: nodesUtils.encodeNodeId(this.container.keyRing.getNodeId()),
      publicJwk: JSON.stringify(
        keysUtils.publicKeyToJWK(this.container.keyRing.keyPair.publicKey),
      ),
    };
  }
}

export { AgentStatusHandler, agentStatusCaller };
