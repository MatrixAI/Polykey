import net from 'net';
import { EventEmitter } from 'events';
import { Address } from '../../nodes/NodeInfo';
import MTPConnection from '../micro-transport-protocol/MTPConnection';
import { randomString } from '../../utils';

// This class is used when you have an existing mtp connection and want to
// pipe it to a tcp address (i.e. that tcp socket doesn't exist yet)
class MTPToTCPSocketPipe extends EventEmitter {
  id: string;
  tcpAddress: Address;

  tcpSocket: net.Socket;
  targetSocketPending: boolean;
  buffer: Buffer[];
  mtpConnection: MTPConnection;

  constructor(mtpConnection: MTPConnection, tcpAddress: Address) {
    super();
    this.id = randomString();

    this.tcpAddress = tcpAddress;

    this.mtpConnection = mtpConnection;

    this.targetSocketPending = true;
    this.buffer = [];

    console.log(`created new pending MTPToTCPSocketPipe.`);

    this.pipeMTPToTCP();
  }

  private pipeMTPToTCP() {
    console.log(`piping MTP connection to TCP Socket.`);

    // We have an MTP connection - now register its handlers
    // On data
    this.mtpConnection.on('data', (data) => {
      // Got data - do we have a target socket?
      if (!this.tcpSocket) {
        // Create a target socket for the relay socket - connecting to the target
        this.pipeTCPToMTP();
        this.emit('pair');
      }

      // Is the target socket still connecting? If so, are we buffering data?
      if (this.targetSocketPending) {
        // Store the data until we have a target socket
        this.buffer[this.buffer.length] = data;
      } else {
        try {
          // Or just pass it directly
          this.tcpSocket.write(data);
        } catch (error) {
          console.error(`Error writing to TCP Socket: `, error);
        }
      }
    });

    // On closing
    this.mtpConnection.on('close', (hadError) => {
      if (hadError) {
        console.error(`MTP Connection closed with error.`);
      }

      if (!this.tcpSocket) {
        // Signal we are closing - server closed the connection
        this.emit('close');
      } else {
        // Destroy the other socket
        this.tcpSocket.destroy();
      }
    });

    this.mtpConnection.on('error', (error) => {
      console.error(`Error with MTP Connection: `, error);
    });
  }

  private pipeTCPToMTP() {
    console.log(`piping TCP Socket to MTP connection.`);

    // Or use TCP
    this.tcpSocket = net.connect(this.tcpAddress.port, this.tcpAddress.host, () => {
      console.log(`Successfully connected to target ${this.tcpAddress.toString()}.`);

      // Configure socket for keeping connections alive
      this.tcpSocket.setKeepAlive(true, 120 * 1000);

      // Connected, not pending anymore
      this.targetSocketPending = false;

      // And if we have any buffered data, forward it
      try {
        for (const bufferItem of this.buffer) {
          this.tcpSocket.write(bufferItem);
        }
      } catch (error) {
        console.error(`Error writing to TCP Socket: `, error);
      }

      // Clear the array
      this.buffer.length = 0;
    });

    // Got data from the target socket?
    this.tcpSocket.on('data', (data) => {
      try {
        // Forward it!
        this.mtpConnection.write(data);
      } catch (error) {
        console.error(`Error writing to MTP Connection: `, error);
      }
    });

    this.tcpSocket.on('error', (hadError) => {
      if (hadError) {
        console.error(`TCP socket was closed with error: `, hadError);
      }

      this.terminate();
    });
  }

  terminate() {
    console.log(`Terminating socket pipe...`);
    this.removeAllListeners();
    this.mtpConnection.destroy();
  }
}

export default MTPToTCPSocketPipe;
