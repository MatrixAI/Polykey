import type { FileSystem } from './types';
import type { Host, Port } from './network/types';

import path from 'path';
import process from 'process';
import Logger from '@matrixai/logger';
import * as utils from './utils';
import * as errors from './errors';
import { KeyManager } from './keys';
import { GRPCServer } from './grpc';
import { Lockfile } from './lockfile';
import { NodeManager } from './nodes';
import { VaultManager } from './vaults';
import { GestaltGraph } from './gestalts';
import { NotificationsManager } from './notifications';
import { Sigchain } from './sigchain';
import { ACL } from './acl';
import { DB } from './db';
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

  public async createPolykeyAgent({
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

    const fwdProxy_ =
      fwdProxy ??
      new ForwardProxy({
        authToken: authToken ?? ' ',
        logger: logger_,
      });
    const revProxy_ =
      revProxy ??
      new ReverseProxy({
        logger: logger_,
      });

    const keys_ =
      keyManager ??
      await KeyManager.createKeyManager({
        keysPath,
        fs: fs,
        logger: logger_.getChild('KeyManager'),
        password,
      });
    const dbKey = keys_.getRootKeyPair()
    const db_ =
      db ??
      await DB.createDB({
        dbPath: dbPath,
        fs: fs_,
        logger: logger_,
        dbKey,
      });
    const sigchain_ =
      sigchain ??
      new Sigchain({
        keyManager: keys_,
        db: db_,
        logger: logger_.getChild('Sigchain'),
      });
    const acl_ =
      acl ??
      new ACL({
        db: db_,
        logger: logger_.getChild('ACL'),
      });
    const gestalts_ =
      gestaltGraph ??
      new GestaltGraph({
        db: db_,
        acl: acl_,
        logger: logger_.getChild('GestaltGraph'),
      });
    const nodes_ =
      nodeManager ??
      new NodeManager({
        db: db_,
        sigchain: sigchain_,
        keyManager: keys_,
        fwdProxy: fwdProxy_,
        revProxy: revProxy_,
        fs: fs_,
        logger: logger_.getChild('NodeManager'),
      });
    const vaults_ =
      vaultManager ??
      new VaultManager({
        vaultsPath: vaultsPath,
        keyManager: keys_,
        nodeManager: nodes_,
        db: db_,
        acl: acl_,
        gestaltGraph: gestalts_,
        fs: fs_,
        logger: logger_.getChild('VaultManager'),
      });
    const identities_ =
      identitiesManager ??
      new IdentitiesManager({
        db: db_,
        logger: logger_.getChild('IdentitiesManager'),
      });
    const discovery_ =
      discovery ??
      new Discovery({
        gestaltGraph: gestalts_,
        identitiesManager: identities_,
        nodeManager: nodes_,
        logger: logger_.getChild('Discovery'),
      });
    const notifications_ =
      notificationsManager ??
      new NotificationsManager({
        acl: acl_,
        db: db_,
        nodeManager: nodes_,
        keyManager: keys_,
        logger: logger_.getChild('NotificationsManager'),
      });
    const workers_ =
      workerManager ??
      new WorkerManager({
        logger: logger_.getChild('WorkerManager'),
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
      workerManager: workers_
    });

    // Starting the agent.
    // await polykeyAgent_.start();
  }

  protected constructor({
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
  }) {
    this.clientGrpcHost = clientGrpcHost;
    this.clientGrpcPort = clientGrpcPort;
    this.agentGrpcHost = agentGrpcHost;
    this.agentGrpcPort = agentGrpcPort;
    this.logger = logger;
    this.fs = fs;
    this.nodePath = nodePath;

    this.fwdProxy = fwdProxy;
    this.revProxy = revProxy;

    this.lockfile = new Lockfile({
      nodePath: this.nodePath,
      fs: this.fs,
      logger: this.logger.getChild('Lockfile'),
    });
    this.keys = keyManager;
    this.db = db;
    this.sigchain = sigchain ;
    this.acl = acl;
    this.gestalts = gestaltGraph;
    this.nodes = nodeManager;
    this.vaults = vaultManager;
    this.identities = identitiesManager;
    this.discovery = discovery;
    this.notifications = notificationsManager;
    this.workers = workerManager;
    this.sessions = new SessionManager({
      db: this.db,
      logger: logger,
    });

    // Create GRPC Servers (services will be injected on start)
    // Client server
    this.clientGrpcServer = new GRPCServer({
      logger: this.logger.getChild('ClientServer'),
    });
    // Agent Server
    this.agentGrpcServer = new GRPCServer({
      logger: this.logger.getChild('AgentServer'),
    });

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
  public async start({
    // password,
    rootKeyPairBits,
    rootCertDuration,
    fresh = false,
  }: {
    // password: string;
    rootKeyPairBits?: number;
    rootCertDuration?: number;
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

    // checking the state version
    // reading the contents of the file
    const versionFilePath = path.join(this.nodePath, 'versionFile');
    let versionInfo;
    try {
      const versionFileContents = await this.fs.promises.readFile(
        versionFilePath,
      );
      versionInfo = JSON.parse(versionFileContents.toString());
    } catch (err) {
      this.logger.info(`Failed to open version file: ${err.message}`);
    }
    if (versionInfo != null) {
      // checking state version
      if (versionInfo.stateVersion !== config.stateVersion) {
        throw new ErrorStateVersionMismatch(
          `The agent state version of ${config.stateVersion} does not match the keynode state version of ${versionInfo.stateVersion}`,
        );
      }
      // checking version
      if (versionInfo.version !== config.version) {
        this.logger.info(
          `The version of the Agent ${config.version} does not match the version of the keynode ${versionInfo.version}`,
        );
      }
    }
    // writing current version info.
    await this.fs.promises.writeFile(versionFilePath, JSON.stringify(config));

    // starting modules
    await this.workers.start();
    this.keys.setWorkerManager(this.workers);
    // await this.keys.start({
    //   password,
    //   rootKeyPairBits,
    //   rootCertDuration,
    //   fresh,
    // });

    // Getting NodeId
    const cert = this.keys.getRootCert();
    const nodeId = certNodeId(cert);

    // await this.db.start({
    //   keyPair: this.keys.getRootKeyPair(),
    //   bits: rootKeyPairBits,
    // });

    await this.acl.start({ fresh });

    await this.sigchain.start({ fresh });
    await this.nodes.start({ fresh });
    await this.gestalts.start({ fresh });
    await this.vaults.start({ fresh });
    await this.identities.start({ fresh });
    await this.notifications.start({ fresh });

    const keyPrivatePem = this.keys.getRootKeyPairPem().privateKey;
    const certChainPem = await this.keys.getRootCertChainPem();

    await this.discovery.start();

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

    await this.lockfile.start({ nodeId });
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

    await this.sessions.start({
      bits: rootKeyPairBits ?? 4096,
    });

    this.logger.info('Started Polykey');
  }

  /**
   * Asynchronously stops the PolykeyAgent
   */
  public async stop() {
    this.logger.info('Stopping Polykey');

    await this.sessions.stop();

    this.logger.info(
      `Deleting lockfile from ${path.join(this.nodePath, 'agent-lock.json')}`,
    );
    await this.lockfile.stop();

    await this.revProxy.stop();

    await this.discovery.stop();

    await this.notifications.stop();

    await this.identities.stop();

    await this.vaults.stop();
    await this.gestalts.stop();
    await this.nodes.stop();
    await this.sigchain.stop();

    await this.fwdProxy.stop();

    await this.db.stop();

    await this.keys.stop();
    this.keys.unsetWorkerManager();
    await this.workers.stop();

    // Stop GRPC Server
    await this.clientGrpcServer.stop();
    await this.agentGrpcServer.stop();

    this.logger.info('Stopped Polykey');
  }

  public async destroy() {
    return;
  }
}

export default Polykey;
