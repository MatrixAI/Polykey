// import os from 'os'
// import fs from 'fs'
// import { createModel } from '@xstate/test';
// import { Polykey, KeyManager } from '../../../src/Polykey'
// import VaultManager from '../../../src/vaults/VaultManager';
// import { vaultsMachine, VaultsStateSchema } from '../../../spec/vaults/Vaults.spec';
// import { randomString } from '../../../src/utils';

// async function createVaultManagerModel() {

//   // pk1
//   const tempDir1 = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)
//   const km1 = new KeyManager(tempDir1, fs)
//   await km1.generateKeyPair('km1', 'passphrase', true)
//   const pk1 = new Polykey(tempDir1, fs, km1)
//   // pk2
//   const tempDir2 = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)
//   const km2 = new KeyManager(tempDir2, fs)
//   await km2.generateKeyPair('km2', 'passphrase', true)
//   const pk2 = new Polykey(tempDir2, fs, km2)
//   await pk2.vaultManager.newVault(randomString())

//   // let each know about the other
//   pk2.peerManager.addPeer(pk1.peerManager.peerInfo)
//   pk1.peerManager.addPeer(pk2.peerManager.peerInfo)

//   const vaultManagerModel = createModel<VaultManager, VaultsStateSchema>(vaultsMachine).withEvents({
//     CREATE_VAULT: {
//       exec: async (vm: VaultManager) => {
//         // Do not await, must interrogate while service is running.
//         vm.newVault(randomString())
//       }
//     },
//     CLONE_VAULT: {
//       // Do not await, must interrogate while service is running.
//       exec: async (vm: VaultManager) => {
//         const vaultNames = pk2.vaultManager.getVaultNames()
//         vm.cloneVault(vaultNames[0], pk2.peerManager.peerInfo.id)
//       }
//     },
//     PULL_VAULT: {
//       // Do not await, must interrogate while service is running.
//       exec: async (vm: VaultManager) => {
//         const vaultNames = pk2.vaultManager.getVaultNames()
//         vm.pullVault(vaultNames[0], pk2.peerManager.peerInfo.id)
//       }
//     },
//     DELETE_VAULT: {
//       // Do not await, must interrogate while service is running.
//       exec: async (vm: VaultManager) => {
//         const vaultNames = vm.getVaultNames()
//         vm.deleteVault(vaultNames[0])
//       }
//     },
//     SUCCESS: {
//       exec: async (vm: VaultManager) => {
//         return
//       }
//     },
//     FAILURE: {
//       exec: async (vm: VaultManager) => {
//         return
//       }
//     }
//   });

//   return {vaultManagerModel, vm: pk1.vaultManager}
// }

// export { createVaultManagerModel };
