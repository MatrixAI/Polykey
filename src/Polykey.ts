import os from 'os';
import fs from 'fs';
import HttpApi from './api/HttpApi';
import KeyManager from './keys/KeyManager';
import PeerManager from './peers/PeerManager';
import VaultManager from './vaults/VaultManager';
import PolykeyAgent from './agent/PolykeyAgent';
import PeerInfo, { Address } from './peers/PeerInfo';

class Polykey {
  polykeyPath: string;

  vaultManager: VaultManager;
  keyManager: KeyManager;
  peerManager: PeerManager;
  httpApi: HttpApi;

  constructor(
    polykeyPath: string = `${os.homedir()}/.polykey`,
    fileSystem: typeof fs,
    keyManager?: KeyManager,
    peerManager?: PeerManager,
    vaultManager?: VaultManager,
  ) {
    this.polykeyPath = polykeyPath;

    // Set key manager
    this.keyManager = keyManager ?? new KeyManager(this.polykeyPath, fileSystem);

    // Initialize peer store and peer discovery classes
    this.peerManager = peerManager ?? new PeerManager(this.polykeyPath, fileSystem, this.keyManager);

    // Set or Initialize vaultManager
    this.vaultManager =
      vaultManager ?? new VaultManager(this.polykeyPath, fileSystem, this.keyManager, this.peerManager);

    // start the api
    this.httpApi = new HttpApi(
      ((apiAddress: Address) => {
        this.peerManager.peerInfo.apiAddress = apiAddress;
      }).bind(this),
      ((csr: string) => this.keyManager.pki.handleCSR(csr)).bind(this),
      (() => this.keyManager.pki.RootCert).bind(this),
      (() => this.keyManager.pki.CertChain).bind(this),
      (() => this.keyManager.pki.createServerCredentials()).bind(this),
      (() => this.vaultManager.getVaultNames()).bind(this),
      ((vaultName: string) => this.vaultManager.newVault(vaultName)).bind(this),
      ((vaultName: string) => this.vaultManager.deleteVault(vaultName)).bind(this),
      ((vaultName: string) => {
        const vault = this.vaultManager.getVault(vaultName)
        return vault.listSecrets()
      }).bind(this),
      ((vaultName: string, secretName: string) => {
        const vault = this.vaultManager.getVault(vaultName)
        return vault.getSecret(secretName).toString()
      }).bind(this),
      (async (vaultName: string, secretName: string, secretContent: string) => {
        try {
          const vault = this.vaultManager.getVault(vaultName)
          await vault.addSecret(secretName, Buffer.from(secretContent))
          return true
        } catch (error) {
          return false
        }
      }).bind(this),
      (async (vaultName: string, secretName: string) => {
        try {
          const vault = this.vaultManager.getVault(vaultName)
          await vault.removeSecret(secretName)
          return true
        } catch (error) {
          return false
        }
      }).bind(this),
    );
  }
}

export default Polykey;
export { KeyManager, VaultManager, PeerManager, PolykeyAgent, PeerInfo, Address };
