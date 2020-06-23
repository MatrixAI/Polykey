import fs from 'fs'
import os from 'os'
import { randomString } from '@polykey/utils'
import KeyManager from '@polykey/keys/KeyManager'

describe('KeyManager class', () => {

	let tempDir: string
  let km: KeyManager

	beforeAll(async done => {
		// Define temp directory
		tempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

		// Create keyManager
		km = new KeyManager(tempDir)
    await km.generateKeyPair('John Smith', 'john.smith@email.com', 'passphrase', true)

		done()
	}, 30000)

	afterAll(() => {
		fs.rmdirSync(`${tempDir}`)
	})

	test('can create keypairs', async done => {
		// Create private keys (async)
    const keypair = await km.generateKeyPair('John Smith', 'john.smith@gmail.com', 'passphrase')
    fs.mkdirSync(`${tempDir}/keys/`, {recursive: true})
    fs.writeFileSync(`${tempDir}/keys/private.key`, keypair.private)
    fs.writeFileSync(`${tempDir}/keys/public.key`, keypair.public)
    done()
	}, 30000)

  test('can sign and verify data', async done => {
    const originalData = Buffer.from('I am to be signed')
    const detachedSignature = await km.signData(originalData)
    const isVerified = await km.verifyData(originalData, detachedSignature)
    expect(isVerified).toEqual(true)
    done()
  })

  test('can sign and verify files', async done => {
    const originalData = Buffer.from('I am to be signed')
    const filePath = `${tempDir}/file`
    fs.writeFileSync(filePath, originalData)
    // Sign file
    const signedPath = await km.signFile(filePath)
    // Verify file
    const isVerified = await km.verifyFile(signedPath, signedPath)
    expect(isVerified).toEqual(true)
    done()
  })
})
