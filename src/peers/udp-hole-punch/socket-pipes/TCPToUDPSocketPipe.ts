import net from 'net';
import { EventEmitter } from 'events';
import { Address } from '../../PeerInfo';
import { MTPConnection } from '../MicroTransportProtocol';

let socketPipeId = 1;

class TCPToUDPSocketPipe extends EventEmitter {
  id: number;
  localAddress: Address;

  tcpSocket: net.Socket;
  targetSocketPending: boolean;
  buffer: Buffer[];
  udpSocket: MTPConnection;

  constructor(localAddress: Address, relaySocket: MTPConnection) {
    super();

    this.id = socketPipeId;
    socketPipeId += 1;

    this.localAddress = localAddress;
    if (localAddress == undefined) {
      throw Error('localAddress cannot be undefined');
    }
    this.udpSocket = relaySocket;

    this.targetSocketPending = true;
    this.buffer = [];

    console.log(`[tcp-udp-relay:${this.id}] Created new pending SocketPipe.`);

    this.openRelayEnd();
  }

  private openRelayEnd() {
    console.log(`[tcp-udp-relay:${this.id}] Socket pipe will TCP connection to connect to relay server.`);

    // We have a relay socket - now register its handlers

    // On data
    this.udpSocket.on('data', (data) => {
      // Got data - do we have a target socket?
      if (this.tcpSocket === undefined) {
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
          this.tcpSocket.write(data);
        } catch (ex) {
          console.error(`[tcp-udp-relay:${this.id}] Error writing to target socket: `, ex);
        }
      }
    });

    // On closing
    this.udpSocket.on('close', (hadError) => {
      if (hadError) {
        console.error(`[tcp-udp-relay:${this.id}] Relay socket closed with error.`);
      }

      if (this.tcpSocket !== undefined) {
        // Destroy the other socket
        this.tcpSocket.destroy();
      } else {
        // Signal we are closing - server closed the connection
        this.emit('close');
      }
    });

    this.udpSocket.on('error', (error) => {
      console.error(`[tcp-udp-relay:${this.id}] Error with relay socket: `, error);
    });
  }

  private openTargetEnd() {
    console.log(
      `[tcp-udp-relay:${
        this.id
      }] Authorized by relay server. Creating new connection to target ${this.localAddress.toString()}...`,
    );
    console.log(`[tcp-udp-target:${this.id}] Socket pipe will TCP connection to connect to target server.`);

    // Or use TCP
    this.tcpSocket = net.connect(this.localAddress.port, this.localAddress.host, () => {
      console.log(`[tcp-udp-target:${this.id}] Successfully connected to target ${this.localAddress.toString()}.`);

      // Configure socket for keeping connections alive
      this.tcpSocket.setKeepAlive(true, 120 * 1000);

      // Connected, not pending anymore
      this.targetSocketPending = false;

      // And if we have any buffered data, forward it
      try {
        for (const bufferItem of this.buffer) {
          this.tcpSocket.write(bufferItem);
        }
      } catch (ex) {
        console.error(`[tcp-udp-target:${this.id}] Error writing to target socket: `, ex);
      }

      // Clear the array
      this.buffer.length = 0;
    });

    // Got data from the target socket?
    this.tcpSocket.on('data', (data) => {
      try {
        // Forward it!
        this.udpSocket.write(data);
      } catch (ex) {
        console.error(`target:${this.id}] Error writing to target socket: `, ex);
      }
    });

    this.tcpSocket.on('error', (hadError) => {
      if (hadError) {
        console.error(`[target:${this.id}] Target socket was closed with error: `, hadError);
      }

      this.terminate();
    });
  }

  terminate() {
    console.log(`[tcp-udp-relay:${this.id}] Terminating socket pipe...`);
    this.removeAllListeners();
    this.udpSocket.destroy();
  }
}

export default TCPToUDPSocketPipe;
