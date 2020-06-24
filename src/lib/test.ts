import { randomString } from '@polykey/utils'
import KeyManager from '@polykey/keys/KeyManager'
import Polykey from '@polykey/Polykey'

async function main() {
  const fs = require('fs')
  const os = require('os')
  // Pk
  const tempDir: string = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)
  const km = new KeyManager(tempDir)
  console.log('hehe');

  await km.generateKeyPair('John Smith', 'john.smith@email.com', 'passphrase', 128, true)
  // Initialize polykey
  const pk = new Polykey(
    tempDir,
    km
  )
  const vm = pk.vaultManager

  // // Peer pk
  // const tempDirPeer = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)
  // const kmPeer = new KeyManager(tempDirPeer)
  // await kmPeer.generateKeyPair('John Smith', 'john.smith@email.com', 'passphrase', 128, true)
  // // Initialize polykey
  // const pkPeer = new Polykey(
  //   tempDirPeer,
  //   kmPeer
  // )
  // const vmPeer = pkPeer.vaultManager



  // // Create vault
  // const randomVaultName = 'Vault' + randomString()
  // const vault = await vm.createVault(randomVaultName)
  // // Add secret
  // const initialSecretName = 'ASecret'
  // const initialSecret = 'super confidential information'
  // await vault.addSecret(initialSecretName, Buffer.from(initialSecret))

  // // Pull from pk in peerPk
  // const pkAddress = pk.peerManager.getLocalPeerInfo().connectedAddr!
  // const getSocket = pkPeer.peerManager.connectToPeer.bind(pkPeer.peerManager)
  // const clonedVault = await vmPeer.cloneVault(randomVaultName, pkAddress, getSocket)

  // const pkSecret = vault.getSecret(initialSecretName).toString()

  // await clonedVault.pullVault(getSocket, pkAddress)

  // const peerPkSecret = clonedVault.getSecret(initialSecretName).toString()
  // console.log(pkSecret);
  // console.log(peerPkSecret);




  fs.rmdirSync(tempDir)
  // fs.rmdirSync(tempDirPeer)
}

main()
