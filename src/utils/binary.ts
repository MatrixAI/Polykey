/**
 * Binary helper functions
 * @module
 */

/**
 * Uint8Array to hex string
 */
function bytes2Hex(bytes: Uint8Array): string {
  return [...bytes].map((n) => dec2Hex(n, 2)).join('');
}

/**
 * Hex string as Uint8Array
 */
function hex2Bytes(hex: string): Uint8Array {
  const numbers = strChunks(hex, 2).map((b) => parseInt(b, 16));
  return new Uint8Array(numbers);
}

/**
 * Uint8Array to bit string
 */
function bytes2Bits(bytes: Uint8Array): string {
  return [...bytes].map((n) => dec2Bits(n, 8)).join('');
}

/**
 * Bit string to Uint8Array
 */
function bits2Bytes(bits: string): Uint8Array {
  const numbers = strChunks(bits, 8).map((b) => parseInt(b, 2));
  return new Uint8Array(numbers);
}

/**
 * Uint8Array to Positive BigInt
 */
function bytes2BigInt(bytes: Uint8Array): bigint {
  const hex = bytes2Hex(bytes);
  return BigInt('0x' + hex);
}

/**
 * Positive BigInt to Uint8Array
 * Big-endian order
 */
function bigInt2Bytes(bigInt: bigint, size?: number): Uint8Array {
  if (bigInt < 0) {
    throw new RangeError('bigInt must be positive');
  }
  let hex;
  if (size != null) {
    bigInt %= BigInt(16 ** (size * 2));
    hex = bigInt.toString(16).padStart(size * 2, '0');
  } else {
    hex = bigInt.toString(16);
    if (hex.length % 2) {
      hex = '0' + hex;
    }
  }
  return hex2Bytes(hex);
}

/**
 * Positive BigInt numbers to hex string
 * Big-endian order
 */
function bigInt2Hex(bigInt: bigint, size?: number): string {
  // Cannot coerce bigint to unsigned bigint
  // Because it requires clamping to a specified bitsize
  // And there's no static bitsize for bigint
  if (bigInt < 0) {
    throw new RangeError('bigInt must be positive');
  }
  let hex;
  if (size != null) {
    bigInt %= BigInt(16 ** size);
    hex = bigInt.toString(16).padStart(size, '0');
  } else {
    hex = bigInt.toString(16);
  }
  return hex;
}

/**
 * Positive base 10 numbers to hex string
 * Big-endian order
 * Use parseInt for vice-versa
 */
function dec2Hex(dec: number, size: number): string {
  dec %= 16 ** size;
  // `>>>` coerces dec to unsigned integer
  return (dec >>> 0).toString(16).padStart(size, '0');
}

/**
 * Positive base 10 numbers to bit string
 * Big-endian order
 * Use parseInt for vice-versa
 */
function dec2Bits(dec: number, size: number): string {
  dec %= 2 ** size;
  // `>>>` coerces dec to unsigned integer
  return (dec >>> 0).toString(2).padStart(size, '0');
}

/**
 * Chunks strings into same size chunks
 * The last chunk will be smaller if a clean division is not possible
 */
function strChunks(str: string, size: number): Array<string> {
  const chunkCount = Math.ceil(str.length / size);
  const chunks = new Array(chunkCount);
  let i = 0;
  let o = 0;
  for (; i < chunkCount; ++i, o += size) {
    chunks[i] = str.substr(o, size);
  }
  return chunks;
}

export {
  bytes2Hex,
  hex2Bytes,
  bytes2Bits,
  bits2Bytes,
  bytes2BigInt,
  bigInt2Bytes,
  bigInt2Hex,
  dec2Hex,
  dec2Bits,
  strChunks,
};
