// import dgram from 'dgram'
// import STUNMessage from '../message/Message'
// import Transport from '../transport/Transport'
// import { Address } from '../../../nodes/Node'
// import { EventEmitter } from 'events'

// class Server extends EventEmitter {
//   // config
//   relayIpList: string[]
//   externalIpList: string[]
//   listeningPort: number
//   listeningIpList: string[]
//   minRelayPort: number
//   maxRelayPort: number

//   // socket
//   sockets: dgram.Socket[] = []

//   constructor(
//     relayIpList: string[] = [],
//     externalIpList: string[] = [],
//     listeningPort: number = 0,
//     minRelayPort: number = 32767,
//     maxRelayPort: number = 65535
//   ) {
//     super()

//     this.relayIpList = relayIpList
//     this.externalIpList = externalIpList
//     this.listeningPort = listeningPort
//     this.minRelayPort = minRelayPort
//     this.maxRelayPort = maxRelayPort
//   }

//   async start() {
//     for (const ip of this.listeningIpList) {
//       const dst = new Address(ip, this.listeningPort);

//       const udpSocket = dgram.createSocket('udp4');

//       udpSocket.on('error', (err) => {
//         console.log(err);
//       });

//       udpSocket.on('message', (message, rinfo) => {
//         const src = new Address(rinfo.address, rinfo.port);
//         const transport = new Transport(src, dst, udpSocket);
//         const msg = new STUNMessage(this, transport);
//         try {
//           if (msg.read(message)) {
//             this.emit('stun-message', msg);
//           }
//         } catch (err) {
//           console.log(err);
//         }
//       });

//       udpSocket.on('listening', () => {
//         console.log(`udpSocket is listening on: ${ip}:${this.listeningPort}`);
//       });

//       udpSocket.on('close', () => {
//         console.log(`udpSocket has closed on: ${ip}:${this.listeningPort}`);
//       });

//       udpSocket.bind({
//         address: ip,
//         port: this.listeningPort,
//         exclusive: true
//       });

//       this.sockets.push(udpSocket);
//     }
//   }
// }

// export default Server
