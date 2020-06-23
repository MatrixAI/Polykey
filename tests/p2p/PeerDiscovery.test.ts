import fs from 'fs'
import os from 'os'
import Polykey from "@polykey/Polykey"
import { randomString } from '@polykey/utils'
import KeyManager from '@polykey/keys/KeyManager'

// TODO expand tests as part of testing PR
describe('Peer Discovery', () => {
  let tempDir: string
  let pk: Polykey

	beforeAll(async () => {
		// Define temp directory
		tempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

		// Create keyManager
    const keyManager = new KeyManager()
    await keyManager.generateKeyPair('John Smith', 'john.smith@email.com', 'some passphrase', 128, true)

		// Initialize polykey
		pk = new Polykey(
			tempDir,
      keyManager
    )

	}, 40000)

	afterAll(() => {
    fs.rmdirSync(tempDir)
	})

	test('find a peer', async () => {
    // TODO: try to find a way to test this, currently its untestable because keybase login integration hasn't been completed
    await pk.peerManager.findSocialUser('robert-cronin', 'github')
  })

	test('find a user on github', async () => {
    // TODO: try to find a way to test this, currently its untestable because keybase login integration hasn't been completed
    await pk.peerManager.findSocialUser('robert-cronin', 'github')
  })


})
