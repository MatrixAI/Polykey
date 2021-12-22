import type { TLSSocket } from 'tls';
import type {
  Client,
  ClientOptions,
  ChannelCredentials,
  ChannelOptions,
  Interceptor,
} from '@grpc/grpc-js';
import type { NodeId } from '../nodes/types';
import type { Certificate } from '../keys/types';
import type { Host, Port, TLSConfig, ProxyConfig } from '../network/types';
import http2 from 'http2';
import Logger from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import * as grpcUtils from './utils';
import * as grpcErrors from './errors';
import * as keysUtils from '../keys/utils';
import * as networkUtils from '../network/utils';
import * as networkErrors from '../network/errors';
import * as nodeUtils from '../nodes/utils';
import {
  promisify,
  promise,
  timerStart,
  timerStop,
  never,
} from '../utils/utils';

abstract class GRPCClient<T extends Client = Client> {
  /**
   * Create the gRPC client
   * This will asynchronously start the connection and verify the
   * server certificate
   * This is not intended to create GRPCClient, instead downstream
   * derived classes should call this as part of their asynchronous
   * creation
   * By default timeout is Infinity which means it retries connection
   * establishment forever
   */
  public static async createClient<T extends Client = Client>({
    clientConstructor,
    nodeId,
    host,
    port,
    tlsConfig,
    proxyConfig,
    timeout = Infinity,
    interceptors = [],
    logger = new Logger(this.name),
  }: {
    clientConstructor: new (
      address: string,
      credentials: ChannelCredentials,
      options?: ClientOptions,
    ) => T;
    nodeId: NodeId;
    host: Host;
    port: Port;
    tlsConfig?: Partial<TLSConfig>;
    proxyConfig?: ProxyConfig;
    timeout?: number;
    interceptors?: Array<Interceptor>;
    logger?: Logger;
  }): Promise<{
    client: T;
    flowCountInterceptor: grpcUtils.FlowCountInterceptor;
    serverCertChain?: Array<Certificate>;
  }> {
    const nodeIdEncoded = nodeUtils.encodeNodeId(nodeId);
    const address = networkUtils.buildAddress(host, port);
    logger.info(`Creating ${this.name} connecting to ${address}`);
    let channelCredentials: ChannelCredentials;
    if (tlsConfig != null) {
      // If the root keys and certificate isn't used
      // then no client authentication is performed
      // however the connection is still encrypted
      channelCredentials = grpcUtils.clientSecureCredentials(
        tlsConfig.keyPrivatePem,
        tlsConfig.certChainPem,
      );
    } else {
      // Plain-text connection
      channelCredentials = grpcUtils.clientInsecureCredentials();
    }
    // Every client has its own channel
    // The channel manages all the connections for a client object
    // The options for the channel is separate from options used by the Client
    // The channel options is needed to be able to look up the server certificate
    const channelOptions: ChannelOptions = {
      // Prevents complaints with having an ip address as the server name
      'grpc.ssl_target_name_override': nodeIdEncoded,
    };
    const flowCountInterceptor = new grpcUtils.FlowCountInterceptor();
    const clientOptions: ClientOptions = {
      // Interceptor middleware on every call
      interceptors: [flowCountInterceptor.interceptor, ...interceptors],
    };
    let client: T;
    if (proxyConfig == null) {
      client = new clientConstructor(address, channelCredentials, {
        ...channelOptions,
        ...clientOptions,
      });
    } else {
      const proxyAddress = networkUtils.buildAddress(
        proxyConfig.host,
        proxyConfig.port,
      );
      // Encode as a URI in order to preserve the '+' characters when retrieving
      // in ForwardProxy from the http_connect_target URL
      const nodeIdEncodedForURI = encodeURIComponent(nodeIdEncoded);
      // Ignore proxy env variables
      channelOptions['grpc.enable_http_proxy'] = 0;
      // The proxy target target is the true address
      channelOptions[
        'grpc.http_connect_target'
      ] = `dns:${address}/?nodeId=${nodeIdEncodedForURI}`;
      channelOptions['grpc.http_connect_creds'] = proxyConfig.authToken;
      client = new clientConstructor(proxyAddress, channelCredentials, {
        ...channelOptions,
        ...clientOptions,
      });
    }
    const waitForReady = promisify(client.waitForReady).bind(client);
    // Add the current unix time because grpc expects the milliseconds since unix epoch
    timeout += Date.now();
    try {
      await waitForReady(timeout);
    } catch (e) {
      // If we fail here then we leak the client object...
      client.close();
      throw new grpcErrors.ErrorGRPCClientTimeout();
    }
    let serverCertChain: Array<Certificate> | undefined;
    if (channelCredentials._isSecure()) {
      const session = grpcUtils.getClientSession(
        client,
        channelOptions,
        channelCredentials,
        host,
        port,
      );
      const socket = session.socket as TLSSocket;
      serverCertChain = networkUtils.getCertificateChain(socket);
      try {
        networkUtils.verifyServerCertificateChain(nodeId, serverCertChain);
      } catch (e) {
        const e_ = e;
        if (e instanceof networkErrors.ErrorCertChain) {
          logger.warn(
            `Failed GRPC server certificate verification connecting to ${address}`,
          );
          const e_ = new grpcErrors.ErrorGRPCClientVerification(
            `${e.name}: ${e.message}`,
            e.data,
          );
          session.destroy(e_, http2.constants.NGHTTP2_PROTOCOL_ERROR);
        }
        throw e_;
      }
    }
    logger.info(`Created ${this.name} connecting to ${address}`);
    return { client, serverCertChain, flowCountInterceptor };
  }

  public readonly nodeId: NodeId;
  public readonly host: Host;
  public readonly port: Port;
  public readonly tlsConfig?: Readonly<Partial<TLSConfig>>;
  public readonly proxyConfig?: Readonly<ProxyConfig>;

  protected logger: Logger;
  protected client: T;
  protected serverCertChain?: Array<Certificate>;
  protected flowCountInterceptor?: grpcUtils.FlowCountInterceptor;
  protected _secured: boolean = false;
  protected destroyCallback: () => Promise<void>;

  constructor({
    client,
    nodeId,
    host,
    port,
    tlsConfig,
    proxyConfig,
    serverCertChain,
    flowCountInterceptor,
    destroyCallback = async () => {},
    logger,
  }: {
    client: T;
    nodeId: NodeId;
    host: Host;
    port: Port;
    tlsConfig?: Partial<TLSConfig>;
    proxyConfig?: ProxyConfig;
    serverCertChain?: Array<Certificate>;
    flowCountInterceptor?: grpcUtils.FlowCountInterceptor;
    destroyCallback?: () => Promise<void>;
    logger: Logger;
  }) {
    this.logger = logger;
    this.client = client;
    this.nodeId = nodeId;
    this.host = host;
    this.port = port;
    this.tlsConfig = tlsConfig;
    this.proxyConfig = proxyConfig;
    this.serverCertChain = serverCertChain;
    this.flowCountInterceptor = flowCountInterceptor;
    this.destroyCallback = destroyCallback;
    if (tlsConfig != null) {
      this._secured = true;
    }
    // Register the channel state watcher
    this.watchChannelState();
  }

  get secured(): boolean {
    return this._secured;
  }

  public async destroy({
    timeout,
  }: {
    timeout?: number;
  } = {}): Promise<void> {
    const address = `${this.host}:${this.port}`;
    this.logger.info(
      `Destroying ${this.constructor.name} connected to ${address}`,
    );
    // This currently doesn't stop all inflight requests
    // https://github.com/grpc/grpc-node/issues/1340
    this.client.close();
    // Block until all flow count is empty
    // This ensures asynchronous interceptors are completed
    // Before this function returns
    if (
      this.flowCountInterceptor != null &&
      this.flowCountInterceptor.flowCount !== 0
    ) {
      const { p: flowEmptyP, resolveP: resolveFlowEmptyP } = promise<void>();
      this.flowCountInterceptor.once('empty', () => {
        resolveFlowEmptyP();
      });
      const timer = timeout != null ? timerStart(timeout) : undefined;
      try {
        await Promise.race([
          flowEmptyP,
          ...(timer != null ? [timer.timerP] : []),
        ]);
      } finally {
        if (timer != null) timerStop(timer);
      }
      if (timer?.timedOut) {
        this.logger.info(
          `Timed out stopping ${this.constructor.name}, forcing destroy`,
        );
      }
    }
    await this.destroyCallback();
    this.logger.info(
      `Destroyed ${this.constructor.name} connected to ${address}`,
    );
  }

  /**
   * Gets the leaf server certificate if the connection is encrypted
   * Don't use this when using network proxies
   */
  public getServerCertificate(): Certificate | undefined {
    if (this.serverCertChain == null) {
      return;
    }
    return keysUtils.certCopy(this.serverCertChain[0]);
  }

  /**
   * Gets the server certificate chain if the connection is encrypted
   * Don't use this when using network proxies
   */
  public getServerCertificates(): Array<Certificate> | undefined {
    if (this.serverCertChain == null) {
      return;
    }
    return this.serverCertChain!.map((crt) => keysUtils.certCopy(crt));
  }

  /**
   * Watches for connection state change
   * Calls `this.destroy()` when the underlying channel is destroyed
   */
  protected watchChannelState() {
    const channel = this.client.getChannel();
    let connected = false;
    const checkState = async (e?: Error) => {
      if (e != null) {
        // This should not happen because the error should only occur
        // when the deadline is exceeded, however our deadline here is Infinity
        this.logger.warn(`Watch Channel State Error: ${e.toString()}`);
        never();
      }
      const state = channel.getConnectivityState(false);
      this.logger.debug(
        `Watch Channel State: ${grpc.connectivityState[state]}`,
      );
      switch (state) {
        case grpc.connectivityState.READY:
          connected = true;
          break;
        case grpc.connectivityState.IDLE:
          // If connected already, then switching to IDLE means
          // the connection has timed out
          if (connected) {
            await this.destroy();
            return;
          }
          break;
        case grpc.connectivityState.SHUTDOWN:
          await this.destroy();
          return;
      }
      try {
        channel.watchConnectivityState(state, Infinity, checkState);
      } catch (e) {
        // Exception occurs only when the channel is already shutdown
        await this.destroy();
        return;
      }
    };
    checkState().then(
      () => {},
      () => {},
    );
  }
}

export default GRPCClient;
