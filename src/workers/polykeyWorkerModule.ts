import type { TransferDescriptor } from 'threads';
import type { PublicKeyAsn1, PrivateKeyAsn1, KeyPairAsn1 } from '../keys/types';

import { Transfer } from 'threads/worker';
import { utils as keysUtils } from '../keys';

/**
 * Worker object that contains all functions that will be executed in parallel
 * Functions should be using CPU-parallelism not IO-parallelism
 * Most functions should be synchronous, not asynchronous
 * Making them asynchronous does not make a difference to the caller
 * The caller must always await because the fucntions will run on the pool
 */
const polykeyWorker = {
  // EFS functions
  async encrypt(
    key: ArrayBuffer,
    plainText: ArrayBuffer,
  ): Promise<TransferDescriptor<ArrayBuffer>> {
    const cipherText = await keysUtils.encryptWithKey(key, plainText);
    return Transfer(cipherText);
  },
  async decrypt(
    key: ArrayBuffer,
    cipherText: ArrayBuffer,
  ): Promise<TransferDescriptor<ArrayBuffer> | undefined> {
    const plainText = await keysUtils.decryptWithKey(key, cipherText);
    if (plainText != null) {
      return Transfer(plainText);
    } else {
      return;
    }
  },

  // KeyManager operations
  /**
   * Generate KeyPair
   */
  async generateKeyPairAsn1(bits: number): Promise<KeyPairAsn1> {
    const keyPair = await keysUtils.generateKeyPair(bits);
    return keysUtils.keyPairToAsn1(keyPair);
  },
  async generateDeterministicKeyPairAsn1(
    bits: number,
    recoveryCode: string,
  ): Promise<KeyPairAsn1> {
    const keyPair = await keysUtils.generateDeterministicKeyPair(
      bits,
      recoveryCode,
    );
    return keysUtils.keyPairToAsn1(keyPair);
  },
  encryptWithPublicKeyAsn1(
    publicKeyAsn1: PublicKeyAsn1,
    plainText: string,
  ): string {
    const plainText_ = Buffer.from(plainText, 'binary');
    const publicKey = keysUtils.publicKeyFromAsn1(publicKeyAsn1);
    const cipherText = keysUtils.encryptWithPublicKey(publicKey, plainText_);
    return cipherText.toString('binary');
  },
  decryptWithPrivateKeyAsn1(
    privateKeyAsn1: PrivateKeyAsn1,
    cipherText: string,
  ): string {
    const cipherText_ = Buffer.from(cipherText, 'binary');
    const privateKey = keysUtils.privateKeyFromAsn1(privateKeyAsn1);
    const plainText = keysUtils.decryptWithPrivateKey(privateKey, cipherText_);
    return plainText.toString('binary');
  },
  signWithPrivateKeyAsn1(privateKeyAsn1: PrivateKeyAsn1, data: string): string {
    const data_ = Buffer.from(data, 'binary');
    const privateKey = keysUtils.privateKeyFromAsn1(privateKeyAsn1);
    const signature = keysUtils.signWithPrivateKey(privateKey, data_);
    return signature.toString('binary');
  },
  verifyWithPublicKeyAsn1(
    publicKeyAsn1: PublicKeyAsn1,
    data: string,
    signature: string,
  ): boolean {
    const data_ = Buffer.from(data, 'binary');
    const signature_ = Buffer.from(signature, 'binary');
    const publicKey = keysUtils.publicKeyFromAsn1(publicKeyAsn1);
    const signed = keysUtils.verifyWithPublicKey(publicKey, data_, signature_);
    return signed;
  },
};

type PolykeyWorkerModule = typeof polykeyWorker;

export type { PolykeyWorkerModule };

export default polykeyWorker;
