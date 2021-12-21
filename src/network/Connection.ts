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
  /**
   * Time used for keep-alive timeout
   */
  public readonly keepAliveTimeoutTime: number;
  /**
   * Time used to gracefully wait for teardown
   * Used for both UTP and client sockets in forward
   * Used for both UTP and server sockets in reverse
   */
  public readonly endTime: number;
  /**
   * Time used between each ping or pong message for hole-punching
   */
  public readonly punchIntervalTime: number;
  /**
   * Time used between each ping or pong message for keep-alive
   */
  public readonly keepAliveIntervalTime: number;

  protected logger: Logger;
  protected timeout: ReturnType<typeof setTimeout>;
  protected _composed: boolean = false;

  constructor({
    utpSocket,
    host,
    port,
    tlsConfig,
    keepAliveTimeoutTime = 20000,
    endTime = 1000,
    punchIntervalTime = 1000,
    keepAliveIntervalTime = 1000,
    logger,
  }: {
    utpSocket: UTP;
    host: Host;
    port: Port;
    tlsConfig: TLSConfig;
    keepAliveTimeoutTime?: number;
    endTime?: number;
    punchIntervalTime?: number;
    keepAliveIntervalTime?: number;
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
    this.keepAliveTimeoutTime = keepAliveTimeoutTime;
    this.endTime = endTime;
    this.punchIntervalTime = punchIntervalTime;
    this.keepAliveIntervalTime = keepAliveIntervalTime;
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
