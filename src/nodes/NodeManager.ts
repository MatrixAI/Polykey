import type { FileSystem } from '../types';

import Logger from '@matrixai/logger';

class NodeManager {
  protected fs: FileSystem;
  protected logger: Logger;

  constructor({
    fs,
    logger,
  }: {
    fs?: FileSystem;
    logger?: Logger;
  } = {}) {
    this.logger = logger ?? new Logger('NodeManager');
    this.fs = fs ?? require('fs/promises');
  }

  public async start() {
    return;
  }

  public async stop() {
    return;
  }
}

export default NodeManager;
