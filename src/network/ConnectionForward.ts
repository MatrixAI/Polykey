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
import { promise } from '../utils';

type ConnectionsForward = {
  ingress: Map<Address, ConnectionForward>;
  client: Map<Address, ConnectionForward>;
};

interface ConnectionForward extends StartStop {}
@StartStop()
class ConnectionForward extends Connection {
  public readonly nodeId: NodeId;
  public readonly pingIntervalTime: number;

  protected connections: ConnectionsForward;
  protected pingInterval: ReturnType<typeof setInterval>;
  protected utpConn: UTPConnection;
  protected tlsSocket: TLSSocket;
  protected clientHost: Host;
  protected clientPort: Port;
  protected clientAddress: Address;
  protected serverCertChain: Array<Certificate>;
  protected resolveReadyP: (value: void) => void;

  public constructor({
    nodeId,
    connections,
    pingIntervalTime = 1000,
    ...rest
  }: {
    nodeId: NodeId;
    connections: ConnectionsForward;
    pingIntervalTime?: number;
  } & AbstractConstructorParameters<typeof Connection>[0]) {
    super(rest);
    this.nodeId = nodeId;
    this.connections = connections;
    this.pingIntervalTime = pingIntervalTime;
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
    this.utpConn = this.utpSocket.connect(this.port, this.host);
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
      }, 1000);
      await Promise.race([
        Promise.all([readyP, secureConnectP]).then(() => {}),
        errorP,
        ...(timer != null ? [timer.timerP] : []),
      ]);
    } catch (e) {
      await this.stop();
      throw new networkErrors.ErrorConnectionStart(e.message, {
        code: e.code,
        errno: e.errno,
        syscall: e.syscall,
      });
    } finally {
      clearInterval(punchInterval);
    }
    if (timer?.timedOut) {
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
    this.tlsSocket.off('error', handleStartError);
    this.tlsSocket.on('error', this.handleError);
    await this.startPingInterval();
    this.serverCertChain = serverCertChain;
    this.connections.ingress.set(this.address, this);
    this.startTimeout();
    this.logger.info('Started Connection Forward');
  }

  public async stop(): Promise<void> {
    this.logger.info('Stopping Connection Forward');
    this._composed = false;
    this.stopTimeout();
    this.stopPingInterval();
    this.utpSocket.off('message', this.handleMessage);
    if (!this.tlsSocket.destroyed) {
      this.tlsSocket.end();
      this.tlsSocket.destroy();
    }
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
      this.logger.info('Composing Connection Forward');
      this.tlsSocket.on('error', (e) => {
        if (!clientSocket.destroyed) {
          clientSocket.destroy(e);
        }
      });
      this.tlsSocket.on('close', () => {
        clientSocket.destroy();
      });
      clientSocket.on('end', () => {
        clientSocket.end();
      });
      clientSocket.on('error', (e) => {
        if (!this.tlsSocket.destroyed) {
          this.tlsSocket.emit('error', e);
        }
        clientSocket.destroy();
      });
      clientSocket.on('close', () => {
        this.tlsSocket.destroy();
      });
      this.tlsSocket.pipe(clientSocket);
      clientSocket.pipe(this.tlsSocket);
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

  protected async startPingInterval(): Promise<void> {
    await this.send(networkUtils.pingBuffer);
    this.pingInterval = setInterval(async () => {
      await this.send(networkUtils.pingBuffer);
    }, this.pingIntervalTime);
  }

  protected stopPingInterval() {
    clearInterval(this.pingInterval);
  }

  protected startTimeout() {
    this.timeout = setTimeout(() => {
      this.tlsSocket.emit(
        'error',
        new networkErrors.ErrorConnectionTimeout()
      );
    }, this.timeoutTime);
  }

  protected stopTimeout() {
    clearTimeout(this.timeout);
  }

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
      this.stopTimeout();
      this.startTimeout();
    }
    if (msg.type === 'ping') {
      this.resolveReadyP();
      // Respond with ready message
      await this.send(networkUtils.pongBuffer);
    }
  };

  protected handleError = (e: Error) => {
    this.logger.warn(`Connection Error: ${e.toString()}`);
    this.tlsSocket.destroy();
  };

  /**
   * Destroying the server socket triggers the close event
   */
  protected handleClose = async () => {
    await this.stop();
  };

  protected handleEnd = () => {
    if (this.utpConn.destroyed) {
      // The utp connection may already be destroyed
      this.tlsSocket.destroy();
    } else {
      // Prevent half open connections
      this.tlsSocket.end();
    }
  };
}

export default ConnectionForward;

export type { ConnectionsForward };
