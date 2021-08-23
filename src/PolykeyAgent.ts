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
  public readonly grpcServer: GRPCServer;
  public readonly grpcHost: string;
  public readonly grpcPort: number;

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
    sigchain,
    notificationsManager,
    acl,
    db,
    workerManager,
    grpcHost,
    grpcPort,
    fwdProxy,
    revProxy,
    authToken,
    fs,
    logger,
    discovery,
  }: {
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
    grpcHost?: string;
    grpcPort?: number;
    fwdProxy?: ForwardProxy;
    revProxy?: ReverseProxy;
    authToken?: string;
    fs?: FileSystem;
    logger?: Logger;
    discovery?: Discovery;
  } = {}) {
    this.grpcHost = grpcHost ?? '127.0.0.1';
    this.grpcPort = grpcPort ?? 0;
    this.logger = logger ?? new Logger('Polykey');
    this.fs = fs ?? require('fs');
    this.nodePath = path.resolve(nodePath ?? utils.getDefaultNodePath());
    const keysPath = path.join(this.nodePath, 'keys');
    const vaultsPath = path.join(this.nodePath, 'vaults');
    const dbPath = path.join(this.nodePath, 'db');

    this.fwdProxy =
      fwdProxy ??
      new ForwardProxy({
        authToken: authToken ?? ' ',
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
    this.db =
      db ??
      new DB({
        dbPath: dbPath,
        fs: this.fs,
        logger: this.logger,
      });
    this.sigchain =
      sigchain ??
      new Sigchain({
        keyManager: this.keys,
        db: this.db,
        logger: this.logger.getChild('Sigchain'),
      });
    this.acl =
      acl ??
      new ACL({
        db: this.db,
        logger: this.logger.getChild('ACL'),
      });
    this.gestalts =
      gestaltGraph ??
      new GestaltGraph({
        db: this.db,
        acl: this.acl,
        logger: this.logger.getChild('GestaltGraph'),
      });
    this.nodes =
      nodeManager ??
      new NodeManager({
        db: this.db,
        sigchain: this.sigchain,
        keyManager: this.keys,
        fwdProxy: this.fwdProxy,
        revProxy: this.revProxy,
        fs: this.fs,
        logger: this.logger.getChild('NodeManager'),
      });
    this.vaults =
      vaultManager ??
      new VaultManager({
        vaultsPath: vaultsPath,
        keyManager: this.keys,
        nodeManager: this.nodes,
        db: this.db,
        acl: this.acl,
        gestaltGraph: this.gestalts,
        fs: this.fs,
        logger: this.logger.getChild('VaultManager'),
      });
    this.identities =
      identitiesManager ??
      new IdentitiesManager({
        db: this.db,
        logger: this.logger.getChild('IdentitiesManager'),
      });
    this.discovery =
      discovery ??
      new Discovery({
        gestaltGraph: this.gestalts,
        identitiesManager: this.identities,
        nodeManager: this.nodes,
        logger: this.logger.getChild('Discovery'),
      });
    this.notifications =
      notificationsManager ??
      new NotificationsManager({
        acl: this.acl,
        db: this.db,
        nodeManager: this.nodes,
        keyManager: this.keys,
        logger: this.logger.getChild('NotificationsManager'),
      });
    this.workers =
      workerManager ??
      new WorkerManager({
        logger: this.logger.getChild('WorkerManager'),
      });
    this.sessions = new SessionManager({
      db: this.db,
      logger: logger,
    });

    // Get GRPC Services
    const clientService: IClientServer = createClientService({
      polykeyAgent: this,
      discovery: this.discovery,
      gestaltGraph: this.gestalts,
      identitiesManager: this.identities,
      keyManager: this.keys,
      nodeManager: this.nodes,
      notificationsManager: this.notifications,
      sessionManager: this.sessions,
      vaultManager: this.vaults,
    });

    const agentService: IAgentServer = createAgentService({
      vaultManager: this.vaults,
      nodeManager: this.nodes,
      sigchain: this.sigchain,
      notificationsManager: this.notifications,
    });

    // Create GRPC Server with the services just created.
    this.grpcServer = new GRPCServer({
      services: [
        [ClientService, clientService],
        [AgentService, agentService],
      ],
      logger: this.logger,
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
    password,
    rootKeyPairBits,
    rootCertDuration,
    fresh = false,
  }: {
    password: string;
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

    await this.workers.start();
    this.keys.setWorkerManager(this.workers);
    await this.keys.start({
      password,
      rootKeyPairBits,
      rootCertDuration,
      fresh,
    });

    // Getting NodeId
    const cert = this.keys.getRootCert();
    const nodeId = certNodeId(cert);

    await this.db.start({
      keyPair: this.keys.getRootKeyPair(),
      bits: rootKeyPairBits,
    });

    await this.acl.start({ fresh });

    await this.sigchain.start({ fresh });
    await this.nodes.start({ nodeId, fresh });
    await this.gestalts.start({ fresh });
    await this.vaults.start({ fresh });
    await this.identities.start({ fresh });
    await this.notifications.start({ fresh });

    const keyPrivatePem = this.keys.getRootKeyPairPem().privateKey;
    const certChainPem = await this.keys.getRootCertChainPem();

    await this.discovery.start();

    // GRPC Server
    await this.grpcServer.start({
      host: this.grpcHost as Host,
      port: this.grpcPort as Port,
    });

    await this.fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPrivatePem,
        certChainPem: certChainPem,
      },
    });

    await this.revProxy.start({
      serverHost: this.grpcHost as Host,
      serverPort: this.grpcServer.getPort() as Port,
      tlsConfig: {
        keyPrivatePem: keyPrivatePem,
        certChainPem: certChainPem,
      },
    });

    await this.lockfile.start({ nodeId });
    await this.lockfile.updateLockfile('host', this.grpcHost);
    await this.lockfile.updateLockfile('port', this.grpcServer.getPort());
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
    await this.grpcServer.stop();

    this.logger.info('Stopped Polykey');
  }

  public async destroy() {
    return;
  }
}

export default Polykey;
