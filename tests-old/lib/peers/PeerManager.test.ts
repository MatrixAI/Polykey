import fs from 'fs'
import os from 'os'
import {Polykey} from "../../../src/Polykey"
import { randomString } from '../../../src/utils'
import KeyManager from '../../../src/keys/KeyManager'
import { KeybaseIdentityProvider } from '../../../src/nodes/identity-provider/default';

describe('NodeManager class', () => {
  type PKNode = {
    tempDir: string
    pk: Polykey
  }
  const setupTwoConnectedNodes = async (): Promise<{ nodeA: PKNode, nodeB: PKNode }> => {

    // ======== PEER A ======== //
    // Define temp directory
    const tempDirNodeA = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString(5)}`)

    // Create keyManager
    const keyManagerA = new KeyManager(tempDirNodeA, fs)
    await keyManagerA.generateKeyPair('John Smith', 'some passphrase', true)

    // Initialize polykey
    const nodeA = new Polykey(
      tempDirNodeA,
      fs,
      keyManagerA
    )
    while (!nodeA.nodeManager.nodeServer.started) {
      await new Promise((resolve, reject) => {
        setTimeout(() => resolve(null), 500)
      })
    }

    // ======== PEER B ======== //
    // Define temp directory
    const tempDirNodeB = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString(5)}`)

    // Create keyManager
    const keyManagerB = new KeyManager(tempDirNodeB, fs)
    await keyManagerB.generateKeyPair('Jane Doe', 'some different passphrase', true)

    // Initialize polykey
    const nodeB = new Polykey(
      tempDirNodeB,
      fs,
      keyManagerB
    )
    while (!nodeB.nodeManager.nodeServer.started) {
      await new Promise((resolve, reject) => {
        setTimeout(() => resolve(null), 500)
      })
    }

    nodeA.nodeManager.addNode(nodeB.nodeManager.nodeInfo)
    nodeB.nodeManager.addNode(nodeA.nodeManager.nodeInfo)

    return {
      nodeA: {
        tempDir: tempDirNodeA,
        pk: nodeA
      },
      nodeB: {
        tempDir: tempDirNodeB,
        pk: nodeB
      }
    }
  }

  describe('Node Connections', () => {
    let tempDirNodeA: string
    let nodeA: Polykey

    let tempDirNodeB: string
    let nodeB: Polykey

    beforeAll(async () => {
      const nodes = await setupTwoConnectedNodes()
      nodeA = nodes.nodeA.pk
      tempDirNodeA = nodes.nodeA.tempDir
      nodeB = nodes.nodeB.pk
      tempDirNodeB = nodes.nodeB.tempDir
    })

    afterAll(() => {
      fs.rmdirSync(tempDirNodeA, { recursive: true })
      fs.rmdirSync(tempDirNodeB, { recursive: true })
    })

    test('can ping node', async done => {
      // ==== A to B ==== //
      const nodeBPubKey = nodeB.nodeManager.nodeInfo.publicKey
      const nodeBId = nodeB.nodeManager.nodeInfo.id

      const pc = nodeA.nodeManager.connectToNode(nodeBId)

      expect(await pc.pingNode(5000)).toEqual(true)

      expect(1+1).toEqual(2);
      done()
    }, 20000)

    test('can connect securely to another node and send data back and forth', async () => {
      // ==== A to B ==== //
      const nodeConnectionAB = nodeA.nodeManager.connectToNode(nodeB.nodeManager.nodeInfo.id)
      expect(nodeConnectionAB).not.toEqual(undefined)
      expect(await nodeConnectionAB.pingNode(5000)).toEqual(true)
      // ==== B to A ==== //
      const nodeConnectionBA = nodeB.nodeManager.connectToNode(nodeA.nodeManager.nodeInfo.id)
      expect(nodeConnectionBA).not.toEqual(undefined)
      expect(await nodeConnectionBA.pingNode(5000)).toEqual(true)
    }, 10000)
  })

  describe('NAT Traversal via Node Relay', () => {
    let tempDirNodeA: string
    let nodeA: Polykey

    let tempDirNodeB: string
    let nodeB: Polykey

    let tempDirNodeC: string
    let nodeC: Polykey

    beforeAll(async () => {
      const nodes = await setupTwoConnectedNodes()
      nodeA = nodes.nodeA.pk
      tempDirNodeA = nodes.nodeA.tempDir
      nodeB = nodes.nodeB.pk
      tempDirNodeB = nodes.nodeB.tempDir

      // open relay connection from nodeB to nodeA
      nodeA.nodeManager.updateNode(nodeB.nodeManager.nodeInfo)
      nodeB.nodeManager.updateNode(nodeA.nodeManager.nodeInfo)
      // ======== PEER C ======== //
      // Define temp directory
      tempDirNodeC = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString(5)}`)

      // Create keyManager
      const keyManagerC = new KeyManager(tempDirNodeC, fs)
      await keyManagerC.generateKeyPair('John Smith', 'some passphrase', true)

      // Initialize polykey
      nodeC = new Polykey(
        tempDirNodeC,
        fs,
        keyManagerC
      )

      nodeA.nodeManager.addNode(nodeC.nodeManager.nodeInfo)
      nodeB.nodeManager.addNode(nodeC.nodeManager.nodeInfo)

      nodeC.nodeManager.addNode(nodeA.nodeManager.nodeInfo)
      // remove connectedAddress from nodeC to simulate a blocked connection
      nodeB.nodeManager.nodeInfo.nodeAddress = undefined
      nodeC.nodeManager.addNode(nodeB.nodeManager.nodeInfo)
    })

    afterAll(() => {
      fs.rmdirSync(tempDirNodeA, { recursive: true })
      fs.rmdirSync(tempDirNodeB, { recursive: true })
      fs.rmdirSync(tempDirNodeC, { recursive: true })
    })

    describe('Node Relay Sharing', () => {
      test('can clone a vault through a node relay connection', async done => {
        // ==== Pull Vault B to C ==== //
        const vaultName = `Vault-${randomString(5)}`
        const vault = await nodeB.vaultManager.newVault(vaultName)

        const clonedVault = await nodeC.vaultManager.cloneVault(vault.name, nodeB.nodeManager.nodeInfo.id)
        expect(vault.name).toEqual(clonedVault.name)

        done()
      }, 100000)

      test('can clone many vaults through a node relay connection', async done => {
        // ==== Pull Vaults B to C ==== //
        const vaultNameList = [...Array(10)].map((_) => {
          return `Vault-${randomString(5)}`
        })

        for (const vaultName of vaultNameList) {
          await nodeB.vaultManager.newVault(vaultName)
        }

        // clone all vaults from B to C asynchronously
        const clonedVaults = await Promise.all(vaultNameList.map(async (v) => {
          return nodeC.vaultManager.cloneVault(v, nodeB.nodeManager.nodeInfo.publicKey)
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
    let tempDirNodeA: string
    let nodeA: Polykey

    let tempDirNodeB: string
    let nodeB: Polykey

    let tempDirNodeC: string
    let nodeC: Polykey

    beforeAll(async () => {
      const nodes = await setupTwoConnectedNodes()
      nodeA = nodes.nodeA.pk
      tempDirNodeA = nodes.nodeA.tempDir
      nodeB = nodes.nodeB.pk
      tempDirNodeB = nodes.nodeB.tempDir


      nodeA.nodeManager.updateNode(nodeB.nodeManager.nodeInfo)
      nodeB.nodeManager.updateNode(nodeA.nodeManager.nodeInfo)
      // ======== PEER C ======== //
      // Define temp directory
      tempDirNodeC = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString(5)}`)

      // Create keyManager
      const keyManagerC = new KeyManager(tempDirNodeC, fs)
      await keyManagerC.generateKeyPair('John Smith', 'some passphrase', true)

      // Initialize polykey
      nodeC = new Polykey(
        tempDirNodeC,
        fs,
        keyManagerC
      )

      nodeA.nodeManager.addNode(nodeC.nodeManager.nodeInfo)
      nodeB.nodeManager.addNode(nodeC.nodeManager.nodeInfo)

      nodeC.nodeManager.addNode(nodeA.nodeManager.nodeInfo)
      // remove connectedAddress from nodeC to simulate a blocked connection
      nodeB.nodeManager.nodeInfo.nodeAddress = undefined
      nodeC.nodeManager.addNode(nodeB.nodeManager.nodeInfo)
    })

    afterAll(() => {
      fs.rmdirSync(tempDirNodeA, { recursive: true })
      fs.rmdirSync(tempDirNodeB, { recursive: true })
      fs.rmdirSync(tempDirNodeC, { recursive: true })
    })

    describe('UDP Hole Punched Sharing', () => {
      test('can clone a vault through a hole punched connection', async done => {
        // ==== Pull Vault B to C ==== //
        const vaultName = `Vault-${randomString(5)}`
        const vault = await nodeB.vaultManager.newVault(vaultName)

        const clonedVault = await nodeC.vaultManager.cloneVault(vault.name, nodeB.nodeManager.nodeInfo.publicKey)
        expect(vault.name).toEqual(clonedVault.name)

        done()
      })

      test('can clone many vaults through a hole punched connection', async done => {
        // ==== Pull Vaults B to C ==== //
        const vaultNameList = [...Array(10).keys()].map((_) => {
          return `Vault-${randomString(5)}`
        })

        for (const vaultName of vaultNameList) {
          const vault = await nodeB.vaultManager.newVault(vaultName)
        }

        // clone all vaults from B to C asynchronously
        const clonedVaults = await Promise.all(vaultNameList.map(async (v) => {
          return nodeC.vaultManager.cloneVault(v, nodeB.nodeManager.nodeInfo.publicKey)
        }))
        const clonedVaultNameList = clonedVaults.map((v) => {
          return v.name
        })

        expect(clonedVaultNameList).toEqual(vaultNameList)

        done()
      }, 20000)
    })
  })

  describe('Node Discovery', () => {
    let tempDirNodeA: string
    let nodeA: Polykey

    let tempDirNodeB: string
    let nodeB: Polykey

    beforeAll(async () => {
      const nodes = await setupTwoConnectedNodes()
      nodeA = nodes.nodeA.pk
      tempDirNodeA = nodes.nodeA.tempDir
      nodeB = nodes.nodeB.pk
      tempDirNodeB = nodes.nodeB.tempDir

      // need to mock a social discovery service
      // For node A
      // nodeA.nodeManager.socialDiscoveryServices = [{
      //   name: 'MockSocialDiscoveryForNodeA',
      //   findUser: async (handle: string, service: string) => nodeB.nodeManager.nodeInfo.publicKey
      // }]
      nodeA.nodeManager.identityProviderPlugins.set("MockSocialDiscoveryForNodeA", KeybaseIdentityProvider)
      // For node B
      // nodeB.nodeManager.socialDiscoveryServices = [{
      //   name: 'MockSocialDiscoveryForNodeB',
      //   findUser: async (handle: string, service: string) => nodeA.nodeManager.nodeInfo.publicKey
      // }]
      nodeB.nodeManager.identityProviderPlugins.set("MockSocialDiscoveryForNodeB", KeybaseIdentityProvider)
    })

    afterAll(() => {
      fs.rmdirSync(tempDirNodeA, { recursive: true })
      fs.rmdirSync(tempDirNodeB, { recursive: true })
    })

    test('find a node via public key', async () => {
      // TODO: try to find a way to test this, currently its untestable because keybase login integration hasn't been completed
      const successful = await nodeA.nodeManager.findPublicKey(nodeB.nodeManager.nodeInfo.publicKey)
      expect(successful).toEqual(true)
    }, 100000)

    test('find a user via a social discovery service', async () => {
      // TODO: try to find a way to test this, currently its untestable because keybase login integration hasn't been completed
      const successful = await nodeA.nodeManager.findSocialUser('mock', 'john-smith', 8e3)
      expect(successful).toEqual(true)
    }, 10000)
  })


})
