import type { FileSystem } from './types';
import type { PolykeyWorkerManagerInterface } from './workers/types';
import type { Host, Port } from './network/types';

import path from 'path';
import process from 'process';
import Logger from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { CreateDestroyStartStop } from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { KeyManager, utils as keysUtils } from './keys';
import { Status } from './status';
import { Schema } from './schema';
import { VaultManager } from './vaults';
import { ACL } from './acl';
import { NodeManager } from './nodes';
import { NotificationsManager } from './notifications';
import { GestaltGraph } from './gestalts';
import { Sigchain } from './sigchain';
import { Discovery } from './discovery';
import { SessionManager } from './sessions';
import { GRPCServer } from './grpc';
import { IdentitiesManager, providers } from './identities';
import { ForwardProxy, ReverseProxy } from './network';
import { createAgentService, AgentServiceService } from './agent';
import { createClientService, ClientServiceService } from './client';
import config from './config';
import * as utils from './utils';
import * as errors from './errors';

type NetworkConfig = {
  proxyHost?: Host;
  proxyPort?: Port;
  egressHost?: Host;
  egressPort?: Port;
  // ReverseProxy
  ingressHost?: Host;
  ingressPort?: Port;
  // GRPCServer for agent service
  agentHost?: Host;
  agentPort?: Port;
  // GRPCServer for client service
  clientHost?: Host;
  clientPort?: Port;
};

interface PolykeyAgent extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new errors.ErrorPolykeyAgentRunning(),
  new errors.ErrorPolykeyAgentDestroyed(),
)
class PolykeyAgent {
  public static async createPolykeyAgent({
    // Required parameters
    nodePath,
    password,
    // Optional configuration
    keysConfig = {},
    networkConfig = {},
    forwardProxyConfig = {},
    reverseProxyConfig = {},
    // Optional dependencies
    schema,
    keyManager,
    db,
    identitiesManager,
    sigchain,
    acl,
    gestaltGraph,
    fwdProxy,
    revProxy,
    nodeManager,
    discovery,
    vaultManager,
    notificationsManager,
    sessionManager,
    grpcServerClient,
    grpcServerAgent,
    fs = require('fs'),
    logger = new Logger(this.name),
    fresh = false,
  }: {
    nodePath: string;
    password: string;
    keysConfig?: {
      rootKeyPairBits?: number;
      rootCertDuration?: number;
      dbKeyBits?: number;
    };
    forwardProxyConfig?: {
      authToken?: string;
      connConnectTime?: number;
      connTimeoutTime?: number;
      connPingIntervalTime?: number;
    };
    reverseProxyConfig?: {
      connConnectTime?: number;
      connTimeoutTime?: number;
    };
    networkConfig?: NetworkConfig;
    schema?: Schema;
    keyManager?: KeyManager;
    db?: DB;
    identitiesManager?: IdentitiesManager;
    sigchain?: Sigchain;
    acl?: ACL;
    gestaltGraph?: GestaltGraph;
    fwdProxy?: ForwardProxy;
    revProxy?: ReverseProxy;
    nodeManager?: NodeManager;
    discovery?: Discovery;
    vaultManager?: VaultManager;
    notificationsManager?: NotificationsManager;
    sessionManager?: SessionManager;
    grpcServerClient?: GRPCServer;
    grpcServerAgent?: GRPCServer;
    fs?: FileSystem;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<PolykeyAgent> {
    logger.info(`Creating ${this.name}`);
    const umask = 0o077;
    logger.info(`Setting umask to ${umask.toString(8).padStart(3, '0')}`);
    process.umask(umask);
    logger.info(`Setting node path to ${nodePath}`);
    const keysConfig_ = {
      rootKeyPairBits: 4096,
      rootCertDuration: 31536000,
      dbKeyBits: 256,
      ...utils.filterEmptyObject(keysConfig),
    };
    const forwardProxyConfig_ = {
      authToken: (await keysUtils.getRandomBytes(10)).toString(),
      connConnectTime: 20000,
      connTimeoutTime: 20000,
      connPingIntervalTime: 1000,
      ...utils.filterEmptyObject(forwardProxyConfig),
    };
    const reverseProxyConfig_ = {
      connConnectTime: 20000,
      connTimeoutTime: 20000,
      ...utils.filterEmptyObject(reverseProxyConfig),
    };
    const networkConfig_ = {
      // ForwardProxy
      proxyHost: '127.0.0.1' as Host,
      proxyPort: 0 as Port,
      egressHost: '0.0.0.0' as Host,
      egressPort: 0 as Port,
      // ReverseProxy
      ingressHost: '0.0.0.0' as Host,
      ingressPort: 0 as Port,
      // GRPCServer for agent service
      agentHost: '127.0.0.1' as Host,
      agentPort: 0 as Port,
      // GRPCServer for client service
      clientHost: '127.0.0.1' as Host,
      clientPort: 0 as Port,
      ...networkConfig,
    };

    await utils.mkdirExists(fs, nodePath);
    const statePath = path.join(nodePath, 'state');
    const dbPath = path.join(statePath, 'db');
    const keysPath = path.join(statePath, 'keys');
    const vaultsPath = path.join(statePath, 'vaults');

    const status = await Status.createStatus({
      nodePath: nodePath,
      fs: fs,
      logger: logger.getChild('Lockfile'),
    });
    await status.start();

    schema =
      schema ??
      (await Schema.createSchema({
        statePath,
        fs,
        logger: logger.getChild(Schema.name),
        fresh,
      }));

    keyManager =
      keyManager ??
      (await KeyManager.createKeyManager({
        ...keysConfig_,
        keysPath,
        password,
        fs,
        logger: logger.getChild(KeyManager.name),
        fresh,
      }));
    await status.updateStatus('nodeId', keyManager.getNodeId());

    db =
      db ??
      (await DB.createDB({
        dbPath,
        crypto: {
          key: keyManager.dbKey,
          ops: {
            encrypt: keysUtils.encryptWithKey,
            decrypt: keysUtils.decryptWithKey,
          },
        },
        fs,
        logger: logger.getChild(DB.name),
        fresh,
      }));

    identitiesManager =
      identitiesManager ??
      (await IdentitiesManager.createIdentitiesManager({
        db,
        logger: logger.getChild(IdentitiesManager.name),
        fresh,
      }));

    // Registering providers
    const githubProvider = new providers.GithubProvider({
      clientId: config.providers['github.com'].clientId,
      logger: logger.getChild(providers.GithubProvider.name),
    });
    identitiesManager.registerProvider(githubProvider);

    sigchain =
      sigchain ??
      (await Sigchain.createSigchain({
        keyManager,
        db,
        logger: logger.getChild(Sigchain.name),
        fresh,
      }));

    acl =
      acl ??
      (await ACL.createACL({
        db,
        logger: logger.getChild(ACL.name),
        fresh,
      }));

    gestaltGraph =
      gestaltGraph ??
      (await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger: logger.getChild(GestaltGraph.name),
        fresh,
      }));

    fwdProxy =
      fwdProxy ??
      new ForwardProxy({
        ...forwardProxyConfig_,
        logger: logger.getChild(ForwardProxy.name),
      });

    revProxy =
      revProxy ??
      new ReverseProxy({
        ...reverseProxyConfig_,
        logger: logger.getChild(ReverseProxy.name),
      });

    nodeManager =
      nodeManager ??
      (await NodeManager.createNodeManager({
        db,
        sigchain,
        keyManager,
        fwdProxy,
        revProxy,
        logger: logger.getChild(NodeManager.name),
        fresh,
      }));

    discovery =
      discovery ??
      (await Discovery.createDiscovery({
        gestaltGraph,
        identitiesManager,
        nodeManager,
        logger: logger.getChild(Discovery.name),
      }));

    vaultManager =
      vaultManager ??
      (await VaultManager.createVaultManager({
        vaultsKey: keyManager.vaultKey,
        vaultsPath,
        keyManager,
        nodeManager,
        gestaltGraph,
        acl,
        db,
        fs,
        logger: logger.getChild(VaultManager.name),
        fresh,
      }));

    notificationsManager =
      notificationsManager ??
      (await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        keyManager,
        logger: logger.getChild(NotificationsManager.name),
        fresh,
      }));

    sessionManager =
      sessionManager ??
      (await SessionManager.createSessionManager({
        db,
        keyManager,
        logger: logger.getChild(SessionManager.name),
      }));

    grpcServerClient =
      grpcServerClient ??
      new GRPCServer({
        logger: logger.getChild(GRPCServer.name + 'Client'),
      });

    grpcServerAgent =
      grpcServerAgent ??
      new GRPCServer({
        logger: logger.getChild(GRPCServer.name + 'Agent'),
      });

    const polykeyAgent = new PolykeyAgent({
      nodePath,
      status,
      schema,
      keyManager,
      db,
      identitiesManager,
      sigchain,
      acl,
      gestaltGraph,
      fwdProxy,
      revProxy,
      nodeManager,
      discovery,
      vaultManager,
      notificationsManager,
      sessionManager,
      grpcServerAgent,
      grpcServerClient,
      fs,
      logger,
    });

    await polykeyAgent.start({
      password,
      fresh,
      networkConfig: networkConfig_,
    });
    // Finished the start process.
    logger.info(`Created ${this.name}`);
    return polykeyAgent;
  }

  public readonly nodePath: string;
  public readonly status: Status;
  public readonly schema: Schema;
  public readonly keyManager: KeyManager;
  public readonly db: DB;
  public readonly identitiesManager: IdentitiesManager;
  public readonly sigchain: Sigchain;
  public readonly acl: ACL;
  public readonly gestaltGraph: GestaltGraph;
  public readonly fwdProxy: ForwardProxy;
  public readonly revProxy: ReverseProxy;
  public readonly nodeManager: NodeManager;
  public readonly discovery: Discovery;
  public readonly vaultManager: VaultManager;
  public readonly notificationsManager: NotificationsManager;
  public readonly sessionManager: SessionManager;
  public readonly grpcServerAgent: GRPCServer;
  public readonly grpcServerClient: GRPCServer;

  protected fs: FileSystem;
  protected logger: Logger;

  constructor({
    nodePath,
    status,
    schema,
    keyManager,
    db,
    identitiesManager,
    sigchain,
    acl,
    gestaltGraph,
    fwdProxy,
    revProxy,
    nodeManager,
    discovery,
    vaultManager,
    notificationsManager,
    sessionManager,
    grpcServerClient,
    grpcServerAgent,
    fs,
    logger,
  }: {
    nodePath: string;
    status: Status;
    schema: Schema;
    keyManager: KeyManager;
    db: DB;
    identitiesManager: IdentitiesManager;
    sigchain: Sigchain;
    acl: ACL;
    gestaltGraph: GestaltGraph;
    fwdProxy: ForwardProxy;
    revProxy: ReverseProxy;
    nodeManager: NodeManager;
    discovery: Discovery;
    vaultManager: VaultManager;
    notificationsManager: NotificationsManager;
    sessionManager: SessionManager;
    grpcServerClient: GRPCServer;
    grpcServerAgent: GRPCServer;
    fs: FileSystem;
    logger: Logger;
  }) {
    this.logger = logger;
    this.nodePath = nodePath;
    this.status = status;
    this.schema = schema;
    this.keyManager = keyManager;
    this.db = db;
    this.identitiesManager = identitiesManager;
    this.sigchain = sigchain;
    this.acl = acl;
    this.gestaltGraph = gestaltGraph;
    this.fwdProxy = fwdProxy;
    this.revProxy = revProxy;
    this.nodeManager = nodeManager;
    this.discovery = discovery;
    this.vaultManager = vaultManager;
    this.notificationsManager = notificationsManager;
    this.sessionManager = sessionManager;
    this.grpcServerClient = grpcServerClient;
    this.grpcServerAgent = grpcServerAgent;
    this.fs = fs;
  }

  public async start({
    password,
    networkConfig = {},
    fresh = false,
  }: {
    password: string;
    networkConfig?: NetworkConfig;
    fresh?: boolean;
  }) {
    const networkConfig_ = {
      // ForwardProxy
      proxyHost: '127.0.0.1' as Host,
      proxyPort: 0 as Port,
      egressHost: '0.0.0.0' as Host,
      egressPort: 0 as Port,
      // ReverseProxy
      ingressHost: '0.0.0.0' as Host,
      ingressPort: 0 as Port,
      // GRPCServer for agent service
      agentHost: '127.0.0.1' as Host,
      agentPort: 0 as Port,
      // GRPCServer for client service
      clientHost: '127.0.0.1' as Host,
      clientPort: 0 as Port,
      ...networkConfig,
    };

    this.logger.info(`Starting ${this.constructor.name}`);
    await this.status.start();
    await this.schema.start({ fresh });

    const agentService = createAgentService({
      keyManager: this.keyManager,
      vaultManager: this.vaultManager,
      nodeManager: this.nodeManager,
      sigchain: this.sigchain,
      notificationsManager: this.notificationsManager,
    });

    const clientService = createClientService({
      polykeyAgent: this,
      discovery: this.discovery,
      gestaltGraph: this.gestaltGraph,
      identitiesManager: this.identitiesManager,
      keyManager: this.keyManager,
      nodeManager: this.nodeManager,
      notificationsManager: this.notificationsManager,
      sessionManager: this.sessionManager,
      vaultManager: this.vaultManager,
      fwdProxy: this.fwdProxy,
      revProxy: this.revProxy,
      clientGrpcServer: this.grpcServerClient,
    });

    // Starting modules
    await this.keyManager.start({
      password,
      fresh,
    });
    await this.db.start({ fresh });
    await this.identitiesManager.start({ fresh });
    await this.sigchain.start({ fresh });
    await this.acl.start({ fresh });
    await this.gestaltGraph.start({ fresh });

    // GRPC Server
    const tlsConfig = {
      keyPrivatePem: this.keyManager.getRootKeyPairPem().privateKey,
      certChainPem: await this.keyManager.getRootCertChainPem(),
    };

    // Client server
    await this.grpcServerClient.start({
      services: [[ClientServiceService, clientService]],
      host: networkConfig_.clientHost,
      port: networkConfig_.clientPort,
      tlsConfig,
    });
    // Agent server
    await this.grpcServerAgent.start({
      services: [[AgentServiceService, agentService]],
      host: networkConfig_.agentHost,
      port: networkConfig_.agentPort,
    });
    await this.fwdProxy.start({
      proxyHost: networkConfig_.proxyHost,
      proxyPort: networkConfig_.proxyPort,
      egressHost: networkConfig_.egressHost,
      egressPort: networkConfig_.egressPort,
      tlsConfig,
    });
    await this.revProxy.start({
      serverHost: this.grpcServerAgent.host,
      serverPort: this.grpcServerAgent.port,
      ingressHost: networkConfig_.ingressHost,
      ingressPort: networkConfig_.ingressPort,
      tlsConfig,
    });

    await this.nodeManager.start({ fresh });
    await this.vaultManager.start({ fresh });
    await this.notificationsManager.start({ fresh });
    await this.sessionManager.start({ fresh });

    await this.status.updateStatus('host', this.grpcServerClient.host);
    await this.status.updateStatus('port', this.grpcServerClient.port);
    await this.status.updateStatus('ingressHost', this.revProxy.ingressHost);
    await this.status.updateStatus('ingressPort', this.revProxy.ingressPort);
    await this.status.updateStatus('fwdProxyHost', this.fwdProxy.proxyHost);
    await this.status.updateStatus('fwdProxyPort', this.fwdProxy.proxyPort);
    await this.status.finishStart();

    this.logger.info(`Started ${this.constructor.name}`);
  }

  /**
   * Asynchronously stops the PolykeyAgent
   */
  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    await this.status.beginStop();
    await this.sessionManager.stop();
    await this.notificationsManager.stop();
    await this.vaultManager.stop();
    await this.nodeManager.stop();
    await this.revProxy.stop();
    await this.fwdProxy.stop();
    await this.grpcServerAgent.stop();
    await this.grpcServerClient.stop();
    await this.gestaltGraph.stop();
    await this.acl.stop();
    await this.sigchain.stop();
    await this.identitiesManager.stop();
    await this.db.stop();
    await this.keyManager.stop();
    await this.schema.stop();
    await this.status.stop();
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    // DB needs to be running for dependent domains to properly clear state.
    await this.db.start();
    await this.sessionManager.destroy();
    await this.notificationsManager.destroy();
    await this.discovery.destroy();
    await this.vaultManager.destroy();
    await this.nodeManager.destroy();
    await this.gestaltGraph.destroy();
    await this.acl.destroy();
    await this.sigchain.destroy();
    await this.identitiesManager.destroy();
    await this.db.stop();
    // Non-DB dependencies
    await this.db.destroy();
    await this.keyManager.destroy();
    await this.schema.destroy();
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  public setWorkerManager(workerManager: PolykeyWorkerManagerInterface) {
    this.db.setWorkerManager(workerManager);
    this.keyManager.setWorkerManager(workerManager);
    this.vaultManager.setWorkerManager(workerManager);
  }

  public unsetWorkerManager() {
    this.db.unsetWorkerManager();
    this.keyManager.unsetWorkerManager();
    this.vaultManager.unsetWorkerManager();
  }
}

export default PolykeyAgent;
