import fs from 'fs'
import os from 'os'
import KeyManager from '../src/lib/keys/KeyManager'
import Polykey from '../src/lib/Polykey'
import { randomString } from '../src/lib/utils'

async function main() {
  const tempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

  const km = new KeyManager(tempDir, fs)
  await km.generateKeyPair('Robert Cronin', 'robert.cronin@uqconnect.edu.au', 'passphrase', 1024, true)

  const pk = new Polykey(tempDir, fs, km)

  console.log(pk.peerManager.getLocalPeerInfo().connectedAddr);

}

main()
