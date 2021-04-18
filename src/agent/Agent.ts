import type { FileSystem } from '../types';

import Logger from '@matrixai/logger';

/**
 * GRPC Calls to the agent server.
 */
class Agent {
  protected fs: FileSystem;
  protected logger: Logger;

  constructor({
    fs,
    logger,
  }: {
    fs?: FileSystem;
    logger?: Logger;
  } = {}) {
    this.logger = logger ?? new Logger('Agent');
    this.fs = fs ?? require('fs/promises');
  }
}
