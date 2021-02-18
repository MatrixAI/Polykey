// import dgram from 'dgram'
// import crypto from 'crypto'
// import Data from '../data/Data'
// import Server from "../server/Server"
// // Format of STUN Message Header:
// // 0                   1                   2                   3
// // 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
// // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// // |0 0|     STUN Message Type     |         Message Length        |
// // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// // |                         Magic Cookie                          |
// // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// // |                                                               |
// // |                     Transaction ID (96 bits)                  |
// // |                                                               |
// // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

// import Transport from "../transport/Transport"
// import { STUNAttributeType, STUNMagicCookie } from "./types"
// import Attribute from "./Attribute"

// // Format of STUN Message Type Field:
// // 0                 1
// // 2  3  4 5 6 7 8 9 0 1 2 3 4 5

// // +--+--+-+-+-+-+-+-+-+-+-+-+-+-+
// // |M |M |M|M|M|C|M|M|M|C|M|M|M|M|
// // |11|10|9|8|7|1|6|5|4|0|3|2|1|0|
// // +--+--+-+-+-+-+-+-+-+-+-+-+-+-+

// // state type
// enum MessageStateType {
//   WAITING = 0,
//   RESOLVED = 1,
//   REJECTED = 2,
//   DISCARDED = 3,
//   INCOMING = 4,
// }

// // state type
// enum MessageClassType {
//   REQUEST = 0x00,
//   INDICATION = 0x01,
//   SUCCESS = 0x02,
//   ERROR = 0x03,
// }

// class STUNMessage {
//   // the server is passed into each STUNMessage so that each method
//   // can reply directly on the message type
//   socket: dgram.Socket
//   transport: Transport
//   transactionId?: string
//   attributes: Map<STUNAttributeType, any> = new Map

//   // state of message
//   private state: MessageStateType = MessageStateType.WAITING
//   class: MessageClassType
//   method: number
//   magicCookie: any
//   length: number

//   constructor(socket: dgram.Socket, transport: Transport) {
//     this.socket = socket
//     this.transport = transport
//   }

//   getAttribute(type: STUNAttributeType): any | null {
//     for (const [attrType, attr] of this.attributes) {
//       if (attrType == type) {
//         return attr
//       }
//     }
//     return null
//   }

//   // toBuffer(): Buffer {
//   //   const zeroBuf = Buffer.alloc()
//   //   // generate a transaction id if non exists
//   //   if (!this.transactionId) {
//   //     this.transactionId = crypto.randomBytes(12).toString('hex')
//   //   }

//   //   return Buffer.concat()
//   // }

//   read(udpPacket?: Buffer) {

//     this.state = MessageStateType.INCOMING;

//     if (!udpPacket) {
//       return false;
//     }

//     const data = Buffer.from(udpPacket) as Data;

//     const firstBit = data.readBit(0);
//     const secondBit = data.readBit(1);

//     // The most significant 2nd bits of every TURN message MUST be zeroes.
//     if (firstBit || secondBit) {
//       return false;
//     }

//     // read class C1 7th bit and C0 11th bit
//     this.class = data.readUncontiguous([7, 11]);

//     // read method from M11 to M0
//     this.method = data.readUncontiguous([2, 3, 4, 5, 6, 8, 9, 10, 12, 13, 14, 15]);

//     const messageLength = data.readInt16BE(2);

//     // check message length
//     if (messageLength + 20 > data.length) {
//       throw new Error('invalid STUN message length');
//     }

//     this.magicCookie = data.readUInt32BE(4);

//     // check magic cookie
//     if (this.magicCookie != STUNMagicCookie) {
//       return false;
//     }

//     this.transactionId = data.toString('hex', 8, 20);

//     // read attributes
//     let attributes = data.slice(20) as Data;


//     while (attributes.length >= 4) {
//       const attribute = new Attribute(this);
//       attribute.read(attributes);


//       // if (attribute.type === STUNAttributeType.MESSAGE_INTEGRITY) {
//       //   let hmacInput = data.slice(0, 20 + this.length);
//       //   let username = this.getAttribute(STUNAttributeType.USERNAME);
//       //   if (!username) {
//       //     console.log('no username sent');
//       //     attribute.value = false;
//       //   } else {
//       //     let password = this.socket.authentification.credentials[username];
//       //     if (!password) {
//       //       console.log('password not provided');


//       //       attribute.value = false;
//       //     } else {
//       //       let hmacKey = crypto.createHash('md5').update(username + ':' + this.socket.realm  + ':' + password).digest();
//       //       // update message length to compute hmac
//       //       let previousLength = hmacInput.readInt16BE(2);
//       //       hmacInput.writeInt16BE(this.length + 24, 2);
//       //       let hmac = crypto.createHmac('sha1', hmacKey).update(hmacInput).digest('hex');
//       //       // reset message length for fingerprint
//       //       hmacInput.writeInt16BE(previousLength, 2);
//       //       if (hmac !== attribute.value) {
//       //         console.log('hmac did not match value');

//       //         this.debug('DEBUG', 'invalid message-integrity, should be ' + hmac + ' instead of ' + attribute.value);
//       //         attribute.value = false;
//       //       }
//       //     }
//       //   }
//       // }
//       // if (attribute.type === STUNAttributeType.FINGERPRINT) {
//       //   this.useFingerprint = true;
//       //   let toHash = data.slice(0, 20 + this.length);
//       //   let fingerprint = Buffer.alloc(4);
//       //   fingerprint.writeUIntBE(crc.crc32(toHash), 0, 4);
//       //   let xor = Buffer.alloc(4);
//       //   xor.writeUIntBE(0x5354554e, 0, 4);
//       //   fingerprint.forEach(function(byte, i) {
//       //     fingerprint[i] = (parseInt(byte, 10) & 0xff) ^ xor[i];
//       //   });
//       //   if (fingerprint.readUIntBE(0,4) !== attribute.value) {
//       //     // fingerprint is invalid
//       //     attribute.value = false;
//       //   }
//       // }
//       this.attributes.push(attribute);
//       this.length += 4 + attribute.length + attribute.padding;
//       attributes = attributes.slice(4 + attribute.length + attribute.padding);
//     }

//     // all tests passed so this is a valid STUN message
//     return true;
//   }

//   reject(code: number, reason: string) {
//     // cannot reject a message in the waiting state
//     if (this.state == MessageStateType.WAITING) {
//       return;
//     }


//     this.class = MessageClassType.ERROR;
//     this.addAttribute(STUNAttributeType.ERROR_CODE, {
//       code: code,
//       reason: reason
//     });
//     this.state = MessageStateType.REJECTED;
//     const msg = this.toBuffer();
//     this.transport.socket.send(msg, this.transport.dst.port, this.transport.dst.address, function(err) {
//       if (err) {
//         self.debug('FATAL', 'Fatal error while responding to ' + self.transport.dst + ' TransactionID: ' + self.transactionID  + '\n' + self);
//         self.debug('FATAL', err);
//         return;
//       }
//       self.debug('DEBUG', 'Sending ' + self);
//     });
//   }
//   addAttribute(type: STUNAttributeType, attribute: any) {
//     this.attributes.set(type, attribute)
//   }
// }

// export default STUNMessage
