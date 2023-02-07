import type { ManifestItem } from '../../RPC/types';
import type KeyRing from '../../keys/KeyRing';
import type CertManager from '../../keys/CertManager';
import type Logger from '@matrixai/logger';
import type { NodeIdEncoded } from '../../ids';
import * as nodesUtils from '../../nodes/utils';
import * as keysUtils from '../../keys/utils';

type StatusResult = {
  pid: number;
  nodeId: NodeIdEncoded;
  publicJwk: string;
};

const agentStatus: ManifestItem<null, StatusResult> = {
  type: 'UNARY',
  handler: async (
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
  },
};

export { agentStatus };
