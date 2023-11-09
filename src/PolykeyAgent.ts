import type { DeepPartial, FileSystem, ObjectEmpty } from './types';
import type { PolykeyWorkerManagerInterface } from './workers/types';
import type { TLSConfig } from './network/types';
import type { SeedNodes } from './nodes/types';
import type { Key, PasswordOpsLimit, PasswordMemLimit } from './keys/types';
import path from 'path';
import process from 'process';
import Logger from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { MDNS } from '@matrixai/mdns';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
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
import * as identityProviders from './identities/providers';
import TaskManager from './tasks/TaskManager';
import ClientService from './client/ClientService';
import config from './config';
import * as errors from './errors';
import * as events from './events';
import * as utils from './utils';
import * as keysUtils from './keys/utils';
import * as keysEvents from './keys/events';
import * as nodesUtils from './nodes/utils';
import * as workersUtils from './workers/utils';
import * as clientMiddleware from './client/middleware';
import clientServerManifest from './client/handlers';
import agentServerManifest from './nodes/agent/handlers';

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
  keys: {
    passwordOpsLimit: PasswordOpsLimit;
    passwordMemLimit: PasswordMemLimit;
    strictMemoryLock: boolean;
    certDuration: number;
    certRenewLeadTime: number;
    recoveryCode: string;
  } & (
    | ObjectEmpty
    | { recoveryCode: string }
    | { privateKey: Buffer }
    | { privateKeyPath: string }
  );
  client: {
    keepAliveTimeoutTime: number;
    keepAliveIntervalTime: number;
    rpcCallTimeoutTime: number;
    rpcParserBufferSize: number;
  };
  nodes: {
    connectionIdleTimeoutTime: number;
    connectionFindConcurrencyLimit: number;
    connectionConnectTimeoutTime: number;
    connectionKeepAliveTimeoutTime: number;
    connectionKeepAliveIntervalTime: number;
    connectionHolePunchIntervalTime: number;
    rpcCallTimeoutTime: number;
    rpcParserBufferSize: number;
  };
  mdns: {
    groups: Array<string>;
    port: number;
  };
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
    fresh?: boolean;
    fs?: FileSystem;
    logger?: Logger;
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
        passwordOpsLimit: config.defaultsUser.passwordOpsLimit,
        passwordMemLimit: config.defaultsUser.passwordMemLimit,
        strictMemoryLock: config.defaultsUser.strictMemoryLock,
        certDuration: config.defaultsUser.certDuration,
        certRenewLeadTime: config.defaultsUser.certRenewLeadTime,
      },
      client: {
        keepAliveTimeoutTime: config.defaultsSystem.clientKeepAliveTimeoutTime,
        keepAliveIntervalTime:
          config.defaultsSystem.clientKeepAliveIntervalTime,
        rpcCallTimeoutTime: config.defaultsSystem.rpcCallTimeoutTime,
        rpcParserBufferSize: config.defaultsSystem.rpcParserBufferSize,
      },
      nodes: {
        connectionIdleTimeoutTime:
          config.defaultsSystem.nodesConnectionIdleTimeoutTime,
        connectionFindConcurrencyLimit:
          config.defaultsSystem.nodesConnectionFindConcurrencyLimit,
        connectionFindLocalTimeoutTime:
          config.defaultsSystem.nodesConnectionFindLocalTimeoutTime,
        connectionConnectTimeoutTime:
          config.defaultsSystem.nodesConnectionConnectTimeoutTime,
        connectionKeepAliveTimeoutTime:
          config.defaultsSystem.nodesConnectionKeepAliveTimeoutTime,
        connectionKeepAliveIntervalTime:
          config.defaultsSystem.nodesConnectionKeepAliveIntervalTime,
        connectionHolePunchIntervalTime:
          config.defaultsSystem.nodesConnectionHolePunchIntervalTime,
      },
      mdns: {
        groups: config.defaultsSystem.mdnsGroups,
        port: config.defaultsSystem.mdnsPort,
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
    let mdns: MDNS | undefined;
    let nodeConnectionManager: NodeConnectionManager | undefined;
    let nodeManager: NodeManager | undefined;
    let discovery: Discovery | undefined;
    let notificationsManager: NotificationsManager | undefined;
    let vaultManager: VaultManager | undefined;
    let sessionManager: SessionManager | undefined;
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
        fs,
        fresh,
        password,
        logger: logger.getChild(KeyRing.name),
        passwordMemLimit: optionsDefaulted.keys.passwordMemLimit,
        passwordOpsLimit: optionsDefaulted.keys.passwordOpsLimit,
        privateKey: optionsDefaulted.keys.privateKey,
        privateKeyPath: optionsDefaulted.keys.privateKeyPath,
        recoveryCode: optionsDefaulted.keys.recoveryCode,
        strictMemoryLock: optionsDefaulted.keys.strictMemoryLock,
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
        certDuration: optionsDefaulted.keys.certDuration,
        certRenewLeadTime: optionsDefaulted.keys.certRenewLeadTime,
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
      const githubProvider = new identityProviders.GithubProvider({
        clientId: config.providers['github.com'].clientId,
        logger: logger.getChild(identityProviders.GithubProvider.name),
      });
      identitiesManager.registerProvider(githubProvider);
      nodeGraph = await NodeGraph.createNodeGraph({
        db,
        fresh,
        keyRing,
        logger: logger.getChild(NodeGraph.name),
      });
      mdns = new MDNS({
        logger: logger.getChild(MDNS.name),
      });
      await mdns.start({
        id: keyRing.getNodeId().toBuffer().readUint16BE(),
        hostname: nodesUtils.encodeNodeId(keyRing.getNodeId()),
        groups: optionsDefaulted.mdns.groups,
        port: optionsDefaulted.mdns.port,
      });
      // Remove your own node ID if provided as a seed node
      const nodeIdOwnEncoded = nodesUtils.encodeNodeId(keyRing.getNodeId());
      delete optionsDefaulted.seedNodes[nodeIdOwnEncoded];
      nodeConnectionManager = new NodeConnectionManager({
        keyRing,
        nodeGraph,
        tlsConfig,
        mdns,
        seedNodes: optionsDefaulted.seedNodes,
        connectionFindConcurrencyLimit:
          optionsDefaulted.nodes.connectionFindConcurrencyLimit,
        connectionFindLocalTimeoutTime:
          optionsDefaulted.nodes.connectionFindLocalTimeoutTime,
        connectionIdleTimeoutTime:
          optionsDefaulted.nodes.connectionIdleTimeoutTime,
        connectionConnectTimeoutTime:
          optionsDefaulted.nodes.connectionConnectTimeoutTime,
        connectionKeepAliveTimeoutTime:
          optionsDefaulted.nodes.connectionKeepAliveTimeoutTime,
        connectionKeepAliveIntervalTime:
          optionsDefaulted.nodes.connectionKeepAliveIntervalTime,
        connectionHolePunchIntervalTime:
          optionsDefaulted.nodes.connectionHolePunchIntervalTime,
        rpcParserBufferSize: optionsDefaulted.nodes.rpcParserBufferSize,
        rpcCallTimeoutTime: optionsDefaulted.nodes.rpcCallTimeoutTime,
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
      // Add seed nodes to the nodeGraph
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
      clientService = new ClientService({
        tlsConfig,
        middlewareFactory: clientMiddleware.middlewareServer(
          sessionManager,
          keyRing,
        ),
        keepAliveTimeoutTime: optionsDefaulted.client.keepAliveTimeoutTime,
        keepAliveIntervalTime: optionsDefaulted.client.keepAliveIntervalTime,
        rpcCallTimeoutTime: optionsDefaulted.client.rpcCallTimeoutTime,
        rpcParserBufferSize: optionsDefaulted.client.rpcParserBufferSize,
        logger: logger.getChild(ClientService.name),
      });
    } catch (e) {
      logger.warn(`Failed Creating ${this.name}`);
      await sessionManager?.stop();
      await notificationsManager?.stop();
      await vaultManager?.stop();
      await discovery?.stop();
      await identitiesManager?.stop();
      await gestaltGraph?.stop();
      await mdns?.stop();
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
      mdns,
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
    });
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
  public readonly mdns: MDNS;
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
    mdns,
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
    mdns: MDNS;
    taskManager: TaskManager;
    nodeConnectionManager: NodeConnectionManager;
    nodeManager: NodeManager;
    discovery: Discovery;
    vaultManager: VaultManager;
    notificationsManager: NotificationsManager;
    sessionManager: SessionManager;
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
    this.mdns = mdns;
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
    return this.nodeConnectionManager.host;
  }

  @ready(new errors.ErrorPolykeyAgentNotRunning())
  get agentServicePort() {
    return this.nodeConnectionManager.port;
  }

  public async start({
    password,
    options = {},
    fresh = false,
  }: {
    password: string;
    options?: DeepPartial<{
      clientServiceHost: string;
      clientServicePort: number;
      agentServiceHost: string;
      agentServicePort: number;
      ipv6Only: boolean;
      workers: number;
      keys:
        | ObjectEmpty
        | { recoveryCode: string }
        | { privateKey: Buffer }
        | { privateKeyPath: string };
      mdns: {
        groups: Array<string>;
        port: number;
      };
    }>;
    workers?: number;
    fresh?: boolean;
  }) {
    try {
      this.logger.info(`Starting ${this.constructor.name}`);
      const optionsDefaulted = utils.mergeObjects(options, {
        clientServiceHost: config.defaultsUser.clientServiceHost,
        clientServicePort: config.defaultsUser.clientServicePort,
        agentServiceHost: config.defaultsUser.agentServiceHost,
        agentServicePort: config.defaultsUser.agentServicePort,
        workers: config.defaultsUser.workers,
        ipv6Only: config.defaultsUser.ipv6Only,
        mdns: {
          groups: config.defaultsSystem.mdnsGroups,
          port: config.defaultsSystem.mdnsPort,
        },
      });
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
        recoveryCode: optionsDefaulted.keys?.recoveryCode,
        privateKey: optionsDefaulted.keys?.privateKey,
        privateKeyPath: optionsDefaulted.keys?.privateKeyPath,
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
      // Client server
      await this.clientService.start({
        manifest: clientServerManifest({
          polykeyAgent: this,
          acl: this.acl,
          certManager: this.certManager,
          db: this.db,
          discovery: this.discovery,
          fs: this.fs,
          gestaltGraph: this.gestaltGraph,
          identitiesManager: this.identitiesManager,
          keyRing: this.keyRing,
          logger: this.logger,
          nodeConnectionManager: this.nodeConnectionManager,
          nodeGraph: this.nodeGraph,
          nodeManager: this.nodeManager,
          notificationsManager: this.notificationsManager,
          sessionManager: this.sessionManager,
          vaultManager: this.vaultManager,
        }),
        host: optionsDefaulted.clientServiceHost,
        port: optionsDefaulted.clientServicePort,
      });
      await this.mdns.start({
        id: this.keyRing.getNodeId().toBuffer().readUint16BE(),
        hostname: nodesUtils.encodeNodeId(this.keyRing.getNodeId()),
        groups: optionsDefaulted.mdns.groups,
        port: optionsDefaulted.mdns.port,
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
      if (optionsDefaulted.workers != null) {
        this.workerManager = await workersUtils.createWorkerManager({
          // 0 means max workers
          cores:
            optionsDefaulted.workers === 0
              ? undefined
              : optionsDefaulted.workers,
          logger: this.logger.getChild(WorkerManager.name),
        });
        this.vaultManager.setWorkerManager(this.workerManager);
        this.db.setWorkerManager(this.workerManager);
      }
      await this.status.finishStart({
        pid: process.pid,
        nodeId: this.keyRing.getNodeId(),
        clientHost: this.clientService.host,
        clientPort: this.clientService.port,
        agentHost: this.nodeConnectionManager.host,
        agentPort: this.nodeConnectionManager.port,
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
      await this.mdns?.stop();
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
    await this.mdns.stop();
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

export type { PolykeyAgentOptions };
