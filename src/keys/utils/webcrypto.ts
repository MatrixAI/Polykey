import { Crypto } from '@peculiar/webcrypto';

/**
 * WebCrypto polyfill from @peculiar/webcrypto
 * This behaves differently with respect to Ed25519 keys
 * See: https://github.com/PeculiarVentures/webcrypto/issues/55
 * TODO: implement interface with libsodium
 */
const webcrypto = new Crypto();

/**
 * Monkey patches the global crypto object polyfill
 */
globalThis.crypto = webcrypto;

export default webcrypto;
