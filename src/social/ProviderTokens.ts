import { TokenData } from './types';

class ProviderTokens {

  protected tokenData?: TokenData;

  public constructor (tokenData?: TokenData) {
    this.tokenData = tokenData;
  }

  public getToken (): TokenData|undefined {
    return this.tokenData;
  }

  public setToken (tokenData: TokenData): void {
    this.tokenData = tokenData;
  }

}

export default ProviderTokens;
