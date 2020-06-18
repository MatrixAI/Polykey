import fs from 'fs'
import os from 'os'
import Path from 'path'
import Polykey from "@polykey/Polykey"
import { randomString } from '@polykey/utils'
import KeyManager from '@polykey/KeyManager'

describe('vaults', () => {
  let randomVaultName: string

	let tempDir: string
  let pk: Polykey

	beforeAll(async done => {
		// Define temp directory
		tempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

		// Create keyManager
		const km = new KeyManager()
		// await km.generateKeyPair('John Smith', 'john.smith@email.com', 'passphrase', true)
		// Initialize polykey
		pk = new Polykey(
      km,
      undefined,
			tempDir
		)
		done()
	}, 30000)

	afterAll(() => {
		fs.rmdirSync(`${tempDir}`)
	})

  beforeEach(() => {
    // Reset the vault name for each test
    randomVaultName = `Vault-${randomString()}`
  })

  test('can create vault', async () => {
    // Create vault
    await pk.createVault(randomVaultName)
    const vaultExists = await pk.vaultExists(randomVaultName)
    expect(vaultExists).toEqual(true)
  })

  test('cannot create same vault twice', async () => {
    // Create vault
    await pk.createVault(randomVaultName)
    const vaultExists = await pk.vaultExists(randomVaultName)
    expect(vaultExists).toEqual(true)
    // Create vault a second time
    expect(pk.createVault(randomVaultName)).rejects.toThrow('Vault already exists!')
  })
  test('can destroy vaults', async () => {
    // Create vault
    await pk.createVault(randomVaultName)
    expect(await pk.vaultExists(randomVaultName)).toStrictEqual(true)
    // Destroy the vault
    await pk.destroyVault(randomVaultName)
    expect(await pk.vaultExists(randomVaultName)).toStrictEqual(false)
  })

  ///////////////////
  // Vault Secrets //
  ///////////////////
  describe('secrets within vaults', () => {
    test('can create secrets and read them back', async () => {
      // Create vault
      await pk.createVault(randomVaultName)

      // Run test
      const initialSecretName = 'ASecret'
      const initialSecret = 'super confidential information'
      // Add secret
      const vault = await pk.getVault(randomVaultName)
      vault.addSecret(initialSecretName, Buffer.from(initialSecret))

      // Read secret
      const readBuffer = vault.getSecret(initialSecretName)
      const readSecret = readBuffer.toString()

      expect(readSecret).toStrictEqual(initialSecret)
    })
  })

  ////////////////////
  // Sharing Vaults //
  ////////////////////
  describe('sharing vaults', () => {
    let tempDir2: string

    beforeEach(() => {
      // Define temp directory
      tempDir2 = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)
    })

    afterEach(() => {
      // Remove temp directory
      fs.rmdirSync(tempDir2, {recursive: true})
    })

    test('can share vault', async done => {
      // Create keyManager
      const km2 = new KeyManager()
      // await km2.generateKeyPair('Jane Doe', 'jane.doe@email.com', 'passphrase', true)
      // Initialize polykey
      const peerPk = new Polykey(
        km2,
        undefined,
        tempDir2
      )

      // Create vault
      const vault = await pk.createVault(randomVaultName)
      // Add secret
      const initialSecretName = 'ASecret'
      const initialSecret = 'super confidential information'
      await vault.addSecret(initialSecretName, Buffer.from(initialSecret))

      // Pull from pk in peerPk
      const pkAddress = pk.peerManager.peerStore.localPeerInfo.connectedAddr!
      const clonedVault = await peerPk.cloneVault(randomVaultName, pkAddress)

      const pkSecret = vault.getSecret(initialSecretName).toString()

      await clonedVault.pullVault(pkAddress)
      const peerPkSecret = clonedVault.getSecret(initialSecretName).toString()
      console.log(pkSecret);
      console.log(peerPkSecret);


      expect(peerPkSecret).toStrictEqual(pkSecret)
      expect(peerPkSecret).toStrictEqual(initialSecret)


      done()
    }, 6000)

    test('can share vault and pull changes', async done => {
      // Create keyManager
      const km2 = new KeyManager()
      // await km2.generateKeyPair('Jane Doe', 'jane.doe@email.com', 'passphrase', true)
      // Initialize polykey
      const peerPk = new Polykey(
        km2,
        undefined,
        tempDir2
      )

      // Create vault
      const vault = await pk.createVault(randomVaultName)
      // Add secret
      const initialSecretName = 'InitialSecret'
      const initialSecret = 'super confidential information'
      await vault.addSecret(initialSecretName, Buffer.from(initialSecret))

      // First clone from pk in peerPk
      const pkAddress = pk.peerManager.peerStore.localPeerInfo.connectedAddr!
      const clonedVault = await peerPk.cloneVault(randomVaultName, pkAddress)

      // Add secret to pk
      await vault.addSecret('NewSecret', Buffer.from('some other secret information'))

      // Pull from vault
      await clonedVault.pullVault(pkAddress)

      // Compare new secret

      const pkNewSecret = vault.getSecret(initialSecretName).toString()
      const peerPkNewSecret = clonedVault.getSecret(initialSecretName).toString()
      expect(pkNewSecret).toStrictEqual(peerPkNewSecret)
      done()
    }, 6000)

    test('removing secrets from shared vaults is reflected in peer vault', async done => {
      // Create keyManager
      const km2 = new KeyManager()
      // await km2.generateKeyPair('Jane Doe', 'jane.doe@email.com', 'passphrase', true)
      // Initialize polykey
      const peerPk = new Polykey(
        km2,
        undefined,
        tempDir2
      )

      // Create vault
      const vault = await pk.createVault(randomVaultName)
      // Add secret
      const initialSecretName = 'InitialSecret'
      const initialSecret = 'super confidential information'
      await vault.addSecret(initialSecretName, Buffer.from(initialSecret))

      // First clone from pk in peerPk
      const pkAddress = pk.peerManager.peerStore.localPeerInfo.connectedAddr!
      const clonedVault = await peerPk.cloneVault(randomVaultName, pkAddress)

      // Confirm secrets list only contains InitialSecret
      const secretList = vault.listSecrets()
      const clonedSecretList = clonedVault.listSecrets()
      expect(secretList).toEqual(clonedSecretList)
      expect(clonedSecretList).toEqual([initialSecretName])

      // Remove secret from pk vault
      await vault.removeSecret(initialSecretName)

      // Pull clonedVault
      await clonedVault.pullVault(pkAddress)

      // Confirm secrets list is now empty
      const removedSecretList = vault.listSecrets()
      const removedClonedSecretList = clonedVault.listSecrets()
      expect(removedSecretList).toEqual(removedClonedSecretList)
      expect(removedClonedSecretList).toEqual([])


      done()
    }, 6000)
  })
})
