// class Data extends Buffer {

//   alloc(size: number) {
//     return Data.from(Buffer.alloc(size));
//   }

//   readBit(index: number) {
//     const byte = index >> 3;
//     const bit = index & 7;
//     return !!(this.buffer[byte] & (128 >> bit));
//   }

//   writeBit(value, index: number) {
//     const byte = index >> 3;
//     const bit = index & 7;
//     const mask = 128 >> bit;

//     const currentByte = this.buffer[byte];
//     const newByte = value ? currentByte | mask : currentByte & ~mask;

//     if (currentByte === newByte) {
//       return false;
//     }

//     this.buffer[byte] = newByte;
//     return true;
//   };

//   readUncontiguous(indexArray: number[]) {
//     let value = 0;
//     for (const [idx, bitIdx] of indexArray.entries()) {
//       let weight = Math.pow(2, indexArray.length - 1 - idx);
//       if (this.readBit(bitIdx)) {
//         value += weight;
//       }
//     };
//     return value;
//   };

//   writeUncontiguous(value, indexArray) {
//     const bits = Array.from(value.toString(2));
//     if (bits.length > indexArray.length) {
//       throw new Error('value is larger than specified data size');
//     }
//     for (let i = 0; i < indexArray.length; i++) {
//       const pos = indexArray[indexArray.length - 1 - i];
//       let bit = 0;
//       if (i < bits.length) {
//         bit = bits[bits.length - 1 - i] === "1" ? 1 : 0;
//       }
//       this.writeBit(bit, pos);
//     }
//   };

//   writeWord(value, offset, length) {
//     const bits = Array.from(value.toString(2));
//     if (bits.length > length) {
//       throw new Error('value is larger than specified data size');
//     }
//     for (let i = 0; i < length; i++) {
//       const pos = offset + length - i - 1;
//       let bit = 0;
//       if (i < bits.length) {
//         bit = bits[bits.length - 1 - i] === "1" ? 1 : 0;
//       }
//       this.writeBit(bit, pos);
//     }
//   };
// }

// export default Data
