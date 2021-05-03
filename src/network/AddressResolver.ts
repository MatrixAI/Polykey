/**
 * Currently unused
 */

// import Logger from '@matrixai/logger';
// import utp from 'utp-native';
// import { Address } from './types';

// /**
//  * For resolving the public address of the keynode.
//  */
// class AddressResolver {
//   // nodeId is a Node ID (Pub Key) appended with a string "FORWARD" or "REVERSE".
//   protected addresses: { [nodeId: string]: Address };

//   // A uTP socket
//   protected socket: any;
//   protected port: number;

//   protected logger: Logger;

//   constructor({ logger }: { logger?: Logger }) {
//     this.addresses = {};
//     this.socket = undefined;
//     this.logger = logger ?? new Logger('Address Resolver');
//   }

//   public async start(onNewAddress?: (address: Address) => void): Promise<void> {
//     this.socket = utp();
//     this.socket.on('message', (data: Buffer, rInfo) => {
//       const regex = /^[\w+\/=]*:[FR]$/;
//       const nodeId = data.toString();
//       const address = {
//         host: rInfo.address,
//         port: rInfo.port,
//       };

//       if (regex.test(nodeId)) {
//         this.addresses[nodeId] = address;
//         if (onNewAddress) {
//           onNewAddress(address);
//         }
//       }
//     });

//     await new Promise<void>((resolve) => {
//       this.socket.listen(() => {
//         resolve();
//       });
//     });

//     this.port = this.socket?.address().port;
//   }

//   public async stop(): Promise<void> {
//     this.socket.close();
//   }

//   public getForwardProxyAddress(nodeId: string): Address | undefined {
//     return this.addresses[nodeId + ':F'];
//   }

//   public getReverseProxyAddress(nodeId: string): Address | undefined {
//     return this.addresses[nodeId + ':R'];
//   }

//   public getPort(): number {
//     return this.port;
//   }
// }

// export default AddressResolver;
