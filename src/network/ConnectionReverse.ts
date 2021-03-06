import type { Socket, AddressInfo } from 'net';
import type { TLSSocket } from 'tls';
import type UTPConnection from 'utp-native/lib/connection';
import type { Host, Port, Address, NetworkMessage } from './types';
import type { NodeId } from '../nodes/types';
import type { Certificate } from '../keys/types';
import type { AbstractConstructorParameters, Timer } from '../types';
import net from 'net';
import tls from 'tls';
import { StartStop, ready } from '@matrixai/async-init/dist/StartStop';
import Connection from './Connection';
import * as networkUtils from './utils';
import * as networkErrors from './errors';
import * as keysUtils from '../keys/utils';
import { promise, timerStart, timerStop } from '../utils';

type ConnectionsReverse = {
  proxy: Map<Address, ConnectionReverse>;
  reverse: Map<Address, ConnectionReverse>;
};

interface ConnectionReverse extends StartStop {}
@StartStop()
class ConnectionReverse extends Connection {
  public readonly serverHost: Host;
  public readonly serverPort: Port;

  protected connections: ConnectionsReverse;
  protected serverSocket: Socket;
  protected tlsSocket?: TLSSocket;
  protected proxyHost: Host;
  protected proxyPort: Port;
  protected proxyAddress: Address;
  protected clientCertChain: Array<Certificate>;
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
      await this.send(networkUtils.pongBuffer);
    } else if (msg.type === 'pong') {
      this.resolveReadyP();
    }
  };

  protected handleError = async (e: Error) => {
    this.logger.warn(`Server Error: ${e.toString()}`);
    await this.stop();
  };

  /**
   * Handles receiving `end` event for `this.serverSocket` from server
   * Handler is removed and not executed when `end` is initiated here
   */
  protected handleEnd = async () => {
    this.logger.debug('Receives serverSocket ending');
    this.logger.debug('Responds serverSocket ending');
    this.serverSocket.end();
    this.serverSocket.destroy();
    this.logger.debug('Responded serverSocket ending');
    await this.stop();
  };

  /**
   * Handles `close` event for `this.serverSocket`
   * Destroying `this.serverSocket` triggers the close event
   * If already stopped, then this does nothing
   */
  protected handleClose = async () => {
    await this.stop();
  };

  public constructor({
    serverHost,
    serverPort,
    connections,
    ...rest
  }: {
    serverHost: Host;
    serverPort: Port;
    connections: ConnectionsReverse;
  } & AbstractConstructorParameters<typeof Connection>[0]) {
    super(rest);
    this.serverHost = serverHost;
    this.serverPort = serverPort;
    this.connections = connections;
  }

  public async start({
    timer,
  }: {
    timer?: Timer;
  } = {}): Promise<void> {
    this.logger.info('Starting Connection Reverse');
    // Promise for ready
    const { p: readyP, resolveP: resolveReadyP } = promise<void>();
    // Promise for server connection
    const { p: socketP, resolveP: resolveSocketP } = promise<void>();
    // Promise for start errors
    const { p: errorP, rejectP: rejectErrorP } = promise<void>();
    this.resolveReadyP = resolveReadyP;
    this.utpSocket.on('message', this.handleMessage);
    this.serverSocket = net.connect(this.serverPort, this.serverHost, () => {
      const proxyAddressInfo = this.serverSocket.address() as AddressInfo;
      this.proxyHost = proxyAddressInfo.address as Host;
      this.proxyPort = proxyAddressInfo.port as Port;
      this.proxyAddress = networkUtils.buildAddress(
        this.proxyHost,
        this.proxyPort,
      );
      resolveSocketP();
    });
    const handleStartError = (e) => {
      rejectErrorP(e);
    };
    this.serverSocket.once('error', handleStartError);
    this.serverSocket.on('end', this.handleEnd);
    this.serverSocket.on('close', this.handleClose);
    let punchInterval;
    try {
      await Promise.race([
        socketP,
        errorP,
        ...(timer != null ? [timer.timerP] : []),
      ]);
      // Send punch & ready signal
      await this.send(networkUtils.pingBuffer);
      punchInterval = setInterval(async () => {
        await this.send(networkUtils.pingBuffer);
      }, this.punchIntervalTime);
      await Promise.race([
        readyP,
        errorP,
        ...(timer != null ? [timer.timerP] : []),
      ]);
    } catch (e) {
      // Clean up partial start
      // Socket isn't established yet, so it is destroyed
      this.serverSocket.destroy();
      this.utpSocket.off('message', this.handleMessage);
      throw new networkErrors.ErrorConnectionStart(e.message, {
        data: {
          code: e.code,
          errno: e.errno,
          syscall: e.syscall,
        },
        cause: e,
      });
    } finally {
      clearInterval(punchInterval);
    }
    this.serverSocket.on('error', this.handleError);
    this.serverSocket.off('error', handleStartError);
    if (timer?.timedOut) {
      // Clean up partial start
      // Socket isn't established yet, so it is destroyed
      this.serverSocket.destroy();
      this.utpSocket.off('message', this.handleMessage);
      throw new networkErrors.ErrorConnectionStartTimeout();
    }
    this.connections.proxy.set(this.address, this);
    this.connections.reverse.set(this.proxyAddress, this);
    this.startKeepAliveTimeout();
    this.logger.info('Started Connection Reverse');
  }

  /**
   * Repeated invocations are noops
   */
  public async stop() {
    this.logger.info('Stopping Connection Reverse');
    this._composed = false;
    this.stopKeepAliveTimeout();
    this.utpSocket.off('message', this.handleMessage);
    const endPs: Array<Promise<void>> = [];
    if (!this.serverSocket.destroyed) {
      this.logger.debug('Sends serverSocket ending');
      this.serverSocket.unpipe();
      // Graceful exit has its own end handler
      this.serverSocket.removeAllListeners('end');
      endPs.push(this.endGracefully(this.serverSocket, this.endTime));
    }
    if (this.tlsSocket != null && !this.tlsSocket.destroyed) {
      this.logger.debug('Sends tlsSocket ending');
      this.tlsSocket.unpipe();
      // Graceful exit has its own end handler
      this.tlsSocket.removeAllListeners('end');
      endPs.push(this.endGracefully(this.tlsSocket, this.endTime));
    }
    await Promise.all(endPs);
    this.connections.proxy.delete(this.address);
    this.connections.reverse.delete(this.proxyAddress);
    this.logger.info('Stopped Connection Reverse');
  }

  @ready(new networkErrors.ErrorConnectionNotRunning(), true)
  public async compose(utpConn: UTPConnection, timer?: Timer): Promise<void> {
    try {
      if (this._composed) {
        throw new networkErrors.ErrorConnectionComposed();
      }
      this.logger.info('Composing Connection Reverse');
      // Promise for secure establishment
      const { p: secureP, resolveP: resolveSecureP } = promise<void>();
      // Promise for compose errors
      const { p: errorP, rejectP: rejectErrorP } = promise<void>();
      const handleComposeError = (e) => {
        rejectErrorP(e);
      };
      const tlsSocket = new tls.TLSSocket(utpConn, {
        key: Buffer.from(this.tlsConfig.keyPrivatePem, 'ascii'),
        cert: Buffer.from(this.tlsConfig.certChainPem, 'ascii'),
        isServer: true,
        requestCert: true,
        rejectUnauthorized: false,
      });
      tlsSocket.once('secure', () => {
        resolveSecureP();
      });
      tlsSocket.once('error', handleComposeError);
      try {
        await Promise.race([
          secureP,
          errorP,
          ...(timer != null ? [timer.timerP] : []),
        ]);
      } catch (e) {
        // Clean up partial compose
        if (!tlsSocket.destroyed) {
          tlsSocket.end();
          tlsSocket.destroy();
        }
        throw new networkErrors.ErrorConnectionCompose(e.message, {
          data: {
            code: e.code,
            errno: e.errno,
            syscall: e.syscall,
          },
          cause: e,
        });
      }
      tlsSocket.on('error', async (e) => {
        this.logger.warn(`Reverse Error: ${e.toString()}`);
        await this.stop();
      });
      tlsSocket.off('error', handleComposeError);
      if (timer?.timedOut) {
        // Clean up partial compose
        if (!tlsSocket.destroyed) {
          tlsSocket.end();
          tlsSocket.destroy();
        }
        throw new networkErrors.ErrorConnectionComposeTimeout();
      }
      const clientCertChain = networkUtils.getCertificateChain(tlsSocket);
      try {
        networkUtils.verifyClientCertificateChain(clientCertChain);
      } catch (e) {
        // Clean up partial compose
        if (!tlsSocket.destroyed) {
          tlsSocket.end();
          tlsSocket.destroy();
        }
        throw e;
      }
      // The TLSSocket is now established
      this.tlsSocket = tlsSocket;
      this.tlsSocket.on('end', async () => {
        this.logger.debug('Receives tlsSocket ending');
        if (utpConn.destroyed) {
          this.tlsSocket!.destroy();
          this.logger.debug('Destroyed tlsSocket');
        } else {
          this.logger.debug('Responds tlsSocket ending');
          this.tlsSocket!.end();
          this.tlsSocket!.destroy();
          this.logger.debug('Responded tlsSocket ending');
        }
        await this.stop();
      });
      this.tlsSocket.on('close', async () => {
        await this.stop();
      });
      this.tlsSocket.pipe(this.serverSocket, { end: false });
      this.tlsSocket.once('data', () => {
        this.serverSocket.pipe(this.tlsSocket as TLSSocket, { end: false });
      });
      this.clientCertChain = clientCertChain;
      this.logger.info('Composed Connection Reverse');
      this._composed = true;
    } catch (e) {
      this._composed = false;
      throw e;
    }
  }

  @ready(new networkErrors.ErrorConnectionNotRunning())
  public getProxyHost(): Host {
    return this.proxyHost;
  }

  @ready(new networkErrors.ErrorConnectionNotRunning())
  public getProxyPort(): Port {
    return this.proxyPort;
  }

  @ready(new networkErrors.ErrorConnectionNotRunning())
  public getClientCertificates(): Array<Certificate> {
    if (!this._composed) {
      throw new networkErrors.ErrorConnectionNotComposed();
    }
    return this.clientCertChain.map((crt) => keysUtils.certCopy(crt));
  }

  @ready(new networkErrors.ErrorConnectionNotRunning())
  public getClientNodeIds(): Array<NodeId> {
    if (!this._composed) {
      throw new networkErrors.ErrorConnectionNotComposed();
    }
    return this.clientCertChain.map((c) => keysUtils.certNodeId(c)!);
  }

  protected startKeepAliveTimeout() {
    this.timeout = setTimeout(async () => {
      const e = new networkErrors.ErrorConnectionTimeout();
      // If the TLSSocket is established, emit the error so the
      // tlsSocket error handler handles it
      // This is not emitted on serverSocket in order maintain
      // symmetry with ConnectionForward behaviour
      if (this.tlsSocket != null && !this.tlsSocket.destroyed) {
        this.tlsSocket.emit('error', e);
      } else {
        // Otherwise the composition has not occurred yet
        // This means we have timed out waiting for a composition
        this.logger.warn(`Reverse Error: ${e.toString()}`);
        await this.stop();
      }
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

export default ConnectionReverse;

export type { ConnectionsReverse };
