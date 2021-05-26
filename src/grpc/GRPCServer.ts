import type { TLSSocket } from 'tls';
import type { Http2SecureServer, Http2Session } from 'http2';
import type { ServerCredentials } from '@grpc/grpc-js';
import type { Services } from './types';
import type { Certificate } from '../keys/types';
import type { Host, Port, TLSConfig } from '../network/types';

import http2 from 'http2';
import Logger from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import * as grpcUtils from './utils';
import * as grpcErrors from './errors';
import { utils as networkUtils, errors as networkErrors } from '../network';
import { promisify } from '../utils';

class GRPCServer {
  protected services: Services;
  protected logger: Logger;
  protected host: Host;
  protected port: Port;
  protected server: grpc.Server;
  protected clientCertChains: WeakMap<
    Http2Session,
    Array<Certificate>
  > = new WeakMap();
  protected _secured: boolean = false;
  protected _started: boolean = false;

  constructor({ services, logger }: { services: Services; logger?: Logger }) {
    this.logger = logger ?? new Logger('GRPCServer');
    this.services = services;
  }

  get started(): boolean {
    return this._started;
  }

  get secured(): boolean {
    return this._secured;
  }

  public async start({
    host = '::' as Host,
    port = 0 as Port,
    tlsConfig,
  }: {
    host?: Host;
    port?: Port;
    tlsConfig?: TLSConfig;
  }): Promise<void> {
    if (this._started) {
      return;
    }
    let address = networkUtils.buildAddress(host, port);
    this.logger.info(`Starting GRPC Server on ${address}`);
    let serverCredentials: ServerCredentials;
    if (tlsConfig == null) {
      serverCredentials = grpcUtils.serverInsecureCredentials();
    } else {
      serverCredentials = grpcUtils.serverSecureCredentials(
        tlsConfig.keyPrivatePem,
        tlsConfig.certChainPem,
      );
    }
    // grpc servers must be recreated after they are stopped
    const server = new grpc.Server();
    for (const [serviceInterface, serviceImplementation] of this.services) {
      server.addService(serviceInterface, serviceImplementation);
    }
    const bindAsync = promisify(server.bindAsync).bind(server);
    try {
      port = await bindAsync(address, serverCredentials);
    } catch (e) {
      throw new grpcErrors.ErrorGRPCServerBind(e.message);
    }
    if (serverCredentials._isSecure()) {
      // @ts-ignore hack for private property
      const http2Servers = server.http2ServerList as Array<Http2SecureServer>;
      for (const http2Server of http2Servers) {
        http2Server.on('session', (session: Http2Session) => {
          const socket = session.socket as TLSSocket;
          const address = networkUtils.buildAddress(
            socket.remoteAddress as Host,
            socket.remotePort as Port,
          );
          this.logger.debug(`Receiving GRPC Client connecting from ${address}`);
          const clientCertChain = networkUtils.getCertificateChain(socket);
          try {
            networkUtils.verifyClientCertificateChain(clientCertChain);
            this.logger.debug(
              `Received GRPC Client connecting from ${address}`,
            );
            this.clientCertChains.set(session, clientCertChain);
          } catch (e) {
            if (e instanceof networkErrors.ErrorCertChain) {
              this.logger.debug(
                `Failed GRPC client certificate verification connecting from ${address}`,
              );
              const e_ = new grpcErrors.ErrorGRPCServerVerification(
                `${e.name}: ${e.message}`,
                e.data,
              );
              session.destroy(e_, http2.constants.NGHTTP2_PROTOCOL_ERROR);
            } else {
              throw e;
            }
          }
        });
      }
    }
    server.start();
    this.host = host;
    this.port = port;
    this.server = server;
    this._started = true;
    if (serverCredentials._isSecure()) {
      this._secured = true;
    }
    address = networkUtils.buildAddress(host, port);
    this.logger.info(`Started GRPC Server on ${address}`);
  }

  public async stop(): Promise<void> {
    if (!this._started) {
      return;
    }
    this.logger.info('Stopping GRPC Server');
    const tryShutdown = promisify(this.server.tryShutdown).bind(this.server);
    try {
      await tryShutdown();
    } catch (e) {
      throw new grpcErrors.ErrorGRPCServerShutdown(e.message);
    }
    this._secured = false;
    this._started = false;
    this.logger.info('Stopped GRPC Server');
  }

  public getHost(): Host {
    if (!this._started) {
      throw new grpcErrors.ErrorGRPCServerNotStarted();
    }
    return this.host;
  }

  public getPort(): Port {
    if (!this._started) {
      throw new grpcErrors.ErrorGRPCServerNotStarted();
    }
    return this.port;
  }

  public getClientCertificate(session: Http2Session): Certificate {
    if (!this._secured) {
      throw new grpcErrors.ErrorGRPCServerNotSecured();
    }
    return this.clientCertChains.get(session)![0];
  }

  public getClientCertificates(session: Http2Session): Array<Certificate> {
    if (!this._secured) {
      throw new grpcErrors.ErrorGRPCServerNotSecured();
    }
    return this.clientCertChains.get(session)!;
  }

  public setTLSConfig(tlsConfig: TLSConfig): void {
    if (!this._secured) {
      throw new grpcErrors.ErrorGRPCServerNotSecured();
    }
    this.logger.info('Updating GRPC Server TLS Config');
    // @ts-ignore hack for private property
    const http2Servers = this.server.http2ServerList;
    for (const http2Server of http2Servers as Array<Http2SecureServer>) {
      http2Server.setSecureContext({
        key: Buffer.from(tlsConfig.keyPrivatePem, 'ascii'),
        cert: Buffer.from(tlsConfig.certChainPem, 'ascii'),
      });
    }
    return;
  }
}

export default GRPCServer;
