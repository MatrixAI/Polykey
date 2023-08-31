import type { ContextTimed } from '@matrixai/contexts';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { NodeId } from './types';
import type { Host, Hostname, Port, TLSConfig } from '../network/types';
import type { Certificate, CertificatePEM } from '../keys/types';
import type { ClientManifest } from '../rpc/types';
import type { QUICSocket, ClientCrypto, QUICConnection } from '@matrixai/quic';
import type { ContextTimedInput } from '@matrixai/contexts/dist/types';
import type { X509Certificate } from '@peculiar/x509';
import Logger from '@matrixai/logger';
import { CreateDestroy } from '@matrixai/async-init/dist/CreateDestroy';
import { timedCancellable, context } from '@matrixai/contexts/dist/decorators';
import { Evented } from '@matrixai/events';
import { QUICClient, events as quicEvents } from '@matrixai/quic';
import { QUICClientEvent } from '@matrixai/quic/dist/events';
import * as nodesErrors from './errors';
import * as nodesEvents from './events';
import RPCClient from '../rpc/RPCClient';
import * as networkUtils from '../network/utils';
import * as rpcUtils from '../rpc/utils';
import * as keysUtils from '../keys/utils';
import * as nodesUtils from '../nodes/utils';
import { never } from '../utils';

/**
 * Encapsulates the unidirectional client-side connection of one node to another.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- False positive for M
interface NodeConnection<M extends ClientManifest> extends CreateDestroy {}
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- False positive for M
interface NodeConnection<M extends ClientManifest> extends Evented {}
@CreateDestroy()
@Evented()
class NodeConnection<M extends ClientManifest> {
  /**
   * Hostname is defined if the target's host was resolved from this hostname
   * Undefined if a Host was directly provided
   */
  public readonly hostname?: Hostname;
  /**
   * The NodeId that it was validated on when verifying the peer
   */
  public readonly validatedNodeId: NodeId;
  /**
   * The most current NodeId of the peer's cert chain
   */
  public readonly nodeId: NodeId;
  public readonly host: Host;
  public readonly port: Port;
  public readonly localHost: Host;
  public readonly localPort: Port;
  public readonly certChain: Readonly<X509Certificate>[];

  protected logger: Logger;
  public readonly quicClient: QUICClient | undefined;
  public readonly quicConnection: QUICConnection;
  public readonly rpcClient: RPCClient<M>;

  static createNodeConnection<M extends ClientManifest>(
    {
      targetNodeIds,
      targetHost,
      targetPort,
      targetHostname,
      tlsConfig,
      connectionKeepAliveIntervalTime,
      connectionMaxIdleTimeout = 60_000,
      quicSocket,
      manifest,
      logger,
    }: {
      targetNodeIds: Array<NodeId>;
      targetHost: Host;
      targetPort: Port;
      targetHostname?: Hostname;
      crypto: ClientCrypto;
      tlsConfig: TLSConfig;
      connectionKeepAliveIntervalTime?: number;
      connectionMaxIdleTimeout?: number;
      quicSocket?: QUICSocket;
      manifest: M;
      logger?: Logger;
    },
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<NodeConnection<M>>;
  @timedCancellable(true, 20000)
  static async createNodeConnection<M extends ClientManifest>(
    {
      targetNodeIds,
      targetHost,
      targetPort,
      targetHostname,
      crypto,
      tlsConfig,
      manifest,
      connectionKeepAliveIntervalTime,
      connectionMaxIdleTimeout = 60_000,
      quicSocket,
      logger = new Logger(this.name),
    }: {
      targetNodeIds: Array<NodeId>;
      targetHost: Host;
      targetPort: Port;
      targetHostname?: Hostname;
      crypto: ClientCrypto;
      tlsConfig: TLSConfig;
      manifest: M;
      connectionKeepAliveIntervalTime?: number;
      connectionMaxIdleTimeout?: number;
      quicSocket?: QUICSocket;
      logger?: Logger;
    },
    @context ctx: ContextTimed,
  ): Promise<NodeConnection<M>> {
    logger.info(`Creating ${this.name}`);
    // Checking if attempting to connect to a wildcard IP
    if (networkUtils.isHostWildcard(targetHost)) {
      throw new nodesErrors.ErrorNodeConnectionHostWildcard();
    }
    let validatedNodeId: NodeId | undefined;
    const quicClient = await QUICClient.createQUICClient(
      {
        host: targetHost,
        port: targetPort,
        socket: quicSocket,
        config: {
          keepAliveIntervalTime: connectionKeepAliveIntervalTime,
          maxIdleTimeout: connectionMaxIdleTimeout,
          verifyPeer: true,
          verifyAllowFail: true,
          ca: undefined,
          key: tlsConfig.keyPrivatePem,
          cert: tlsConfig.certChainPem,
        },
        verifyCallback: async (certPEMs) => {
          validatedNodeId = await networkUtils.verifyServerCertificateChain(
            targetNodeIds,
            certPEMs,
          );
        },
        crypto: {
          ops: crypto,
        },
        reasonToCode: nodesUtils.reasonToCode,
        codeToReason: nodesUtils.codeToReason,
        logger: logger.getChild(QUICClient.name),
      },
      ctx,
    );
    const quicConnection = quicClient.connection;
    // FIXME: right now I'm not sure it's possible for streams to be emitted while setting up here.
    //  If we get any while setting up they need to be re-emitted after set up. Otherwise cleaned up.
    const throwFunction = () =>
      never('We should never get connections before setting up handling');
    quicConnection.addEventListener('connectionStream', throwFunction);
    const rpcClient = await RPCClient.createRPCClient<M>({
      manifest,
      middlewareFactory: rpcUtils.defaultClientMiddlewareWrapper(),
      streamFactory: () => {
        return quicConnection.streamNew();
      },
      logger: logger.getChild(RPCClient.name),
    });
    if (validatedNodeId == null) never();
    // Obtaining remote node ID from certificate chain. It should always exist in the chain if validated.
    //  This may de different from the NodeId we validated it as if it renewed at some point.
    const connection = quicClient.connection;
    // Remote certificate information should always be available here due to custom verification
    const certChain = connection.getRemoteCertsChain().map((pem) => {
      const cert = keysUtils.certFromPEM(pem as CertificatePEM);
      if (cert == null) never();
      return cert;
    });
    if (certChain == null) never();
    const nodeId = keysUtils.certNodeId(certChain[0]);
    if (nodeId == null) never();
    const newLogger = logger.getParent() ?? new Logger(this.name);
    const nodeConnection = new this<M>({
      validatedNodeId,
      nodeId,
      host: targetHost,
      port: targetPort,
      localHost: connection.localHost as Host,
      localPort: connection.localPort as Port,
      certChain,
      hostname: targetHostname,
      quicClient,
      quicConnection,
      rpcClient,
      logger: newLogger.getChild(
        `${this.name} [${nodesUtils.encodeNodeId(nodeId)}@${
          quicConnection.remoteHost
        }:${quicConnection.remotePort}]`,
      ),
    });
    // TODO: remove this later based on testing
    quicConnection.removeEventListener('connectionStream', throwFunction);
    // QUICClient events are...
    //   - QUICClientEvent,
    //   - QUICClientDestroyEvent,
    //   - QUICClientErrorEvent,
    // QUICConnection events are...
    //   - QUICConnectionEvent,
    //   - QUICConnectionStreamEvent,
    //   - QUICConnectionStopEvent,
    //   - QUICConnectionErrorEvent,
    // QUICStream events are...
    //   - QUICStreamEvent,
    //   - QUICStreamDestroyEvent,
    const handleNodeConnectionEvents = (e) => {
      if (e instanceof quicEvents.QUICClientDestroyEvent) {
        // Trigger the nodeConnection destroying
        void nodeConnection.destroy({ force: false });
      } else if (e instanceof quicEvents.QUICConnectionStreamEvent) {
        const quicStream = e.detail;
        // Setting up stream handling
        quicStream.addEventListener(
          quicEvents.QUICStreamDestroyEvent.name,
          (e) => {
            nodeConnection.dispatchEvent(e.clone());
          },
          { once: true },
        );
        nodeConnection.dispatchEvent(
          new nodesEvents.EventNodeStream({ detail: quicStream }),
        );
      }
      nodeConnection.dispatchEvent(e.clone());
    };
    // Setting up QUICConnection events
    quicConnection.addEventListener(handleNodeConnectionEvents);
    quicConnection.addEventListener(
      quicEvents.QUICConnectionStopEvent.name,
      () => {
        quicConnection.removeEventListener(handleNodeConnectionEvents);
      },
      { once: true },
    );
    // Setting up QUICClient events
    quicClient.addEventListener(handleNodeConnectionEvents);
    quicClient.addEventListener(
      quicEvents.QUICClientDestroyEvent.name,
      () => {
        quicClient.removeEventListener(handleNodeConnectionEvents);
      },
      { once: true },
    );
    logger.info(`Created ${this.name}`);
    return nodeConnection;
  }

  static async createNodeConnectionReverse<M extends ClientManifest>({
    certChain,
    nodeId,
    quicConnection,
    manifest,
    logger = new Logger(this.name),
  }: {
    certChain: Array<Certificate>;
    nodeId: NodeId;
    quicConnection: QUICConnection;
    manifest: M;
    logger?: Logger;
  }): Promise<NodeConnection<M>> {
    logger.info(`Creating ${this.name}`);
    // Creating RPCClient
    const rpcClient = await RPCClient.createRPCClient<M>({
      manifest,
      middlewareFactory: rpcUtils.defaultClientMiddlewareWrapper(),
      streamFactory: () => {
        return quicConnection.streamNew();
      },
      logger: logger.getChild(RPCClient.name),
    });
    // Creating NodeConnection
    const nodeConnection = new this<M>({
      validatedNodeId: nodeId,
      nodeId: nodeId,
      localHost: quicConnection.localHost as Host,
      localPort: quicConnection.localPort as Port,
      host: quicConnection.remoteHost as Host,
      port: quicConnection.remotePort as Port,
      certChain,
      // Hostname and client are not available on reverse connections
      hostname: undefined,
      quicClient: undefined,
      quicConnection,
      rpcClient,
      logger,
    });
    // QUICClient events are...
    //   - QUICClientEvent,
    //   - QUICClientDestroyEvent,
    //   - QUICClientErrorEvent,
    // QUICConnection events are...
    //   - QUICConnectionEvent,
    //   - QUICConnectionStreamEvent,
    //   - QUICConnectionStopEvent,
    //   - QUICConnectionErrorEvent,
    const handleNodeConnectionEvents = (e) => {
      if (e instanceof quicEvents.QUICClientDestroyEvent) {
        // Trigger the nodeConnection destroying
        void nodeConnection.destroy({ force: false });
      } else if (e instanceof quicEvents.QUICConnectionStreamEvent) {
        const quicStream = e.detail;
        // Setting up stream handling
        quicStream.addEventListener(
          quicEvents.QUICStreamDestroyEvent.name,
          (e) => {
            nodeConnection.dispatchEvent(e.clone());
          },
          { once: true },
        );
        nodeConnection.dispatchEvent(
          new nodesEvents.EventNodeStream({ detail: quicStream }),
        );
      }
      nodeConnection.dispatchEvent(e.clone());
    };
    // Setting up QUICConnection events
    quicConnection.addEventListener(handleNodeConnectionEvents);
    quicConnection.addEventListener(
      quicEvents.QUICConnectionStopEvent.name,
      () => {
        quicConnection.removeEventListener(handleNodeConnectionEvents);
      },
      { once: true },
    );
    logger.info(`Created ${this.name}`);
    return nodeConnection;
  }

  constructor({
    validatedNodeId,
    nodeId,
    host,
    port,
    localHost,
    localPort,
    certChain,
    hostname,
    quicClient,
    quicConnection,
    rpcClient,
    logger,
  }: {
    validatedNodeId: NodeId;
    nodeId: NodeId;
    host: Host;
    port: Port;
    localHost: Host;
    localPort: Port;
    certChain: Readonly<X509Certificate>[];
    hostname?: Hostname;
    quicClient?: QUICClient;
    quicConnection: QUICConnection;
    rpcClient: RPCClient<M>;
    logger: Logger;
  }) {
    this.validatedNodeId = validatedNodeId;
    this.nodeId = nodeId;
    this.host = host;
    this.port = port;
    this.localHost = localHost;
    this.localPort = localPort;
    this.certChain = certChain;
    this.hostname = hostname;
    this.quicClient = quicClient;
    this.quicConnection = quicConnection;
    this.rpcClient = rpcClient;
    this.logger = logger;
  }

  public async destroy({
    force,
  }: {
    force?: boolean;
  } = {}) {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.quicClient?.destroy({ force });
    // This is only needed for reverse connections, otherwise it is handled by the quicClient.
    await this.quicConnection.stop(
      force
        ? {
            applicationError: true,
            errorCode: 0,
            errorMessage: 'NodeConnection is forcing destruction',
            force: true,
          }
        : {},
    );
    await this.rpcClient.destroy();
    this.logger.debug(`${this.constructor.name} triggered destroyed event`);
    this.dispatchEvent(new nodesEvents.EventNodeConnectionDestroy());
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Gets RPCClient for this node connection
   */
  public getClient(): RPCClient<M> {
    return this.rpcClient;
  }
}

export default NodeConnection;
