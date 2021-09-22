import type UTP from 'utp-native';
import type { Host, Port, Address, TLSConfig } from './types';

import Logger from '@matrixai/logger';
import * as networkUtils from './utils';
import { promisify } from '../utils';

abstract class Connection {
  public readonly utpSocket: UTP;
  public readonly host: Host;
  public readonly port: Port;
  public readonly address: Address;
  public readonly tlsConfig: Readonly<TLSConfig>;
  public readonly timeoutTime: number;

  protected logger: Logger;
  protected timeout: ReturnType<typeof setTimeout>;
  protected _started: boolean = false;
  protected _composed: boolean = false;

  constructor({
    utpSocket,
    host,
    port,
    tlsConfig,
    timeoutTime = 20000,
    logger,
  }: {
    utpSocket: UTP;
    host: Host;
    port: Port;
    tlsConfig: TLSConfig;
    timeoutTime?: number;
    logger?: Logger;
  }) {
    const address = networkUtils.buildAddress(host, port);
    this.logger = logger ?? new Logger(`Connection ${address}`);
    this.utpSocket = utpSocket;
    // The host for the connection must always valid target
    // here we resolve any zero IPs to localhost
    // this matches the default behaviour in other parts of node
    this.host = networkUtils.resolvesZeroIP(host);
    this.port = port;
    this.tlsConfig = tlsConfig;
    this.address = address;
    this.timeoutTime = timeoutTime;
  }

  get started(): boolean {
    return this._started;
  }

  get composed(): boolean {
    return this._composed;
  }

  public async send(data: Buffer): Promise<void> {
    const utpSocketSend = promisify(this.utpSocket.send).bind(this.utpSocket);
    await utpSocketSend(data, 0, data.byteLength, this.port, this.host);
  }
}

export default Connection;
