import net from 'net';
import dgram from 'dgram';
import { EventEmitter } from 'events';
import { Address } from '../../nodes/Node';
import MTPConnection from '../micro-transport-protocol/MTPConnection';
import { randomString } from '../../utils';
import Logger from '@matrixai/logger';

// This class is used when you have an existing tcp socket and want to
// pipe it to a udp address (i.e. via a new MTP connection)
class TCPToMTPSocketPipe extends EventEmitter {
  id: string;

  localNodeId: string;
  udpAddress: Address;
  udpSocket: dgram.Socket;
  logger: Logger;

  mtpConnection: MTPConnection;
  targetSocketPending: boolean;
  buffer: Buffer[];
  tcpSocket: net.Socket;

  constructor(
    localNodeId: string,
    tcpSocket: net.Socket,
    udpAddress: Address,
    udpSocket: dgram.Socket,
    logger: Logger = new Logger('TCPToMTPSocketPipe'),
  ) {
    super();

    this.id = randomString(5);

    this.localNodeId = localNodeId;
    this.tcpSocket = tcpSocket;
    this.udpAddress = udpAddress;
    this.udpSocket = udpSocket;
    this.logger = logger;

    this.targetSocketPending = true;
    this.buffer = [];

    console.log(`created new pending SocketPipe.`);

    this.pipeTCPToMTP();
  }

  private pipeTCPToMTP() {
    // We have a tcp socket - now register its handlers
    // On data
    this.tcpSocket.on('data', (data) => {
      // Got data - do we have a target socket?
      if (this.mtpConnection === undefined) {
        // Create a target socket for the relay socket - connecting to the target
        this.pipeMTPToTCP();
        this.emit('pair');
      }

      // Is the target socket still connecting? If so, are we buffering data?
      if (this.targetSocketPending) {
        // Store the data until we have a target socket
        this.buffer[this.buffer.length] = data;
      } else {
        try {
          // Or just pass it directly
          this.mtpConnection.write(data);
        } catch (error) {
          console.error(`error writing to mtp connection: `, error);
        }
      }
    });

    // On closing
    this.tcpSocket.on('close', (hadError) => {
      if (hadError) {
        console.error(`tcp socket closed with error`);
      }

      if (!this.mtpConnection) {
        // Signal we are closing - server closed the connection
        this.emit('close');
      } else {
        // Destroy the other socket
        this.mtpConnection.destroy();
      }
    });

    this.tcpSocket.on('error', (error) => {
      console.error(`error with tcp socket: `, error);
    });
  }

  private pipeMTPToTCP() {
    // connect udp socket
    this.mtpConnection = MTPConnection.connect(
      this.localNodeId,
      this.udpAddress.port,
      this.udpAddress.host,
      this.udpSocket,
    );

    console.log(
      `Successfully connected to udp address ${this.udpAddress.toString()}.`,
    );

    // Connected, not pending anymore
    this.targetSocketPending = false;

    // And if we have any buffered data, forward it
    try {
      for (const bufferItem of this.buffer) {
        this.mtpConnection.write(bufferItem);
      }
    } catch (error) {
      console.error(`Error writing to MTP Connection: `, error);
    }

    // Clear the array
    this.buffer.length = 0;

    // Got data from the target socket?
    this.mtpConnection.on('data', (data) => {
      try {
        // Forward it!
        if (!this.tcpSocket.destroyed) {
          this.tcpSocket.write(data);
        }
      } catch (error) {
        console.error(`Error writing to TCP Socket: `, error);
      }
    });

    this.mtpConnection.on('error', (hadError) => {
      if (hadError) {
        console.error(`MTP Connection was closed with error: `, hadError);
      }

      this.terminate();
    });
  }

  terminate() {
    this.logger.info(`terminating socket pipe...`);
    this.mtpConnection.destroy(undefined, (error) => {
      if (error) {
        this.logger.error(`socket pipe could not be destroyed: ${error}`);
      } else {
        this.logger.info(`socket pipe successfully destroyed`);
      }
    });
    this.logger.info(`removed all listeners`);
    this.removeAllListeners();
    this.logger.info(`removed all listeners`);
    this.tcpSocket.destroy();
    this.logger.info(`socket pipe successfully destroyed`);
  }
}

export default TCPToMTPSocketPipe;
