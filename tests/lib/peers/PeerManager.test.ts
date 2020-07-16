import fs from 'fs'
import os from 'os'
import Polykey from "../../../src/lib/Polykey"
import { randomString } from '../../../src/lib/utils'
import KeyManager from '../../../src/lib/keys/KeyManager'

// TODO expand tests as part of testing PR
describe('PeerManager class', () => {
  let tempDirPeerA: string
  let peerA: Polykey

  let tempDirPeerB: string
  let peerB: Polykey

	beforeAll(async () => {
    // ======== PEER A ======== //
		// Define temp directory
		tempDirPeerA = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

    // Create keyManager
    const keyManagerA = new KeyManager(tempDirPeerA, fs)
    await keyManagerA.generateKeyPair('John Smith', 'john.smith@email.com', 'some passphrase', 1024, true)

		// Initialize polykey
		peerA = new Polykey(
      tempDirPeerA,
      fs,
      keyManagerA
    )
    while (!peerA.peerManager.serverStarted) {
      await new Promise((resolve, reject) => {
        setTimeout(() => resolve(), 500)
      })
    }

    // ======== PEER A ======== //
		// Define temp directory
		tempDirPeerB = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

    // Create keyManager
    const keyManagerB = new KeyManager(tempDirPeerB, fs)
    await keyManagerB.generateKeyPair('Jane Doe', 'jane.doe@email.com', 'some different passphrase', 1024, true)

		// Initialize polykey
		peerB = new Polykey(
      tempDirPeerB,
      fs,
      keyManagerB
    )
    while (!peerB.peerManager.serverStarted) {
      await new Promise((resolve, reject) => {
        setTimeout(() => resolve(), 500)
      })
    }

	})

	afterAll(() => {
    fs.rmdirSync(tempDirPeerA)
    fs.rmdirSync(tempDirPeerB)
	})

  describe('Peer Connections', () => {
    test('can connect securely to another peer and send data back and forth', async done => {
      peerA.peerManager.addPeer(peerB.peerManager.getLocalPeerInfo())
      peerB.peerManager.addPeer(peerA.peerManager.getLocalPeerInfo())
      // ==== A to B ==== //
      const gitClient = peerA.peerManager.connectToPeer(peerB.peerManager.getLocalPeerInfo().publicKey)
      expect(gitClient).not.toEqual(undefined)

      done()
    })
  })

  describe('Peer Discovery', () => {
    test('find a peer via public key', async done => {
      // TODO: try to find a way to test this, currently its untestable because keybase login integration hasn't been completed
      const peerInfo = await peerA.peerManager.findPubKey(peerB.peerManager.getLocalPeerInfo().publicKey)
      console.log(peerInfo);

      done()
    })

    test('find a user on github', async () => {
      // TODO: try to find a way to test this, currently its untestable because keybase login integration hasn't been completed
      await peerA.peerManager.findSocialUser('robert-cronin', 'github')
    })
  })


})
