import type { Socket, AddressInfo } from 'net';
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
import { utils as keysUtils } from '../keys';
import { promise } from '../utils';

type ConnectionsReverse = {
  egress: Map<Address, ConnectionReverse>;
  proxy: Map<Address, ConnectionReverse>;
};

interface ConnectionReverse extends StartStop {}
@StartStop()
class ConnectionReverse extends Connection {
  public readonly serverHost: Host;
  public readonly serverPort: Port;

  protected connections: ConnectionsReverse;
  protected serverSocket: Socket;
  protected proxyHost: Host;
  protected proxyPort: Port;
  protected proxyAddress: Address;
  protected clientCertChain: Array<Certificate>;
  protected resolveReadyP: (value: void) => void;

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
      }, 1000);
      await Promise.race([
        readyP,
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
    this.serverSocket.off('error', handleStartError);
    this.serverSocket.on('error', this.handleError);
    this.connections.egress.set(this.address, this);
    this.connections.proxy.set(this.proxyAddress, this);
    this.startTimeout();
    this.logger.info('Started Connection Reverse');
  }

  /**
   * The close event should run the stop
   * Repeated invocations are noops
   */
  public async stop() {
    this.logger.info('Stopping Connection Reverse');
    this._composed = false;
    this.stopTimeout();
    this.utpSocket.off('message', this.handleMessage);
    if (!this.serverSocket.destroyed) {
      // console.log('SENDING END TO serverSocket');
      this.serverSocket.end();
      this.serverSocket.destroy();
    }
    this.connections.egress.delete(this.address);
    this.connections.proxy.delete(this.proxyAddress);
    this.logger.info('Stopped Connection Reverse');
  }

  /**
   * Repeated invocations are noops
   */
  @ready(new networkErrors.ErrorConnectionNotRunning())
  public async compose(utpConn: UTPConnection, timer?: Timer): Promise<void> {
    try {
      if (this._composed) {
        throw new networkErrors.ErrorConnectionComposed();
      }
      this._composed = true;
      this.logger.info('Composing Connection Reverse');
      // Promise for secure establishment
      const { p: secureP, resolveP: resolveSecureP } = promise<void>();
      // Promise for compose errors
      const { p: errorP, rejectP: rejectErrorP } = promise<void>();
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
      const handleComposeError = (e) => {
        rejectErrorP(e);
      };
      tlsSocket.once('error', handleComposeError);
      try {
        await Promise.race([
          secureP,
          errorP,
          ...(timer != null ? [timer.timerP] : []),
        ]);
      } catch (e) {
        throw new networkErrors.ErrorConnectionCompose(e.message, {
          code: e.code,
          errno: e.errno,
          syscall: e.syscall,
        });
      }
      if (timer?.timedOut) {
        throw new networkErrors.ErrorConnectionComposeTimeout();
      }
      const clientCertChain = networkUtils.getCertificateChain(tlsSocket);
      networkUtils.verifyClientCertificateChain(clientCertChain);
      tlsSocket.off('error', handleComposeError);
      // Propagate end, error, close and data
      tlsSocket.on('end', () => {
        if (utpConn.destroyed) {
          // The utp connection may already be destroyed
          tlsSocket.destroy();
        } else {

          // console.log('DESTROYED', tlsSocket.destroyed);
          // // @ts-ignore
          // console.log('PENDING', tlsSocket.pending);
          // // @ts-ignore
          // console.log('READYSTATE', tlsSocket.readyState);
          // console.log('CONNECTING', tlsSocket.connecting);
          // console.log('ALLOW HALF OPEN', tlsSocket.allowHalfOpen);
          // console.log('ALLOW HALF OPEN utpConn', utpConn.allowHalfOpen);
          // console.log('ENDED?', tlsSocket.writableEnded);
          // console.log('FINISHED?', tlsSocket.writableFinished);
          // console.log('ENDED?', utpConn.writableEnded);
          // console.log('FINISHED?', utpConn.writableFinished);
          // console.log(utpConn);

          // Prevent half open connections
          tlsSocket.end();

          // utpConn.end();
          // console.log("ENDED TLS SOCKET AGAIN?");

        }
      });
      tlsSocket.on('error', (e) => {

        // console.log('EMITTING ERROR ON TLS SOCKET', e);

        if (!this.serverSocket.destroyed) {
          this.serverSocket.emit('error', e);
        }
        tlsSocket.destroy();
      });
      tlsSocket.on('close', () => {
        this.serverSocket.destroy();
      });
      this.serverSocket.on('error', (e) => {
        if (!tlsSocket.destroyed) {
          tlsSocket.destroy(e);
        }
      });
      this.serverSocket.on('close', () => {
        tlsSocket.destroy();
      });
      tlsSocket.pipe(this.serverSocket);
      this.serverSocket.pipe(tlsSocket);
      this.clientCertChain = clientCertChain;
      this.logger.info('Composed Connection Reverse');
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

  public getClientCertificates(): Array<Certificate> {
    if (!this._composed) {
      throw new networkErrors.ErrorConnectionNotComposed();
    }
    return this.clientCertChain.map((crt) => keysUtils.certCopy(crt));
  }

  public getClientNodeIds(): Array<NodeId> {
    if (!this._composed) {
      throw new networkErrors.ErrorConnectionNotComposed();
    }
    return this.clientCertChain.map((c) => networkUtils.certNodeId(c));
  }

  protected startTimeout() {
    this.timeout = setTimeout(() => {
      this.serverSocket.emit(
        'error',
        new networkErrors.ErrorConnectionTimeout(),
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
      await this.send(networkUtils.pongBuffer);
    } else if (msg.type === 'pong') {
      this.resolveReadyP();
    }
  };

  protected handleError = (e: Error) => {
    this.logger.warn(`Connection Error: ${e.toString()}`);
    this.serverSocket.destroy();
  };

  /**
   * Destroying the server socket triggers the close event
   */
  protected handleClose = async () => {
    await this.stop();
  };

  protected handleEnd = () => {
    // Prevent half open connections
    this.serverSocket.end();
  };
}

export default ConnectionReverse;

export type { ConnectionsReverse };
