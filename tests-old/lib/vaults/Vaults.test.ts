import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import {Polykey} from "../../../src/Polykey";
import { randomString } from '../../../src/utils';
import KeyManager from '../../../src/keys/KeyManager';
import VaultManager from '../../../src/vaults/VaultManager';

describe('VaultManager class', () => {
  let randomVaultName: string

  let caTempDir: string
  let caKm: KeyManager

  let tempDir: string
  let pk: Polykey
  let vm: VaultManager

  beforeAll(async done => {
    // Define CA temp directory
    caTempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString(5)}`)

    // Create CA keyManager
    caKm = new KeyManager(caTempDir, fs)
    await caKm.generateKeyPair('John Smith', 'passphrase', true)

    // Define temp directory
    tempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString(5)}`)

    // Create keyManager
    const km = new KeyManager(tempDir, fs)

    // Generate keypair
    await km.generateKeyPair('John Smith', 'passphrase', true)

    // request certificate from CA
    km.pki.addCA(caKm.pki.RootCert)
    const csr = km.pki.createCSR('localhost', 'passphrase')
    const certString = caKm.pki.handleCSR(csr)
    km.pki.importCertificate(certString)

    // Initialize polykey
    pk = new Polykey(
      tempDir,
      fs,
      km
    )
    vm = pk.vaultManager
    done()
  })

  afterAll(() => {
    fs.rmdirSync(tempDir, { recursive: true })
  })

  beforeEach(() => {
    // Reset the vault name for each test
    randomVaultName = `Vault-${randomString(5)}`
  })

  test('test', () => {
    expect(1+1).toEqual(2);
  })

  test('can create vault', async () => {
    // Create vault
    await vm.newVault(randomVaultName)
    const vaultExists = vm.vaultExists(randomVaultName)
    expect(vaultExists).toEqual(true)
  })

  test('cannot create same vault twice', async () => {
    // Create vault
    await vm.newVault(randomVaultName)
    const vaultExists = vm.vaultExists(randomVaultName)
    expect(vaultExists).toEqual(true)
    // Create vault a second time
    expect(vm.newVault(randomVaultName)).rejects.toThrow('Vault already exists!')
  })
  test('can destroy vaults', async () => {
    // Create vault
    await vm.newVault(randomVaultName)
    expect(vm.vaultExists(randomVaultName)).toStrictEqual(true)
    // Destroy the vault
    await vm.deleteVault(randomVaultName)
    expect(vm.vaultExists(randomVaultName)).toStrictEqual(false)
  })

  ///////////////////
  // Vault Secrets //
  ///////////////////
  describe('secrets within vaults', () => {
    test('can create secrets and read them back', async () => {
      // Create vault
      const vault = await vm.newVault(randomVaultName)

      // Run test
      const initialSecretName = 'ASecret'
      const initialSecret = 'super confidential information'
      // Add secret
      await vault.addSecret(initialSecretName, Buffer.from(initialSecret))

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
    let nodePk: Polykey
    let nodeVm: VaultManager

    beforeAll(async done => {
      // Define temp directory
      tempDir2 = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString(5)}`)
      // Create keyManager
      const km2 = new KeyManager(tempDir2, fs)

      // Generate keypair
      await km2.generateKeyPair('Jane Doe', 'passphrase', true)

      // request certificate from CA
      km2.pki.addCA(caKm.pki.RootCert)
      const csr = km2.pki.createCSR('localhost', 'passphrase')
      const certString = caKm.pki.handleCSR(csr)
      km2.pki.importCertificate(certString)

      // Initialize polykey
      nodePk = new Polykey(
        tempDir2,
        fs,
        km2
      )
      nodeVm = nodePk.vaultManager

      // add to node stores
      nodePk.nodeManager.addNode(pk.nodeManager.nodeInfo)
      pk.nodeManager.addNode(nodePk.nodeManager.nodeInfo)

      done()
    })

    afterAll(() => {
      // Remove temp directory
      fs.rmdirSync(tempDir2, { recursive: true })
    })

    test('can clone vault', async done => {
      // Create vault
      const vault = await vm.newVault(randomVaultName)
      // Add secret
      const initialSecretName = 'ASecret'
      const initialSecret = 'super confidential information'
      await vault.addSecret(initialSecretName, Buffer.from(initialSecret))

      // Pull from pk in nodePk
      const clonedVault = await nodeVm.cloneVault(randomVaultName, pk.nodeManager.nodeInfo.publicKey)

      const pkSecret = vault.getSecret(initialSecretName).toString()

      await clonedVault.pullVault(pk.nodeManager.nodeInfo.publicKey)

      const nodePkSecret = clonedVault.getSecret(initialSecretName).toString()

      expect(nodePkSecret).toStrictEqual(pkSecret)
      expect(nodePkSecret).toStrictEqual(initialSecret)

      done()
    })

    test('stress test - can clone many vaults concurrently', async done => {

      const vaultNameList = [...Array(10).keys()].map((_) => {
        return `Vault-${randomString(5)}`
      })

      for (const vaultName of vaultNameList) {
        const vault = await vm.newVault(vaultName)
        // Add secret
        const initialSecretName = 'ASecret'
        const initialSecret = 'super confidential information'
        await vault.addSecret(initialSecretName, Buffer.from(initialSecret))
      }

      // clone all vaults asynchronously
      const clonedVaults = await Promise.all(vaultNameList.map(async (v) => {
        return nodeVm.cloneVault(v, pk.nodeManager.nodeInfo.publicKey)
      }))
      const clonedVaultNameList = clonedVaults.map((v) => {
        return v.name
      })

      expect(clonedVaultNameList).toEqual(vaultNameList)

      done()
    }, 25000)

    test('can pull changes', async done => {
      // Create vault
      const vault = await vm.newVault(randomVaultName)
      // Add secret
      const initialSecretName = 'InitialSecret'
      const initialSecret = 'super confidential information'
      await vault.addSecret(initialSecretName, Buffer.from(initialSecret))

      // First clone from pk in nodePk
      const clonedVault = await nodeVm.cloneVault(randomVaultName, pk.nodeManager.nodeInfo.publicKey)

      // Add secret to pk
      await vault.addSecret('NewSecret', Buffer.from('some other secret information'))

      // Pull from vault
      await clonedVault.pullVault(pk.nodeManager.nodeInfo.publicKey)

      // Compare new secret
      const pkNewSecret = vault.getSecret(initialSecretName).toString()
      const nodePkNewSecret = clonedVault.getSecret(initialSecretName).toString()
      expect(pkNewSecret).toStrictEqual(nodePkNewSecret)
      done()
    })

    test('removing secret is reflected in node vault', async done => {
      // Create vault
      const vault = await vm.newVault(randomVaultName)
      // Add secret
      const initialSecretName = 'InitialSecret'
      const initialSecret = 'super confidential information'
      await vault.addSecret(initialSecretName, Buffer.from(initialSecret))

      // First clone from pk in nodePk
      const clonedVault = await nodeVm.cloneVault(randomVaultName, pk.nodeManager.nodeInfo.publicKey)

      // Confirm secrets list only contains InitialSecret
      const secretList = vault.listSecrets()
      const clonedSecretList = clonedVault.listSecrets()
      expect(secretList).toEqual(clonedSecretList)
      expect(clonedSecretList).toEqual([initialSecretName])

      // Remove secret from pk vault
      await vault.removeSecret(initialSecretName)

      // Pull clonedVault
      await clonedVault.pullVault(pk.nodeManager.nodeInfo.publicKey)

      // Confirm secrets list is now empty
      const removedSecretList = vault.listSecrets()
      const removedClonedSecretList = clonedVault.listSecrets()
      expect(removedSecretList).toEqual(removedClonedSecretList)
      expect(removedClonedSecretList).toEqual([])

      done()
    })
  })

  /////////////////
  // Concurrency //
  /////////////////
  describe('concurrency', () => {
    test('parallel write operations are sequentially executed', async done => {
      const vault = await pk.vaultManager.newVault(randomVaultName)
      const writeOps: Promise<void>[] = []
      const expectedHistory: number[] = []
      for (const n of Array(50).keys()) {
        // Get a random number of bytes so each operation might finish earlier than the others
        const randomNumber = 1 + Math.round(Math.random() * 5000)
        const secretBuffer = crypto.randomBytes(randomNumber)
        const writeOp = vault.addSecret(`${n + 1}`, secretBuffer)
        writeOps.push(writeOp)
        expectedHistory.push(n + 1)
      }
      await Promise.all(writeOps)

      const history = (await vault.getVaultHistory()).reverse()
        .map((commit) => {
          const match = commit.match(/([0-9]+)/)
          return (match) ? parseInt(match[0]) : undefined
        })
        .filter((n) => n != undefined)

      expect(history).toEqual(expectedHistory)

      done()
    }, 20000)
  })
})
