import fs from 'fs'
import os from 'os'
import {Polykey} from "../../../src/Polykey"
import { randomString } from '../../../src/utils'
import KeyManager from '../../../src/keys/KeyManager'
import { KeybaseIdentityProvider } from '../../../src/peers/identity-provider/default';

describe('PeerManager class', () => {
  type PKNode = {
    tempDir: string
    pk: Polykey
  }
  const setupTwoConnectedNodes = async (): Promise<{ nodeA: PKNode, nodeB: PKNode }> => {

    // ======== PEER A ======== //
    // Define temp directory
    const tempDirPeerA = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

    // Create keyManager
    const keyManagerA = new KeyManager(tempDirPeerA, fs)
    await keyManagerA.generateKeyPair('John Smith', 'some passphrase', true)

    // Initialize polykey
    const peerA = new Polykey(
      tempDirPeerA,
      fs,
      keyManagerA
    )
    while (!peerA.peerManager.peerServer.started) {
      await new Promise((resolve, reject) => {
        setTimeout(() => resolve(null), 500)
      })
    }

    // ======== PEER B ======== //
    // Define temp directory
    const tempDirPeerB = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

    // Create keyManager
    const keyManagerB = new KeyManager(tempDirPeerB, fs)
    await keyManagerB.generateKeyPair('Jane Doe', 'some different passphrase', true)

    // Initialize polykey
    const peerB = new Polykey(
      tempDirPeerB,
      fs,
      keyManagerB
    )
    while (!peerB.peerManager.peerServer.started) {
      await new Promise((resolve, reject) => {
        setTimeout(() => resolve(null), 500)
      })
    }

    peerA.peerManager.addPeer(peerB.peerManager.peerInfo)
    peerB.peerManager.addPeer(peerA.peerManager.peerInfo)

    return {
      nodeA: {
        tempDir: tempDirPeerA,
        pk: peerA
      },
      nodeB: {
        tempDir: tempDirPeerB,
        pk: peerB
      }
    }
  }

  describe('Peer Connections', () => {
    let tempDirPeerA: string
    let peerA: Polykey

    let tempDirPeerB: string
    let peerB: Polykey

    beforeAll(async () => {
      const nodes = await setupTwoConnectedNodes()
      peerA = nodes.nodeA.pk
      tempDirPeerA = nodes.nodeA.tempDir
      peerB = nodes.nodeB.pk
      tempDirPeerB = nodes.nodeB.tempDir
    })

    afterAll(() => {
      fs.rmdirSync(tempDirPeerA, { recursive: true })
      fs.rmdirSync(tempDirPeerB, { recursive: true })
    })

    test('can ping peer', async done => {
      // ==== A to B ==== //
      const peerBPubKey = peerB.peerManager.peerInfo.publicKey
      const peerBId = peerB.peerManager.peerInfo.id

      const pc = peerA.peerManager.connectToPeer(peerBId)

      expect(await pc.pingPeer(5000)).toEqual(true)

      expect(1+1).toEqual(2);
      done()
    }, 20000)

    test('can connect securely to another peer and send data back and forth', async () => {
      // ==== A to B ==== //
      const peerConnectionAB = peerA.peerManager.connectToPeer(peerB.peerManager.peerInfo.id)
      expect(peerConnectionAB).not.toEqual(undefined)
      expect(await peerConnectionAB.pingPeer(5000)).toEqual(true)
      // ==== B to A ==== //
      const peerConnectionBA = peerB.peerManager.connectToPeer(peerA.peerManager.peerInfo.id)
      expect(peerConnectionBA).not.toEqual(undefined)
      expect(await peerConnectionBA.pingPeer(5000)).toEqual(true)
    }, 10000)
  })

  describe('NAT Traversal via Peer Relay', () => {
    let tempDirPeerA: string
    let peerA: Polykey

    let tempDirPeerB: string
    let peerB: Polykey

    let tempDirPeerC: string
    let peerC: Polykey

    beforeAll(async () => {
      const nodes = await setupTwoConnectedNodes()
      peerA = nodes.nodeA.pk
      tempDirPeerA = nodes.nodeA.tempDir
      peerB = nodes.nodeB.pk
      tempDirPeerB = nodes.nodeB.tempDir

      // open relay connection from peerB to peerA
      peerA.peerManager.updatePeer(peerB.peerManager.peerInfo)
      peerB.peerManager.updatePeer(peerA.peerManager.peerInfo)
      // ======== PEER C ======== //
      // Define temp directory
      tempDirPeerC = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

      // Create keyManager
      const keyManagerC = new KeyManager(tempDirPeerC, fs)
      await keyManagerC.generateKeyPair('John Smith', 'some passphrase', true)

      // Initialize polykey
      peerC = new Polykey(
        tempDirPeerC,
        fs,
        keyManagerC
      )

      peerA.peerManager.addPeer(peerC.peerManager.peerInfo)
      peerB.peerManager.addPeer(peerC.peerManager.peerInfo)

      peerC.peerManager.addPeer(peerA.peerManager.peerInfo)
      // remove connectedAddress from peerC to simulate a blocked connection
      peerB.peerManager.peerInfo.peerAddress = undefined
      peerC.peerManager.addPeer(peerB.peerManager.peerInfo)
    })

    afterAll(() => {
      fs.rmdirSync(tempDirPeerA, { recursive: true })
      fs.rmdirSync(tempDirPeerB, { recursive: true })
      fs.rmdirSync(tempDirPeerC, { recursive: true })
    })

    describe('Peer Relay Sharing', () => {
      test('can clone a vault through a peer relay connection', async done => {
        // ==== Pull Vault B to C ==== //
        const vaultName = `Vault-${randomString()}`
        const vault = await peerB.vaultManager.newVault(vaultName)

        const clonedVault = await peerC.vaultManager.cloneVault(vault.name, peerB.peerManager.peerInfo.id)
        expect(vault.name).toEqual(clonedVault.name)

        done()
      }, 100000)

      test('can clone many vaults through a peer relay connection', async done => {
        // ==== Pull Vaults B to C ==== //
        const vaultNameList = [...Array(10)].map((_) => {
          return `Vault-${randomString()}`
        })

        for (const vaultName of vaultNameList) {
          await peerB.vaultManager.newVault(vaultName)
        }

        // clone all vaults from B to C asynchronously
        const clonedVaults = await Promise.all(vaultNameList.map(async (v) => {
          return peerC.vaultManager.cloneVault(v, peerB.peerManager.peerInfo.publicKey)
        }))
        const clonedVaultNameList = clonedVaults.map((v) => {
          return v.name
        })

        expect(clonedVaultNameList).toEqual(vaultNameList)

        done()
      }, 20000)
    })
  })

  describe('NAT Traversal via UDP Hole Punching', () => {
    let tempDirPeerA: string
    let peerA: Polykey

    let tempDirPeerB: string
    let peerB: Polykey

    let tempDirPeerC: string
    let peerC: Polykey

    beforeAll(async () => {
      const nodes = await setupTwoConnectedNodes()
      peerA = nodes.nodeA.pk
      tempDirPeerA = nodes.nodeA.tempDir
      peerB = nodes.nodeB.pk
      tempDirPeerB = nodes.nodeB.tempDir


      peerA.peerManager.updatePeer(peerB.peerManager.peerInfo)
      peerB.peerManager.updatePeer(peerA.peerManager.peerInfo)
      // ======== PEER C ======== //
      // Define temp directory
      tempDirPeerC = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

      // Create keyManager
      const keyManagerC = new KeyManager(tempDirPeerC, fs)
      await keyManagerC.generateKeyPair('John Smith', 'some passphrase', true)

      // Initialize polykey
      peerC = new Polykey(
        tempDirPeerC,
        fs,
        keyManagerC
      )

      peerA.peerManager.addPeer(peerC.peerManager.peerInfo)
      peerB.peerManager.addPeer(peerC.peerManager.peerInfo)

      peerC.peerManager.addPeer(peerA.peerManager.peerInfo)
      // remove connectedAddress from peerC to simulate a blocked connection
      peerB.peerManager.peerInfo.peerAddress = undefined
      peerC.peerManager.addPeer(peerB.peerManager.peerInfo)
    })

    afterAll(() => {
      fs.rmdirSync(tempDirPeerA, { recursive: true })
      fs.rmdirSync(tempDirPeerB, { recursive: true })
      fs.rmdirSync(tempDirPeerC, { recursive: true })
    })

    describe('UDP Hole Punched Sharing', () => {
      test('can clone a vault through a hole punched connection', async done => {
        // ==== Pull Vault B to C ==== //
        const vaultName = `Vault-${randomString()}`
        const vault = await peerB.vaultManager.newVault(vaultName)

        const clonedVault = await peerC.vaultManager.cloneVault(vault.name, peerB.peerManager.peerInfo.publicKey)
        expect(vault.name).toEqual(clonedVault.name)

        done()
      })

      test('can clone many vaults through a hole punched connection', async done => {
        // ==== Pull Vaults B to C ==== //
        const vaultNameList = [...Array(10).keys()].map((_) => {
          return `Vault-${randomString()}`
        })

        for (const vaultName of vaultNameList) {
          const vault = await peerB.vaultManager.newVault(vaultName)
        }

        // clone all vaults from B to C asynchronously
        const clonedVaults = await Promise.all(vaultNameList.map(async (v) => {
          return peerC.vaultManager.cloneVault(v, peerB.peerManager.peerInfo.publicKey)
        }))
        const clonedVaultNameList = clonedVaults.map((v) => {
          return v.name
        })

        expect(clonedVaultNameList).toEqual(vaultNameList)

        done()
      }, 20000)
    })
  })

  describe('Peer Discovery', () => {
    let tempDirPeerA: string
    let peerA: Polykey

    let tempDirPeerB: string
    let peerB: Polykey

    beforeAll(async () => {
      const nodes = await setupTwoConnectedNodes()
      peerA = nodes.nodeA.pk
      tempDirPeerA = nodes.nodeA.tempDir
      peerB = nodes.nodeB.pk
      tempDirPeerB = nodes.nodeB.tempDir

      // need to mock a social discovery service
      // For peer A
      // peerA.peerManager.socialDiscoveryServices = [{
      //   name: 'MockSocialDiscoveryForPeerA',
      //   findUser: async (handle: string, service: string) => peerB.peerManager.peerInfo.publicKey
      // }]
      peerA.peerManager.identityProviderPlugins.set("MockSocialDiscoveryForPeerA", KeybaseIdentityProvider)
      // For peer B
      // peerB.peerManager.socialDiscoveryServices = [{
      //   name: 'MockSocialDiscoveryForPeerB',
      //   findUser: async (handle: string, service: string) => peerA.peerManager.peerInfo.publicKey
      // }]
      peerB.peerManager.identityProviderPlugins.set("MockSocialDiscoveryForPeerB", KeybaseIdentityProvider)
    })

    afterAll(() => {
      fs.rmdirSync(tempDirPeerA, { recursive: true })
      fs.rmdirSync(tempDirPeerB, { recursive: true })
    })

    test('find a peer via public key', async () => {
      // TODO: try to find a way to test this, currently its untestable because keybase login integration hasn't been completed
      const successful = await peerA.peerManager.findPublicKey(peerB.peerManager.peerInfo.publicKey)
      expect(successful).toEqual(true)
    }, 100000)

    test('find a user via a social discovery service', async () => {
      // TODO: try to find a way to test this, currently its untestable because keybase login integration hasn't been completed
      const successful = await peerA.peerManager.findSocialUser('mock', 'john-smith', 8e3)
      expect(successful).toEqual(true)
    }, 10000)
  })


})
