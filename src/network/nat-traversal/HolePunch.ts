// import net from 'net'
// import dgram from 'dgram'
// import { Address } from '../../nodes/Node';
// import TCPToMTPSocketPipe from '../socket-pipes/TCPToMTPSocketPipe';

// class HolePunch {
//   relayedNodeId: string;

//   private localNodeId: string;
//   private udpSocket: dgram.Socket;
//   private udpAddress: Address;
//   private relayedTCPServer: net.Server;

//   // pipes
//   private tcpToMTPSocketPipes: Map<string, TCPToMTPSocketPipe> = new Map

//   constructor(localNodeId: string, udpSocket: dgram.Socket, udpAddress: Address) {
//     this.localNodeId = localNodeId
//     this.udpSocket = udpSocket
//     this.udpAddress = udpAddress
//     this.relayedTCPServer = net.createServer((socket) => {
//       // create tcp to mtp pipe
//       const pipe = new TCPToMTPSocketPipe(
//         this.localNodeId,
//         socket,
//         this.udpAddress,
//         this.udpSocket
//       )
//       this.tcpToMTPSocketPipes.set(pipe.id, pipe)
//     })
//   }

//   async start() {
//     return new Promise<void>((resolve, reject) => {
//       try {
//         const host = process.env.PK_PEER_HOST ?? '0.0.0.0'
//         this.relayedTCPServer.listen(0, host, () => {
//           resolve()
//         })
//       } catch (error) {
//         reject(error)
//       }
//     })
//   }

//   async stop() {
//     return new Promise<void>((resolve, reject) => {
//       this.tcpToMTPSocketPipes.forEach(p => p.terminate())
//       this.tcpToMTPSocketPipes = new Map
//       this.relayedTCPServer.close((error) => {
//         if (error) {
//           reject(error)
//         } else {
//           resolve()
//         }
//       })
//     })
//   }

//   public get address(): Address {
//     return Address.fromAddressInfo(<net.AddressInfo>this.relayedTCPServer.address())
//   }

// }

// export default HolePunch
