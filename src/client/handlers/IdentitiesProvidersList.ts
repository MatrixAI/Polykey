import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
} from '../types.js';
import type IdentitiesManager from '../../identities/IdentitiesManager.js';
import { UnaryHandler } from '@matrixai/rpc';

class IdentitiesProvidersList extends UnaryHandler<
  {
    identitiesManager: IdentitiesManager;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<{
    providerIds: Array<string>;
  }>
> {
  public handle = async (): Promise<
    ClientRPCResponseResult<{
      providerIds: Array<string>;
    }>
  > => {
    const { identitiesManager }: { identitiesManager: IdentitiesManager } =
      this.container;
    const providers = identitiesManager.getProviders();
    return {
      providerIds: Object.keys(providers),
    };
  };
}

export default IdentitiesProvidersList;
