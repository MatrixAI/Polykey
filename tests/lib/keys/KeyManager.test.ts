import fs from 'fs';
import os from 'os';
import { randomString } from '../../../src/lib/utils';
import KeyManager from '../../../src/lib/keys/KeyManager';

describe('KeyManager class', () => {

  let tempDir: string
  let km: KeyManager

  beforeAll(async done => {
    // Define temp directory
    tempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

    // Create keyManager
    km = new KeyManager(tempDir, fs)
    await km.generateKeyPair('John Smith', 'john.smith@email.com', 'passphrase', 1024, true)

    done()
  })

  afterAll(() => {
    fs.rmdirSync(tempDir, { recursive: true })
  })

  test('can create keypairs', async done => {
    // Create private keys (async)
    expect(km.generateKeyPair('John Smith', 'john.smith@gmail.com', 'passphrase', 1024)).resolves.not.toThrow()

    done()
  })

  test('can create symmetric keys', async done => {
    const generatedKey = await km.generateKey('new-key', 'passphrase', true)

    const retreivedKey = km.getKey('new-key')

    expect(retreivedKey).toEqual(generatedKey)

    done()
  })

  test('can load an identity from a public key', async done => {

    const keypair = await km.generateKeyPair('John Smith', 'john@email.com', 'passphrase', 1024)

    const identity = await km.getIdentityFromPublicKey(Buffer.from(keypair.public!))

    expect(identity).not.toEqual(undefined)

    done()
  })

  test('can load an identity from a private key', async done => {

    const keypair = await km.generateKeyPair('John Smith', 'john@email.com', 'passphrase', 1024)

    const identity = await km.getIdentityFromPrivateKey(Buffer.from(keypair.private!), 'passphrase')

    expect(identity).not.toEqual(undefined)

    done()
  })

  test('can sign and verify data', async done => {
    const originalData = Buffer.from('I am to be signed')
    const signedData = await km.signData(originalData)
    const isVerified = await km.verifyData(signedData)
    expect(isVerified).toEqual(true)
    done()
  })

  test('can sign and verify files', async done => {
    const originalData = Buffer.from('I am to be signed')
    const filePath = `${tempDir}/file`
    fs.writeFileSync(filePath, originalData)
    // Sign file
    const signedFilePath = await km.signFile(filePath)
    // Verify file
    const isVerified = await km.verifyFile(signedFilePath)
    expect(isVerified).toEqual(true)
    done()
  })
})
