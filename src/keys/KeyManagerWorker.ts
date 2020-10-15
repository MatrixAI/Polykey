import { promisify } from 'util';
import { expose } from 'threads/worker';

const kbpgp = require('kbpgp')

const keyManagerWorker = {
  /**
   * Signs the given data with the provided identity
   * @param data Buffer or file containing the data to be signed
   * @param identity Identity with which to sign with.
   */
  async signData(data: Buffer | string, identity: any): Promise<Buffer> {
    const params = {
      msg: data,
      sign_with: identity,
    };
    const result_string = await promisify(kbpgp)(params);
    return Buffer.from(result_string);
  },
  /**
   * Verifies the given data with the provided identity
   * @param data Buffer or file containing the data to be verified
   * @param identity Identity with which to verify with.
   */
  async verifyData(data: Buffer | string, identity: any): Promise<Buffer> {
    const ring = new kbpgp.keyring.KeyRing();

    ring.add_key_manager(identity);
    const params = {
      armored: data,
      keyfetch: ring,
    };
    const literals = await promisify(kbpgp.unbox)(params);
    // Get the identity that signed the data if any
    const dataSigner = literals[0].get_data_signer();
    // get the verified message
    const verifiedMessage = Buffer.from(literals[0].toString());
    // Retrieve the key manager associated with that data signer
    let verifiedKM: any;
    if (dataSigner) {
      verifiedKM = dataSigner.get_key_manager();
    }
    // If we know the pgp finger print then we say the data is verified.
    // Otherwise it is unverified.
    if (verifiedKM && verifiedKM.get_pgp_fingerprint() == identity.get_pgp_fingerprint()) {
      return verifiedMessage;
    } else {
      throw Error('data could not be verified');
    }
  },
  /**
   * Encrypts the given data for the provided identity
   * @param data The data to be encrypted
   * @param identity Identity to encrypt for
   */
  async encryptData(data: Buffer, identity: any): Promise<Buffer> {
    const params = {
      msg: data,
      encrypt_for: identity,
    };
    const result_string: string = await promisify(kbpgp.box)(params);
    return Buffer.from(result_string);
  },
  /**
   * Decrypts the given data with the provided identity
   * @param data The data to be decrypted
   * @param identity Identity to decrypt with
   */
  async decryptData(data: Buffer, identity: any): Promise<Buffer> {
    var ring = new kbpgp.keyring.KeyRing();

    ring.add_key_manager(identity);
    const params = {
      armored: data.toString(),
      keyfetch: ring,
    };
    const literals = await promisify(kbpgp.unbox)(params);
    const decryptedData = Buffer.from(literals[0].toString());
    return decryptedData;
  },
};

export type KeyManagerWorker = typeof keyManagerWorker;

expose(keyManagerWorker);
