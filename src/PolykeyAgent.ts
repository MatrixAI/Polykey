import type { DeepPartial, FileSystem, PromiseDeconstructed } from './types';
import type { PolykeyWorkerManagerInterface } from './workers/types';
import type { TLSConfig } from './network/types';
import type { SeedNodes, NodesOptions } from './nodes/types';
import type { Key, KeysOptions } from './keys/types';
import path from 'path';
import process from 'process';
import Logger from '@matrixai/logger';
import { DB } from '@matrixai/db';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import RPCServer from '@matrixai/rpc/dist/RPCServer';
import * as rpcUtilsMiddleware from '@matrixai/rpc/dist/middleware';
import * as clientUtilsMiddleware from './client/utils/middleware';
import { WorkerManager } from './workers';
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
import IdentitiesManager from './identities/IdentitiesManager';
import { providers } from './identities';
import config from './config';
import * as errors from './errors';
import * as events from './events';
import * as utils from './utils';
import * as keysUtils from './keys/utils';
import * as keysEvents from './keys/events';
import * as nodesUtils from './nodes/utils';
import * as workersUtils from './workers/utils';
import TaskManager from './tasks/TaskManager';
import { serverManifest as clientServerManifest } from './client/handlers';
import agentServerManifest from './nodes/agent/handlers';
import ClientService from './client/ClientService';
import { WebSocketServer } from '@matrixai/ws';
/**
 * Optional configuration for `PolykeyAgent`.
 */
type PolykeyAgentOptions = {
  nodePath: string;
  clientServiceHost: string;
  clientServicePort: number;
  agentServiceHost: string;
  agentServicePort: number;
  seedNodes: SeedNodes;
  workers: number;
  ipv6Only: boolean;
  keys: KeysOptions;
  rpc: {
    callTimeoutTime: number;
    parserBufferSize: number;
  };
  client: {
    connectTimeoutTime: number;
    keepAliveTimeoutTime: number;
    keepAliveIntervalTime: number;
  };
  nodes: NodesOptions;
};

type PolykeyAgentStartOptions = {
  clientServiceHost: string;
  clientServicePort: number;
  agentServiceHost: string;
  agentServicePort: number;
  ipv6Only: boolean;
  workers: number;
};

interface PolykeyAgent extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new errors.ErrorPolykeyAgentRunning(),
  new errors.ErrorPolykeyAgentDestroyed(),
  {
    eventStart: events.EventPolykeyAgentStart,
    eventStarted: events.EventPolykeyAgentStarted,
    eventStop: events.EventPolykeyAgentStop,
    eventStopped: events.EventPolykeyAgentStopped,
    eventDestroy: events.EventPolykeyAgentDestroy,
    eventDestroyed: events.EventPolykeyAgentDestroyed,
  },
)
class PolykeyAgent {
  /**
   * Create the Polykey Agent.
   *
   * All optional configuration is deep-merged with defaults.
   *
   * If any of the optional dependencies is injected, their lifecycle will not
   * be managed by `PolykeyAgent`. Furthermore, if you inject an optional
   * dependency, make sure you are injecting all upstream transitive
   * dependencies at the same time. For example if you inject `acl`, you must
   * also inject `db`.
   */
  public static async createPolykeyAgent({
    // Required parameters
    password,
    // Options
    options = {},
    fresh = false,
    // Optional dependencies
    fs = require('fs'),
    logger = new Logger(this.name),
  }: {
    password: string;
    options?: DeepPartial<PolykeyAgentOptions>;
    fs?: FileSystem;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<PolykeyAgent> {
    logger.info(`Creating ${this.name}`);
    const umask = 0o077;
    logger.info(`Setting umask to ${umask.toString(8).padStart(3, '0')}`);
    process.umask(umask);
    const optionsDefaulted = utils.mergeObjects(options, {
      nodePath: config.defaultsUser.nodePath,
      clientServiceHost: config.defaultsUser.clientServiceHost,
      clientServicePort: config.defaultsUser.clientServicePort,
      agentServiceHost: config.defaultsUser.agentServiceHost,
      agentServicePort: config.defaultsUser.agentServicePort,
      seedNodes: config.defaultsUser.seedNodes,
      workers: config.defaultsUser.workers,
      ipv6Only: config.defaultsUser.ipv6Only,
      keys: {
        certDuration: config.defaultsUser.certDuration,
        certRenewLeadTime: config.defaultsUser.certRenewLeadTime,
      },
      rpc: {
        callTimeoutTime: config.defaultsSystem.rpcCallTimeoutTime,
        parserBufferSize: config.defaultsSystem.rpcParserBufferSize,
      },
      client: {
        connectTimoutTime: config.defaultsSystem.clientConnectTimeoutTime,
        keepAliveTimeoutTime: config.defaultsSystem.clientKeepAliveTimeoutTime,
        keepAliveIntervalTime:
          config.defaultsSystem.clientKeepAliveIntervalTime,
      },
      nodes: {
        connectionIdleTimeoutTime:
          config.defaultsSystem.nodesConnectionIdleTimeoutTime,
        connectionFindConcurrencyLimit:
          config.defaultsSystem.nodesConnectionFindConcurrencyLimit,
        connectionConnectTimeoutTime:
          config.defaultsSystem.nodesConnectionConnectTimeoutTime,
        connectionKeepAliveTimeoutTime:
          config.defaultsSystem.nodesConnectionKeepAliveTimeoutTime,
        connectionKeepAliveIntervalTime:
          config.defaultsSystem.nodesConnectionKeepAliveIntervalTime,
        connectionHolePunchIntervalTime:
          config.defaultsSystem.nodesConnectionHolePunchIntervalTime,
      },
    });
    // This can only happen if the caller didn't specify the node path and the
    // automatic detection failed
    if (optionsDefaulted.nodePath == null) {
      throw new errors.ErrorUtilsNodePath();
    }
    logger.info(`Setting node path to ${optionsDefaulted.nodePath}`);
    await utils.mkdirExists(fs, optionsDefaulted.nodePath);
    const statusPath = path.join(
      optionsDefaulted.nodePath,
      config.paths.statusBase,
    );
    const statusLockPath = path.join(
      optionsDefaulted.nodePath,
      config.paths.statusLockBase,
    );
    const statePath = path.join(
      optionsDefaulted.nodePath,
      config.paths.stateBase,
    );
    const dbPath = path.join(statePath, config.paths.dbBase);
    const keysPath = path.join(statePath, config.paths.keysBase);
    const vaultsPath = path.join(statePath, config.paths.vaultsBase);
    let pkAgentProm: PromiseDeconstructed<PolykeyAgent> | undefined;

    let status: Status | undefined;
    let schema: Schema | undefined;
    let keyRing: KeyRing | undefined;
    let db: DB | undefined;
    let taskManager: TaskManager | undefined;
    let certManager: CertManager | undefined;
    let sigchain: Sigchain | undefined;
    let acl: ACL | undefined;
    let gestaltGraph: GestaltGraph | undefined;
    let identitiesManager: IdentitiesManager | undefined;
    let nodeGraph: NodeGraph | undefined;
    let nodeConnectionManager: NodeConnectionManager | undefined;
    let nodeManager: NodeManager | undefined;
    let discovery: Discovery | undefined;
    let notificationsManager: NotificationsManager | undefined;
    let vaultManager: VaultManager | undefined;
    let sessionManager: SessionManager | undefined;
    let rpcServerClient: RPCServer | undefined;
    let clientService: ClientService | undefined;
    try {
      status = new Status({
        statusPath,
        statusLockPath,
        fs: fs,
        logger: logger.getChild(Status.name),
      });
      // Start locking the status
      await status.start({ pid: process.pid });
      schema = await Schema.createSchema({
        statePath,
        fs,
        logger: logger.getChild(Schema.name),
        fresh,
      });
      keyRing = await KeyRing.createKeyRing({
        keysPath,
        options: optionsDefaulted.keys,
        fs,
        fresh,
        password,
        logger: logger.getChild(KeyRing.name),
      });
      db = await DB.createDB({
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
      });
      taskManager = await TaskManager.createTaskManager({
        db,
        fresh,
        lazy: true,
        logger,
      });
      certManager = await CertManager.createCertManager({
        db,
        keyRing,
        taskManager,
        options: optionsDefaulted.keys,
        logger: logger.getChild(CertManager.name),
        fresh,
      });
      // TLS configuration for networking
      const tlsConfig: TLSConfig = {
        keyPrivatePem: keysUtils.privateKeyToPEM(keyRing.keyPair.privateKey),
        certChainPem: await certManager.getCertPEMsChainPEM(),
      };
      sigchain = await Sigchain.createSigchain({
        db,
        keyRing,
        logger: logger.getChild(Sigchain.name),
        fresh,
      });
      acl = await ACL.createACL({
        db,
        logger: logger.getChild(ACL.name),
        fresh,
      });
      gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger: logger.getChild(GestaltGraph.name),
        fresh,
      });
      identitiesManager = await IdentitiesManager.createIdentitiesManager({
        keyRing,
        db,
        sigchain,
        gestaltGraph,
        logger: logger.getChild(IdentitiesManager.name),
        fresh,
      });
      // Registering providers
      const githubProvider = new providers.GithubProvider({
        clientId: config.providers['github.com'].clientId,
        logger: logger.getChild(providers.GithubProvider.name),
      });
      identitiesManager.registerProvider(githubProvider);
      nodeGraph = await NodeGraph.createNodeGraph({
        db,
        fresh,
        keyRing,
        logger: logger.getChild(NodeGraph.name),
      });
      // Remove your own node ID if provided as a seed node
      const nodeIdOwnEncoded = nodesUtils.encodeNodeId(keyRing.getNodeId());
      delete optionsDefaulted.seedNodes[nodeIdOwnEncoded];
      nodeConnectionManager = new NodeConnectionManager({
        keyRing,
        nodeGraph,
        tlsConfig,
        seedNodes: optionsDefaulted.seedNodes,
        options: optionsDefaulted.nodes,
        logger: logger.getChild(NodeConnectionManager.name),
      });
      nodeManager = new NodeManager({
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
      // add seed nodes to the nodeGraph
      const setNodeProms = new Array<Promise<void>>();
      for (const nodeIdEncoded in optionsDefaulted.seedNodes) {
        const nodeId = nodesUtils.decodeNodeId(nodeIdEncoded);
        if (nodeId == null) utils.never();
        const setNodeProm = nodeManager.setNode(
          nodeId,
          optionsDefaulted.seedNodes[nodeIdEncoded],
          true,
        );
        setNodeProms.push(setNodeProm);
      }
      await Promise.all(setNodeProms);
      discovery = await Discovery.createDiscovery({
        db,
        keyRing,
        gestaltGraph,
        identitiesManager,
        nodeManager,
        taskManager,
        logger: logger.getChild(Discovery.name),
      });
      notificationsManager =
        await NotificationsManager.createNotificationsManager({
          acl,
          db,
          nodeConnectionManager,
          nodeManager,
          keyRing,
          logger: logger.getChild(NotificationsManager.name),
          fresh,
        });
      vaultManager = await VaultManager.createVaultManager({
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
      });
      sessionManager = await SessionManager.createSessionManager({
        db,
        keyRing,
        logger: logger.getChild(SessionManager.name),
        fresh,
      });
      // If a recovery code is provided then we reset any sessions in case the
      // password changed.
      if (optionsDefaulted.keys.recoveryCode != null) {
        await sessionManager.resetKey();
      }
      pkAgentProm = utils.promise();
      rpcServerClient = await RPCServer.createRPCServer({
        manifest: clientServerManifest({
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
        middlewareFactory: rpcUtilsMiddleware.defaultServerMiddlewareWrapper(
          clientUtilsMiddleware.middlewareServer(sessionManager, keyRing),
          optionsDefaulted.rpc.parserBufferSize,
        ),
        sensitive: false,
        handlerTimeoutTime: optionsDefaulted.rpc.callTimeoutTime,
        handlerTimeoutGraceTime: optionsDefaulted.rpc.callTimeoutTime + 2000,
        logger: logger.getChild(RPCServer.name + 'Client'),
      });
      clientService = await ClientService.createClientService({
        manifest: clientServerManifest({
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
        tlsConfig,
        options: {
          middlewareFactory: clientUtilsMiddleware.middlewareServer(
            sessionManager,
            keyRing,
          ),
          host: optionsDefaulted.clientServiceHost,
          port: optionsDefaulted.clientServicePort,
          keepAliveTimeoutTime: optionsDefaulted.client.keepAliveTimeoutTime,
          keepAliveIntervalTime:
            optionsDefaulted.client.keepAliveIntervalTime,
          rpcCallTimeoutTime: optionsDefaulted.rpc.callTimeoutTime,
          rpcParserBufferSize: optionsDefaulted.rpc.parserBufferSize,
        },
        logger: logger.getChild(ClientService.name),
      });
    } catch (e) {
      logger.warn(`Failed Creating ${this.name}`);
      await rpcServerClient?.destroy();
      await clientService?.stop({ force: true });
      await sessionManager?.stop();
      await notificationsManager?.stop();
      await vaultManager?.stop();
      await discovery?.stop();
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
      nodePath: optionsDefaulted.nodePath,
      status,
      schema,
      keyRing,
      db,
      certManager,
      identitiesManager,
      sigchain,
      acl,
      gestaltGraph,
      nodeGraph,
      taskManager,
      nodeConnectionManager,
      nodeManager,
      discovery,
      vaultManager,
      notificationsManager,
      sessionManager,
      rpcServerClient,
      clientService,
      fs,
      logger,
    });
    pkAgentProm?.resolveP(pkAgent);

    await pkAgent.start({
      password,
      options: {
        clientServiceHost: optionsDefaulted.clientServiceHost,
        clientServicePort: optionsDefaulted.clientServicePort,
        agentServiceHost: optionsDefaulted.agentServiceHost,
        agentServicePort: optionsDefaulted.agentServicePort,
        workers: optionsDefaulted.workers,
        ipv6Only: optionsDefaulted.ipv6Only,
      },
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
  public readonly nodeGraph: NodeGraph;
  public readonly taskManager: TaskManager;
  public readonly nodeConnectionManager: NodeConnectionManager;
  public readonly nodeManager: NodeManager;
  public readonly discovery: Discovery;
  public readonly vaultManager: VaultManager;
  public readonly notificationsManager: NotificationsManager;
  public readonly sessionManager: SessionManager;
  public readonly fs: FileSystem;
  public readonly logger: Logger;
  public readonly clientService: ClientService;
  protected workerManager: PolykeyWorkerManagerInterface | undefined;

  protected handleEventCertManagerCertChange = async (
    evt: keysEvents.EventCertManagerCertChange,
  ) => {
    const data = evt.detail;
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
    this.clientService.setTlsConfig(tlsConfig);
    this.nodeConnectionManager.updateTlsConfig(tlsConfig);
    this.logger.info(`${KeyRing.name} change propagated`);
  };

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
    nodeGraph,
    taskManager,
    nodeConnectionManager,
    nodeManager,
    discovery,
    vaultManager,
    notificationsManager,
    sessionManager,
    clientService,
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
    nodeGraph: NodeGraph;
    taskManager: TaskManager;
    nodeConnectionManager: NodeConnectionManager;
    nodeManager: NodeManager;
    discovery: Discovery;
    vaultManager: VaultManager;
    notificationsManager: NotificationsManager;
    sessionManager: SessionManager;
    rpcServerClient: RPCServer;
    clientService: ClientService;
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
    this.discovery = discovery;
    this.nodeGraph = nodeGraph;
    this.taskManager = taskManager;
    this.nodeConnectionManager = nodeConnectionManager;
    this.nodeManager = nodeManager;
    this.vaultManager = vaultManager;
    this.notificationsManager = notificationsManager;
    this.sessionManager = sessionManager;
    this.clientService = clientService;
    this.fs = fs;
  }

  @ready(new errors.ErrorPolykeyAgentNotRunning())
  get clientServiceHost() {
    return this.clientService.host;
  }

  @ready(new errors.ErrorPolykeyAgentNotRunning())
  get clientServicePort() {
    return this.clientService.port;
  }

  @ready(new errors.ErrorPolykeyAgentNotRunning())
  get agentServiceHost() {
    return this.nodeConnectionManager.host as string;
  }

  @ready(new errors.ErrorPolykeyAgentNotRunning())
  get agentServicePort() {
    return this.nodeConnectionManager.port as number;
  }

  public async start({
    password,
    options = {},
    workers,
    fresh = false,
  }: {
    password: string;
    options?: Partial<PolykeyAgentStartOptions>;
    workers?: number;
    fresh?: boolean;
  }) {
    const optionsDefaulted = utils.mergeObjects(options, {
      clientServiceHost: config.defaultsUser.clientServiceHost,
      clientServicePort: config.defaultsUser.clientServicePort,
      agentServiceHost: config.defaultsUser.agentServiceHost,
      agentServicePort: config.defaultsUser.agentServicePort,
      workers: config.defaultsUser.workers,
      ipv6Only: config.defaultsUser.ipv6Only,
    });
    try {
      this.logger.info(`Starting ${this.constructor.name}`);
      // Register event handlers
      this.certManager.addEventListener(
        keysEvents.EventCertManagerCertChange.name,
        this.handleEventCertManagerCertChange,
      );
      await this.status.start({ pid: process.pid });
      await this.schema.start({ fresh });
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
      const tlsConfig: TLSConfig = {
        keyPrivatePem: keysUtils.privateKeyToPEM(
          this.keyRing.keyPair.privateKey,
        ),
        certChainPem: await this.certManager.getCertPEMsChainPEM(),
      };
      await this.clientService.start({
        tlsConfig,
        options: {
          host: optionsDefaulted.clientServiceHost,
          port: optionsDefaulted.clientServicePort,
        },
      });
      await this.nodeManager.start();
      await this.nodeConnectionManager.start({
        host: optionsDefaulted.agentServiceHost,
        port: optionsDefaulted.agentServicePort,
        ipv6Only: optionsDefaulted.ipv6Only,
        manifest: agentServerManifest({
          acl: this.acl,
          db: this.db,
          keyRing: this.keyRing,
          logger: this.logger,
          nodeConnectionManager: this.nodeConnectionManager,
          nodeGraph: this.nodeGraph,
          nodeManager: this.nodeManager,
          notificationsManager: this.notificationsManager,
          sigchain: this.sigchain,
          vaultManager: this.vaultManager,
        }),
      });
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
        clientHost: this.clientServiceHost,
        clientPort: this.clientServicePort,
        agentHost: this.agentServiceHost,
        agentPort: this.agentServicePort,
      });
      this.logger.info(`Started ${this.constructor.name}`);
    } catch (e) {
      this.logger.warn(
        `Failed Starting ${this.constructor.name} with ${e.message}`,
      );
      this.certManager.removeEventListener(
        keysEvents.EventCertManagerCertChange.name,
        this.handleEventCertManagerCertChange,
      );
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
      await this.clientService.stop({ force: true });
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
    this.certManager.removeEventListener(
      keysEvents.EventCertManagerCertChange.name,
      this.handleEventCertManagerCertChange,
    );
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
    await this.clientService.stop({ force: true });
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
    await this.clientService.destroy({ force: true });
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

export type {
  PolykeyAgentOptions,
};
