import type { Socket, AddressInfo } from 'net';
import type { TLSSocket } from 'tls';
import type UTPConnection from 'utp-native/lib/connection';
import type { Certificate } from '../keys/types';
import type { Address, Host, NetworkMessage, Port } from './types';
import type { NodeId } from '../nodes/types';
import type { AbstractConstructorParameters, Timer } from '../types';

import tls from 'tls';
import { StartStop, ready } from '@matrixai/async-init/dist/StartStop';
import Connection from './Connection';
import * as networkUtils from './utils';
import * as networkErrors from './errors';
import { utils as keysUtils } from '../keys';
import { promise, timerStart, timerStop } from '../utils';

type ConnectionsForward = {
  ingress: Map<Address, ConnectionForward>;
  client: Map<Address, ConnectionForward>;
};

interface ConnectionForward extends StartStop {}
@StartStop()
class ConnectionForward extends Connection {
  public readonly nodeId: NodeId;
  public readonly endTime: number;

  protected connections: ConnectionsForward;
  protected pingInterval: ReturnType<typeof setInterval>;
  protected utpConn: UTPConnection;
  protected tlsSocket: TLSSocket;
  protected clientSocket?: Socket;
  protected clientHost: Host;
  protected clientPort: Port;
  protected clientAddress: Address;
  protected serverCertChain: Array<Certificate>;
  protected resolveReadyP: (value: void) => void;

  protected handleMessage = async (
    data: Buffer,
    remoteInfo: { address: string; port: number },
  ) => {
    // Ignore messages not intended for this target
    if (remoteInfo.address !== this.host || remoteInfo.port !== this.port) {
      return;
    }
    let msg: NetworkMessage;
    try {
      msg = networkUtils.unserializeNetworkMessage(data);
    } catch (e) {
      return;
    }
    // Don't reset timeout until timeout is initialised
    if (this.timeout != null) {
      // Any message should reset the timeout
      this.stopKeepAliveTimeout();
      this.startKeepAliveTimeout();
    }
    if (msg.type === 'ping') {
      this.resolveReadyP();
      // Respond with ready message
      await this.send(networkUtils.pongBuffer);
    }
  };

  protected handleError = async (e: Error) => {
    this.logger.warn(`Forward Error: ${e.toString()}`);
    await this.stop();
  };

  /**
   * Handles receiving `end` event for `this.tlsSocket` from reverse
   * Handler is removed and not executed when `end` is initiated here
   */
  protected handleEnd = async () => {
    this.logger.debug('Receives tlsSocket ending');
    if (this.utpConn.destroyed) {
      this.tlsSocket.destroy();
      this.logger.debug('Destroyed tlsSocket');
    } else {
      this.logger.debug('Responds tlsSocket ending');
      this.tlsSocket.end();
      this.tlsSocket.destroy();
      this.logger.debug('Responded tlsSocket ending');
    }
    await this.stop();
  };

  /**
   * Handles `close` event for `this.tlsSocket`
   * Destroying `this.tlsSocket` triggers the close event
   * If already stopped, then this does nothing
   */
  protected handleClose = async () => {
    await this.stop();
  };

  public constructor({
    nodeId,
    connections,
    ...rest
  }: {
    nodeId: NodeId;
    connections: ConnectionsForward;
  } & AbstractConstructorParameters<typeof Connection>[0]) {
    super(rest);
    this.nodeId = nodeId;
    this.connections = connections;
  }

  public async start({
    timer,
  }: {
    timer?: Timer;
  } = {}): Promise<void> {
    this.logger.info('Starting Connection Forward');
    // Promise for ready
    const { p: readyP, resolveP: resolveReadyP } = promise<void>();
    // Promise for start errors
    const { p: errorP, rejectP: rejectErrorP } = promise<void>();
    // Promise for secure connection
    const { p: secureConnectP, resolveP: resolveSecureConnectP } =
      promise<void>();
    this.resolveReadyP = resolveReadyP;
    this.utpSocket.on('message', this.handleMessage);
    const handleStartError = (e) => {
      rejectErrorP(e);
    };
    // Normal sockets defaults to `allowHalfOpen: false`
    // But UTP defaults to `allowHalfOpen: true`
    // Setting `allowHalfOpen: false` on UTP is buggy and cannot be used
    this.utpConn = this.utpSocket.connect(this.port, this.host, {
      allowHalfOpen: true,
    });
    this.tlsSocket = tls.connect(
      {
        key: Buffer.from(this.tlsConfig.keyPrivatePem, 'ascii'),
        cert: Buffer.from(this.tlsConfig.certChainPem, 'ascii'),
        socket: this.utpConn,
        rejectUnauthorized: false,
      },
      () => {
        resolveSecureConnectP();
      },
    );
    this.tlsSocket.once('error', handleStartError);
    this.tlsSocket.on('end', this.handleEnd);
    this.tlsSocket.on('close', this.handleClose);
    let punchInterval;
    try {
      // Send punch signal
      await this.send(networkUtils.pingBuffer);
      punchInterval = setInterval(async () => {
        await this.send(networkUtils.pingBuffer);
      }, this.punchIntervalTime);
      await Promise.race([
        Promise.all([readyP, secureConnectP]).then(() => {}),
        errorP,
        ...(timer != null ? [timer.timerP] : []),
      ]);
    } catch (e) {
      // Destroy the socket before calling stop
      // The stop will try to do a graceful end
      // if the socket is not already destroyed
      // However at this point the socket is not actually established
      this.tlsSocket.destroy();
      await this.stop();
      throw new networkErrors.ErrorConnectionStart(e.message, {
        code: e.code,
        errno: e.errno,
        syscall: e.syscall,
      });
    } finally {
      clearInterval(punchInterval);
    }
    this.tlsSocket.on('error', this.handleError);
    this.tlsSocket.off('error', handleStartError);
    if (timer?.timedOut) {
      // Destroy the socket
      // At this point the socket is not actually established
      this.tlsSocket.destroy();
      await this.stop();
      throw new networkErrors.ErrorConnectionStartTimeout();
    }
    const serverCertChain = networkUtils.getCertificateChain(this.tlsSocket);
    try {
      networkUtils.verifyServerCertificateChain(this.nodeId, serverCertChain);
    } catch (e) {
      await this.stop();
      throw e;
    }
    await this.startKeepAliveInterval();
    this.serverCertChain = serverCertChain;
    this.connections.ingress.set(this.address, this);
    this.startKeepAliveTimeout();
    this.logger.info('Started Connection Forward');
  }

  /**
   * Repeated invocations are noops
   */
  public async stop(): Promise<void> {
    this.logger.info('Stopping Connection Forward');
    this._composed = false;
    this.stopKeepAliveTimeout();
    this.stopKeepAliveInterval();
    this.utpSocket.off('message', this.handleMessage);
    const endPs: Array<Promise<void>> = [];
    if (!this.tlsSocket.destroyed) {
      this.logger.debug('Sends tlsSocket ending');
      this.tlsSocket.unpipe();
      // Graceful exit has its own end handler
      this.tlsSocket.removeAllListeners('end');
      endPs.push(this.endGracefully(this.tlsSocket, this.endTime));
    }
    if (this.clientSocket != null && !this.clientSocket.destroyed) {
      this.logger.debug('Sends clientSocket ending');
      this.clientSocket.unpipe();
      // Graceful exit has its own end handler
      this.clientSocket.removeAllListeners('end');
      endPs.push(this.endGracefully(this.clientSocket, this.endTime));
    }
    await Promise.all(endPs);
    this.connections.ingress.delete(this.address);
    this.connections.client.delete(this.clientAddress);
    this.logger.info('Stopped Connection Forward');
  }

  @ready(new networkErrors.ErrorConnectionNotRunning())
  public compose(clientSocket: Socket): void {
    try {
      if (this._composed) {
        throw new networkErrors.ErrorConnectionComposed();
      }
      this._composed = true;
      this.clientSocket = clientSocket;
      this.logger.info('Composing Connection Forward');
      clientSocket.on('error', async (e) => {
        this.logger.warn(`Client Error: ${e.toString()}`);
        await this.stop();
      });
      clientSocket.on('end', async () => {
        this.logger.debug('Receives clientSocket ending');
        this.logger.debug('Responds clientSocket ending');
        clientSocket.end();
        clientSocket.destroy();
        this.logger.debug('Responded clientSocket ending');
        await this.stop();
      });
      clientSocket.on('close', async () => {
        await this.stop();
      });
      this.tlsSocket.pipe(clientSocket, { end: false });
      clientSocket.pipe(this.tlsSocket, { end: false });
      const clientAddressInfo = clientSocket.address() as AddressInfo;
      this.clientHost = clientAddressInfo.address as Host;
      this.clientPort = clientAddressInfo.port as Port;
      this.clientAddress = networkUtils.buildAddress(
        this.clientHost,
        this.clientPort,
      );
      this.connections.client.set(this.clientAddress, this);
      this.logger.info('Composed Connection Forward');
    } catch (e) {
      this._composed = false;
      throw e;
    }
  }

  public getClientHost(): Host {
    if (!this._composed) {
      throw new networkErrors.ErrorConnectionNotComposed();
    }
    return this.clientHost;
  }

  public getClientPort(): Port {
    if (!this._composed) {
      throw new networkErrors.ErrorConnectionNotComposed();
    }
    return this.clientPort;
  }

  @ready(new networkErrors.ErrorConnectionNotRunning())
  public getServerCertificates(): Array<Certificate> {
    return this.serverCertChain.map((crt) => keysUtils.certCopy(crt));
  }

  @ready(new networkErrors.ErrorConnectionNotRunning())
  public getServerNodeIds(): Array<NodeId> {
    return this.serverCertChain.map((c) => networkUtils.certNodeId(c));
  }

  protected async startKeepAliveInterval(): Promise<void> {
    await this.send(networkUtils.pingBuffer);
    this.pingInterval = setInterval(async () => {
      await this.send(networkUtils.pingBuffer);
    }, this.keepAliveIntervalTime);
  }

  protected stopKeepAliveInterval() {
    clearInterval(this.pingInterval);
  }

  protected startKeepAliveTimeout() {
    this.timeout = setTimeout(() => {
      this.tlsSocket.emit('error', new networkErrors.ErrorConnectionTimeout());
    }, this.keepAliveTimeoutTime);
  }

  protected stopKeepAliveTimeout() {
    clearTimeout(this.timeout);
  }

  protected async endGracefully(socket: Socket, timeout: number) {
    const { p: endP, resolveP: resolveEndP } = promise<void>();
    socket.once('end', resolveEndP);
    socket.end();
    const timer = timerStart(timeout);
    await Promise.race([endP, timer.timerP]);
    socket.removeListener('end', resolveEndP);
    if (timer.timedOut) {
      socket.emit('error', new networkErrors.ErrorConnectionEndTimeout());
    } else {
      timerStop(timer);
    }
    // Must be destroyed if timed out
    // If not timed out, force destroy the socket due to buggy tlsSocket and utpConn
    socket.destroy();
  }
}

export default ConnectionForward;

export type { ConnectionsForward };
