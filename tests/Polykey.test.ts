// ts imports
import fs from 'fs'
import os from 'os'
import Polykey from '@polykey/Polykey'
import { randomString } from '@polykey/utils'
import KeyManager from '@polykey/KeyManager'
import PeerDiscovery from '@polykey/P2P/PeerDiscovery'

describe('PolyKey class', () => {

	let tempDir: string
  let pk: Polykey

	beforeAll(done => {
		// Define temp directory
		tempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

		// Create keyManager
		const km = new KeyManager()
		km.generateKeyPair('John Smith', 'john.smith@email.com', 'passphrase', true)
		// Initialize polykey
		pk = new Polykey(
      km,
      undefined,
			tempDir
		)
		done()
	})

	afterAll(() => {
		fs.rmdirSync(`${tempDir}`)
	})

	test('can create keypairs', done => {
		// Create private keys (async)
		pk.keyManager.generateKeyPair('John Smith', 'john.smith@gmail.com', 'passphrase').then((keypair) => {
			fs.mkdirSync(`${tempDir}/keys/`, {recursive: true})
			fs.writeFileSync(`${tempDir}/keys/private.key`, keypair.private)
			fs.writeFileSync(`${tempDir}/keys/public.key`, keypair.public)
			done()
		})
	}, 20000)

	/////////////
	// Signing //
	/////////////
	describe('signing', () => {
		let vaultName: string

		beforeEach(done => {
			// Reset the vault name for each test
			vaultName = `Vault-${randomString()}`
			// Create private keys (async)
			pk.keyManager.generateKeyPair('John Smith', 'john.smith@gmail.com', 'passphrase').then((keypair) => {
				expect(keypair).not.toBeNull()
				done()
			})
		}, 200000)

		test('can sign and verify strings', async done => {
			const originalData = Buffer.from('I am to be signed')
			const signedData = await pk.keyManager.signData(originalData)
			const verifiedData = await pk.keyManager.verifyData(originalData, signedData)
			expect(originalData).toEqual(verifiedData)
			done()

		}, 200000)

		test('can sign and verify files', async done => {
			const originalData = Buffer.from('I am to be signed')
			const filePath = `${tempDir}/file`
			fs.writeFileSync(filePath, originalData)
			// Sign file
			const signedPath = `${tempDir}/file.signed`
			await pk.keyManager.signFile(filePath, signedPath)
			// Verify file
			const verifiedPath = `${tempDir}/file.signed`
			await pk.keyManager.verifyFile(signedPath, verifiedPath)
			// Confirm equality
			const verifiedBuffer = fs.readFileSync(verifiedPath, undefined)
			expect(verifiedBuffer).toEqual(originalData)
			done()

		}, 200000)
	})


	////////////////
	// KeyManager //
	////////////////

})
