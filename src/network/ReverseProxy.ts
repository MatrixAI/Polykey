import net from 'net';
import Logger from '@matrixai/logger';

import ConnectionManager from './ConnectionManager';
import { promisify } from '../utils';

/**
 * A proxy responsible for forwarding traffic from another proxy
 * to a local entity.
 */
class ReverseProxy {
  protected authToken: string;
  protected server: any;
  protected port: number;
  protected logger: Logger;
  protected grpcPort: number;
  protected grpcHost: string;
  protected connection: ConnectionManager;

  constructor({ logger }: { logger?: Logger }) {
    this.logger = logger ?? new Logger('ReverseProxy');
    this.connection = new ConnectionManager({ logger: this.logger });
  }

  /**
   * Start the proxy server at the specified host and port.
   * If the port is not provided, the port is randomly selected.
   * @param host
   * @param port
   */
  public async start({
    grpcHost = '127.0.0.1',
    grpcPort = 0,
  }: {
    grpcHost?: string;
    grpcPort?: number;
  } = {}): Promise<void> {
    this.logger.info('Starting Reverse Proxy.');

    this.connection.start();
    this.grpcHost = grpcHost;
    this.grpcPort = grpcPort;
    this.server = this.connection.getSocket();
    this.server.on('connection', this.handleConnect);

    await new Promise<void>((resolve) => {
      this.server.listen(() => {
        resolve();
      });
    });

    this.port = this.connection.getPort();
    this.logger.info(`Started Reverse Proxy at port ${this.port}.`);
  }

  /**
   * Stop the proxy server and perform necessary clean up.
   */
  public async stop(): Promise<void> {
    this.logger.info('Stopping Reverse Proxy Server.');
    await new Promise<void>((resolve) => {
      this.server.close(() => resolve());
    });
    await this.connection.stop();
    this.logger.info('Stopped Reverse Proxy Server.');
  }

  public getSocketPort(): number {
    return this.port;
  }

  /**
   * Currently not being used as AddressResolver is being replaced
   * with another system
   */
  // public contactAddressResolver(resolverPort: number, resolverHost: string) {
  //   const addressInfoBuffer = Buffer.from(this.nodeId + ':R');
  //   this.connection
  //     .getSocket()
  //     .send(
  //       addressInfoBuffer,
  //       0,
  //       addressInfoBuffer.length,
  //       resolverPort,
  //       resolverHost,
  //     );
  // }

  public async addNatConnection(
    remotePort: number,
    remoteHost: string,
    attempts: number = 50,
  ): Promise<boolean> {
    return this.connection.addNatConnection(remotePort, remoteHost, attempts);
  }

  public addDirectConnection(remotePort: number, remoteHost: string): void {
    this.connection.addDirectConnection(remotePort, remoteHost);
  }

  protected handleConnect = async (fwdProxySocket: any) => {
    fwdProxySocket.once('data', async () => {
      const serverSocket = net.connect(this.grpcPort, this.grpcHost);

      serverSocket.pipe(fwdProxySocket);
      fwdProxySocket.pipe(serverSocket);

      const fwdProxySocketWrite = promisify(fwdProxySocket.write).bind(
        fwdProxySocket,
      );
      fwdProxySocketWrite('Hello');
      console.log(fwdProxySocket.remoteAddress);
      console.log(fwdProxySocket.remotePort);

      this.logger.info(`Forward Proxy Connected.`);
    });

    fwdProxySocket.on('close', () => {
      this.logger.info(`Disconnected.`);
    });
  };
}

export default ReverseProxy;
