import type { FileSystem, PromiseDeconstructed } from './types';
import type { PolykeyWorkerManagerInterface } from './workers/types';
import type { ConnectionData, Host, Port, TLSConfig } from './network/types';
import type { SeedNodes } from './nodes/types';
import type { CertManagerChangeData, Key } from './keys/types';
import type { RecoveryCode, PrivateKey } from './keys/types';
import type { PasswordMemLimit, PasswordOpsLimit } from './keys/types';
import path from 'path';
import process from 'process';
import Logger from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { CreateDestroyStartStop } from '@matrixai/async-init/dist/CreateDestroyStartStop';
import RPCServer from './rpc/RPCServer';
import WebSocketServer from './websockets/WebSocketServer';
import * as middlewareUtils from './rpc/utils/middleware';
import * as authMiddleware from './client/utils/authenticationMiddleware';
import { WorkerManager } from './workers';
import * as networkUtils from './network/utils';
import KeyRing from './keys/KeyRing';
import CertManager from './keys/CertManager';
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
import config from './config';
import * as errors from './errors';
import * as utils from './utils';
import * as keysUtils from './keys/utils';
import * as nodesUtils from './nodes/utils';
import * as workersUtils from './workers/utils';
import TaskManager from './tasks/TaskManager';
import { serverManifest } from './client/handlers';

type NetworkConfig = {
  forwardHost?: Host;
  forwardPort?: Port;
  proxyHost?: Host;
  proxyPort?: Port;
  // GRPCServer for agent service
  agentHost?: Host;
  agentPort?: Port;
  // RPCServer for client service
  clientHost?: Host;
  clientPort?: Port;
  maxReadBufferBytes?: number;
  idleTimeout?: number;
  pingInterval?: number;
  pingTimeout?: number;
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
    [CertManager.name]: Symbol(CertManager.name),
    [Proxy.name]: Symbol(Proxy.name),
  } as {
    readonly CertManager: unique symbol;
    readonly Proxy: unique symbol;
  };

  public static async createPolykeyAgent({
    // Required parameters
    password,
    // Optional configuration
    nodePath = config.defaults.nodePath,
    keyRingConfig = {},
    certManagerConfig = {},
    networkConfig = {},
    proxyConfig = {},
    nodeConnectionManagerConfig = {},
    seedNodes = {},
    workers,
    // Optional dependencies
    status,
    schema,
    keyRing,
    db,
    certManager,
    identitiesManager,
    sigchain,
    acl,
    gestaltGraph,
    proxy,
    taskManager,
    nodeGraph,
    nodeConnectionManager,
    nodeManager,
    discovery,
    vaultManager,
    notificationsManager,
    sessionManager,
    rpcServerClient,
    grpcServerAgent,
    webSocketServerClient,
    fs = require('fs'),
    logger = new Logger(this.name),
    fresh = false,
  }: {
    password: string;
    nodePath?: string;
    keyRingConfig?: {
      recoveryCode?: RecoveryCode;
      privateKey?: PrivateKey;
      privateKeyPath?: string;
      passwordOpsLimit?: PasswordOpsLimit;
      passwordMemLimit?: PasswordMemLimit;
      strictMemoryLock?: boolean;
    };
    certManagerConfig?: {
      certDuration?: number;
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
    workers?: number;
    status?: Status;
    schema?: Schema;
    keyRing?: KeyRing;
    db?: DB;
    certManager?: CertManager;
    identitiesManager?: IdentitiesManager;
    sigchain?: Sigchain;
    acl?: ACL;
    gestaltGraph?: GestaltGraph;
    proxy?: Proxy;
    taskManager?: TaskManager;
    nodeGraph?: NodeGraph;
    nodeConnectionManager?: NodeConnectionManager;
    nodeManager?: NodeManager;
    discovery?: Discovery;
    vaultManager?: VaultManager;
    notificationsManager?: NotificationsManager;
    sessionManager?: SessionManager;
    rpcServerClient?: RPCServer;
    grpcServerAgent?: GRPCServer;
    webSocketServerClient?: WebSocketServer;
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
    const certManagerConfig_ = {
      ...config.defaults.certManagerConfig,
      ...utils.filterEmptyObject(certManagerConfig),
    };
    const proxyConfig_ = {
      authToken: keysUtils.getRandomBytes(10).toString(),
      ...config.defaults.proxyConfig,
      ...utils.filterEmptyObject(proxyConfig),
    };
    const nodeConnectionManagerConfig_ = {
      ...config.defaults.nodeConnectionManagerConfig,
      ...utils.filterEmptyObject(nodeConnectionManagerConfig),
    };
    const _networkConfig = {
      ...config.defaults.networkConfig,
      ...utils.filterEmptyObject(networkConfig),
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
    let pkAgentProm: PromiseDeconstructed<PolykeyAgent> | undefined;
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
      keyRing =
        keyRing ??
        (await KeyRing.createKeyRing({
          fresh,
          fs,
          keysPath,
          password,
          ...keyRingConfig,
          logger: logger.getChild(KeyRing.name),
        }));
      // Remove your own node ID if provided as a seed node
      const nodeIdOwn = keyRing.getNodeId();
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
            key: keyRing.dbKey,
            ops: {
              encrypt: async (key, plainText) => {
                return keysUtils.encryptWithKey(
                  utils.bufferWrap(key) as Key,
                  utils.bufferWrap(plainText),
                );
              },
              decrypt: async (key, cipherText) => {
                return keysUtils.decryptWithKey(
                  utils.bufferWrap(key) as Key,
                  utils.bufferWrap(cipherText),
                );
              },
            },
          },
          fs,
          logger: logger.getChild(DB.name),
          fresh,
        }));
      taskManager =
        taskManager ??
        (await TaskManager.createTaskManager({
          db,
          fresh,
          lazy: true,
          logger,
        }));
      certManager =
        certManager ??
        (await CertManager.createCertManager({
          keyRing,
          db,
          taskManager,
          changeCallback: async (data) =>
            events.emitAsync(PolykeyAgent.eventSymbols.CertManager, data),
          logger: logger.getChild(CertManager.name),
          fresh,
          ...certManagerConfig_,
        }));
      sigchain =
        sigchain ??
        (await Sigchain.createSigchain({
          keyRing,
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
      identitiesManager =
        identitiesManager ??
        (await IdentitiesManager.createIdentitiesManager({
          keyRing,
          db,
          sigchain,
          gestaltGraph,
          logger: logger.getChild(IdentitiesManager.name),
          fresh,
        }));
      // Registering providers
      const githubProvider = new providers.GithubProvider({
        clientId: config.providers['github.com'].clientId,
        logger: logger.getChild(providers.GithubProvider.name),
      });
      identitiesManager.registerProvider(githubProvider);
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
          keyRing,
          logger: logger.getChild(NodeGraph.name),
        }));
      nodeConnectionManager =
        nodeConnectionManager ??
        new NodeConnectionManager({
          keyRing,
          nodeGraph,
          proxy,
          taskManager,
          seedNodes,
          ...nodeConnectionManagerConfig_,
          logger: logger.getChild(NodeConnectionManager.name),
        });
      nodeManager =
        nodeManager ??
        new NodeManager({
          db,
          sigchain,
          keyRing,
          nodeGraph,
          nodeConnectionManager,
          taskManager,
          gestaltGraph,
          logger: logger.getChild(NodeManager.name),
        });
      await nodeManager.start();
      discovery =
        discovery ??
        (await Discovery.createDiscovery({
          db,
          keyRing,
          gestaltGraph,
          identitiesManager,
          nodeManager,
          taskManager,
          logger: logger.getChild(Discovery.name),
        }));
      notificationsManager =
        notificationsManager ??
        (await NotificationsManager.createNotificationsManager({
          acl,
          db,
          nodeConnectionManager,
          nodeManager,
          keyRing,
          logger: logger.getChild(NotificationsManager.name),
          fresh,
        }));
      vaultManager =
        vaultManager ??
        (await VaultManager.createVaultManager({
          vaultsPath,
          keyRing,
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
          keyRing,
          logger: logger.getChild(SessionManager.name),
          fresh,
        }));
      // If a recovery code is provided then we reset any sessions in case the
      //  password changed.
      if (keyRingConfig.recoveryCode != null) await sessionManager.resetKey();
      if (rpcServerClient == null) {
        pkAgentProm = utils.promise();
        rpcServerClient = await RPCServer.createRPCServer({
          manifest: serverManifest({
            acl: acl,
            certManager: certManager,
            db: db,
            discovery: discovery,
            fs: fs,
            gestaltGraph: gestaltGraph,
            identitiesManager: identitiesManager,
            keyRing: keyRing,
            logger: logger,
            nodeConnectionManager: nodeConnectionManager,
            nodeGraph: nodeGraph,
            nodeManager: nodeManager,
            notificationsManager: notificationsManager,
            pkAgentProm: pkAgentProm.p,
            sessionManager: sessionManager,
            vaultManager: vaultManager,
          }),
          middlewareFactory: middlewareUtils.defaultServerMiddlewareWrapper(
            authMiddleware.authenticationMiddlewareServer(
              sessionManager,
              keyRing,
            ),
          ),
          sensitive: false,
          logger: logger.getChild('RPCServerClient'),
        });
      }
      const tlsConfig: TLSConfig = {
        keyPrivatePem: keysUtils.privateKeyToPEM(keyRing.keyPair.privateKey),
        certChainPem: await certManager.getCertPEMsChainPEM(),
      };
      webSocketServerClient =
        webSocketServerClient ??
        (await WebSocketServer.createWebSocketServer({
          connectionCallback: (streamPair) =>
            rpcServerClient!.handleStream(streamPair, {}),
          fs,
          host: _networkConfig.clientHost,
          port: _networkConfig.clientPort,
          tlsConfig,
          maxReadBufferBytes: _networkConfig.maxReadBufferBytes,
          idleTimeout: _networkConfig.idleTimeout,
          pingInterval: _networkConfig.pingInterval,
          pingTimeout: _networkConfig.pingTimeout,
          logger: logger.getChild('WebSocketServer'),
        }));
      grpcServerAgent =
        grpcServerAgent ??
        new GRPCServer({
          logger: logger.getChild(GRPCServer.name + 'Agent'),
        });
    } catch (e) {
      logger.warn(`Failed Creating ${this.name}`);
      await rpcServerClient?.destroy();
      await webSocketServerClient?.stop(true);
      await sessionManager?.stop();
      await notificationsManager?.stop();
      await vaultManager?.stop();
      await discovery?.stop();
      await proxy?.stop();
      await identitiesManager?.stop();
      await gestaltGraph?.stop();
      await acl?.stop();
      await sigchain?.stop();
      await certManager?.stop();
      await taskManager?.stop();
      await db?.stop();
      await keyRing?.stop();
      await schema?.stop();
      await status?.stop({});
      throw e;
    }
    const pkAgent = new this({
      nodePath,
      status,
      schema,
      keyRing,
      db,
      certManager,
      identitiesManager,
      sigchain,
      acl,
      gestaltGraph,
      proxy,
      nodeGraph,
      taskManager,
      nodeConnectionManager,
      nodeManager,
      discovery,
      vaultManager,
      notificationsManager,
      sessionManager,
      rpcServerClient,
      grpcServerAgent,
      webSocketServerClient,
      events,
      fs,
      logger,
    });
    pkAgentProm?.resolveP(pkAgent);
    await pkAgent.start({
      password,
      networkConfig,
      workers,
      fresh,
    });
    logger.info(`Created ${this.name}`);
    return pkAgent;
  }

  public readonly nodePath: string;
  public readonly status: Status;
  public readonly schema: Schema;
  public readonly keyRing: KeyRing;
  public readonly db: DB;
  public readonly certManager: CertManager;
  public readonly identitiesManager: IdentitiesManager;
  public readonly sigchain: Sigchain;
  public readonly acl: ACL;
  public readonly gestaltGraph: GestaltGraph;
  public readonly proxy: Proxy;
  public readonly nodeGraph: NodeGraph;
  public readonly taskManager: TaskManager;
  public readonly nodeConnectionManager: NodeConnectionManager;
  public readonly nodeManager: NodeManager;
  public readonly discovery: Discovery;
  public readonly vaultManager: VaultManager;
  public readonly notificationsManager: NotificationsManager;
  public readonly sessionManager: SessionManager;
  public readonly grpcServerAgent: GRPCServer;
  public readonly events: EventBus;
  public readonly fs: FileSystem;
  public readonly logger: Logger;
  public readonly rpcServerClient: RPCServer;
  public readonly webSocketServerClient: WebSocketServer;
  protected workerManager: PolykeyWorkerManagerInterface | undefined;

  constructor({
    nodePath,
    status,
    schema,
    keyRing,
    db,
    certManager,
    identitiesManager,
    sigchain,
    acl,
    gestaltGraph,
    proxy,
    nodeGraph,
    taskManager,
    nodeConnectionManager,
    nodeManager,
    discovery,
    vaultManager,
    notificationsManager,
    sessionManager,
    rpcServerClient,
    grpcServerAgent,
    webSocketServerClient,
    events,
    fs,
    logger,
  }: {
    nodePath: string;
    status: Status;
    schema: Schema;
    keyRing: KeyRing;
    db: DB;
    certManager: CertManager;
    identitiesManager: IdentitiesManager;
    sigchain: Sigchain;
    acl: ACL;
    gestaltGraph: GestaltGraph;
    proxy: Proxy;
    nodeGraph: NodeGraph;
    taskManager: TaskManager;
    nodeConnectionManager: NodeConnectionManager;
    nodeManager: NodeManager;
    discovery: Discovery;
    vaultManager: VaultManager;
    notificationsManager: NotificationsManager;
    sessionManager: SessionManager;
    rpcServerClient: RPCServer;
    grpcServerAgent: GRPCServer;
    webSocketServerClient: WebSocketServer;
    events: EventBus;
    fs: FileSystem;
    logger: Logger;
  }) {
    this.logger = logger;
    this.nodePath = nodePath;
    this.status = status;
    this.schema = schema;
    this.keyRing = keyRing;
    this.db = db;
    this.certManager = certManager;
    this.sigchain = sigchain;
    this.identitiesManager = identitiesManager;
    this.acl = acl;
    this.gestaltGraph = gestaltGraph;
    this.proxy = proxy;
    this.discovery = discovery;
    this.nodeGraph = nodeGraph;
    this.taskManager = taskManager;
    this.nodeConnectionManager = nodeConnectionManager;
    this.nodeManager = nodeManager;
    this.vaultManager = vaultManager;
    this.notificationsManager = notificationsManager;
    this.sessionManager = sessionManager;
    this.rpcServerClient = rpcServerClient;
    this.webSocketServerClient = webSocketServerClient;
    this.grpcServerAgent = grpcServerAgent;
    this.events = events;
    this.fs = fs;
  }

  public async start({
    password,
    networkConfig = {},
    workers,
    fresh = false,
  }: {
    password: string;
    networkConfig?: NetworkConfig;
    workers?: number;
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
        PolykeyAgent.eventSymbols.CertManager,
        async (data: CertManagerChangeData) => {
          this.logger.info(`${KeyRing.name} change propagating`);
          await this.status.updateStatusLive({
            nodeId: data.nodeId,
          });
          await this.nodeManager.resetBuckets();
          // Update the sigchain
          await this.sigchain.onKeyRingChange();
          const tlsConfig: TLSConfig = {
            keyPrivatePem: keysUtils.privateKeyToPEM(data.keyPair.privateKey),
            certChainPem: await this.certManager.getCertPEMsChainPEM(),
          };
          // FIXME: Can we even support updating TLS config anymore?
          // this.grpcServerClient.setTLSConfig(tlsConfig);
          this.proxy.setTLSConfig(tlsConfig);
          this.logger.info(`${KeyRing.name} change propagated`);
        },
      );
      this.events.on(
        PolykeyAgent.eventSymbols.Proxy,
        async (data: ConnectionData) => {
          if (data.type === 'reverse') {
            if (this.keyRing.getNodeId().equals(data.remoteNodeId)) return;
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
            await this.nodeManager.setNode(data.remoteNodeId, {
              host: data.remoteHost,
              port: data.remotePort,
            });
          }
        },
      );
      const _networkConfig = {
        ...config.defaults.networkConfig,
        ...utils.filterEmptyObject(networkConfig),
      };
      await this.status.start({ pid: process.pid });
      await this.schema.start({ fresh });
      const agentService = createAgentService({
        db: this.db,
        keyRing: this.keyRing,
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
      // Starting modules
      await this.keyRing.start({
        password,
        fresh,
      });
      await this.db.start({
        crypto: {
          key: this.keyRing.dbKey,
          ops: {
            encrypt: async (key, plainText) => {
              return keysUtils.encryptWithKey(
                utils.bufferWrap(key) as Key,
                utils.bufferWrap(plainText),
              );
            },
            decrypt: async (key, cipherText) => {
              return keysUtils.decryptWithKey(
                utils.bufferWrap(key) as Key,
                utils.bufferWrap(cipherText),
              );
            },
          },
        },
        fresh,
      });
      await this.taskManager.start({ fresh, lazy: true });
      await this.certManager.start({
        fresh,
      });
      await this.sigchain.start({ fresh });
      await this.acl.start({ fresh });
      await this.gestaltGraph.start({ fresh });
      // Adding self to the gestaltGraph
      await this.gestaltGraph.setNode({ nodeId: this.keyRing.getNodeId() });
      await this.identitiesManager.start({ fresh });
      // GRPC Server
      const tlsConfig: TLSConfig = {
        keyPrivatePem: keysUtils.privateKeyToPEM(
          this.keyRing.keyPair.privateKey,
        ),
        certChainPem: await this.certManager.getCertPEMsChainPEM(),
      };
      // Client server
      await this.webSocketServerClient.start({
        tlsConfig,
        host: _networkConfig.clientHost,
        port: _networkConfig.clientPort,
        connectionCallback: (streamPair) =>
          this.rpcServerClient.handleStream(streamPair, {}),
      });
      // Agent server
      await this.grpcServerAgent.start({
        services: [[AgentServiceService, agentService]],
        host: _networkConfig.agentHost,
        port: _networkConfig.agentPort,
      });
      await this.proxy.start({
        forwardHost: _networkConfig.forwardHost,
        forwardPort: _networkConfig.forwardPort,
        serverHost: this.grpcServerAgent.getHost(),
        serverPort: this.grpcServerAgent.getPort(),
        proxyHost: _networkConfig.proxyHost,
        proxyPort: _networkConfig.proxyPort,
        tlsConfig,
      });
      await this.nodeManager.start();
      await this.nodeConnectionManager.start({ nodeManager: this.nodeManager });
      await this.nodeGraph.start({ fresh });
      await this.nodeManager.syncNodeGraph(false);
      await this.discovery.start({ fresh });
      await this.vaultManager.start({ fresh });
      await this.notificationsManager.start({ fresh });
      await this.sessionManager.start({ fresh });
      await this.taskManager.startProcessing();
      if (workers != null) {
        this.workerManager = await workersUtils.createWorkerManager({
          // 0 means max workers
          cores: workers === 0 ? undefined : workers,
          logger: this.logger.getChild(WorkerManager.name),
        });
        this.vaultManager.setWorkerManager(this.workerManager);
        this.db.setWorkerManager(this.workerManager);
      }
      await this.status.finishStart({
        pid: process.pid,
        nodeId: this.keyRing.getNodeId(),
        clientHost: this.webSocketServerClient.getHost(),
        clientPort: this.webSocketServerClient.getPort(),
        agentHost: this.grpcServerAgent.getHost(),
        agentPort: this.grpcServerAgent.getPort(),
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
      await this.taskManager?.stopProcessing();
      await this.taskManager?.stopTasks();
      await this.sessionManager?.stop();
      await this.notificationsManager?.stop();
      await this.vaultManager?.stop();
      await this.discovery?.stop();
      await this.nodeGraph?.stop();
      await this.nodeConnectionManager?.stop();
      await this.nodeManager?.stop();
      await this.proxy?.stop();
      await this.grpcServerAgent?.stop();
      await this.webSocketServerClient.stop(true);
      await this.identitiesManager?.stop();
      await this.gestaltGraph?.stop();
      await this.acl?.stop();
      await this.sigchain?.stop();
      await this.certManager?.stop();
      await this.taskManager?.stop();
      await this.db?.stop();
      await this.keyRing?.stop();
      await this.schema?.stop();
      this.vaultManager.unsetWorkerManager();
      this.db.unsetWorkerManager();
      await this.workerManager?.destroy();
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
    await this.taskManager.stopProcessing();
    await this.taskManager.stopTasks();
    await this.sessionManager.stop();
    await this.notificationsManager.stop();
    await this.vaultManager.stop();
    await this.discovery.stop();
    await this.nodeConnectionManager.stop();
    await this.nodeGraph.stop();
    await this.nodeManager.stop();
    await this.proxy.stop();
    await this.grpcServerAgent.stop();
    await this.webSocketServerClient.stop(true);
    await this.identitiesManager.stop();
    await this.gestaltGraph.stop();
    await this.acl.stop();
    await this.sigchain.stop();
    await this.certManager.stop();
    await this.taskManager.stop();
    await this.db.stop();
    await this.keyRing.stop();
    await this.schema.stop();
    this.vaultManager.unsetWorkerManager();
    this.db.unsetWorkerManager();
    await this.workerManager?.destroy();
    await this.status.stop({});
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy(password: string) {
    this.logger.info(`Destroying ${this.constructor.name}`);
    // KeyRing needs to be started for the DB
    await this.keyRing.start({ password });
    // DB needs to be running for dependent domains to properly clear state.
    await this.db.start({
      crypto: {
        key: this.keyRing.dbKey,
        ops: {
          encrypt: async (key, plainText) => {
            return keysUtils.encryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(plainText),
            );
          },
          decrypt: async (key, cipherText) => {
            return keysUtils.decryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(cipherText),
            );
          },
        },
      },
    });
    // TaskManager needs to be running for dependent domains to clear state.
    await this.taskManager.start({ lazy: true });
    await this.sessionManager.destroy();
    await this.notificationsManager.destroy();
    await this.vaultManager.destroy();
    await this.discovery.destroy();
    await this.nodeGraph.destroy();
    await this.rpcServerClient.destroy();
    await this.identitiesManager.destroy();
    await this.gestaltGraph.destroy();
    await this.acl.destroy();
    await this.sigchain.destroy();
    await this.certManager.destroy();
    await this.taskManager.stop();
    await this.taskManager.destroy();
    // Non-TaskManager dependencies
    await this.db.stop();
    // Non-DB dependencies
    await this.db.destroy();
    await this.keyRing.stop();
    await this.keyRing.destroy();
    await this.schema.destroy();
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }
}

export default PolykeyAgent;
