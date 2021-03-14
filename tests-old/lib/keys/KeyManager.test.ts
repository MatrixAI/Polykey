import fs from 'fs';
import os from 'os';
import { randomString } from '../../../src/utils';
import KeyManager from '../../../src/keys/KeyManager';

describe('KeyManager class', () => {

  let tempDir: string
  let km: KeyManager

  beforeAll(async () => {
    // Define temp directory
    tempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString(5)}`)

    // Create keyManager
    km = new KeyManager(tempDir, fs)
    await km.generateKeyPair('John Smith', 'passphrase', true)
  })

  afterAll(() => {
    fs.rmdirSync(tempDir, { recursive: true })
  })

  test('can create keypairs', async () => {
    // Create private keys (async)
    expect(km.generateKeyPair('John Smith', 'passphrase')).resolves.not.toThrow()
  })

  test('can create symmetric keys', async () => {
    const generatedKey = await km.generateKey('new-key', 'passphrase', true)

    const retrievedKey = km.getKey('new-key')

    expect(retrievedKey).toEqual(generatedKey)
  })

  test('can load an identity from a public key', async () => {

    const keypair = await km.generateKeyPair('John Smith', 'passphrase')

    const identity = await KeyManager.getIdentityFromPublicKey(Buffer.from(keypair.public!))

    expect(identity).not.toEqual(undefined)
  })

  test('can load an identity from a private key', async () => {

    const keypair = await km.generateKeyPair('John Smith', 'passphrase')

    const identity = await KeyManager.getIdentityFromPrivateKey(Buffer.from(keypair.private!), 'passphrase')

    expect(identity).not.toEqual(undefined)
  })

  test('can sign and verify data', async () => {
    const originalData = Buffer.from('I am to be signed')
    const signedData = await km.signData(originalData)
    const verifiedData = await km.verifyData(signedData)
    expect(verifiedData).toEqual(originalData)
	})

  test('can sign and verify data', async () => {
    const originalData = Buffer.from('I am to be signed')
    const detachedSignature = await km.signData(originalData)
    const isVerified = await km.verifyData(detachedSignature)
    expect(isVerified).toEqual(originalData)
  })

  test('can box and unbox a Uint8Array', async () => {
    const originalData = Uint8Array.from([23,1,44,23,54,23,24,4,3,4,5,3,46,45,64,5,2,34,35])
    // box
    const boxedData = await km.signData(
      await km.encryptData(Buffer.from(originalData))
    )
    // unbox
    const unboxedData = await km.decryptData(
      await km.verifyData(boxedData)
    )
    expect(Uint8Array.from(unboxedData)).toStrictEqual(originalData)
  })

  test('can sign and verify files', async () => {
    const originalData = Buffer.from('I am to be signed')
    const filePath = `${tempDir}/file`
    fs.writeFileSync(filePath, originalData)
    // Sign file
    const signedFilePath = await km.signFile(filePath)
    // Verify file
    const isVerified = await km.verifyFile(signedFilePath)
    expect(isVerified).toEqual(true)
  })
})
