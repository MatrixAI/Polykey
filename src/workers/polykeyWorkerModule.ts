import type { TransferDescriptor } from 'threads';
import {
  Key,
  KeyPair,
  PrivateKey,
  RecoveryCode,
  PasswordHash,
  PasswordSalt,
  PasswordMemLimit,
  PasswordOpsLimit,
  CertId,
} from '../keys/types';
import { isWorkerRuntime } from 'threads';
import { Transfer } from 'threads/worker';
import * as keysUtils from '../keys/utils';
import { IdInternal } from '@matrixai/id';

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

  // Diagnostic functions

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

  // Keys functions

  hashPassword(
    password: string,
    salt?: ArrayBuffer,
    opsLimit?: PasswordOpsLimit,
    memLimit?: PasswordMemLimit
  ): TransferDescriptor<[ArrayBuffer, ArrayBuffer]> {
    if (salt != null) salt = Buffer.from(salt);
    // It is guaranteed that `keysUtils.hashPassword` returns non-pooled buffers
    const hashAndSalt = keysUtils.hashPassword(
      password,
      salt as PasswordSalt | undefined,
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
    hash = Buffer.from(hash);
    salt = Buffer.from(salt);
    return keysUtils.checkPassword(
      password,
      hash as PasswordHash,
      salt as PasswordSalt,
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
      publicKey: keyPair.publicKey.buffer,
      privateKey: keyPair.privateKey.buffer,
      secretKey: keyPair.secretKey.buffer
    };
    return Transfer(result, [result.publicKey, result.privateKey, result.secretKey]);
  },
  async generateCertificate({
    certId,
    subjectKeyPair,
    issuerPrivateKey,
    duration,
    subjectAttrsExtra,
    issuerAttrsExtra,
  }: {
    certId: ArrayBuffer;
    subjectKeyPair: {
      publicKey: ArrayBuffer;
      privateKey: ArrayBuffer;
    },
    issuerPrivateKey: ArrayBuffer,
    duration: number;
    subjectAttrsExtra?: Array<{ [key: string]: Array<string> }>;
    issuerAttrsExtra?: Array<{ [key: string]: Array<string> }>;
  }): Promise<TransferDescriptor<ArrayBuffer>> {
    certId = IdInternal.create<CertId>(certId);
    subjectKeyPair.publicKey = Buffer.from(subjectKeyPair.publicKey);
    subjectKeyPair.privateKey = Buffer.from(subjectKeyPair.privateKey);
    issuerPrivateKey = Buffer.from(issuerPrivateKey);
    const cert = await keysUtils.generateCertificate({
      certId: certId as CertId,
      subjectKeyPair: subjectKeyPair as KeyPair,
      issuerPrivateKey: issuerPrivateKey as PrivateKey,
      duration,
      subjectAttrsExtra,
      issuerAttrsExtra,
    });
    return Transfer(cert.rawData);
  },

  // EFS functions

  encrypt(
    key: ArrayBuffer,
    plainText: ArrayBuffer,
  ): TransferDescriptor<ArrayBuffer> {
    const cipherText = keysUtils.encryptWithKey(
      Buffer.from(key) as Key,
      Buffer.from(plainText)
    );
    return Transfer(cipherText.buffer);
  },
  decrypt(
    key: ArrayBuffer,
    cipherText: ArrayBuffer,
  ): TransferDescriptor<ArrayBuffer> | undefined {
    const plainText = keysUtils.decryptWithKey(
      Buffer.from(key) as Key,
      Buffer.from(cipherText)
    );
    if (plainText != null) {
      return Transfer(plainText.buffer);
    } else {
      return;
    }
  },
};

type PolykeyWorkerModule = typeof polykeyWorker;

export type { PolykeyWorkerModule };

export default polykeyWorker;
