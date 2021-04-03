import Logger from '@matrixai/logger';
import utp from 'utp-native';
import { ErrorPeerConnectionNotExists } from './errors';
import { buildAddress, holePunch, getPort, getHost } from './utils';

/**
 * Manages a utp-native socket.
 */
class ConnectionManager {
  // A utp-native socket.
  protected socket: any;

  // A dictionary where the key is the connectable adress, and value
  // is the type of connection.
  protected connected: { [address: string]: 'direct' | 'nat' | 'relay' };

  // The last time (in unix time) a keep alive packet is received.
  protected lastAlive: { [address: string]: number };
  protected logger: Logger;
  // Reference to the setTimeout used to cancel the KeepAlive loop
  protected timer: ReturnType<typeof setTimeout>;

  constructor({ logger }: { logger?: Logger }) {
    this.socket = undefined;
    this.connected = {};
    this.lastAlive = {};
    this.logger = logger ?? new Logger('ConnectionManager');
  }

  /**
   * Initialise the Connection Object. Creates and returns a utp-native socket.
   */
  public start(): any {
    if (this.socket === undefined) {
      this.socket = utp();
      this.socket.on('message', (data: Buffer, rinfo) => {
        const address = buildAddress(rinfo.address, rinfo.port);
        if (data.toString() == 'Keep Alive') {
          this.socket.send(
            Buffer.from('Keep Alive Confirmed'),
            0,
            20,
            rinfo.port,
            rinfo.address,
          );
          this.logger.info(`Keep alive from ${rinfo.address}:${rinfo.port}.`);
        } else if (data.toString() == 'Keep Alive Confirmed') {
          if (address in this.lastAlive) {
            this.lastAlive[address] = Date.now();
          }
          this.logger.info(
            `Keep alive confirmed from ${rinfo.address}:${rinfo.port}.`,
          );
        }
      });
      this.keepAlive();
    }
    return this.socket;
  }

  public async stop(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.connected = {};
    this.lastAlive = {};
    this.socket?.close();
    this.socket = undefined;
  }

  /**
   * Connect to the remote host at the specified port. Returns a utp-native connection.
   * @param remotePort
   * @param remoteHost
   */
  public connect(remotePort: number, remoteHost: string): any {
    if (!(buildAddress(remoteHost, remotePort) in this.connected)) {
      throw new ErrorPeerConnectionNotExists();
    }
    return this.socket.connect(remotePort, remoteHost);
  }

  /**
   * Bind the connection to a random port.
   */
  public bind(): void {
    this.socket.bind();
  }

  public getPort(): number {
    return this.socket?.address().port;
  }

  /**
   * Adding a directly connectable address. Note that there is no conectivity verification
   * when adding the address.
   *
   * @param remoteHost
   * @param remotePort
   */
  public addDirectConnection(remotePort: number, remoteHost: string): void {
    this.connected[buildAddress(remoteHost, remotePort)] = 'direct';
  }

  /**
   * Adding a natted address, connectivity is verified by hole punching and maintained by
   * keep alive packets.
   *
   * @param remoteHost
   * @param remotePort
   * @param attempts
   */
  public async addNatConnection(
    remotePort: number,
    remoteHost: string,
    attempts: number = 50,
  ): Promise<boolean> {
    const punched = await holePunch(
      this.socket,
      attempts,
      remotePort,
      remoteHost,
    );
    if (punched) {
      const address = buildAddress(remoteHost, remotePort);
      this.connected[address] = 'nat';
      this.lastAlive[address] = Date.now();
    }
    return new Promise<boolean>((resolve) => {
      resolve(punched);
    });
  }

  public addRelayConnection(remotePort: number, remoteHost: string): void {
    this.connected[buildAddress(remoteHost, remotePort)] = 'relay';
  }

  public removeConnection(remotePort: number, remoteHost: string): void {
    delete this.connected[buildAddress(remoteHost, remotePort)];
  }

  /**
   * Get the utp-native socket created. Enables you to do some
   * low level operations directly on the socket.
   */
  public getSocket(): any {
    return this.socket;
  }

  /**
   * Sending a keep alive packet to the peer every 25 seconds.
   */
  protected keepAlive = (): void => {
    this.logger.info(`Sending keep alive to all NATTED hosts.`);
    for (const address in this.connected) {
      this.socket.send(
        Buffer.from('Keep Alive'),
        0,
        10,
        getPort(address),
        getHost(address),
      );
      break;
    }
    this.timer = setTimeout(this.keepAlive, 25 * 1000);
  };
}

export default ConnectionManager;
