import fs from 'fs'
import os from 'os'
import tls from 'tls'
import Polykey from "@polykey/Polykey"
import { randomString } from '@polykey/utils'
import KeyManager from '@polykey/keys/KeyManager'

// TODO expand tests as part of testing PR
describe('Peer Manager', () => {
  let tempDir: string
  let pk: Polykey

	beforeAll(async done => {
		// Define temp directory
		tempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

		// Create keyManager
    const keyManager = new KeyManager(tempDir)
    await keyManager.generateKeyPair('John Smith', 'john.smith@email.com', 'some passphrase', 128, true)

		// Initialize polykey
		pk = new Polykey(
			tempDir,
      keyManager
    )

    done()
	})

	afterAll(() => {
    fs.rmdirSync(tempDir)
  })

  //////////////////////
  // Peer Connections //
  //////////////////////
  describe('Peer Connections', () => {
    let peerTempDir: string
    let peerPk: Polykey

    beforeAll(async done => {
      // Define temp directory
      peerTempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

      // Create keyManager
      const keyManager = new KeyManager(peerTempDir)
      await keyManager.generateKeyPair('John Smith', 'john.smith@email.com', 'some passphrase', 128, true)

      // Initialize polykey
      peerPk = new Polykey(
        peerTempDir,
        keyManager
      )

      done()
    })

    afterAll(() => {
      fs.rmdirSync(peerTempDir)
    })

    test('can connect securely to another peer and send data back and forth', async done => {
      // ==== Server ==== //
      const server = pk.peerManager.server
      server.on('secureConnection', (socket) => {
        socket.on('data', data => {
          socket.write(data)
        })
      })

      // ==== Client ==== //
      const peerSocket = peerPk.peerManager.connectToPeer(pk.peerManager.getLocalPeerInfo().connectedAddr!)
      const testMessage = Buffer.from('this is an echo test message')
      peerSocket.on('data', data => {
        const str: string = data.toString()
        // if (!str.includes('HTTP')) {
          expect(data.toString()).toEqual(testMessage.toString())
        // }

        done()
      })

      peerSocket.write(testMessage.toString())
      peerSocket.write('dsrfgerg')
      peerSocket.write('woiejogirwe')

    })

  })

  ////////////////////
  // Peer Discovery //
  ////////////////////
	test('find a peer', async () => {
    // TODO: try to find a way to test this, currently its untestable because keybase login integration hasn't been completed
    await pk.peerManager.findSocialUser('robert-cronin', 'github')
  })

	test('find a user on github', async () => {
    // TODO: try to find a way to test this, currently its untestable because keybase login integration hasn't been completed
    await pk.peerManager.findSocialUser('robert-cronin', 'github')
  })


})
