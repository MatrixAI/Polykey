import { pki, md } from 'node-forge';
import { expose } from 'threads/worker';

const keyManagerWorker = {
  /**
   * Signs the given data with the provided identity
   * @param data the data to be signed
   * @param decryptedPrivateKey the decrypted key with which to sign with.
   */
  async signData(data: string, decryptedPrivateKey: string): Promise<string> {
    const privateKey = pki.privateKeyFromPem(decryptedPrivateKey);
    const digest = md.sha512.create();
    digest.update(data.toString(), 'raw');
    const signature = privateKey.sign(digest);
    return signature;
  },
  /**
   * Verifies the given data with the provided key or the primary key if none is specified
   * @param data the data to be verified
   * @param signature the signature
   * @param publicKey Buffer containing the key to verify with. Defaults to primary public key if no key is given.
   */
  async verifyData(
    data: string,
    signature: string,
    publicKey: string,
  ): Promise<boolean> {
    const resolvedKey = pki.publicKeyFromPem(publicKey);
    const digest = md.sha512.create();
    digest.update(data.toString(), 'raw');
    const verified = resolvedKey.verify(digest.digest().bytes(), signature);
    return verified;
  },
  /**
   * Encrypts the given data for a specific public key
   * @param data The data to be encrypted
   * @param publicKey The key to encrypt for (optional)
   */
  async encryptData(data: string, publicKey: string): Promise<string> {
    const resolvedKey = pki.publicKeyFromPem(publicKey);
    const encryptedData = resolvedKey.encrypt(data);
    return encryptedData;
  },
  /**
   * Decrypts the given data with the provided key or the primary key if none is given
   * @param data The data to be decrypted
   * @param privateKey The key to decrypt with. Defaults to primary private key if no key is given.
   * @param passphrase Required if privateKey is provided.
   */
  async decryptData(data: string, privateKey: string): Promise<string> {
    const resolvedKey = pki.privateKeyFromPem(privateKey);
    const decryptedData = resolvedKey.decrypt(data);
    return decryptedData;
  },
};

export type KeyManagerWorker = typeof keyManagerWorker;

expose(keyManagerWorker);
