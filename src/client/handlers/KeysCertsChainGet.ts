import type { ContextTimed } from '@matrixai/contexts';
import type { JSONValue } from '@matrixai/rpc';
import type {
  CertMessage,
  ClientRPCRequestParams,
  ClientRPCResponseResult,
} from '../types.js';
import type CertManager from '../../keys/CertManager.js';
import { ServerHandler } from '@matrixai/rpc';

class KeysCertsChainGet extends ServerHandler<
  {
    certManager: CertManager;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<CertMessage>
> {
  public handle = async function* (
    _input: ClientRPCRequestParams,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue>,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<CertMessage>> {
    const { certManager }: { certManager: CertManager } = this.container;
    for (const certPEM of await certManager.getCertPEMsChain()) {
      ctx.signal.throwIfAborted();
      yield { cert: certPEM };
    }
  };
}

export default KeysCertsChainGet;
