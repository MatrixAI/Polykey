import type { ProviderKey } from '../types';

import Provider from './Provider';
import { ErrorIdentities } from '../errors';

class ProviderManager {
  protected providers: { [key: string]: Provider } = {};

  public constructor(providers: Array<Provider>) {
    for (const p of providers) {
      this.providers[p.key] = p;
    }
  }

  public getProvider(key: ProviderKey): Provider {
    const provider = this.providers[key];
    if (!provider) {
      throw new ErrorIdentities(`Missing provider: ${key}`);
    }
    return provider;
  }
}

export default ProviderManager;
