import fs from 'fs';
import path from 'path';
import { TokenData } from './types';
import Logger from '@matrixai/logger';

class ProviderTokens {
  private metadataPath: string;
  private logger: Logger;
  protected tokenData?: TokenData;

  public constructor(
    polykeyPath: string,
    provider: string,
    logger: Logger,
    tokenData?: TokenData,
  ) {
    this.metadataPath = path.join(polykeyPath, '.providers', provider);
    this.tokenData = tokenData;
    this.logger = logger;
    this.writeMetadata();
    this.loadMetadata();
  }

  public getToken(): TokenData | undefined {
    return this.tokenData;
  }

  public setToken(tokenData: TokenData): void {
    this.tokenData = tokenData;
    this.writeMetadata();
  }

  writeMetadata() {
    if (this.tokenData) {
      fs.mkdirSync(path.dirname(this.metadataPath), { recursive: true });
      fs.writeFileSync(this.metadataPath, JSON.stringify(this.tokenData));
      this.logger.info(`Created and stored token metadata at '${this.metadataPath}'`)
    }
  }

  loadMetadata() {
    if (fs.existsSync(this.metadataPath)) {
      this.tokenData = JSON.parse(
        fs.readFileSync(this.metadataPath).toString(),
      );
    }
  }
}

export default ProviderTokens;
