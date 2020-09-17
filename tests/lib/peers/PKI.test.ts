import fs from 'fs'
import os from 'os'
import Polykey from '../../../src/Polykey'
import { sleep } from '../../../src/utils'
import { randomString } from '../../../src/utils'
import KeyManager from '../../../src/keys/KeyManager'

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
    await keyManagerA.generateKeyPair('John Smith', 'some passphrase', 1024, true)

    // Initialize polykey
    peerA = new Polykey(
      tempDirPeerA,
      fs,
      keyManagerA
    )
    while (!peerA.peerManager.peerServer.started) {
      await sleep(500)
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
