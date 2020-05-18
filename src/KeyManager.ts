import fs from 'fs'
import Path from 'path'
import crypto from 'crypto'
import { promisify } from 'util'

// js imports
const kbpgp = require('kbpgp')
var F = kbpgp["const"].openpgp
const zxcvbn = require('zxcvbn')

type KeyPair = {
  private: string,
  public: string,
  passphrase: string
}

class KeyManager {
  private keyPair: KeyPair = {private: '', public: '', passphrase: ''}
  private identity: Object | undefined = undefined
  private derivedKeys: Map<string, Buffer>
  private passphrase!: string

  storePath: string

  constructor(
    polyKeyPath: string = '~/.polykey/'
  ) {
    this.storePath = polyKeyPath

    this.derivedKeys = new Map()
  }

  // return {private: string, public: string}
  async generateKeyPair(name: string, email: string, passphrase: string, numBits: number = 4096): Promise<KeyPair> {
    // Validate passphrase
    const passValidation = zxcvbn(passphrase)
    // The following is an arbitrary delineation of desirable scores
    if (passValidation.score < 2) {
      throw new Error(`passphrase score for new keypair is below 2!`)
    }

    // Define options
    var options = {
      userid: `${name} <${email}>`,
      primary: {
        nbits: 4096,
        flags: F.certify_keys | F.sign_data | F.auth | F.encrypt_comm | F.encrypt_storage,
        expire_in: 0  // never expire
      },
      subkeys: [
        // {
        //   nbits: 2048,
        //   flags: F.sign_data,
        //   expire_in: 86400 * 365 * 8 // 8 years
        // }
      ]
    }

    this.passphrase = passphrase

    return new Promise<KeyPair>((resolve, reject) => {
      kbpgp.KeyManager.generate(options, (err, identity) => {
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
              const keypair = { private: privKey, public: pubKey, passphrase: passphrase }
              this.keyPair = keypair
              // Set the new identity
              this.identity = identity

              resolve(keypair)
            })
          })
        })
      })
    })
  }

  getKeyPair(): KeyPair {
    return this.keyPair
  }

  getPublicKey(): string {
    return this.keyPair.public
  }

  getPrivateKey(): string {
    return this.keyPair.private
  }

  async loadPrivateKey(privateKey: string | Buffer, passphrase: string = ''): Promise<void> {
    try {
      let keyBuffer: Buffer
      if (typeof privateKey === 'string') {
        keyBuffer = Buffer.from(await fs.promises.readFile(privateKey))
      } else {
        keyBuffer = privateKey
      }
      this.keyPair.private = keyBuffer.toString()

      if (passphrase) {
        this.passphrase = passphrase
      }
    } catch (err) {
      throw(err)
    }
  }

  async loadPublicKey(publicKey: string | Buffer): Promise<void> {
    try {
      let keyBuffer: Buffer
      if (typeof publicKey === 'string') {
        keyBuffer = Buffer.from(await fs.promises.readFile(publicKey))
      } else {
        keyBuffer = publicKey
      }
      this.keyPair.public = keyBuffer.toString()
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

              this.identity = identity
              resolve()
            })
          } else {
            this.identity = identity
            resolve()
          }
        })
      })
    })
  }

  async loadKeyPair(publicKey: string | Buffer, privateKey: string | Buffer, passphrase: string = '') {
    await this.loadPrivateKey(privateKey)
    await this.loadPublicKey(publicKey)
    await this.loadIdentity(passphrase)

    if (passphrase) {
      this.passphrase
    }
  }

  async exportPrivateKey(path: string): Promise<void> {
    await fs.promises.writeFile(path, this.keyPair.private)
  }

  async exportPublicKey(path: string): Promise<void> {
    await fs.promises.writeFile(path, this.keyPair.public)
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

  importKeySync(name: string, keyPath: string): void {
    this.derivedKeys[name] = fs.readFileSync(keyPath)
  }

  async importKey(name: string, keyPath: string): Promise<void> {
    this.derivedKeys[name] = await fs.promises.readFile(keyPath)
  }

  importKeyBuffer(name: string, key: Buffer): void {
    this.derivedKeys[name] = key
  }

  async exportKey(name: string, path: string, createPath?: boolean): Promise<void> {
    if (!this.derivedKeys[name]) {
      throw Error(`There is no key loaded for name: ${name}`)
    }
    if (createPath) {
      await fs.promises.mkdir(Path.dirname(path), {recursive: true})
    }
    await fs.promises.writeFile(path, this.derivedKeys[name])
  }

  exportKeySync(path: string, createPath?: boolean): void {
    if (!this.derivedKeys[name]) {
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
  signData(data: Buffer | string, withKey: Buffer | undefined = undefined, keyPassphrase: string | undefined = undefined): Promise<Buffer> {
    return new Promise<Buffer>(async (resolve, reject) => {
      let resolvedIdentity: Object
      if (withKey !== undefined) {
        if (keyPassphrase === undefined) {
          reject(Error('passphrase for private key was not provided'))
        }
        resolvedIdentity = await this.getIdentityFromPrivateKey(withKey, keyPassphrase!)
      } else if (this.identity !== undefined) {
        resolvedIdentity = this.identity
      } else {
        throw(Error('no identity available for signing'))
      }
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
    })
  }

  // Verify data
  verifyData(data: Buffer | string, signature: Buffer, withKey: Buffer | undefined = undefined): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      var ring = new kbpgp.keyring.KeyRing;
      let resolvedIdentity: Object
      if (withKey !== undefined) {
        resolvedIdentity = await this.getIdentityFromPublicKey(withKey)
      } else if (this.identity !== undefined) {
        resolvedIdentity = this.identity
      } else {
        throw(Error('no identity available for signing'))
      }

      ring.add_key_manager(this.identity)
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
          resolve(km.get_pgp_fingerprint().toString('hex'));
        } else {
          reject(Error('could not verify file'))
        }
      })
    })
  }

  getKey(name: string): Buffer {
    return this.derivedKeys[name]
  }

  isLoaded(): boolean {
    if (this.derivedKeys[name]) {
      return true
    }
    return false
  }
}

export { KeyManager, KeyPair}
