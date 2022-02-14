import type { TLSSocket } from 'tls';
import type { Http2SecureServer, Http2Session } from 'http2';
import type { ServerCredentials } from '@grpc/grpc-js';
import type { Services } from './types';
import type { Certificate } from '../keys/types';
import type { Host, Port, TLSConfig } from '../network/types';

import http2 from 'http2';
import Logger from '@matrixai/logger';
import { StartStop, ready } from '@matrixai/async-init/dist/StartStop';
import * as grpc from '@grpc/grpc-js';
import * as grpcUtils from './utils';
import * as grpcErrors from './errors';
import * as networkUtils from '../network/utils';
import * as networkErrors from '../network/errors';
import { promisify, timerStart, timerStop } from '../utils/utils';

interface GRPCServer extends StartStop {}
@StartStop()
class GRPCServer {
  protected services: Services;
  protected logger: Logger;
  protected _host: Host;
  protected _port: Port;
  protected server: grpc.Server;
  protected clientCertChains: WeakMap<Http2Session, Array<Certificate>> =
    new WeakMap();
  protected tlsConfig?: TLSConfig;
  protected _secured: boolean = false;

  constructor({ logger }: { logger?: Logger } = {}) {
    this.logger = logger ?? new Logger(this.constructor.name);
  }

  get secured(): boolean {
    return this._secured;
  }

  public async start({
    services,
    host = '127.0.0.1' as Host,
    port = 0 as Port,
    tlsConfig,
  }: {
    services: Services;
    host?: Host;
    port?: Port;
    tlsConfig?: TLSConfig;
  }): Promise<void> {
    this._host = host;
    this.tlsConfig = tlsConfig;
    this.services = services;
    let address = networkUtils.buildAddress(this._host, port);
    this.logger.info(`Starting ${this.constructor.name} on ${address}`);
    let serverCredentials: ServerCredentials;
    if (this.tlsConfig == null) {
      serverCredentials = grpcUtils.serverInsecureCredentials();
    } else {
      serverCredentials = grpcUtils.serverSecureCredentials(
        this.tlsConfig.keyPrivatePem,
        this.tlsConfig.certChainPem,
      );
    }
    // Grpc servers must be recreated after they are stopped
    const server = new grpc.Server();
    for (const [serviceInterface, serviceImplementation] of this.services) {
      server.addService(serviceInterface, serviceImplementation);
    }
    const bindAsync = promisify(server.bindAsync).bind(server);
    try {
      this._port = await bindAsync(address, serverCredentials);
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
          if (clientCertChain.length === 0) {
            // Client connected without providing certs.
            this.logger.debug(
              `${address} connected without providing certificates`,
            );
          } else {
            try {
              networkUtils.verifyClientCertificateChain(clientCertChain);
              this.logger.debug(`Verified certificate from ${address}`);
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
          }
        });
      }
    }
    server.start();
    this.server = server;
    if (serverCredentials._isSecure()) {
      this._secured = true;
    }
    address = networkUtils.buildAddress(this._host, this._port);
    this.logger.info(`Started ${this.constructor.name} on ${address}`);
  }

  /**
   * Stop the GRPC Server
   * Graceful shutdown can be flaky
   * Use a timeout to eventually force shutdown
   */
  public async stop({
    timeout,
  }: {
    timeout?: number;
  } = {}): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    const tryShutdown = promisify(this.server.tryShutdown).bind(this.server);
    const timer = timeout != null ? timerStart(timeout) : undefined;
    try {
      await Promise.race([
        tryShutdown(),
        ...(timer != null ? [timer.timerP] : []),
      ]);
    } catch (e) {
      throw new grpcErrors.ErrorGRPCServerShutdown(e.message);
    } finally {
      if (timer != null) timerStop(timer);
    }
    if (timer?.timedOut) {
      this.logger.info(
        `Timed out stopping ${this.constructor.name}, forcing shutdown`,
      );
      this.server.forceShutdown();
    }
    this._secured = false;
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  @ready(new grpcErrors.ErrorGRPCServerNotRunning())
  get host(): Host {
    return this._host;
  }

  @ready(new grpcErrors.ErrorGRPCServerNotRunning())
  get port(): Port {
    return this._port;
  }

  @ready(new grpcErrors.ErrorGRPCServerNotRunning())
  public getClientCertificate(session: Http2Session): Certificate {
    if (!this._secured) {
      throw new grpcErrors.ErrorGRPCServerNotSecured();
    }
    return this.clientCertChains.get(session)![0];
  }

  @ready(new grpcErrors.ErrorGRPCServerNotRunning())
  public getClientCertificates(session: Http2Session): Array<Certificate> {
    if (!this._secured) {
      throw new grpcErrors.ErrorGRPCServerNotSecured();
    }
    return this.clientCertChains.get(session)!;
  }

  @ready(new grpcErrors.ErrorGRPCServerNotRunning())
  public setTLSConfig(tlsConfig: TLSConfig): void {
    if (!this._secured) {
      throw new grpcErrors.ErrorGRPCServerNotSecured();
    }
    this.logger.info(`Updating ${this.constructor.name} TLS Config`);
    // @ts-ignore hack for private property
    const http2Servers = this.server.http2ServerList;
    for (const http2Server of http2Servers as Array<Http2SecureServer>) {
      http2Server.setSecureContext({
        key: Buffer.from(tlsConfig.keyPrivatePem, 'ascii'),
        cert: Buffer.from(tlsConfig.certChainPem, 'ascii'),
      });
    }
    this.tlsConfig = tlsConfig;
    return;
  }

  @ready(new grpcErrors.ErrorGRPCServerNotRunning())
  public closeServerForce(): void {
    this.server.forceShutdown();
  }
}

export default GRPCServer;
