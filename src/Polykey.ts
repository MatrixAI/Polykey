import type { FileSystem } from './types';

import path from 'path';
import process from 'process';
import Logger from '@matrixai/logger';
import { KeyManager } from './keys';
import { VaultManager } from './vaults';
import { NodeManager } from './nodes';
import { WorkerManager } from './workers';
import * as utils from './utils';

class Polykey {
  public readonly nodePath: string;
  public readonly keys: KeyManager;
  public readonly vaults: VaultManager;
  public readonly nodes: NodeManager;
  public readonly workers: WorkerManager;

  protected fs: FileSystem;
  protected logger: Logger;

  constructor({
    nodePath,
    keyManager,
    vaultManager,
    nodeManager,
    workerManager,
    fs,
    logger,
  }: {
    nodePath?: string;
    keyManager?: KeyManager;
    vaultManager?: VaultManager;
    nodeManager?: NodeManager;
    workerManager?: WorkerManager;
    fs?: FileSystem;
    logger?: Logger;
  } = {}) {
    this.logger = logger ?? new Logger('Polykey');
    this.fs = fs ?? require('fs/promises');
    this.nodePath = path.resolve(nodePath ?? utils.getDefaultNodePath());
    const keysPath = `${this.nodePath}/keys`;
    const vaultsPath = `${this.nodePath}/vaults`;
    this.keys =
      keyManager ??
      new KeyManager({
        keysPath,
        fs: this.fs,
        logger: this.logger.getChild('KeyManager'),
      });
    this.vaults =
      vaultManager ??
      new VaultManager({
        baseDir: vaultsPath,
        keyManager: this.keys,
        fs: this.fs,
        logger: this.logger.getChild('VaultManager'),
      });
    this.nodes =
      nodeManager ??
      new NodeManager({
        fs: this.fs,
        logger: this.logger.getChild('NodeManager'),
      });
    this.workers =
      workerManager ??
      new WorkerManager({
        logger: this.logger.getChild('WorkerManager'),
      });
  }

  public async start({
    password,
    bits,
    duration,
    fresh = false,
  }: {
    password: string;
    bits?: number;
    duration?: number;
    fresh?: boolean;
  }) {
    this.logger.info('Starting Polykey');
    const umaskNew = 0o077;
    this.logger.info(
      `Setting umask to ${umaskNew.toString(8).padStart(3, '0')}`,
    );
    process.umask(umaskNew);
    this.logger.info(`Setting node path to ${this.nodePath}`);
    await utils.mkdirExists(this.fs, this.nodePath, { recursive: true });
    await this.workers.start();
    this.keys.setWorkerManager(this.workers);
    await this.keys.start({
      password,
      bits,
      duration,
      fresh,
    });
    await this.nodes.start();
    await this.vaults.start({ fresh });
    this.logger.info('Started Polykey');
  }

  public async stop() {
    this.logger.info('Stopping Polykey');
    await this.vaults.stop();
    await this.nodes.stop();
    await this.keys.stop();
    this.keys.unsetWorkerManager();
    await this.workers.stop();
    this.logger.info('Stopped Polykey');
  }

  public async destroy() {
    return;
  }
}

export default Polykey;
