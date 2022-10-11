import type { TransferDescriptor } from 'threads';
import { Key } from '../keys/types';
// import type { PublicKeyAsn1, PrivateKeyAsn1, KeyPairAsn1 } from '../keys/types';
import { isWorkerRuntime } from 'threads';
import { Transfer } from 'threads/worker';
import * as keysUtils from '../keys/utils';
import * as utils from '../utils';

/**
 * Worker object that contains all functions that will be executed in parallel
 * Functions should be using CPU-parallelism not IO-parallelism
 * Most functions should be synchronous, not asynchronous
 * Making them asynchronous does not make a difference to the caller
 * The caller must always await because the fucntions will run on the pool
 */
const polykeyWorker = {
  /**
   * Check if we are running in the worker.
   * Only used for testing
   */
  isRunningInWorker(): boolean {
    return isWorkerRuntime();
  },
  /**
   * Sleep synchronously
   * This blocks the entire event loop
   * Only used for testing
   */
  sleep(ms: number): void {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
    return;
  },
  /**
   * Zero copy demonstration manipulating buffers
   */
  transferBuffer(data: ArrayBuffer): TransferDescriptor<ArrayBuffer> {
    // Zero-copy wrap to use Node Buffer API
    const buffer = Buffer.from(data);
    // Set the last character to 2
    buffer[buffer.byteLength - 1] = '2'.charCodeAt(0);
    // Node Buffer cannot be detached
    // so we transfer the ArrayBuffer instead
    return Transfer(data);
  },
  // EFS functions
  encrypt(
    key: ArrayBuffer,
    plainText: ArrayBuffer,
  ): TransferDescriptor<ArrayBuffer> {

    // wait do we need to do a slice copy here?
    // otherwise it may not work properly
    // cause the arraybuffer being transferred back has some issues
    // ok we have a problem
    // while the key

    const cipherText = keysUtils.encryptWithKey(
      utils.bufferWrap(key) as Key,
      utils.bufferWrap(plainText)
    );
    return Transfer(cipherText.buffer);
  },
  decrypt(
    key: ArrayBuffer,
    cipherText: ArrayBuffer,
  ): TransferDescriptor<ArrayBuffer> | undefined {
    const plainText = keysUtils.decryptWithKey(
      utils.bufferWrap(key) as Key,
      utils.bufferWrap(cipherText)
    );
    if (plainText != null) {
      return Transfer(plainText.buffer);
    } else {
      return;
    }
  },

  // // KeyManager operations
  // /**
  //  * Generate KeyPair
  //  */
  // async generateKeyPairAsn1(bits: number): Promise<KeyPairAsn1> {
  //   const keyPair = await keysUtils.generateKeyPair(bits);
  //   return keysUtils.keyPairToAsn1(keyPair);
  // },
  // async generateDeterministicKeyPairAsn1(
  //   bits: number,
  //   recoveryCode: string,
  // ): Promise<KeyPairAsn1> {
  //   const keyPair = await keysUtils.generateDeterministicKeyPair(
  //     bits,
  //     recoveryCode,
  //   );
  //   return keysUtils.keyPairToAsn1(keyPair);
  // },
  // encryptWithPublicKeyAsn1(
  //   publicKeyAsn1: PublicKeyAsn1,
  //   plainText: string,
  // ): string {
  //   const plainText_ = Buffer.from(plainText, 'binary');
  //   const publicKey = keysUtils.publicKeyFromAsn1(publicKeyAsn1);
  //   const cipherText = keysUtils.encryptWithPublicKey(publicKey, plainText_);
  //   return cipherText.toString('binary');
  // },
  // decryptWithPrivateKeyAsn1(
  //   privateKeyAsn1: PrivateKeyAsn1,
  //   cipherText: string,
  // ): string {
  //   const cipherText_ = Buffer.from(cipherText, 'binary');
  //   const privateKey = keysUtils.privateKeyFromAsn1(privateKeyAsn1);
  //   const plainText = keysUtils.decryptWithPrivateKey(privateKey, cipherText_);
  //   return plainText.toString('binary');
  // },
  // signWithPrivateKeyAsn1(privateKeyAsn1: PrivateKeyAsn1, data: string): string {
  //   const data_ = Buffer.from(data, 'binary');
  //   const privateKey = keysUtils.privateKeyFromAsn1(privateKeyAsn1);
  //   const signature = keysUtils.signWithPrivateKey(privateKey, data_);
  //   return signature.toString('binary');
  // },
  // verifyWithPublicKeyAsn1(
  //   publicKeyAsn1: PublicKeyAsn1,
  //   data: string,
  //   signature: string,
  // ): boolean {
  //   const data_ = Buffer.from(data, 'binary');
  //   const signature_ = Buffer.from(signature, 'binary');
  //   const publicKey = keysUtils.publicKeyFromAsn1(publicKeyAsn1);
  //   const signed = keysUtils.verifyWithPublicKey(publicKey, data_, signature_);
  //   return signed;
  // },
};

type PolykeyWorkerModule = typeof polykeyWorker;

export type { PolykeyWorkerModule };

export default polykeyWorker;
