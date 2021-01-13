import os from 'os';
import fs from 'fs';
import HttpApi from './api/HttpApi';
import KeyManager from './keys/KeyManager';
import PeerManager from './peers/PeerManager';
import VaultManager from './vaults/VaultManager';
import PolykeyAgent from './agent/PolykeyAgent';
import { promisifyGrpc } from './bin/utils';
import { PeerInfo, PeerInfoReadOnly, Address } from './peers/PeerInfo';

class Polykey {
  polykeyPath: string;

  vaultManager: VaultManager;
  keyManager: KeyManager;
  peerManager: PeerManager;
  httpApi: HttpApi;

  constructor(
    polykeyPath = `${os.homedir()}/.polykey`,
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
      vaultManager ??
      new VaultManager(
        this.polykeyPath,
        fileSystem,
        this.keyManager,
        this.peerManager.connectToPeer.bind(this.peerManager),
        this.peerManager.setGitHandlers.bind(this.peerManager),
      );

    // start the api
    this.httpApi = new HttpApi(
      ((apiAddress: Address) => {
        this.peerManager.peerInfo.apiAddress = apiAddress;
      }).bind(this),
      this.peerManager.pki.handleCSR.bind(this.peerManager.pki),
      (() => this.peerManager.pki.RootCertificatePem).bind(this),
      (() => this.peerManager.pki.CertChain).bind(this),
      this.peerManager.pki.createServerCredentials.bind(this.peerManager.pki),
      this.vaultManager.getVaultNames.bind(this.vaultManager),
      ((vaultName: string) => this.vaultManager.newVault(vaultName)).bind(this),
      ((vaultName: string) => this.vaultManager.deleteVault(vaultName)).bind(this),
      ((vaultName: string) => {
        const vault = this.vaultManager.getVault(vaultName);
        return vault.listSecrets();
      }).bind(this),
      ((vaultName: string, secretName: string) => {
        const vault = this.vaultManager.getVault(vaultName);
        return vault.getSecret.bind(vault)(secretName);
      }).bind(this),
      (async (vaultName: string, secretName: string, secretContent: Buffer) => {
        const vault = this.vaultManager.getVault(vaultName);
        await vault.addSecret(secretName, secretContent);
      }).bind(this),
      (async (vaultName: string, secretName: string) => {
        const vault = this.vaultManager.getVault(vaultName);
        await vault.deleteSecret(secretName);
      }).bind(this),
    );
  }

  // helper methods
  async startAllServices() {
    await this.peerManager.start()
    await this.httpApi.start()
  }
  async stopAllServices() {
    await this.peerManager.stop()
    await this.httpApi.stop()
  }
}

export default Polykey
export {
  KeyManager,
  VaultManager,
  PeerManager,
  PeerInfo,
  PeerInfoReadOnly,
  PolykeyAgent,
  Address,
  promisifyGrpc
};
