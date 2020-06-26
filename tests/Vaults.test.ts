import fs from 'fs'
import os from 'os'
import {pki} from 'node-forge'
import Polykey from "@polykey/Polykey"
import { randomString } from '@polykey/utils'
import KeyManager from '@polykey/keys/KeyManager'
import VaultManager from '@polykey/vaults/VaultManager'
import PeerManager from '@polykey/peers/PeerManager'
import PublicKeyInfrastructure from '@polykey/pki/PublicKeyInfrastructure'



function createCACert(nbits: number = 2048, organizationName: string = 'MatrixAI') {
  // generate a keypair and create an X.509v3 certificate
  const keys = pki.rsa.generateKeyPair(nbits);
  const cert = pki.createCertificate();

  cert.publicKey = keys.publicKey;
  // alternatively set public key from a csr
  //cert.publicKey = csr.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [{
    name: 'commonName',
    value: 'polykey'
  }, {
    name: 'organizationName',
    value: organizationName
  }];
  cert.setSubject(attrs);
  // alternatively set subject from a csr
  //cert.setSubject(csr.subject.attributes);
  cert.setIssuer(attrs);
  cert.setExtensions([{
    name: 'basicConstraints',
    cA: true
  }, {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
  }, {
    name: 'extKeyUsage',
    serverAuth: true,
    clientAuth: true,
    codeSigning: true,
    emailProtection: true,
    timeStamping: true
  }, {
    name: 'nsCertType',
    client: true,
    server: true,
    email: true,
    objsign: true,
    sslCA: true,
    emailCA: true,
    objCA: true
  }, {
    name: 'subjectAltName',
    altNames: {
      type: 7, // IP
      ip: '127.0.0.1'
    }
  }, {
    name: 'subjectKeyIdentifier'
  }]);
  cert.sign(keys.privateKey)

  const keyPem = Buffer.from(pki.privateKeyToPem(keys.privateKey))
  const certPem = Buffer.from(pki.certificateToPem(cert))

  return {
    keyPem,
    certPem
  }
}


describe('vaults', () => {
  let randomVaultName: string

	let tempDir: string
  let pk: Polykey
  let vm: VaultManager
  let caCert: Buffer
  let caKey: Buffer

	beforeAll(async done => {
		// Define temp directory
		tempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

		// Create keyManager
		const km = new KeyManager(tempDir)
    await km.generateKeyPair('John Smith', 'john.smith@email.com', 'passphrase', 128, true)
    // PublicKeyInfrastructure
    const {certPem, keyPem} = createCACert()
    caCert = certPem
    caKey = keyPem
    const pki = new PublicKeyInfrastructure(caKey, caCert)
		// Initialize polykey
		pk = new Polykey(
			tempDir,
      km,
      undefined,
      undefined,
      pki
    )
    vm = pk.vaultManager
		done()
	})

	afterAll(() => {
		fs.rmdirSync(`${tempDir}`)
	})

  beforeEach(() => {
    // Reset the vault name for each test
    randomVaultName = `Vault-${randomString()}`
  })

  test('can create vault', async () => {
    // Create vault
    await vm.createVault(randomVaultName)
    const vaultExists = vm.vaultExists(randomVaultName)
    expect(vaultExists).toEqual(true)
  })

  test('cannot create same vault twice', async () => {
    // Create vault
    await vm.createVault(randomVaultName)
    const vaultExists = vm.vaultExists(randomVaultName)
    expect(vaultExists).toEqual(true)
    // Create vault a second time
    expect(vm.createVault(randomVaultName)).rejects.toThrow('Vault already exists!')
  })
  test('can destroy vaults', async () => {
    // Create vault
    await vm.createVault(randomVaultName)
    expect(vm.vaultExists(randomVaultName)).toStrictEqual(true)
    // Destroy the vault
    vm.destroyVault(randomVaultName)
    expect(vm.vaultExists(randomVaultName)).toStrictEqual(false)
  })

  ///////////////////
  // Vault Secrets //
  ///////////////////
  describe('secrets within vaults', () => {
    test('can create secrets and read them back', async () => {
      // Create vault
      const vault = await vm.createVault(randomVaultName)

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
    let peerPk: Polykey
    let peerVm: VaultManager

    beforeAll(async done => {
      // Define temp directory
      tempDir2 = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)
      // Create keyManager
      const km2 = new KeyManager(tempDir2)
      await km2.generateKeyPair('Jane Doe', 'jane.doe@email.com', 'passphrase', 128, true)
      // PublicKeyInfrastructure
      const pki = new PublicKeyInfrastructure(caKey, caCert)

      // Initialize polykey
      peerPk = new Polykey(
        tempDir2,
        km2,
        undefined,
        undefined,
        pki
      )
      peerVm = peerPk.vaultManager
      done()
    })

    afterAll(() => {
      // Remove temp directory
      fs.rmdirSync(tempDir2, {recursive: true})
    })

    test('can share vault', async done => {
      // Create vault
      const vault = await vm.createVault(randomVaultName)
      // Add secret
      const initialSecretName = 'ASecret'
      const initialSecret = 'super confidential information'
      await vault.addSecret(initialSecretName, Buffer.from(initialSecret))

      // Pull from pk in peerPk
      const gitClient = peerPk.peerManager.connectToPeer(pk.peerManager.getLocalPeerInfo().connectedAddr!)

      const clonedVault = await peerVm.cloneVault(randomVaultName, gitClient)

      const pkSecret = vault.getSecret(initialSecretName).toString()

      await clonedVault.pullVault(gitClient)

      const peerPkSecret = clonedVault.getSecret(initialSecretName).toString()
      console.log(pkSecret);
      console.log(peerPkSecret);


      expect(peerPkSecret).toStrictEqual(pkSecret)
      expect(peerPkSecret).toStrictEqual(initialSecret)


      done()
    },20000)

    test('can pull changes', async done => {
      // Create vault
      const vault = await vm.createVault(randomVaultName)
      // Add secret
      const initialSecretName = 'InitialSecret'
      const initialSecret = 'super confidential information'
      await vault.addSecret(initialSecretName, Buffer.from(initialSecret))

      // First clone from pk in peerPk
      const gitClient = peerPk.peerManager.connectToPeer(pk.peerManager.getLocalPeerInfo().connectedAddr!)
      const clonedVault = await peerVm.cloneVault(randomVaultName, gitClient)

      // Add secret to pk
      await vault.addSecret('NewSecret', Buffer.from('some other secret information'))

      // Pull from vault
      await clonedVault.pullVault(gitClient)

      // Compare new secret
      const pkNewSecret = vault.getSecret(initialSecretName).toString()
      const peerPkNewSecret = clonedVault.getSecret(initialSecretName).toString()
      expect(pkNewSecret).toStrictEqual(peerPkNewSecret)
      done()
    })

    test('removing secrets from shared vaults is reflected in peer vault', async done => {
      // Create vault

      const vault = await vm.createVault(randomVaultName)
      // Add secret
      const initialSecretName = 'InitialSecret'
      const initialSecret = 'super confidential information'
      await vault.addSecret(initialSecretName, Buffer.from(initialSecret))

      // First clone from pk in peerPk
      const gitClient = peerPk.peerManager.connectToPeer(pk.peerManager.getLocalPeerInfo().connectedAddr!)
      const clonedVault = await peerVm.cloneVault(randomVaultName, gitClient)

      // Confirm secrets list only contains InitialSecret
      const secretList = vault.listSecrets()
      const clonedSecretList = clonedVault.listSecrets()
      expect(secretList).toEqual(clonedSecretList)
      expect(clonedSecretList).toEqual([initialSecretName])

      // Remove secret from pk vault
      await vault.removeSecret(initialSecretName)

      // Pull clonedVault
      await clonedVault.pullVault(gitClient)

      // Confirm secrets list is now empty
      const removedSecretList = vault.listSecrets()
      const removedClonedSecretList = clonedVault.listSecrets()
      expect(removedSecretList).toEqual(removedClonedSecretList)
      expect(removedClonedSecretList).toEqual([])


      done()
    })
  })
})
