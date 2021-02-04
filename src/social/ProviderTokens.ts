import fs from 'fs'
import path from 'path'
import { TokenData } from './types';

class ProviderTokens {

  private metadataPath: string;
  protected tokenData?: TokenData;

  public constructor(polykeyPath: string, provider: string, tokenData?: TokenData) {
    this.metadataPath = path.join(polykeyPath, '.providers', provider)
    this.tokenData = tokenData;
    this.writeMetadata()
    this.loadMetadata()
  }

  public getToken(): TokenData | undefined {
    return this.tokenData;
  }

  public setToken(tokenData: TokenData): void {
    this.tokenData = tokenData;
    this.writeMetadata()
  }

  writeMetadata() {
    if (this.tokenData) {
      fs.mkdirSync(path.dirname(this.metadataPath), { recursive: true })
      fs.writeFileSync(this.metadataPath, JSON.stringify(this.tokenData))
    }
  }

  loadMetadata() {
    if (fs.existsSync(this.metadataPath)) {
      this.tokenData = JSON.parse(fs.readFileSync(this.metadataPath).toString())
    }
  }
}

export default ProviderTokens;
