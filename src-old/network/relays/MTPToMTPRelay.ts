// import net from 'net'
// import dgram from 'dgram'
// import { PK_BOOTSTRAP_HOSTS } from '../../config';
// import { Address } from '../../nodes/Node';
// import MTPToMTPSocketPipe from '../socket-pipes/MTPToMTPSocketPipe';
// import { MTPServer } from '../micro-transport-protocol/MTPServer';
// import Logger from '@matrixai/logger'

// class MTPToMTPRelay {
//   relayedNodeId: string;

//   private mtpServer: MTPServer;
//   private socket: dgram.Socket;
//   private targetAddress: Address;

//   // pipes
//   private mtpToMTPSocketPipes: Map<string, MTPToMTPSocketPipe> = new Map

//   constructor(targetSocket: dgram.Socket, targetAddress: Address, socket?: dgram.Socket) {
//     this.socket = socket ?? dgram.createSocket('udp4')
//     this.targetAddress = targetAddress
//     this.mtpServer = new MTPServer((socket) => {
//       // create tcp to mtp pipe
//       const pipe = new MTPToMTPSocketPipe(
//         this.localNodeId,
//         socket,
//         this.udpAddress,
//         this.udpSocket
//       )
//       this.tcpToMTPSocketPipes.set(pipe.id, pipe)
//     }, new Logger('MTPToMTPRelay'))
//   }

//   async start() {
//     return new Promise<void>((resolve, reject) => {
//       try {
//         const host = PK_BOOTSTRAP_HOSTS ?? '0.0.0.0'
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

//   public get relayedAddress(): Address {
//     const address = Address.fromAddressInfo(<net.AddressInfo>this.relayedTCPServer.address())
//     if (PK_BOOTSTRAP_HOSTS) {
//       address.updateHost(PK_BOOTSTRAP_HOSTS)
//     }
//     return address
//   }

// }

// export default MTPToMTPRelay
