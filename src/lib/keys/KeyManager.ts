import fs from 'fs'
import os from 'os'
import Path from 'path'
import kbpgp from 'kbpgp'
import crypto from 'crypto'
import { promisify } from 'util'
import {Pool, ModuleThread} from 'threads'
import { KeyManagerWorker } from '@polykey/keys/KeyManagerWorker'

type KeyManagerMetadata = {
  privateKeyPath: string | null,
  publicKeyPath: string | null
}

type KeyPair = {
  private: string | null,
  public: string | null
}

class KeyManager {
  private primaryKeyPair: KeyPair = {private: null, public: null}
  private primaryIdentity?: Object
  private derivedKeys: Map<string, Buffer>
  private useWebWorkers: boolean
  private workerPool?: Pool<ModuleThread<KeyManagerWorker>>

  private metadataPath: string
  private metadata: KeyManagerMetadata = { privateKeyPath: null, publicKeyPath: null }

  constructor(
    polyKeyPath: string = `${os.homedir()}/.polykey`,
    passphrase?: string,
    useWebWorkers: boolean = false,
    workerPool?: Pool<ModuleThread<KeyManagerWorker>>
  ) {
    this.useWebWorkers = useWebWorkers
    this.workerPool = workerPool
    this.derivedKeys = new Map()

    // Load key manager metadata
    const keypairPath = Path.join(polyKeyPath, '.keypair')
    fs.mkdirSync(keypairPath)
    this.metadataPath = Path.join(keypairPath, 'metadata')
    this.loadMetadata()

    // Load keys if they were provided
    if (this.metadata.privateKeyPath && this.metadata.publicKeyPath && passphrase) {
      // Load files into memory
      const publicKey = fs.readFileSync(this.metadata.publicKeyPath)
      const privateKey = fs.readFileSync(this.metadata.privateKeyPath)

      // Load private and public keys
      this.loadKeyPair(publicKey, privateKey, passphrase)
    }

  }

  // return {private: string, public: string}
  // The replacePrimary parameter will tell KeyManager to replace the
  // existing identity with one derived from the new keypair
  async generateKeyPair(name: string, email: string, passphrase: string, nbits: number = 4096, replacePrimary: boolean = false, progressCallback?: (info) => void): Promise<KeyPair> {

    // Define options
    const F = kbpgp["const"].openpgp
    const options = {
      asp: (progressCallback) ? new kbpgp.ASP({progress_hook: progressCallback}) : undefined,
      userid: `${name} <${email}>`,
      primary: {
        nbits: nbits,
        flags: F.certify_keys | F.sign_data | F.auth | F.encrypt_comm | F.encrypt_storage,
        expire_in: 0  // never expire
      },
      subkeys: []
    }

    return new Promise<KeyPair>((resolve, reject) => {
      kbpgp.KeyManager.generate(options, (err, identity) => {
        if (err) {
          reject(err)
        }
        identity.sign({}, (err) => {
          if (err) {
            reject(err)
          }
          // Export pub key first
          identity.export_pgp_public({}, (err, pubKey) => {
            if (err) {
              reject(err)
            }
            // Finally export priv key
            identity.export_pgp_private({passphrase: passphrase}, (err, privKey) => {
              if (err) {
                reject(err)
              }
              // Resolve to parent promise
              const keypair = { private: privKey, public: pubKey }
              if (replacePrimary) {
                // Set the new keypair
                this.primaryKeyPair = keypair
                // Set the new identity
                this.primaryIdentity = identity
              }

              resolve(keypair)
            })
          })
        })
      })
    })
  }

  getKeyPair(): KeyPair {
    return this.primaryKeyPair
  }

  hasPublicKey(): boolean {
    return (this.primaryKeyPair.public) ? true : false
  }

  getPublicKey(): string {
    if (!this.primaryKeyPair.public) {
      throw new Error('Public key does not exist in memory')
    }
    return this.primaryKeyPair.public
  }

  getPrivateKey(): string {
    if (!this.primaryKeyPair.private) {
      throw new Error('Private key does not exist in memory')
    }
    return this.primaryKeyPair.private
  }

  async loadKeyPair(publicKey: string | Buffer, privateKey: string | Buffer, passphrase: string): Promise<void> {
    await this.loadPrivateKey(privateKey)
    await this.loadPublicKey(publicKey)
    await this.loadIdentity(passphrase)
  }

  async loadPrivateKey(privateKey: string | Buffer): Promise<void> {
    try {
      let keyBuffer: Buffer
      if (typeof privateKey === 'string') {
        keyBuffer = Buffer.from(await fs.promises.readFile(privateKey))
        this.metadata.privateKeyPath = privateKey
        this.writeMetadata()
      } else {
        keyBuffer = privateKey
      }
      this.primaryKeyPair.private = keyBuffer.toString()

    } catch (err) {
      throw(err)
    }
  }

  async loadPublicKey(publicKey: string | Buffer): Promise<void> {
    try {
      let keyBuffer: Buffer
      if (typeof publicKey === 'string') {
        keyBuffer = Buffer.from(await fs.promises.readFile(publicKey))
        this.metadata.publicKeyPath = publicKey
        this.writeMetadata()
      } else {
        keyBuffer = publicKey
      }
      this.primaryKeyPair.public = keyBuffer.toString()
    } catch (err) {
      throw(err)
    }
  }

  async loadIdentity(passphrase: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const pubKey: string = this.getPublicKey()
      const privKey: string = this.getPrivateKey()

      kbpgp.KeyManager.import_from_armored_pgp({armored: pubKey}, (err, identity) => {
        if (err) {
          reject(err)
        }

        identity.merge_pgp_private({
          armored: privKey
        }, (err) => {
          if (err) {
            reject(err)
          }

          if (identity.is_pgp_locked()) {
            identity.unlock_pgp({
              passphrase: passphrase
            }, (err) => {
              if (err) {
                reject(err)
              }

              this.primaryIdentity = identity
              resolve()
            })
          } else {
            this.primaryIdentity = identity
            resolve()
          }
        })
      })
    })
  }

  async exportPrivateKey(path: string): Promise<void> {
    await fs.promises.writeFile(path, this.primaryKeyPair.private)
    this.metadata.privateKeyPath = path
    this.writeMetadata()
  }

  async exportPublicKey(path: string): Promise<void> {
    await fs.promises.writeFile(path, this.primaryKeyPair.public)
    this.metadata.publicKeyPath = path
    this.writeMetadata()
  }

  // symmetric key generation
  generateKeySync(name: string, passphrase: string): Buffer {
    const salt = crypto.randomBytes(32)
    this.derivedKeys[name] = crypto.pbkdf2Sync(passphrase , salt, 10000, 256/8, 'sha256')

    return this.derivedKeys[name]
  }

  async generateKey(name: string, passphrase: string): Promise<Buffer> {
    const salt = crypto.randomBytes(32)
    this.derivedKeys[name] = await promisify(crypto.pbkdf2)(passphrase , salt, 10000, 256/8, 'sha256')

    return this.derivedKeys[name]
  }

  importKeySync(name: string, key: string | Buffer): void {
    if (typeof key === 'string') {
      this.derivedKeys[name] = fs.readFileSync(key)
    } else {
      this.derivedKeys[name] = key
    }
  }

  async importKey(name: string, key: string | Buffer): Promise<void> {
    if (typeof key === 'string') {
      this.derivedKeys[name] = await fs.promises.readFile(key)
    } else {
      this.derivedKeys[name] = key
    }
  }

  async exportKey(name: string, path: string, createPath?: boolean): Promise<void> {
    if (!this.derivedKeys.has(name)) {
      throw Error(`There is no key loaded for name: ${name}`)
    }
    if (createPath) {
      await fs.promises.mkdir(Path.dirname(path), {recursive: true})
    }
    await fs.promises.writeFile(path, this.derivedKeys[name])
  }

  exportKeySync(path: string, createPath?: boolean): void {
    if (!this.derivedKeys.has(name)) {
      throw Error(`There is no key loaded for name: ${name}`)
    }
    if (createPath) {
      fs.mkdirSync(Path.dirname(path), {recursive: true})
    }
    fs.writeFileSync(path, this.derivedKeys[name])
  }

  async getIdentityFromPublicKey(pubKey: Buffer): Promise<Object> {
    return new Promise<Object>((resolve, reject) => {
      kbpgp.KeyManager.import_from_armored_pgp({armored: pubKey}, (err, identity) => {
        if (err) {
          reject(err)
        }
        resolve(identity)
      })
    })
  }

  async getIdentityFromPrivateKey(privKey: Buffer, passphrase: string): Promise<Object> {
    return new Promise<Object>((resolve, reject) => {
      kbpgp.KeyManager.import_from_armored_pgp({armored: privKey}, (err, identity) => {
        if (err) {
          reject(err)
        }
        if (identity.is_pgp_locked()) {
          identity.unlock_pgp({
            passphrase: passphrase
          }, (err) => {
            if (err) {
              reject(err)
            }
            resolve(identity)
          });
        } else {
          resolve(identity)
        }
      })
    })
  }

  // Sign data
  async signData(data: Buffer | string, withKey?: Buffer, keyPassphrase?: string): Promise<Buffer> {
    return new Promise<Buffer>(async (resolve, reject) => {
      let resolvedIdentity: Object
      if (withKey) {
        if (!keyPassphrase) {
          reject(Error('passphrase for private key was not provided'))
        }
        resolvedIdentity = await this.getIdentityFromPrivateKey(withKey, keyPassphrase!)
      } else if (this.primaryIdentity) {
        resolvedIdentity = this.primaryIdentity
      } else {
        throw(Error('no identity available for signing'))
      }

      if (this.useWebWorkers && this.workerPool) {
        const workerResponse = await this.workerPool.queue(async (workerCrypto) => {
          return await workerCrypto.signData(data, resolvedIdentity);
        });
        resolve(workerResponse)
      } else {
        const params = {
          msg: data,
          sign_with: resolvedIdentity
        }
        kbpgp.box(params, (err: Error, result_string: string, result_buffer: Buffer) => {
          if (err) {
            reject(err)
          }
          resolve(Buffer.from(result_string))
        })
      }
    })
  }

  // Verify data
  async verifyData(data: Buffer | string, signature: Buffer, withKey?: Buffer): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      const ring = new kbpgp.keyring.KeyRing;
      let resolvedIdentity: Object
      if (withKey) {
        resolvedIdentity = await this.getIdentityFromPublicKey(withKey)
      } else if (this.primaryIdentity) {
        resolvedIdentity = this.primaryIdentity
      } else {
        throw new Error('no identity available for verifying')
      }

      if (this.useWebWorkers && this.workerPool) {
        const workerResponse = await this.workerPool.queue(async (workerCrypto) => {
          return await workerCrypto.verifyData(data, signature, resolvedIdentity);
        });
        resolve(workerResponse)
      } else {
        ring.add_key_manager(this.primaryIdentity)
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
      }
    })
  }

  async verifyFile(filePath: string, signaturePath: string, publicKey?: string | Buffer): Promise<boolean> {
    // Get key if provided
    let keyBuffer: Buffer
    if (publicKey) {
      if (typeof publicKey === 'string') {  // Path
        // Read in from fs
        keyBuffer = fs.readFileSync(publicKey)
      } else {  // Buffer
        keyBuffer = publicKey
      }
    }
    // Read in file buffer and signature
    const fileBuffer = fs.readFileSync(filePath)
    const signatureBuffer = fs.readFileSync(signaturePath)
    const isVerified = await this.verifyData(fileBuffer, signatureBuffer, keyBuffer!)
    return isVerified
  }

  async signFile(path: string, privateKey?: string | Buffer, privateKeyPassphrase?: string): Promise<string> {
    // Get key if provided
    let keyBuffer: Buffer
    if (privateKey) {
      if (typeof privateKey === 'string') {  // Path
        // Read in from fs
        keyBuffer = Buffer.from(fs.readFileSync(privateKey))
      } else {  // Buffer
        keyBuffer = privateKey
      }
    }
    // Read file into buffer
    const buffer = Buffer.from(fs.readFileSync(path))
    // Sign the buffer
    const signedBuffer = await this.signData(buffer, keyBuffer!, privateKeyPassphrase)
    // Write buffer to signed file
    const signedPath = `${path}.sig`
    fs.writeFileSync(signedPath, signedBuffer)
    return signedPath
  }

  // Encrypt data
  async encryptData(data: Buffer, forPubKey: Buffer): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      let resolvedIdentity: Object
      try {
        resolvedIdentity = await this.getIdentityFromPublicKey(forPubKey)
      } catch (err) {
        throw(Error(`Identity could not be resolved for encrypting: ${err}`))
      }

      if (this.useWebWorkers && this.workerPool) {
        const workerResponse = await this.workerPool.queue(async (workerCrypto) => {
          return await workerCrypto.encryptData(data, resolvedIdentity);
        });
        resolve(workerResponse)
      } else {
        const params = {
          msg: data,
          encrypt_for: resolvedIdentity
        }
        kbpgp.box(params, (err: Error, result_string: string, result_buffer: Buffer) => {
          if (err) {
            reject(err)
          }
          resolve(result_string)
        })
      }
    })
  }

  // Decrypt data
  async decryptData(data: string, withKey?: Buffer): Promise<Buffer> {
    return new Promise<Buffer>(async (resolve, reject) => {
      var ring = new kbpgp.keyring.KeyRing;
      let resolvedIdentity: Object
      if (withKey) {
        resolvedIdentity = await this.getIdentityFromPublicKey(withKey)
      } else if (this.primaryIdentity) {
        resolvedIdentity = this.primaryIdentity
      } else {
        throw(Error('no identity available for signing'))
      }

      if (this.useWebWorkers && this.workerPool) {
        const workerResponse = await this.workerPool.queue(async (workerCrypto) => {
          return await workerCrypto.decryptData(data, resolvedIdentity);
        });
        resolve(workerResponse)
      } else {
        ring.add_key_manager(resolvedIdentity)
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
      }
    })
  }

  /* ============ HELPERS =============== */
  getKey(name: string): Buffer {
    return this.derivedKeys[name]
  }

  isLoaded(name: string): boolean {
    if (this.derivedKeys[name]) {
      return true
    }
    return false
  }

  private writeMetadata(): void {
    const metadata = JSON.stringify(this.metadata)
    fs.writeFileSync(this.metadataPath, metadata)
  }
  private loadMetadata(): void {
    // Check if file exists
    if (fs.existsSync(this.metadataPath)) {
      const metadata = fs.readFileSync(this.metadataPath).toString()
      this.metadata = JSON.parse(metadata)
    }
  }


}

export default KeyManager
export { KeyPair}
