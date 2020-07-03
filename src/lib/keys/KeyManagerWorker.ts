import kbpgp from 'kbpgp'
import { promisify } from 'util';
import { expose } from 'threads/worker';

const keyManagerWorker = {
  /**
   * Signs the given data with the provided identity
   * @param data Buffer or file containing the data to be signed
   * @param identity Identity with which to sign with.
   */
  async signData(data: Buffer | string, identity: any): Promise<Buffer> {
    const params = {
      msg: data,
      sign_with: identity
    }
    const result_string = await promisify(kbpgp)(params)
    return Buffer.from(result_string)
  },
  /**
   * Verifies the given data with the provided identity
   * @param data Buffer or file containing the data to be verified
   * @param signature The PGP signature
   * @param identity Identity with which to verify with.
   */
  async verifyData(data: Buffer | string, signature: Buffer, identity: any): Promise<boolean> {
    const ring = new kbpgp.keyring.KeyRing;

    ring.add_key_manager(identity)
    const params = {
      armored: signature,
      data: data,
      keyfetch: ring
    }
    const literals = await promisify(kbpgp.unbox)(params)
    // Get the identity that signed the data if any
    const dataSigner = literals[0].get_data_signer()
    // Retrieve the key manager associated with that data signer
    let keyManager: any
    if (dataSigner) {
      keyManager = dataSigner.get_key_manager()
    }
    // If we know the pgp finger print then we say the data is verified.
    // Otherwise it is unverified.
    if (keyManager) {
      if (keyManager.get_pgp_fingerprint()) {
        return true
      } else {
        return false
      }
    } else {
      return false
    }
  },
  /**
   * Encrypts the given data for the provided identity
   * @param data The data to be encrypted
   * @param identity Identity to encrypt for
   */
  async encryptData(data: Buffer, identity: any): Promise<string> {
    const params = {
      msg: data,
      encrypt_for: identity
    }
    const result_string: string = await promisify(kbpgp.box)(params)
    return result_string
  },
  /**
   * Decrypts the given data with the provided identity
   * @param data The data to be decrypted
   * @param identity Identity to decrypt with
   */
  async decryptData(data: Buffer, identity: any): Promise<Buffer> {
    var ring = new kbpgp.keyring.KeyRing;

    ring.add_key_manager(identity)
    const params = {
      armored: data.toString(),
      keyfetch: ring
    }
    const literals = await promisify(kbpgp.unbox)(params)
    const decryptedData = Buffer.from(literals[0].toString())
    return decryptedData
  }
};

export type KeyManagerWorker = typeof keyManagerWorker;

expose(keyManagerWorker);
