import type { FileSystem } from './types';
import type { Host, Port } from './network/types';

import path from 'path';
import process from 'process';
import Logger from '@matrixai/logger';
import { GitBackend } from './git';
import * as utils from './utils';
import { KeyManager } from './keys';
import { GRPCServer } from './grpc';
import { Lockfile } from './lockfile';
import { NodeManager } from './nodes';
import { VaultManager } from './vaults';
import { GestaltGraph } from './gestalts';
import { WorkerManager } from './workers';
import { certNodeId } from './network/utils';
import { IdentitiesManager } from './identities';
import { ForwardProxy, ReverseProxy } from './network';
import { IAgentServer } from './proto/js/Agent_grpc_pb';
import { IClientServer } from './proto/js/Client_grpc_pb';
import { createAgentService, AgentService } from './agent';
import { createClientService, ClientService } from './client';

class Polykey {
  public readonly nodePath: string;
  public readonly lockfile: Lockfile;
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

  // Git
  public readonly gitBackend: GitBackend;

  // Proxies
  public readonly fwdProxy: ForwardProxy;
  public readonly revProxy: ReverseProxy;

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
    gitBackend,
    grpcHost,
    grpcPort,
    fwdProxy,
    revProxy,
    authToken,
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
    gitBackend?: GitBackend;
    grpcHost?: string;
    grpcPort?: number;
    fwdProxy?: ForwardProxy;
    revProxy?: ReverseProxy;
    authToken?: string;
    fs?: FileSystem;
    logger?: Logger;
  } = {}) {
    this.grpcHost = grpcHost ?? '127.0.0.1';
    this.grpcPort = grpcPort ?? 55557;
    this.logger = logger ?? new Logger('Polykey');
    this.fs = fs ?? require('fs');
    this.nodePath = path.resolve(nodePath ?? utils.getDefaultNodePath());
    const keysPath = path.join(this.nodePath, 'keys');
    const nodesPath = path.join(this.nodePath, 'nodes');
    const vaultsPath = path.join(this.nodePath, 'vaults');
    const gestaltsPath = path.join(this.nodePath, 'gestalts');
    const identitiesPath = path.join(this.nodePath, 'identities');

    this.fwdProxy =
      fwdProxy ??
      new ForwardProxy({
        authToken: authToken ?? '',
        logger: this.logger,
      });
    this.revProxy =
      revProxy ??
      new ReverseProxy({
        logger: this.logger,
      });

    this.lockfile = new Lockfile({
      nodePath: this.nodePath,
      fs: this.fs,
      logger: this.logger.getChild('Lockfile'),
    });
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
        nodesPath: nodesPath,
        keyManager: this.keys,
        fwdProxy: this.fwdProxy,
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
    this.gitBackend =
      gitBackend ??
      new GitBackend({
        getVault: this.vaults.getVault.bind(this.vaults),
        getVaultID: this.vaults.getVaultIds.bind(this.vaults),
        getVaultNames: this.vaults.listVaults.bind(this.vaults),
        logger: logger,
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
      git: this.gitBackend,
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

    // Getting NodeId
    const cert = this.keys.getRootCert();
    const nodeId = certNodeId(cert);

    await this.workers.start();
    this.keys.setWorkerManager(this.workers);
    await this.keys.start({
      password,
      rootKeyPairBits,
      rootCertDuration,
      keysDbBits,
      fresh,
    });
    await this.nodes.start({ nodeId, fresh });
    await this.vaults.start({ fresh });
    await this.gestalts.start({ fresh });
    await this.identities.start({ fresh });

    const keyPrivatePem = this.keys.getRootKeyPairPem().privateKey;
    const certChainPem = await this.keys.getRootCertChainPem();

    // GRPC Server
    await this.grpcServer.start({
      host: this.grpcHost as Host,
      port: this.grpcPort as Port,
      keyPrivatePem: keyPrivatePem,
      certChainPem: certChainPem,
    });

    await this.fwdProxy.start({
      keyPrivatePem: keyPrivatePem,
      certChainPem: certChainPem,
    });

    await this.revProxy.start({
      grpcHost: this.grpcHost as Host,
      grpcPort: this.grpcPort as Port,
    });

    await this.lockfile.start({ nodeId });
    await this.lockfile.updateLockfile('host', this.grpcHost);
    await this.lockfile.updateLockfile('port', this.grpcServer.getPort());
    await this.lockfile.updateLockfile('fwdProxyHost', this.fwdProxy.getHost());
    await this.lockfile.updateLockfile('fwdProxyPort', this.fwdProxy.getPort());

    this.logger.info('Started Polykey');
  }

  /**
   * Asynchronously stops the PolykeyAgent
   */
  public async stop() {
    this.logger.info('Stopping Polykey');

    await this.lockfile.stop();

    await this.revProxy.stop();
    await this.fwdProxy.stop();

    await this.grpcServer.stop();

    await this.identities.stop();
    await this.gestalts.stop();

    this.logger.info(
      `Deleting lockfile from ${path.join(this.nodePath, 'agent-lock.json')}`,
    );

    await this.vaults.stop();
    await this.nodes.stop();
    await this.keys.stop();
    this.keys.unsetWorkerManager();
    await this.workers.stop();

    // Stop GRPC Server
    await this.grpcServer.stop();

    this.logger.info('Stopped Polykey');
  }

  public async destroy() {
    return;
  }
}

export default Polykey;
