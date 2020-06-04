import fs from 'fs'
import os from 'os'
import Polykey from "../src/Polykey"
import { randomString } from '../src/utils'

describe('vaults', () => {
  let vaultName: string

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

  beforeEach(() => {
    // Reset the vault name for each test
    vaultName = `Vault-${randomString()}`
  })

  test('can create vaults', async () => {
    // Create vault
    await pk.createVault(vaultName)
    const vaultExists = await pk.vaultExists(vaultName)
    expect(vaultExists).toEqual(true)
  })
  test('cannot create same vault twice', async () => {
    // Create vault
    await pk.createVault(vaultName)
    const vaultExists = await pk.vaultExists(vaultName)
    expect(vaultExists).toEqual(true)
    // Create vault a second time
    expect(pk.createVault(vaultName)).rejects.toThrow('Vault already exists!')
  })
  test('can destroy vaults', async () => {
    // Create vault
    await pk.createVault(vaultName)
    expect(await pk.vaultExists(vaultName)).toStrictEqual(true)
    // Destroy the vault
    await pk.destroyVault(vaultName)
    expect(await pk.vaultExists(vaultName)).toStrictEqual(false)
  })

  ///////////////////
  // Vault Secrets //
  ///////////////////
  describe('secrets within vaults', () => {
    test('can create secrets and read them back', async () => {
      // Create vault
      await pk.createVault(vaultName)

      // Run test
      const initialSecretName = 'ASecret'
      const initialSecret = 'super confidential information'
      // Add secret
      await pk.addSecret(vaultName, initialSecretName, Buffer.from(initialSecret))

      // Read secret
      const readBuffer = await pk.getSecret(vaultName, initialSecretName)
      const readSecret = readBuffer.toString()

      expect(readSecret).toStrictEqual(initialSecret)
    })
  })
})
