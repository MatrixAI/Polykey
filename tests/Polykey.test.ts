// ts imports
import fs from 'fs'
import os from 'os'
import Polykey from '../src/Polykey'
import { randomString } from '../src/utils'

// js imports
const kbpgp = require('kbpgp')
const vfs = require('virtualfs')


describe('PolyKey class', () => {

	let tempDir: string
  let pk: Polykey

	beforeAll(done => {
		// Define temp directory
		tempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

		// Create keyManager
		const km = new Polykey.KeyManager()
		km.loadKeyPair('./playground/keys/private.key', './playground/keys/public.key')
		// Initialize polykey
		pk = new Polykey(
			km,
			tempDir
		)
		done()
	})

	afterAll(() => {
		fs.rmdirSync(`${tempDir}`)
	})

	test('can create keypairs', done => {
		// Create private keys (async)
		pk.km.generateKeyPair('John Smith', 'john.smith@gmail.com', 'passphrase').then((keypair) => {
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
			pk.km.generateKeyPair('John Smith', 'john.smith@gmail.com', 'passphrase').then((keypair) => {
				expect(keypair).not.toBeNull()
				done()
			})
		}, 200000)

		test('can sign and verify strings', async done => {
			const originalData = Buffer.from('I am to be signed')
			const signedData = await pk.km.signData(originalData)
			const verifiedData = await pk.km.verifyData(originalData, signedData)
			expect(originalData).toEqual(verifiedData)
			done()

		}, 200000)

		test('can sign and verify files', async done => {
			const originalData = Buffer.from('I am to be signed')
			const filePath = `${tempDir}/file`
			fs.writeFileSync(filePath, originalData)
			// Sign file
			const signedPath = `${tempDir}/file.signed`
			await pk.signFile(filePath, signedPath)
			// Verify file
			const verifiedPath = `${tempDir}/file.signed`
			await pk.verifyFile(signedPath, verifiedPath)
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
