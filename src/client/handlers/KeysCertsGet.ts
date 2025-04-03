import type {
  CertMessage,
  ClientRPCRequestParams,
  ClientRPCResponseResult,
} from '../types.js';
import type CertManager from '../../keys/CertManager.js';
import { UnaryHandler } from '@matrixai/rpc';

class KeysCertsGet extends UnaryHandler<
  {
    certManager: CertManager;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<CertMessage>
> {
  public handle = async (): Promise<ClientRPCResponseResult<CertMessage>> => {
    const { certManager }: { certManager: CertManager } = this.container;
    const cert = await certManager.getCurrentCertPEM();
    return { cert };
  };
}

export default KeysCertsGet;
