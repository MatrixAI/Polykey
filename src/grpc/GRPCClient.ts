import type { Http2Session } from 'http2';
import type { TLSSocket } from 'tls';
import type { ChannelCredentials, ClientOptions, Client } from '@grpc/grpc-js';
import type { NodeId } from '../nodes/types';
import type { Certificate } from '../keys/types';
import type { Host, Port, TLSConfig, ProxyConfig } from '../network/types';

import http2 from 'http2';
import Logger from '@matrixai/logger';
import * as grpcUtils from './utils';
import * as grpcErrors from './errors';
import { utils as keysUtils } from '../keys';
import { utils as networkUtils, errors as networkErrors } from '../network';
import { promisify } from '../utils';

abstract class GRPCClient<T extends Client> {
  public readonly nodeId: NodeId;
  public readonly host: Host;
  public readonly port: Port;
  public readonly proxyConfig?: Readonly<ProxyConfig>;

  protected logger: Logger;
  protected client: T;
  protected session: Http2Session;
  protected serverCertChain: Array<Certificate>;
  protected _secured: boolean = false;
  protected _started: boolean = false;

  constructor({
    nodeId,
    host,
    port,
    proxyConfig,
    logger,
  }: {
    nodeId: NodeId;
    host: Host;
    port: Port;
    proxyConfig?: ProxyConfig;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger('GRPCClient');
    this.nodeId = nodeId;
    this.host = host;
    this.port = port;
    this.proxyConfig = proxyConfig;
  }

  get started(): boolean {
    return this._started;
  }

  get secured(): boolean {
    return this._secured;
  }

  public async start({
    clientConstructor,
    tlsConfig,
    timeout = Infinity,
  }: {
    clientConstructor: new (
      address: string,
      credentials: ChannelCredentials,
      options?: ClientOptions,
    ) => T;
    tlsConfig?: TLSConfig;
    timeout?: number;
  }): Promise<void> {
    if (this._started) {
      return;
    }
    const address = networkUtils.buildAddress(this.host, this.port);
    this.logger.info(`Starting GRPC Client connecting to ${address}`);
    let clientCredentials;
    if (tlsConfig == null) {
      clientCredentials = grpcUtils.clientInsecureCredentials();
    } else {
      clientCredentials = grpcUtils.clientSecureCredentials(
        tlsConfig.keyPrivatePem,
        tlsConfig.certChainPem,
      );
    }
    const clientOptions: ClientOptions = {
      // prevents complaints with having an ip address as the server name
      'grpc.ssl_target_name_override': this.nodeId,
    };
    let client: T;
    if (this.proxyConfig == null) {
      client = new clientConstructor(address, clientCredentials, clientOptions);
    } else {
      const proxyAddress = networkUtils.buildAddress(
        this.proxyConfig.host,
        this.proxyConfig.port,
      );
      // Encode as a URI in order to preserve the '+' characters when retrieving
      // in ForwardProxy from the http_connect_target URL
      const encodedNodeId = encodeURIComponent(this.nodeId);
      // ignore proxy env variables
      clientOptions['grpc.enable_http_proxy'] = 0;
      // the proxy target target is the true address
      clientOptions[
        'grpc.http_connect_target'
      ] = `dns:${address}/?nodeId=${encodedNodeId}`;
      clientOptions['grpc.http_connect_creds'] = this.proxyConfig.authToken;
      client = new clientConstructor(
        proxyAddress,
        clientCredentials,
        clientOptions,
      );
    }
    const waitForReady = promisify(client.waitForReady).bind(client);
    // add the current unix time because grpc expects the milliseconds since unix epoch
    timeout += Date.now();
    try {
      await waitForReady(timeout);
    } catch (e) {
      throw new grpcErrors.ErrorGRPCClientTimeout();
    }
    if (clientCredentials._isSecure()) {
      const session = grpcUtils.getClientSession(
        client,
        clientOptions,
        clientCredentials,
        this.host,
        this.port,
      );
      const socket = session.socket as TLSSocket;
      const serverCertChain = networkUtils.getCertificateChain(socket);
      try {
        networkUtils.verifyServerCertificateChain(this.nodeId, serverCertChain);
      } catch (e) {
        const e_ = e;
        if (e instanceof networkErrors.ErrorCertChain) {
          this.logger.warn(
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
      this.session = session;
      this.serverCertChain = serverCertChain;
      this._secured = true;
    }
    this.client = client;
    this._started = true;
    this.logger.info(`Started GRPC Client connected to ${address}`);
  }

  public async stop(): Promise<void> {
    if (!this._started) {
      return;
    }
    const address = `${this.host}:${this.port}`;
    this.logger.info(`Stopping GRPC Client connected to ${address}`);
    // this currently doesn't stop all inflight requests
    // https://github.com/grpc/grpc-node/issues/1340
    this.client.close();
    this._secured = false;
    this._started = false;
    this.logger.info(`Stopped GRPC Client connected to ${address}`);
  }

  public getServerCertificate(): Certificate {
    if (!this._secured) {
      throw new grpcErrors.ErrorGRPCClientNotSecured();
    }
    return keysUtils.certCopy(this.serverCertChain[0]);
  }

  public getServerCertificates(): Array<Certificate> {
    if (!this._secured) {
      throw new grpcErrors.ErrorGRPCClientNotSecured();
    }
    return this.serverCertChain.map((crt) => keysUtils.certCopy(crt));
  }
}

export default GRPCClient;
