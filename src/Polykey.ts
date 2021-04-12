import type { FileSystem } from './types';

import path from 'path';
import process from 'process';
import Logger from '@matrixai/logger';
import { KeyManager } from './keys';
import { VaultManager } from './vaults';
import { NodeManager } from './nodes';
import { WorkerManager } from './workers';
import { GestaltGraph } from './gestalts';
import { IdentitiesManager } from './identities';
import * as utils from './utils';

class Polykey {
  public readonly nodePath: string;
  public readonly keys: KeyManager;
  public readonly vaults: VaultManager;
  public readonly nodes: NodeManager;
  public readonly gestalts: GestaltGraph;
  public readonly identities: IdentitiesManager;
  public readonly workers: WorkerManager;

  protected fs: FileSystem;
  protected logger: Logger;

  constructor({
    nodePath,
    keyManager,
    vaultManager,
    nodeManager,
    gestaltGraph,
    identitiesManager,
    workerManager,
    fs,
    logger,
  }: {
    nodePath?: string;
    keyManager?: KeyManager;
    vaultManager?: VaultManager;
    nodeManager?: NodeManager;
    gestaltGraph?: GestaltGraph;
    identitiesManager?: IdentitiesManager;
    workerManager?: WorkerManager;
    fs?: FileSystem;
    logger?: Logger;
  } = {}) {
    this.logger = logger ?? new Logger('Polykey');
    this.fs = fs ?? require('fs/promises');
    this.nodePath = path.resolve(nodePath ?? utils.getDefaultNodePath());
    const keysPath = path.join(this.nodePath, 'keys');
    const vaultsPath = path.join(this.nodePath, 'vaults');
    const gestaltsPath = path.join(this.nodePath, 'gestalts');
    const identitiesPath = path.join(this.nodePath, 'identities');
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
        vaultsPath: vaultsPath,
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
    this.gestalts =
      gestaltGraph ??
      new GestaltGraph({
        gestaltsPath,
        keyManager: this.keys,
        fs: this.fs,
        logger: this.logger.getChild('GestaltGraph'),
      });
    this.identities =
      identitiesManager ??
      new IdentitiesManager({
        identitiesPath,
        keyManager: this.keys,
        fs: this.fs,
        logger: this.logger.getChild('IdentitiesManager'),
      });
    this.workers =
      workerManager ??
      new WorkerManager({
        logger: this.logger.getChild('WorkerManager'),
      });
  }

  public async start({
    password,
    rootKeyPairBits,
    rootCertDuration,
    keysDbBits,
    fresh = false,
  }: {
    password: string;
    rootKeyPairBits?: number;
    rootCertDuration?: number;
    keysDbBits?: number;
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
      rootKeyPairBits,
      rootCertDuration,
      keysDbBits,
      fresh,
    });
    await this.nodes.start();
    await this.vaults.start({ fresh });
    await this.gestalts.start({ fresh });
    await this.identities.start({ fresh });
    this.logger.info('Started Polykey');
  }

  public async stop() {
    this.logger.info('Stopping Polykey');
    await this.identities.stop();
    await this.gestalts.stop();
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
