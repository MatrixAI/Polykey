// import Data from "../data/Data";
// import STUNMessage from "./Message";
// import { STUNAttributeType } from "./types";

// class Attribute {
//   message: STUNMessage
//   type: STUNAttributeType;
//   value: any;
//   length: number;
//   padding: number;
//   constructor(
//     message: STUNMessage,
//     type?: STUNAttributeType,
//     value?: any
//   ) {
//     this.message = message
//     if (type) {
//       this.type = type
//     }
//     if (value) {
//       this.value = value
//     }
//   }

//   read(data: Data) {
//     this.type = data.readUIntBE(0, 2);
//     this.length = data.readUIntBE(2, 2);
//     this.padding = this.length % 4 ? 4 - (this.length % 4) : 0;
//     switch (this.type) {
//       case STUNAttributeType.ALTERNATE_SERVER:
//         this.value = data.readUIntBE(4, this.length);
//         break;
//       case STUNAttributeType.CHANNEL_NUMBER:
//         this.value = data.readUIntBE(4, 2);
//         break;
//       case STUNAttributeType.DATA:
//         this.value = data.slice(4, this.length + 4);
//         break;
//       case STUNAttributeType.DONT_FRAGMENT:
//         this.value = true;
//         break;
//       case STUNAttributeType.ERROR_CODE:
//         this.value = data.readUIntBE(4, this.length);
//         break;
//       case STUNAttributeType.EVEN_PORT:
//         /*
//         *      0
//         *      0 1 2 3 4 5 6 7
//         *     +-+-+-+-+-+-+-+-+
//         *     |R|    RFFU     |
//         *     +-+-+-+-+-+-+-+-+
//         */
//         this.value = data.readBit(32);
//         break;
//       case STUNAttributeType.FINGERPRINT:
//         this.value = data.readUIntBE(4, this.length);
//         break;
//       case STUNAttributeType.LIFETIME:
//         this.value = data.readUIntBE(4, this.length);
//         break;
//       case STUNAttributeType.MAPPED_ADDRESS:
//         this.value = data.readUIntBE(4, this.length);
//         break;
//       case STUNAttributeType.MESSAGE_INTEGRITY:
//         this.value = data.toString('hex', 4, 4 + this.length);
//         break;
//       case STUNAttributeType.NONCE:
//         this.value = data.toString('utf8', 4, 4 + this.length);
//         break;
//       case STUNAttributeType.REALM:
//         this.value = data.toString('utf8', 4, 4 + this.length);
//         break;
//       case STUNAttributeType.REQUESTED_TRANSPORT:
//         this.value = data.readUIntBE(4, 1);
//         break;
//       case STUNAttributeType.RESERVATION_TOKEN:
//         this.value = data.readUIntBE(4, this.length);
//         break;
//       case STUNAttributeType.SOFTWARE:
//         this.value = data.toString('utf8', 4, 4 + this.length);
//         break;
//       case STUNAttributeType.UNKNOWN_ATTRIBUTES:
//         this.value = data.readUIntBE(4, this.length);
//         break;
//       case STUNAttributeType.USERNAME:
//         this.value = data.toString('utf8', 4, 4 + this.length);
//         break;
//       case STUNAttributeType.XOR_MAPPED_ADDRESS:
//       case STUNAttributeType.XOR_PEER_ADDRESS:
//       case STUNAttributeType.XOR_RELAYED_ADDRESS:
//         var family = data.readUIntBE(5, 1);
//         var xport = data.readUIntBE(6, 2);
//         var port = xport ^ (this.msg.magicCookie >> 16);
//         if (family === CONSTANTS.TRANSPORT.FAMILY.IPV4) {
//           var magicCookieBuffer = Buffer.alloc(4);
//           magicCookieBuffer.writeUInt32BE(this.msg.magicCookie);
//           var address = [];
//           address.push((data[8] & 0xff) ^ magicCookieBuffer[0]);
//           address.push((data[9] & 0xff) ^ magicCookieBuffer[1]);
//           address.push((data[10] & 0xff) ^ magicCookieBuffer[2]);
//           address.push((data[11] & 0xff) ^ magicCookieBuffer[3]);
//           address = address.join('.');
//           this.value = new Address(address, port);
//         } else {
//           var key = Buffer.alloc(16);
//           key.writeUInt32BE(this.msg.magicCookie);
//           key.write(this.msg.transactionID, 4, 12, 'hex');
//           var address = [];
//           for (var i = 0; i < 8; i++) {
//             address.push((data.readUInt16BE(8 + i * 2) ^ key.readUInt16BE(i * 2)).toString(16));
//           }
//           this.value = new Address(address.join(':'), port);
//         }
//         break;
//       default:
//         throw new Error('Invalid Attribute type ' + this.type.toString(16));
//     }

//     Object.keys(STUNAttributeType).forEach(function (name) {
//       if (STUNAttributeType[name] === self.type) {
//         self.name = name.replace(/_/g, '-').toLowerCase();
//       }
//     });
//   }
// }

// export default Attribute
