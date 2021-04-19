import type { FileSystem } from './types';

import path from 'path';
import process from 'process';
import Logger from '@matrixai/logger';
import * as utils from './utils';
import { KeyManager } from './keys';
import { VaultManager } from './vaults';
import { NodeManager } from './nodes';
import { WorkerManager } from './workers';
import { GestaltGraph } from './gestalts';
import { IdentitiesManager } from './identities';
import { GRPCServer, utils as grpcUtils } from './grpc';
import { createClientService, ClientService } from './client';
import { createAgentService, AgentService } from './agent';
import { ErrorPolykey } from './errors';
import { IClientServer } from './proto/js/Client_grpc_pb';
import { IAgentServer } from './proto/js/Agent_grpc_pb';

class Polykey {
  public readonly nodePath: string;
  public readonly keys: KeyManager;
  public readonly vaults: VaultManager;
  public readonly nodes: NodeManager;
  public readonly gestalts: GestaltGraph;
  public readonly identities: IdentitiesManager;
  public readonly workers: WorkerManager;

  // GRPC
  public readonly grpcServer: GRPCServer;
  public readonly grpcHost: string;
  public readonly grpcPort: number;

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
    grpcHost,
    grpcPort,
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
    grpcHost?: string;
    grpcPort?: number;
    fs?: FileSystem;
    logger?: Logger;
  } = {}) {
    this.grpcHost = grpcHost ?? '127.0.0.1';
    this.grpcPort = grpcPort ?? 55557;
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

    // Get GRPC Services
    const clientService: IClientServer = createClientService({
      keyManager: this.keys,
      vaultManager: this.vaults,
      nodeManager: this.nodes,
    });

    const agentService: IAgentServer = createAgentService({
      keyManager: this.keys,
      vaultManager: this.vaults,
      nodeManager: this.nodes,
    });

    // Create GRPC Server with the services just created.
    this.grpcServer = new GRPCServer({
      services: [
        [ClientService, clientService],
        [AgentService, agentService],
      ],
      logger: this.logger,
    });
  }

  /**
   * Asynchronously start the PolykeyAgent
   * @param options: password, bits, duration, fresh
   */
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

    // Interrogate Lock File
    const lock = await utils.parseLock(
      this.fs,
      path.join(this.nodePath, 'agent-lock.json'),
    );
    if (lock) {
      if (utils.pidIsRunning(lock.pid)) {
        this.logger.error(`PolykeyAgent already started at pid: ${lock.pid}`);
        throw new ErrorPolykey(
          `PolykeyAgent already started at pid: ${lock.pid}`,
        );
      }
    }

    this.logger.info(
      `Writing lockfile to ${path.join(this.nodePath, 'agent-lock.json')}`,
    );
    await utils.writeLock(
      this.fs,
      path.join(this.nodePath, 'agent-lock.json'),
      this.grpcHost,
      this.grpcPort,
    );

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

    // GRPC Server
    await this.grpcServer.start({
      host: this.grpcHost,
      port: this.grpcPort,
      credentials: grpcUtils.serverCredentials(),
    });

    this.logger.info('Started Polykey');
  }

  /**
   * Asynchronously stops the PolykeyAgent
   */
  public async stop() {
    this.logger.info('Stopping Polykey');
    await this.identities.stop();
    await this.gestalts.stop();

    this.logger.info(
      `Deleting lockfile from ${path.join(this.nodePath, 'agent-lock.json')}`,
    );
    await utils.deleteLock(
      this.fs,
      path.join(this.nodePath, 'agent-lock.json'),
    );

    await this.vaults.stop();
    await this.nodes.stop();
    await this.keys.stop();
    this.keys.unsetWorkerManager();
    await this.workers.stop();

    // Stop GRPC Server
    this.grpcServer.stop();

    this.logger.info('Stopped Polykey');
  }

  public async destroy() {
    return;
  }
}

export default Polykey;
