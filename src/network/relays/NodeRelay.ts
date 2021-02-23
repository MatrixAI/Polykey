import net from 'net';
import dgram from 'dgram';
import { Address } from '../../nodes/NodeInfo';
import TCPToMTPSocketPipe from '../socket-pipes/TCPToMTPSocketPipe';
import Logger from '@matrixai/logger';

class NodeRelay {
  relayedNodeId: string;

  private localNodeId: string;
  private udpSocket: dgram.Socket;
  private udpAddress: Address;
  private logger: Logger;
  private relayedTCPServer: net.Server;

  // pipes
  private tcpToMTPSocketPipes: Map<string, TCPToMTPSocketPipe> = new Map();

  constructor(
    localNodeId: string,
    udpSocket: dgram.Socket,
    udpAddress: Address,
    logger: Logger = new Logger('NodeRelay'),
  ) {
    this.localNodeId = localNodeId;
    this.udpSocket = udpSocket;
    this.udpAddress = udpAddress;
    this.logger = logger;
    this.relayedTCPServer = net.createServer((socket) => {
      // create tcp to mtp pipe
      const pipe = new TCPToMTPSocketPipe(
        this.localNodeId,
        socket,
        this.udpAddress,
        this.udpSocket,
        this.logger.getChild('TCPToMTPSocketPipe'),
      );
      this.tcpToMTPSocketPipes.set(pipe.id, pipe);
    });
  }

  async start() {
    return new Promise<void>((resolve, reject) => {
      try {
        const host = process.env.PK_PEER_HOST ?? '0.0.0.0';
        this.relayedTCPServer.listen(0, host, () => {
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop() {
    return new Promise<void>((resolve, reject) => {
      try {
        this.tcpToMTPSocketPipes.forEach((p) => p.terminate());
        this.tcpToMTPSocketPipes = new Map();
        this.logger.info('finished terminating socket pipes');
        this.relayedTCPServer.close((error) => {
          if (error) {
            this.logger.error(`could not close relayed tcp server: ${error}`);
            reject(error);
          } else {
            this.logger.info('successfully terminated relayed tcp server');
            resolve();
          }
        });
      } catch (error) {
        this.logger.error(error);
        reject(error);
      }
    });
  }

  public get relayedAddress(): Address {
    const address = Address.fromAddressInfo(
      <net.AddressInfo>this.relayedTCPServer.address(),
    );
    if (process.env.PK_PEER_HOST) {
      address.updateHost(process.env.PK_PEER_HOST);
    }
    return address;
  }
}

export default NodeRelay;
