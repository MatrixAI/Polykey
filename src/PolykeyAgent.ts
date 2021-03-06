import type { FileSystem } from './types';
import type { PolykeyWorkerManagerInterface } from './workers/types';
import type { ConnectionData, Host, Port } from './network/types';
import type { SeedNodes } from './nodes/types';
import type { KeyManagerChangeData } from './keys/types';
import path from 'path';
import process from 'process';
import Logger from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { CreateDestroyStartStop } from '@matrixai/async-init/dist/CreateDestroyStartStop';
import Queue from './nodes/Queue';
import * as networkUtils from './network/utils';
import KeyManager from './keys/KeyManager';
import Status from './status/Status';
import Schema from './schema/Schema';
import VaultManager from './vaults/VaultManager';
import ACL from './acl/ACL';
import NodeManager from './nodes/NodeManager';
import NodeGraph from './nodes/NodeGraph';
import NodeConnectionManager from './nodes/NodeConnectionManager';
import NotificationsManager from './notifications/NotificationsManager';
import GestaltGraph from './gestalts/GestaltGraph';
import Sigchain from './sigchain/Sigchain';
import Discovery from './discovery/Discovery';
import SessionManager from './sessions/SessionManager';
import GRPCServer from './grpc/GRPCServer';
import IdentitiesManager from './identities/IdentitiesManager';
import { providers } from './identities';
import Proxy from './network/Proxy';
import { EventBus, captureRejectionSymbol } from './events';
import createAgentService, { AgentServiceService } from './agent/service';
import createClientService, { ClientServiceService } from './client/service';
import config from './config';
import * as errors from './errors';
import * as utils from './utils';
import * as keysUtils from './keys/utils';
import * as nodesUtils from './nodes/utils';

type NetworkConfig = {
  forwardHost?: Host;
  forwardPort?: Port;
  proxyHost?: Host;
  proxyPort?: Port;
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
  /**
   * Event symbols
   * These represent event topics
   */
  public static readonly eventSymbols = {
    [KeyManager.name]: Symbol(KeyManager.name),
    [Proxy.name]: Symbol(Proxy.name),
  } as {
    readonly KeyManager: unique symbol;
    readonly Proxy: unique symbol;
  };

  public static async createPolykeyAgent({
    // Required parameters
    password,
    // Optional configuration
    nodePath = config.defaults.nodePath,
    keysConfig = {},
    networkConfig = {},
    proxyConfig = {},
    nodeConnectionManagerConfig = {},
    seedNodes = {},
    // Optional dependencies
    status,
    schema,
    keyManager,
    db,
    identitiesManager,
    sigchain,
    acl,
    gestaltGraph,
    proxy,
    nodeGraph,
    queue,
    nodeConnectionManager,
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
    password: string;
    nodePath?: string;
    keysConfig?: {
      rootKeyPairBits?: number;
      rootCertDuration?: number;
      dbKeyBits?: number;
      recoveryCode?: string;
    };
    proxyConfig?: {
      authToken?: string;
      connConnectTime?: number;
      connKeepAliveTimeoutTime?: number;
      connEndTime?: number;
      connPunchIntervalTime?: number;
      connKeepAliveIntervalTime?: number;
    };
    nodeConnectionManagerConfig?: {
      connConnectTime?: number;
      connTimeoutTime?: number;
      initialClosestNodes?: number;
    };
    networkConfig?: NetworkConfig;
    seedNodes?: SeedNodes;
    status?: Status;
    schema?: Schema;
    keyManager?: KeyManager;
    db?: DB;
    identitiesManager?: IdentitiesManager;
    sigchain?: Sigchain;
    acl?: ACL;
    gestaltGraph?: GestaltGraph;
    proxy?: Proxy;
    nodeGraph?: NodeGraph;
    queue?: Queue;
    nodeConnectionManager?: NodeConnectionManager;
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
    if (nodePath == null) {
      throw new errors.ErrorUtilsNodePath();
    }
    logger.info(`Setting node path to ${nodePath}`);
    const keysConfig_ = {
      ...config.defaults.keysConfig,
      ...utils.filterEmptyObject(keysConfig),
    };
    const proxyConfig_ = {
      authToken: (await keysUtils.getRandomBytes(10)).toString(),
      ...config.defaults.proxyConfig,
      ...utils.filterEmptyObject(proxyConfig),
    };
    const nodeConnectionManagerConfig_ = {
      ...config.defaults.nodeConnectionManagerConfig,
      ...utils.filterEmptyObject(nodeConnectionManagerConfig),
    };
    await utils.mkdirExists(fs, nodePath);
    const statusPath = path.join(nodePath, config.defaults.statusBase);
    const statusLockPath = path.join(nodePath, config.defaults.statusLockBase);
    const statePath = path.join(nodePath, config.defaults.stateBase);
    const dbPath = path.join(statePath, config.defaults.dbBase);
    const keysPath = path.join(statePath, config.defaults.keysBase);
    const vaultsPath = path.join(statePath, config.defaults.vaultsBase);
    const events = new EventBus({
      captureRejections: true,
    });
    try {
      status =
        status ??
        new Status({
          statusPath,
          statusLockPath,
          fs: fs,
          logger: logger.getChild(Status.name),
        });
      // Start locking the status
      await status.start({ pid: process.pid });
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
          changeCallback: (data) =>
            events.emitAsync(PolykeyAgent.eventSymbols.KeyManager, data),
          logger: logger.getChild(KeyManager.name),
          fresh,
        }));
      // Remove your own node ID if provided as a seed node
      const nodeIdOwn = keyManager.getNodeId();
      const nodeIdEncodedOwn = Object.keys(seedNodes).find((nodeIdEncoded) => {
        return nodeIdOwn.equals(nodesUtils.decodeNodeId(nodeIdEncoded)!);
      });
      if (nodeIdEncodedOwn != null) {
        delete seedNodes[nodeIdEncodedOwn];
      }
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
      proxy =
        proxy ??
        new Proxy({
          ...proxyConfig_,
          connectionEstablishedCallback: (data) =>
            events.emitAsync(PolykeyAgent.eventSymbols.Proxy, data),
          logger: logger.getChild(Proxy.name),
        });
      nodeGraph =
        nodeGraph ??
        (await NodeGraph.createNodeGraph({
          db,
          fresh,
          keyManager,
          logger: logger.getChild(NodeGraph.name),
        }));
      queue =
        queue ??
        new Queue({
          logger: logger.getChild(Queue.name),
        });
      nodeConnectionManager =
        nodeConnectionManager ??
        new NodeConnectionManager({
          keyManager,
          nodeGraph,
          proxy,
          queue,
          seedNodes,
          ...nodeConnectionManagerConfig_,
          logger: logger.getChild(NodeConnectionManager.name),
        });
      nodeManager =
        nodeManager ??
        new NodeManager({
          db,
          sigchain,
          keyManager,
          nodeGraph,
          nodeConnectionManager,
          queue,
          logger: logger.getChild(NodeManager.name),
        });
      await nodeManager.start();
      discovery =
        discovery ??
        (await Discovery.createDiscovery({
          db,
          keyManager,
          gestaltGraph,
          identitiesManager,
          nodeManager,
          sigchain,
          logger: logger.getChild(Discovery.name),
        }));
      notificationsManager =
        notificationsManager ??
        (await NotificationsManager.createNotificationsManager({
          acl,
          db,
          nodeConnectionManager,
          nodeManager,
          keyManager,
          logger: logger.getChild(NotificationsManager.name),
          fresh,
        }));
      vaultManager =
        vaultManager ??
        (await VaultManager.createVaultManager({
          vaultsPath,
          keyManager,
          nodeConnectionManager,
          notificationsManager,
          gestaltGraph,
          acl,
          db,
          fs,
          logger: logger.getChild(VaultManager.name),
          fresh,
        }));
      sessionManager =
        sessionManager ??
        (await SessionManager.createSessionManager({
          db,
          keyManager,
          logger: logger.getChild(SessionManager.name),
          fresh,
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
    } catch (e) {
      logger.warn(`Failed Creating ${this.name}`);
      await sessionManager?.stop();
      await notificationsManager?.stop();
      await vaultManager?.stop();
      await discovery?.stop();
      await proxy?.stop();
      await gestaltGraph?.stop();
      await acl?.stop();
      await sigchain?.stop();
      await identitiesManager?.stop();
      await db?.stop();
      await keyManager?.stop();
      await schema?.stop();
      await status?.stop({});
      throw e;
    }
    const pkAgent = new PolykeyAgent({
      nodePath,
      status,
      schema,
      keyManager,
      db,
      identitiesManager,
      sigchain,
      acl,
      gestaltGraph,
      proxy,
      nodeGraph,
      queue,
      nodeConnectionManager,
      nodeManager,
      discovery,
      vaultManager,
      notificationsManager,
      sessionManager,
      grpcServerAgent,
      grpcServerClient,
      events,
      fs,
      logger,
    });
    await pkAgent.start({
      password,
      networkConfig,
      fresh,
    });
    logger.info(`Created ${this.name}`);
    return pkAgent;
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
  public readonly proxy: Proxy;
  public readonly nodeGraph: NodeGraph;
  public readonly queue: Queue;
  public readonly nodeConnectionManager: NodeConnectionManager;
  public readonly nodeManager: NodeManager;
  public readonly discovery: Discovery;
  public readonly vaultManager: VaultManager;
  public readonly notificationsManager: NotificationsManager;
  public readonly sessionManager: SessionManager;
  public readonly grpcServerAgent: GRPCServer;
  public readonly grpcServerClient: GRPCServer;
  public readonly events: EventBus;
  public readonly fs: FileSystem;
  public readonly logger: Logger;

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
    proxy,
    nodeGraph,
    queue,
    nodeConnectionManager,
    nodeManager,
    discovery,
    vaultManager,
    notificationsManager,
    sessionManager,
    grpcServerClient,
    grpcServerAgent,
    events,
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
    proxy: Proxy;
    nodeGraph: NodeGraph;
    queue: Queue;
    nodeConnectionManager: NodeConnectionManager;
    nodeManager: NodeManager;
    discovery: Discovery;
    vaultManager: VaultManager;
    notificationsManager: NotificationsManager;
    sessionManager: SessionManager;
    grpcServerClient: GRPCServer;
    grpcServerAgent: GRPCServer;
    events: EventBus;
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
    this.proxy = proxy;
    this.discovery = discovery;
    this.nodeGraph = nodeGraph;
    this.queue = queue;
    this.nodeConnectionManager = nodeConnectionManager;
    this.nodeManager = nodeManager;
    this.vaultManager = vaultManager;
    this.notificationsManager = notificationsManager;
    this.sessionManager = sessionManager;
    this.grpcServerClient = grpcServerClient;
    this.grpcServerAgent = grpcServerAgent;
    this.events = events;
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
    try {
      this.logger.info(`Starting ${this.constructor.name}`);
      // Set up error handling for event handlers
      this.events[captureRejectionSymbol] = (err, event: symbol) => {
        let msg = `EventBus error for ${event.toString()}`;
        if (err instanceof errors.ErrorPolykey) {
          msg += `: ${err.name}: ${err.description}`;
          if (err.message !== '') {
            msg += ` - ${err.message}`;
          }
        } else {
          msg += `: ${err.name}`;
          if (err.message !== '') {
            msg += `: ${err.message}`;
          }
        }
        this.logger.error(msg);
        throw err;
      };
      // Register event handlers
      this.events.on(
        PolykeyAgent.eventSymbols.KeyManager,
        async (data: KeyManagerChangeData) => {
          this.logger.info(`${KeyManager.name} change propagating`);
          await this.status.updateStatusLive({
            nodeId: data.nodeId,
          });
          await this.nodeManager.resetBuckets();
          const tlsConfig = {
            keyPrivatePem: keysUtils.privateKeyToPem(
              data.rootKeyPair.privateKey,
            ),
            certChainPem: await this.keyManager.getRootCertChainPem(),
          };
          this.grpcServerClient.setTLSConfig(tlsConfig);
          this.proxy.setTLSConfig(tlsConfig);
          this.logger.info(`${KeyManager.name} change propagated`);
        },
      );
      this.events.on(
        PolykeyAgent.eventSymbols.Proxy,
        async (data: ConnectionData) => {
          if (data.type === 'reverse') {
            const address = networkUtils.buildAddress(
              data.remoteHost,
              data.remotePort,
            );
            const nodeIdEncoded = nodesUtils.encodeNodeId(data.remoteNodeId);
            this.logger.info(
              `Reverse connection adding ${nodeIdEncoded}:${address} to ${NodeGraph.name}`,
            );
            // Reverse connection was established and authenticated,
            //  add it to the node graph
            await this.nodeManager.setNode(
              data.remoteNodeId,
              {
                host: data.remoteHost,
                port: data.remotePort,
              },
              false,
            );
          }
        },
      );
      const networkConfig_ = {
        ...config.defaults.networkConfig,
        ...utils.filterEmptyObject(networkConfig),
      };
      await this.status.start({ pid: process.pid });
      await this.schema.start({ fresh });
      const agentService = createAgentService({
        db: this.db,
        keyManager: this.keyManager,
        vaultManager: this.vaultManager,
        nodeManager: this.nodeManager,
        nodeGraph: this.nodeGraph,
        sigchain: this.sigchain,
        nodeConnectionManager: this.nodeConnectionManager,
        notificationsManager: this.notificationsManager,
        acl: this.acl,
        gestaltGraph: this.gestaltGraph,
        proxy: this.proxy,
        logger: this.logger.getChild('GRPCClientAgentService'),
      });
      const clientService = createClientService({
        pkAgent: this,
        db: this.db,
        discovery: this.discovery,
        gestaltGraph: this.gestaltGraph,
        identitiesManager: this.identitiesManager,
        keyManager: this.keyManager,
        nodeGraph: this.nodeGraph,
        nodeConnectionManager: this.nodeConnectionManager,
        nodeManager: this.nodeManager,
        notificationsManager: this.notificationsManager,
        sessionManager: this.sessionManager,
        vaultManager: this.vaultManager,
        sigchain: this.sigchain,
        acl: this.acl,
        grpcServerClient: this.grpcServerClient,
        grpcServerAgent: this.grpcServerAgent,
        proxy: this.proxy,
        fs: this.fs,
        logger: this.logger.getChild('GRPCClientClientService'),
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
      await this.proxy.start({
        forwardHost: networkConfig_.forwardHost,
        forwardPort: networkConfig_.forwardPort,
        serverHost: this.grpcServerAgent.getHost(),
        serverPort: this.grpcServerAgent.getPort(),
        proxyHost: networkConfig_.proxyHost,
        proxyPort: networkConfig_.proxyPort,
        tlsConfig,
      });
      await this.queue.start();
      await this.nodeManager.start();
      await this.nodeConnectionManager.start({ nodeManager: this.nodeManager });
      await this.nodeGraph.start({ fresh });
      await this.nodeConnectionManager.syncNodeGraph(false);
      await this.discovery.start({ fresh });
      await this.vaultManager.start({ fresh });
      await this.notificationsManager.start({ fresh });
      await this.sessionManager.start({ fresh });
      await this.status.finishStart({
        pid: process.pid,
        nodeId: this.keyManager.getNodeId(),
        clientHost: this.grpcServerClient.getHost(),
        clientPort: this.grpcServerClient.getPort(),
        agentHost: this.grpcServerAgent.getHost(),
        agentPort: this.grpcServerClient.getPort(),
        forwardHost: this.proxy.getForwardHost(),
        forwardPort: this.proxy.getForwardPort(),
        proxyHost: this.proxy.getProxyHost(),
        proxyPort: this.proxy.getProxyPort(),
      });
      this.logger.info(`Started ${this.constructor.name}`);
    } catch (e) {
      this.logger.warn(`Failed Starting ${this.constructor.name}`);
      this.events.removeAllListeners();
      await this.status?.beginStop({ pid: process.pid });
      await this.sessionManager?.stop();
      await this.notificationsManager?.stop();
      await this.vaultManager?.stop();
      await this.discovery?.stop();
      await this.queue?.stop();
      await this.nodeGraph?.stop();
      await this.nodeConnectionManager?.stop();
      await this.nodeManager?.stop();
      await this.proxy?.stop();
      await this.grpcServerAgent?.stop();
      await this.grpcServerClient?.stop();
      await this.gestaltGraph?.stop();
      await this.acl?.stop();
      await this.sigchain?.stop();
      await this.identitiesManager?.stop();
      await this.db?.stop();
      await this.keyManager?.stop();
      await this.schema?.stop();
      await this.status?.stop({});
      throw e;
    }
  }

  /**
   * Asynchronously stops the PolykeyAgent
   */
  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.events.removeAllListeners();
    await this.status.beginStop({ pid: process.pid });
    await this.sessionManager.stop();
    await this.notificationsManager.stop();
    await this.vaultManager.stop();
    await this.discovery.stop();
    await this.nodeConnectionManager.stop();
    await this.nodeGraph.stop();
    await this.nodeManager.stop();
    await this.queue.stop();
    await this.proxy.stop();
    await this.grpcServerAgent.stop();
    await this.grpcServerClient.stop();
    await this.gestaltGraph.stop();
    await this.acl.stop();
    await this.sigchain.stop();
    await this.identitiesManager.stop();
    await this.db.stop();
    await this.keyManager.stop();
    await this.schema.stop();
    await this.status.stop({});
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    // DB needs to be running for dependent domains to properly clear state.
    await this.db.start();
    await this.sessionManager.destroy();
    await this.notificationsManager.destroy();
    await this.vaultManager.destroy();
    await this.discovery.destroy();
    await this.nodeGraph.destroy();
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
