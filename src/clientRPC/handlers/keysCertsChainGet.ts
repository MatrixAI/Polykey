import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { CertMessage } from './types';
import type CertManager from 'keys/CertManager';
import { ServerCaller } from '../../RPC/callers';
import { ServerHandler } from '../../RPC/handlers';

const keysCertsChainGet = new ServerCaller<
  RPCRequestParams,
  RPCResponseResult<CertMessage>
>();

class KeysCertsChainGetHandler extends ServerHandler<
  {
    certManager: CertManager;
  },
  RPCRequestParams,
  RPCResponseResult<CertMessage>
> {
  public async *handle(): AsyncGenerator<RPCResponseResult<CertMessage>> {
    const { certManager } = this.container;
    for (const certPEM of await certManager.getCertPEMsChain()) {
      yield {
        cert: certPEM,
      };
    }
  }
}

export { keysCertsChainGet, KeysCertsChainGetHandler };
