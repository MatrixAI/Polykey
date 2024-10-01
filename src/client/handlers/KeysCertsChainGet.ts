import type {
  CertMessage,
  ClientRPCRequestParams,
  ClientRPCResponseResult,
} from '../types';
import type CertManager from '../../keys/CertManager';
import { ServerHandler } from '@matrixai/rpc';

class KeysCertsChainGet extends ServerHandler<
  {
    certManager: CertManager;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<CertMessage>
> {
  public handle = async function* (
    _input,
    _cancel,
    _meta,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<CertMessage>> {
    const { certManager }: { certManager: CertManager } = this.container;
    for (const certPEM of await certManager.getCertPEMsChain()) {
      if (ctx.signal.aborted) throw ctx.signal.reason;
      yield {
        cert: certPEM,
      };
    }
  };
}

export default KeysCertsChainGet;
