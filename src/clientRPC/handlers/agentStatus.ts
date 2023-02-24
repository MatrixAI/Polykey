import type KeyRing from '../../keys/KeyRing';
import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { StatusResultMessage } from './types';
import * as nodesUtils from '../../nodes/utils';
import * as keysUtils from '../../keys/utils';
import { UnaryHandler } from '../../RPC/handlers';
import { UnaryCaller } from '../../RPC/callers';

const agentStatus = new UnaryCaller<
  RPCRequestParams,
  RPCResponseResult<StatusResultMessage>
>();

class AgentStatusHandler extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  RPCRequestParams,
  RPCResponseResult<StatusResultMessage>
> {
  public async handle(): Promise<RPCResponseResult<StatusResultMessage>> {
    const { keyRing } = this.container;
    return {
      pid: process.pid,
      nodeId: nodesUtils.encodeNodeId(keyRing.getNodeId()),
      publicJwk: JSON.stringify(
        keysUtils.publicKeyToJWK(keyRing.keyPair.publicKey),
      ),
    };
  }
}

export { AgentStatusHandler, agentStatus };
