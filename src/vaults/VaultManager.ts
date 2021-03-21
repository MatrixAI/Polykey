import type { FileSystem } from '../types';

import Logger from '@matrixai/logger';
import * as utils from '../utils';

class VaultManager {
  public readonly vaultsPath: string;

  protected fs: FileSystem;
  protected logger: Logger;

  constructor({
    vaultsPath,
    fs,
    logger,
  }: {
    vaultsPath: string;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger('VaultManager');
    this.vaultsPath = vaultsPath;
    this.fs = fs ?? require('fs/promises');
  }

  public async start({
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}) {
    if (fresh) {
      await this.fs.rm(this.vaultsPath, {
        force: true,
        recursive: true,
      });
    }
    await utils.mkdirExists(this.fs, this.vaultsPath);
  }

  public async stop() {
    return;
  }
}

export default VaultManager;
