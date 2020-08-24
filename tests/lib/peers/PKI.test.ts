import fs from 'fs'
import os from 'os'
import Polykey from "../../../src/lib/Polykey"
import { randomString } from '../../../src/lib/utils'
import KeyManager from '../../../src/lib/keys/KeyManager'

// TODO: part of adding PKI functionality to polykey
describe('PKI', () => {
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
  })

  afterAll(() => {
    fs.rmdirSync(tempDirPeerA, { recursive: true })
    fs.rmdirSync(tempDirPeerB, { recursive: true })
  })

  describe('Peer Connections', () => {
    test('can connect securely to another peer and send data back and forth', async done => {
      done()
    })
  })
})
