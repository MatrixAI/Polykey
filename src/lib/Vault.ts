import fs from 'fs'
import Path from 'path'
import hkdf from 'futoin-hkdf'
import { EncryptedFS } from 'encryptedfs'

class Vault {

  private key: Buffer
  private keyLen: number
  name: string
  private fs: EncryptedFS
  private secrets: Map<string, any>
  private vaultPath: string
  constructor(
    name: string,
    symKey: Buffer,
    baseDir: string
  ) {
    // how do we create pub/priv key pair?
    // do we use the same gpg pub/priv keypair
    this.keyLen = 32
    this.key = this.genSymKey(symKey, this.keyLen)
    // Set filesystem
    const vfsInstance = new (require('virtualfs')).VirtualFS

    this.fs = new EncryptedFS(
      symKey,
      vfsInstance,
      vfsInstance,
      fs,
      process
    )

    this.name = name
    this.vaultPath = Path.join(baseDir, name)
    // make the vault directory
    this.fs.mkdirSync(this.vaultPath, {recursive: true})
    this.secrets = new Map()

    this.loadSecrets()
  }

  loadSecrets(): void {
    const secrets = fs.readdirSync(this.vaultPath, undefined)

    for (const secret of secrets) {
      this.secrets.set(secret, null)
    }
  }

  genSymKey(asymKey: Buffer, keyLen: number): Buffer {
    return Buffer.from(hkdf(asymKey.toString(), keyLen))
  }

  secretExists(secretName: string) : boolean {
    const secretPath = Path.join(this.vaultPath, secretName)
    return this.secrets.has(secretName) && this.fs.existsSync(secretPath)
  }

  addSecret (secretName: string, secretBuf: Buffer): void {
    // TODO: check if secret already exists
    const writePath = Path.join(this.vaultPath, secretName)
    // TODO: use aysnc methods
    const fd = this.fs.openSync(writePath, 'w')
    this.fs.writeSync(fd, secretBuf, 0, secretBuf.length, 0)
    this.secrets.set(secretName, secretBuf)
    // TODO: close file or use write file sync
  }

  getSecret(secretName: string): Buffer | string {
    if (this.secrets.has(secretName)) {
      const secret = this.secrets.get(secretName)
      if (secret) {
        return secret
      } else {
        const secretPath = Path.join(this.vaultPath, secretName)
        // TODO: this should be async
        const secretBuf = this.fs.readFileSync(secretPath, {})
        this.secrets.set(secretName, secretBuf)
        return secretBuf
      }
    }
    throw Error('Secret: ' + secretName + ' does not exist')
  }

  removeSecret (secretName: string): void {
    if (this.secrets.has(secretName)) {
      const successful = this.secrets.delete(secretName)
      if (successful) {
        return
      }
      throw Error('Secret: ' + secretName + ' was not removed')
    }
    throw Error('Secret: ' + secretName + ' does not exist')
  }

  listSecrets(): string[] {
    let secrets: string[] = Array.from(this.secrets.keys())
    return secrets
  }

  tagVault() {

  }

  untagVault() {

  }

  shareVault() {
  }

  unshareVault() {
  }

  // ============== Helper methods ============== //

}

export default Vault
