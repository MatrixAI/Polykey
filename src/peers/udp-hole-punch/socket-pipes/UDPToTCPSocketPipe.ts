import net from 'net';
import { EventEmitter } from 'events';
import { Address } from '../../PeerInfo';
import { MTPConnection, connect } from '../MicroTransportProtocol';

let socketPipeId = 0;

class UDPToTCPSocketPipe extends EventEmitter {
  id: number;
  udpAddress: Address;

  udpSocket: MTPConnection;
  targetSocketPending: boolean;
  buffer: Buffer[];
  tcpSocket: net.Socket;

  constructor(tcpSocket: net.Socket, udpAddress: Address) {
    super();

    this.id = socketPipeId;
    socketPipeId += 1;

    this.udpAddress = udpAddress;
    this.tcpSocket = tcpSocket;

    this.targetSocketPending = true;
    this.buffer = [];

    console.log(`[udp-tcp-relay:${this.id}] Created new pending SocketPipe.`);

    this.openRelayEnd();
  }

  private openRelayEnd() {
    console.log(`[udp-tcp-relay:${this.id}] Socket pipe will TCP connection to connect to relay server.`);

    // We have a relay socket - now register its handlers

    // On data
    this.tcpSocket.on('data', (data) => {
      // Got data - do we have a target socket?
      if (this.udpSocket === undefined) {
        // Create a target socket for the relay socket - connecting to the target
        this.openTargetEnd();
        this.emit('pair');
      }

      // Is the target socket still connecting? If so, are we buffering data?
      if (this.targetSocketPending) {
        // Store the data until we have a target socket
        this.buffer[this.buffer.length] = data;
      } else {
        try {
          // Or just pass it directly
          this.udpSocket.write(data);
        } catch (ex) {
          console.error(`[udp-tcp-relay:${this.id}] Error writing to target socket: `, ex);
        }
      }
    });

    // On closing
    this.tcpSocket.on('close', (hadError) => {
      if (hadError) {
        console.error(`[udp-tcp-relay:${this.id}] Relay socket closed with error.`);
      }

      if (this.udpSocket !== undefined) {
        // Destroy the other socket
        this.udpSocket.destroy();
      } else {
        // Signal we are closing - server closed the connection
        this.emit('close');
      }
    });

    this.tcpSocket.on('error', (error) => {
      console.error(`[udp-tcp-relay:${this.id}] Error with relay socket: `, error);
    });
  }

  private openTargetEnd() {
    console.log(
      `[udp-tcp-relay:${
        this.id
      }] Authorized by relay server. Creating new connection to target ${this.udpAddress.toString()}...`,
    );
    console.log(`[udp-tcp-target:${this.id}] Socket pipe will TCP connection to connect to target server.`);

    // connect udp socket
    this.udpSocket = connect(this.udpAddress.port, this.udpAddress.host);

    console.log(`[udp-tcp-target:${this.id}] Successfully connected to target ${this.udpAddress.toString()}.`);

    // Connected, not pending anymore
    this.targetSocketPending = false;

    // And if we have any buffered data, forward it
    try {
      for (const bufferItem of this.buffer) {
        this.udpSocket.write(bufferItem);
      }
    } catch (ex) {
      console.error(`[udp-tcp-target:${this.id}] Error writing to target socket: `, ex);
    }

    // Clear the array
    this.buffer.length = 0;

    // Got data from the target socket?
    this.udpSocket.on('data', (data) => {
      try {
        // Forward it!
        if (!this.tcpSocket.destroyed) {
          this.tcpSocket.write(data);
        }
      } catch (ex) {
        console.error(`target:${this.id}] Error writing to target socket: `, ex);
      }
    });

    this.udpSocket.on('error', (hadError) => {
      if (hadError) {
        console.error(`[target:${this.id}] Target socket was closed with error: `, hadError);
      }

      this.terminate();
    });
  }

  terminate() {
    console.log(`[udp-tcp-relay:${this.id}] Terminating socket pipe...`);
    this.removeAllListeners();
    this.tcpSocket.destroy();
  }
}

export default UDPToTCPSocketPipe;
