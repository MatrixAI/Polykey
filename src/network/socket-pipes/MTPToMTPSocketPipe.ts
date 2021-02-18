import dgram from 'dgram';
import { EventEmitter } from 'events';
import { Address } from '../../nodes/NodeInfo';
import MTPConnection from '../micro-transport-protocol/MTPConnection';
import { randomString } from '../../utils';

// This class is used when you have an existing mtp connection and want to
// pipe it to a tcp address (i.e. that tcp socket doesn't exist yet)
class MTPToTCPSocketPipe extends EventEmitter {
  id: string;

  targetConnectionPending: boolean;
  buffer: Buffer[];

  mtpConnection: MTPConnection;
  nodeId: string;
  udpAddress: Address;
  udpSocket: dgram.Socket;

  targetConnection: MTPConnection;

  constructor(mtpConnection: MTPConnection, nodeId: string, udpAddress: Address, udpSocket: dgram.Socket) {
    super();
    this.id = randomString();

    this.nodeId = nodeId;
    this.udpAddress = udpAddress;
    this.udpSocket = udpSocket;

    this.mtpConnection = mtpConnection;

    this.targetConnectionPending = true;
    this.buffer = [];

    console.log(`created new pending MTPToTCPSocketPipe.`);

    this.pipeOriginToTarget();
  }

  private pipeOriginToTarget() {
    console.log(`piping existing MTP connection to new MTP connection.`);

    // We have an MTP connection - now register its handlers
    // On data
    this.mtpConnection.on('data', (data) => {
      // Got data - do we have a target socket?
      if (!this.targetConnection) {
        // Create a target socket for the relay socket - connecting to the target
        this.pipeTargetToOrigin();
        this.emit('pair');
      }

      // Is the target socket still connecting? If so, are we buffering data?
      if (this.targetConnectionPending) {
        // Store the data until we have a target socket
        this.buffer[this.buffer.length] = data;
      } else {
        try {
          // Or just pass it directly
          this.targetConnection.write(data);
        } catch (error) {
          console.error(`Error writing to target connection: `, error);
        }
      }
    });

    // On closing
    this.mtpConnection.on('close', (hadError) => {
      if (hadError) {
        console.error(`origin Connection closed with error.`);
      }

      if (!this.targetConnection) {
        // Signal we are closing - server closed the connection
        this.emit('close');
      } else {
        // Destroy the other socket
        this.targetConnection.destroy();
      }
    });

    this.mtpConnection.on('error', (error) => {
      console.error(`Error with MTP Connection: `, error);
    });
  }

  private pipeTargetToOrigin() {
    console.log(`piping target connection to origin connection.`);

    // Or use TCP
    this.targetConnection = MTPConnection.connect(this.nodeId, this.udpAddress.port, this.udpAddress.host, this.udpSocket);
    console.log(`Successfully connected to target ${this.udpAddress.toString()}.`);

    // Connected, not pending anymore
    this.targetConnectionPending = false;

    // And if we have any buffered data, forward it
    try {
      for (const bufferItem of this.buffer) {
        this.targetConnection.write(bufferItem);
      }
    } catch (error) {
      console.error(`error writing to target connection: `, error);
    }

    // Clear the array
    this.buffer.length = 0;

    // Got data from the target socket?
    this.targetConnection.on('data', (data) => {
      try {
        // Forward it!
        this.mtpConnection.write(data);
      } catch (error) {
        console.error(`error writing to origin connection: `, error);
      }
    });

    this.targetConnection.on('error', (hadError) => {
      if (hadError) {
        console.error(`target connection was closed with error: `, hadError);
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
