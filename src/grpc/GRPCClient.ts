import type { Http2Session } from 'http2';
import type { TLSSocket } from 'tls';
import type { NodeId } from '../nodes/types';
import type {
  Certificate,
  CertificatePemChain,
  PrivateKeyPem,
} from '../keys/types';
import type { ChannelCredentials, ClientOptions, Client } from '@grpc/grpc-js';

import http2 from 'http2';
import Logger from '@matrixai/logger';
import * as grpcUtils from './utils';
import * as grpcErrors from './errors';
import { utils as keysUtils } from '../keys';
import { utils as networkUtils, errors as networkErrors } from '../network';
import { promisify } from '../utils';

abstract class GRPCClient<T extends Client> {
  public readonly nodeId: NodeId;
  public readonly host: string;
  public readonly port: number;

  protected logger: Logger;
  protected client: T;

  protected session: Http2Session;
  protected serverCertChain: Array<Certificate>;
  protected _started: boolean = false;

  constructor({
    nodeId,
    host,
    port,
    logger,
  }: {
    nodeId: NodeId;
    host: string;
    port: number;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger('GRPCClient');
    this.nodeId = nodeId;
    this.host = host;
    this.port = port;
  }

  get started(): boolean {
    return this._started;
  }

  public async start({
    clientConstructor,
    keyPrivatePem,
    certChainPem,
    timeout = Infinity,
  }: {
    clientConstructor: new (
      address: string,
      credentials: ChannelCredentials,
      options?: ClientOptions,
    ) => T;
    keyPrivatePem: PrivateKeyPem;
    certChainPem: CertificatePemChain;
    timeout?: number;
  }): Promise<void> {
    const address = networkUtils.buildAddress(this.host, this.port);
    this.logger.info(`Starting GRPC Client connecting to ${address}`);
    const clientOptions = {
      // prevents complaints with having an ip address as the server name
      'grpc.ssl_target_name_override': this.nodeId,
    };
    const clientCredentials = grpcUtils.clientCredentials(
      keyPrivatePem,
      certChainPem,
    );
    const client = new clientConstructor(
      address,
      clientCredentials,
      clientOptions,
    );
    const waitForReady = promisify(client.waitForReady).bind(client);
    // add the current unix time because grpc expects the milliseconds since unix epoch
    timeout += Date.now();
    try {
      await waitForReady(timeout);
    } catch (e) {
      throw new grpcErrors.ErrorGRPCClientTimeout();
    }
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
    this.client = client;
    this.session = session;
    this.serverCertChain = serverCertChain;
    this._started = true;
    this.logger.info(`Started GRPC Client connected to ${address}`);
  }

  public async stop(): Promise<void> {
    const address = `${this.host}:${this.port}`;
    this.logger.info(`Stopping GRPC Client connected to ${address}`);
    if (this._started) {
      // this currently doesn't stop all inflight requests
      // https://github.com/grpc/grpc-node/issues/1340
      this.client.close();
    }
    this._started = false;
    this.logger.info(`Stopped GRPC Client connected to ${address}`);
  }

  public getServerCertificate(): Certificate {
    if (!this._started) {
      throw new grpcErrors.ErrorGRPCClientNotStarted();
    }
    return keysUtils.certCopy(this.serverCertChain[0]);
  }

  public getServerCertificates(): Array<Certificate> {
    if (!this._started) {
      throw new grpcErrors.ErrorGRPCClientNotStarted();
    }
    return this.serverCertChain.map((crt) => keysUtils.certCopy(crt));
  }
}

export default GRPCClient;
