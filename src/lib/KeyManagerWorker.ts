import kbpgp from 'kbpgp'
import { expose } from 'threads/worker';

const keyManagerWorker = {
  // Sign data
  signData(data: Buffer | string, identity: any): Promise<Buffer> {
    return new Promise<Buffer>(async (resolve, reject) => {
      const params = {
        msg: data,
        sign_with: identity
      }
      kbpgp.box(params, (err: Error, result_string: string, result_buffer: Buffer) => {
        if (err) {
          reject(err)
        }
        resolve(Buffer.from(result_string))
      })
    })
  },
  // Verify data
  verifyData(data: Buffer | string, signature: Buffer, identity: any): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      const ring = new kbpgp.keyring.KeyRing;

      ring.add_key_manager(identity)
      const params = {
        armored: signature,
        data: data,
        keyfetch: ring
      }
      kbpgp.unbox(params, (err, literals) => {
        if (err) {
          reject(err)
        }
        let ds = literals[0].get_data_signer()
        let km: any
        if (ds) {
          km = ds.get_key_manager()
        }
        if (km) {
          if (km.get_pgp_fingerprint()) {
            resolve(true)
          } else {
            resolve(false)
          }
          resolve(km.get_pgp_fingerprint());
        } else {
          resolve(false)
        }
      })
    })
  },
  // Encrypt data
  async encryptData(data: Buffer, identity: any): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const params = {
        msg: data,
        encrypt_for: identity
      }
      kbpgp.box(params, (err: Error, result_string: string, result_buffer: Buffer) => {
        if (err) {
          reject(err)
        }
        resolve(result_string)
      })
    })
  },
  // Decrypt data
  async decryptData(data: string, identity: any): Promise<Buffer> {
    return new Promise<Buffer>(async (resolve, reject) => {
      var ring = new kbpgp.keyring.KeyRing;

      ring.add_key_manager(identity)
      const params = {
        armored: data,
        keyfetch: ring
      }
      kbpgp.unbox(params, (err, literals) => {
        if (err) {
          reject(err)
        }
        try {
          const decryptedData = Buffer.from(literals[0].toString())
          resolve(decryptedData)
        } catch (err) {
          reject(err)
        }
      })
    })
  }
};

export type KeyManagerWorker = typeof keyManagerWorker;

expose(keyManagerWorker);
