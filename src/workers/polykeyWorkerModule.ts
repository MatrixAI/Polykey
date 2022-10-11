import type { TransferDescriptor } from 'threads';
import {
  Key,
  RecoveryCode,
  PasswordHash,
  PasswordSalt,
  PasswordMemLimit,
  PasswordOpsLimit,
} from '../keys/types';
// import type { PublicKeyAsn1, PrivateKeyAsn1, KeyPairAsn1 } from '../keys/types';
import { isWorkerRuntime } from 'threads';
import { Transfer } from 'threads/worker';
import * as keysUtils from '../keys/utils';
import * as utils from '../utils';

/**
 * Worker object that contains all functions that will be executed in parallel.
 * Functions should be using CPU-parallelism not IO-parallelism.
 * Most functions should be synchronous, not asynchronous.
 * Making them asynchronous does not make a difference to the caller.
 * The caller must always await because the fucntions will run on the pool.
 *
 * When passing in `Buffer`, it is coerced into an `Uint8Array`. To avoid
 * confusion, do not pass in `Buffer` and instead use `ArrayBuffer`.
 *
 * If you are passing the underlying `ArrayBuffer`, ensure that the containing
 * `Buffer` is unpooled, or make a slice copy of the underlying `ArrayBuffer`
 * with the `Buffer.byteOffset` and `Buffer.byteLength`.
 *
 * Remember the subtyping relationship of buffers:
 * Buffers < Uint8Array < ArrayBuffer < BufferSource
 *
 * Only the `ArrayBuffer` is "transferrable" which means they can be zero-copy
 * transferred. When transferring a structure that contains `ArrayBuffer`, you
 * must pass the array of transferrable objects as the second parameter to
 * `Transfer`.
 *
 * Only transfer things that you don't expect to be using in the sending thread.
 *
 * Note that `Buffer.from(ArrayBuffer)` is a zero-copy wrapper.
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

  hashPassword(
    password: string,
    salt?: ArrayBuffer,
    opsLimit?: PasswordOpsLimit,
    memLimit?: PasswordMemLimit
  ): TransferDescriptor<[ArrayBuffer, ArrayBuffer]> {
    let salt_: PasswordSalt | undefined;
    if (salt != null) {
      salt = Buffer.from(salt) as PasswordSalt;
    }
    // It is guaranteed that `keysUtils.hashPassword` returns non-pooled buffers
    const hashAndSalt = keysUtils.hashPassword(
      password,
      salt_,
      opsLimit,
      memLimit
    );
    // Result is a tuple of [hash, salt] using transferable `ArrayBuffer`
    const result: [ArrayBuffer, ArrayBuffer] = [
      hashAndSalt[0].buffer,
      hashAndSalt[1].buffer
    ];
    return Transfer(result, [result[0], result[1]]);
  },

  checkPassword(
    password: string,
    hash: ArrayBuffer,
    salt: ArrayBuffer,
    opsLimit?: PasswordOpsLimit,
    memLimit?: PasswordMemLimit
  ): boolean {
    const hash_ = Buffer.from(hash) as PasswordHash;
    const salt_ = Buffer.from(salt) as PasswordSalt;
    return keysUtils.checkPassword(
      password,
      hash_,
      salt_,
      opsLimit,
      memLimit
    );
  },

  async generateDeterministicKeyPair(
    recoveryCode: RecoveryCode
  ): Promise<TransferDescriptor<{
    publicKey: ArrayBuffer;
    privateKey: ArrayBuffer;
    secretKey: ArrayBuffer;
  }>> {
    const keyPair = await keysUtils.generateDeterministicKeyPair(recoveryCode);
    // Result is a record of {publicKey, privateKey, secretKey} using transferable `ArrayBuffer`
    const result = {
      publicKey: keyPair.privateKey.buffer,
      privateKey: keyPair.privateKey.buffer,
      secretKey: keyPair.secretKey.buffer
    };
    return Transfer(result, [result.publicKey, result.privateKey, result.secretKey]);
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
