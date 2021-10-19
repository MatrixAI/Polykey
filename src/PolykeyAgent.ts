import type { FileSystem } from './types';
import type { Host, Port } from './network/types';

import path from 'path';
import process from 'process';
import Logger from '@matrixai/logger';
import * as utils from './utils';
import * as errors from './errors';
import { KeyManager, utils as keyUtils } from './keys';
import { GRPCServer } from './grpc';
import { Lockfile } from './lockfile';
import { NodeManager } from './nodes';
import { VaultManager } from './vaults';
import { GestaltGraph } from './gestalts';
import { NotificationsManager } from './notifications';
import { Sigchain } from './sigchain';
import { ACL } from './acl';
import { DB } from '@matrixai/db';
import { Discovery } from './discovery';
import { WorkerManager } from './workers';
import { SessionManager } from './sessions';
import { certNodeId } from './network/utils';
import { IdentitiesManager } from './identities';
import { ForwardProxy, ReverseProxy } from './network';
import { IAgentServer } from './proto/js/Agent_grpc_pb';
import { IClientServer } from './proto/js/Client_grpc_pb';
import { createAgentService, AgentService } from './agent';
import { createClientService, ClientService } from './client';
import { GithubProvider } from './identities/providers';
import config from './config';
import { ErrorStateVersionMismatch } from './errors';
import { CreateDestroyStartStop } from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { VaultKey } from "@/vaults/types";

interface Polykey extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new errors.ErrorPolykeyAgentNotRunning(),
  new errors.ErrorPolykeyAgentDestroyed(),
)
class Polykey {
  public readonly nodePath: string;
  public readonly lockfile: Lockfile;
  public readonly sessions: SessionManager;
  public readonly keys: KeyManager;
  public readonly vaults: VaultManager;
  public readonly nodes: NodeManager;
  public readonly gestalts: GestaltGraph;
  public readonly identities: IdentitiesManager;
  public readonly notifications: NotificationsManager;
  public readonly workers: WorkerManager;
  public readonly sigchain: Sigchain;
  public readonly acl: ACL;
  public readonly db: DB;
  public readonly discovery: Discovery;

  // GRPC
  // Client server
  public readonly clientGrpcServer: GRPCServer;
  public readonly clientGrpcHost: string;
  public readonly clientGrpcPort: number;
  protected clientService: IClientServer;
  // Agent server
  public readonly agentGrpcServer: GRPCServer;
  public readonly agentGrpcHost: string;
  public readonly agentGrpcPort: number;
  protected agentService: IAgentServer;

  // Proxies
  public readonly fwdProxy: ForwardProxy;
  public readonly revProxy: ReverseProxy;

  protected fs: FileSystem;
  protected logger: Logger;

  public static async createPolykey({
    password,
    nodePath,
    keyManager,
    vaultManager,
    nodeManager,
    gestaltGraph,
    identitiesManager,
    sigchain,
    notificationsManager,
    acl,
    db,
    workerManager,
    clientGrpcHost,
    agentGrpcHost,
    clientGrpcPort,
    agentGrpcPort,
    fwdProxy,
    revProxy,
    authToken,
    fs,
    logger,
    discovery,
    fresh = false,
    rootKeyPairBits,
    rootCertDuration,
    dbKeyBits,
    cores,
  }: {
    password: string;
    nodePath?: string;
    keyManager?: KeyManager;
    vaultManager?: VaultManager;
    nodeManager?: NodeManager;
    gestaltGraph?: GestaltGraph;
    identitiesManager?: IdentitiesManager;
    sigchain?: Sigchain;
    notificationsManager?: NotificationsManager;
    acl?: ACL;
    db?: DB;
    workerManager?: WorkerManager;
    clientGrpcHost?: string;
    agentGrpcHost?: string;
    clientGrpcPort?: number;
    agentGrpcPort?: number;
    fwdProxy?: ForwardProxy;
    revProxy?: ReverseProxy;
    authToken?: string;
    fs?: FileSystem;
    logger?: Logger;
    discovery?: Discovery;
    fresh?: boolean;
    rootKeyPairBits?: number;
    rootCertDuration?: number;
    dbKeyBits?: number;
    cores?: number;
  }): Promise<Polykey> {
    const clientGrpcHost_ = clientGrpcHost ?? '127.0.0.1';
    const clientGrpcPort_ = clientGrpcPort ?? 0;
    const agentGrpcHost_ = agentGrpcHost ?? '127.0.0.1';
    const agentGrpcPort_ = agentGrpcPort ?? 0;
    const logger_ = logger ?? new Logger('Polykey');
    const fs_ = fs ?? require('fs');
    const nodePath_ = path.resolve(nodePath ?? utils.getDefaultNodePath());
    const keysPath = path.join(nodePath_, 'keys');
    const vaultsPath = path.join(nodePath_, 'vaults');
    const dbPath = path.join(nodePath_, 'db');

    if (
      (await Lockfile.checkLock(
        fs_,
        path.join(nodePath_, 'agent-lock.json'),
      )) !== 'DOESNOTEXIST'
    ) {
      // Interrogate Lock File
      const lock = await Lockfile.parseLock(
        fs_,
        path.join(nodePath_, 'agent-lock.json'),
      );

      if (utils.pidIsRunning(lock.pid)) {
        logger_.error(`PolykeyAgent already started at pid: ${lock.pid}`);
        throw new errors.ErrorPolykey(
          `PolykeyAgent already started at pid: ${lock.pid}`,
        );
      }
    }

    const umaskNew = 0o077;
    logger_.info(`Setting umask to ${umaskNew.toString(8).padStart(3, '0')}`);
    process.umask(umaskNew);

    logger_.info(`Setting node path to ${nodePath_}`);
    await utils.mkdirExists(fs_, nodePath_, { recursive: true });

    // Checking the state version
    // reading the contents of the file
    const versionFilePath = path.join(nodePath_, 'versionFile');
    let versionInfo;
    try {
      const versionFileContents = await fs_.promises.readFile(
        versionFilePath,
      );
      versionInfo = JSON.parse(versionFileContents.toString());
    } catch (err) {
      logger_.info(`Failed to open version file: ${err.message}`);
    }
    if (versionInfo != null) {
      // Checking state version
      if (versionInfo.stateVersion !== config.stateVersion) {
        throw new ErrorStateVersionMismatch(
          `The agent state version of ${config.stateVersion} does not match the keynode state version of ${versionInfo.stateVersion}`,
        );
      }
      // Checking version
      if (versionInfo.version !== config.version) {
        logger_.info(
          `The version of the Agent ${config.version} does not match the version of the keynode ${versionInfo.version}`,
        );
      }
    }
    // Writing current version info.
    await fs_.promises.writeFile(versionFilePath, JSON.stringify(config));

    const workers_ =
      workerManager ??
      (await WorkerManager.createPolykeyWorkerManager({
        cores,
        logger: logger_.getChild('WorkerManager'),
      }));
    const fwdProxy_ =
      fwdProxy ??
      (await ForwardProxy.createForwardProxy({
        authToken: authToken ?? ' ',
        logger: logger_,
      }));
    const revProxy_ =
      revProxy ??
      (await ReverseProxy.createReverseProxy({
        logger: logger_,
      }));
    const keys_ =
      keyManager ??
      (await KeyManager.createKeyManager({
        keysPath,
        password,
        rootKeyPairBits,
        rootCertDuration,
        dbKeyBits,
        fs: fs_,
        logger: logger_.getChild('KeyManager'),
        fresh,
      }));
    const db_ =
      db ??
      (await DB.createDB({
        dbPath: dbPath,
        fs: fs_,
        logger: logger_,
        crypto: {
          key: keys_.dbKey,
          ops: {
            encrypt: keyUtils.encryptWithKey,
            decrypt: keyUtils.decryptWithKey,
          },
        },
      }));
    db_.setWorkerManager(workers_);
    const sigchain_ =
      sigchain ??
      (await Sigchain.createSigchain({
        keyManager: keys_,
        db: db_,
        logger: logger_.getChild('Sigchain'),
        fresh,
      }));
    const acl_ =
      acl ??
      (await ACL.createACL({
        db: db_,
        logger: logger_.getChild('ACL'),
        fresh,
      }));
    const gestalts_ =
      gestaltGraph ??
      (await GestaltGraph.createGestaltGraph({
        db: db_,
        acl: acl_,
        logger: logger_.getChild('GestaltGraph'),
        fresh,
      }));
    const nodes_ =
      nodeManager ??
      (await NodeManager.createNodeManager({
        db: db_,
        sigchain: sigchain_,
        keyManager: keys_,
        fwdProxy: fwdProxy_,
        revProxy: revProxy_,
        fs: fs_,
        logger: logger_.getChild('NodeManager'),
      }));
    const vaults_ =
      vaultManager ??
      await VaultManager.createVaultManager({
        vaultsPath: vaultsPath,
        vaultsKey: keys_.vaultKey,
        nodeManager: nodes_,
        gestaltGraph: gestalts_,
        acl: acl_,
        db: db_,
        acl: acl_,
        gestaltGraph: gestalts_,
        fs: fs_,
        logger: logger_.getChild('VaultManager')
      });
    // vaults_.setWorkerManager(workers_); FIXME, need to be able to set this.
    const identities_ =
      identitiesManager ??
      (await IdentitiesManager.createIdentitiesManager({
        db: db_,
        logger: logger_.getChild('IdentitiesManager'),
        fresh,
      }));
    const discovery_ =
      discovery ??
      (await Discovery.createDiscovery({
        gestaltGraph: gestalts_,
        identitiesManager: identities_,
        nodeManager: nodes_,
        logger: logger_.getChild('Discovery'),
      }));
    const notifications_ =
      notificationsManager ??
      (await NotificationsManager.createNotificationsManager({
        acl: acl_,
        db: db_,
        nodeManager: nodes_,
        keyManager: keys_,
        logger: logger_.getChild('NotificationsManager'),
        fresh,
      }));

    const sessionManager = await SessionManager.createSessionManager({
      db: db_,
      logger: logger,
      bits: rootKeyPairBits ?? 4096,
    });

    const clientGrpcServer_ = await GRPCServer.createGRPCServer({
      logger: logger_.getChild('ClientServer'),
    });
    const agentGrpcServer_ = await GRPCServer.createGRPCServer({
      logger: logger_.getChild('AgentServer'),
    });

    return new Polykey({
      acl: acl_,
      agentGrpcHost: agentGrpcHost_,
      agentGrpcPort: agentGrpcPort_,
      clientGrpcHost: clientGrpcHost_,
      clientGrpcPort: clientGrpcPort_,
      db: db_,
      discovery: discovery_,
      fs: fs_,
      fwdProxy: fwdProxy_,
      gestaltGraph: gestalts_,
      identitiesManager: identities_,
      keyManager: keys_,
      logger: logger_,
      nodeManager: nodes_,
      nodePath: nodePath_,
      notificationsManager: notifications_,
      revProxy: revProxy_,
      sigchain: sigchain_,
      vaultManager: vaults_,
      workerManager: workers_,
      sessionManager: sessionManager,
      clientGrpcServer: clientGrpcServer_,
      agentGrpcServer: agentGrpcServer_,
    });
  }

  constructor({
    nodePath,
    keyManager,
    vaultManager,
    nodeManager,
    gestaltGraph,
    identitiesManager,
    sigchain,
    notificationsManager,
    acl,
    db,
    workerManager,
    clientGrpcHost,
    agentGrpcHost,
    clientGrpcPort,
    agentGrpcPort,
    fwdProxy,
    revProxy,
    fs,
    logger,
    discovery,
    sessionManager,
    clientGrpcServer,
    agentGrpcServer,
  }: {
    nodePath: string;
    keyManager: KeyManager;
    vaultManager: VaultManager;
    nodeManager: NodeManager;
    gestaltGraph: GestaltGraph;
    identitiesManager: IdentitiesManager;
    sigchain: Sigchain;
    notificationsManager: NotificationsManager;
    acl: ACL;
    db: DB;
    workerManager: WorkerManager;
    clientGrpcHost: string;
    agentGrpcHost: string;
    clientGrpcPort: number;
    agentGrpcPort: number;
    fwdProxy: ForwardProxy;
    revProxy: ReverseProxy;
    fs: FileSystem;
    logger: Logger;
    discovery: Discovery;
    sessionManager: SessionManager;
    clientGrpcServer: GRPCServer;
    agentGrpcServer: GRPCServer;
  }) {
    this.clientGrpcHost = clientGrpcHost;
    this.clientGrpcPort = clientGrpcPort;
    this.agentGrpcHost = agentGrpcHost;
    this.agentGrpcPort = agentGrpcPort;
    this.logger = logger;
    this.fs = fs;
    this.nodePath = path.resolve(nodePath ?? utils.getDefaultNodePath());

    this.fwdProxy = fwdProxy;
    this.revProxy = revProxy;

    this.lockfile = new Lockfile({
      nodePath: this.nodePath,
      fs: this.fs,
      logger: this.logger.getChild('Lockfile'),
    });
    this.keys = keyManager;
    this.db = db;
    this.sigchain = sigchain;
    this.acl = acl;
    this.gestalts = gestaltGraph;
    this.nodes = nodeManager;
    this.vaults = vaultManager;
    this.identities = identitiesManager;
    this.discovery = discovery;
    this.notifications = notificationsManager;
    this.workers = workerManager;
    this.sessions = sessionManager;

    // Create GRPC Servers (services will be injected on start)
    // Client server
    this.clientGrpcServer = clientGrpcServer;
    // Agent Server
    this.agentGrpcServer = agentGrpcServer;

    // Get GRPC Services
    this.clientService = createClientService({
      polykeyAgent: this,
      discovery: this.discovery,
      gestaltGraph: this.gestalts,
      identitiesManager: this.identities,
      keyManager: this.keys,
      nodeManager: this.nodes,
      notificationsManager: this.notifications,
      sessionManager: this.sessions,
      vaultManager: this.vaults,
      fwdProxy: this.fwdProxy,
      revProxy: this.revProxy,
      grpcServer: this.clientGrpcServer,
    });

    this.agentService = createAgentService({
      keyManager: this.keys,
      vaultManager: this.vaults,
      nodeManager: this.nodes,
      sigchain: this.sigchain,
      notificationsManager: this.notifications,
    });

    // Registering providers.
    const githubProvider = new GithubProvider({
      clientId: config.providers['github.com'].clientId,
      logger: this.logger.getChild('GithubProvider'),
    });
    this.identities.registerProvider(githubProvider);
  }

  /**
   * Asynchronously start the PolykeyAgent
   * @param options: password, bits, duration, fresh
   */
  public async start({ fresh = false }: { fresh?: boolean }) {
    this.logger.info('Starting Polykey');

    if (
      (await Lockfile.checkLock(
        this.fs,
        path.join(this.nodePath, 'agent-lock.json'),
      )) !== 'DOESNOTEXIST'
    ) {
      // Interrogate Lock File
      const lock = await Lockfile.parseLock(
        this.fs,
        path.join(this.nodePath, 'agent-lock.json'),
      );

      if (utils.pidIsRunning(lock.pid)) {
        this.logger.error(`PolykeyAgent already started at pid: ${lock.pid}`);
        throw new errors.ErrorPolykey(
          `PolykeyAgent already started at pid: ${lock.pid}`,
        );
      }
    }

    // Starting modules
    this.keys.setWorkerManager(this.workers);

    // Getting NodeId
    const cert = this.keys.getRootCert();
    const nodeId = certNodeId(cert);

    await this.db.start();

    await this.nodes.start({ fresh });

    const keyPrivatePem = this.keys.getRootKeyPairPem().privateKey;
    const certChainPem = await this.keys.getRootCertChainPem();

    // GRPC Server
    // Client server
    await this.clientGrpcServer.start({
      services: [[ClientService, this.clientService]],
      host: this.clientGrpcHost as Host,
      port: this.clientGrpcPort as Port,
      tlsConfig: {
        keyPrivatePem: keyPrivatePem,
        certChainPem: certChainPem,
      },
    });
    // Agent server
    await this.agentGrpcServer.start({
      services: [[AgentService, this.agentService]],
      host: this.agentGrpcHost as Host,
      port: this.agentGrpcPort as Port,
    });

    await this.fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPrivatePem,
        certChainPem: certChainPem,
      },
    });

    await this.revProxy.start({
      serverHost: this.agentGrpcHost as Host,
      serverPort: this.agentGrpcServer.getPort() as Port,
      tlsConfig: {
        keyPrivatePem: keyPrivatePem,
        certChainPem: certChainPem,
      },
    });

    await this.lockfile.start({ nodeId }); // TODO: start the lockfile when Polykey is created.
    await this.lockfile.updateLockfile('host', this.clientGrpcHost);
    await this.lockfile.updateLockfile('port', this.clientGrpcServer.getPort());
    await this.lockfile.updateLockfile(
      'fwdProxyHost',
      this.fwdProxy.getProxyHost(),
    );
    await this.lockfile.updateLockfile(
      'fwdProxyPort',
      this.fwdProxy.getProxyPort(),
    );

    this.logger.info('Started Polykey');
  }

  /**
   * Asynchronously stops the PolykeyAgent
   */
  public async stop() {
    this.logger.info('Stopping Polykey');

    this.logger.info(
      `Deleting lockfile from ${path.join(this.nodePath, 'agent-lock.json')}`,
    );
    await this.lockfile.stop(); // TODO: remove the lockfile when polykey is destroyed.
    await this.revProxy.stop();
    await this.nodes.stop();
    await this.fwdProxy.stop();
    await this.db.stop();

    this.keys.unsetWorkerManager();

    // Stop GRPC Server
    await this.clientGrpcServer.stop();
    await this.agentGrpcServer.stop();

    this.logger.info('Stopped Polykey');
  }

  public async destroy() {
    this.logger.info('Destroying Polykey');
    await this.vaults.destroy();
    await this.discovery.destroy();
    await this.agentGrpcServer.destroy();
    await this.clientGrpcServer.destroy();
    await this.revProxy.destroy();
    await this.discovery.destroy();
    await this.nodes.destroy();
    await this.gestalts.destroy();
    await this.notifications.destroy();
    await this.identities.destroy();
    await this.sigchain.destroy();
    await this.sessions.destroy();
    await this.acl.destroy();
    await this.workers.destroy();
    // Await this.db.destroy(); // don't actually destroy this. it removes files.
    await this.keys.destroy();
    this.logger.info('Destroyed Polykey');
  }
}

export default Polykey;
