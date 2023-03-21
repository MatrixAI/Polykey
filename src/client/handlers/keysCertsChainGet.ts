import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { CertMessage } from './types';
import type CertManager from 'keys/CertManager';
import { ServerCaller } from '../../RPC/callers';
import { ServerHandler } from '../../RPC/handlers';

const keysCertsChainGet = new ServerCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult<CertMessage>
>();

class KeysCertsChainGetHandler extends ServerHandler<
  {
    certManager: CertManager;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<CertMessage>
> {
  public async *handle(): AsyncGenerator<ClientRPCResponseResult<CertMessage>> {
    const { certManager } = this.container;
    for (const certPEM of await certManager.getCertPEMsChain()) {
      yield {
        cert: certPEM,
      };
    }
  }
}

export { keysCertsChainGet, KeysCertsChainGetHandler };
