import os from 'os';
import fs from 'fs';
import HttpApi from './api/HttpApi';
import KeyManager from './keys/KeyManager';
import { LinkInfoIdentity } from './links';
import { promisifyGrpc } from './bin/utils';
import PeerManager from './peers/PeerManager';
import PolykeyAgent from './agent/PolykeyAgent';
import VaultManager from './vaults/VaultManager';
import GestaltGraph from './gestalts/GestaltGraph';
import GestaltTrust from './gestalts/GestaltTrust';
import { ProviderManager, ProviderTokens } from './social';
import { GitHubProvider } from './social/providers/github';
import { PeerInfo, PeerInfoReadOnly, Address } from './peers/PeerInfo';
(JSON as any).canonicalize = require('canonicalize');

class Polykey {
  polykeyPath: string;

  vaultManager: VaultManager;
  keyManager: KeyManager;
  peerManager: PeerManager;
  httpApi: HttpApi;
  providerManager: ProviderManager;
  gestaltGraph: GestaltGraph;
  gestaltTrust: GestaltTrust;

  constructor(
    polykeyPath = `${os.homedir()}/.polykey`,
    fileSystem: typeof fs,
    keyManager?: KeyManager,
    peerManager?: PeerManager,
    vaultManager?: VaultManager,
  ) {
    this.polykeyPath = polykeyPath;

    // Set key manager
    this.keyManager =
      keyManager ?? new KeyManager(this.polykeyPath, fileSystem);

    // Initialize peer store and peer discovery classes
    this.peerManager =
      peerManager ??
      new PeerManager(this.polykeyPath, fileSystem, this.keyManager);

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
      ((vaultName: string) => this.vaultManager.deleteVault(vaultName)).bind(
        this,
      ),
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

    ////////////
    // Social //
    ////////////
    // TODO: this stuff is still just a WIP, so need to fix any hardcoded values after demo
    this.providerManager = new ProviderManager([
      new GitHubProvider(
        new ProviderTokens(this.polykeyPath, 'github.com'),
        'ca5c4c520da868387c52',
      ),
    ]);

    this.gestaltTrust = new GestaltTrust();
    this.gestaltGraph = new GestaltGraph(
      this.gestaltTrust,
      this.peerManager,
      this.providerManager,
      this.peerManager.verifyLinkClaim.bind(this.peerManager),
    );
  }

  // helper methods
  async loadGestaltGraph() {
    try {
      // get own username
      const gitHubProvider = this.providerManager.getProvider('github.com');
      const identityKey = await gitHubProvider.getIdentityKey();
      // get identity details
      const identityInfo = await gitHubProvider.getIdentityInfo(identityKey);
      // set initials on the gestalt graph
      this.gestaltGraph.setNode({ id: this.peerManager.peerInfo.id });
      const linkInfoList = this.peerManager.peerInfo.linkInfoList;
      const linkInfo = linkInfoList.length != 0 ? linkInfoList[0] : undefined;
      if (identityInfo && linkInfo) {
        console.log('setting gestalt graph');
        this.gestaltGraph.setLinkIdentity(
          linkInfo as LinkInfoIdentity,
          { id: this.peerManager.peerInfo.id },
          identityInfo,
        );
        console.log('gestalt graph has been loaded');
      } else {
        console.log(
          'gestalt could not be loaded because either identityInfo or linkInfo was undefined',
        );
        console.log('identityInfo: ', identityInfo);
        console.log('linkInfo: ', linkInfo);
      }
    } catch (error) {
      // no throw
      console.log(error);
    }
  }
  async startAllServices() {
    this.loadGestaltGraph();
    await this.peerManager.start();
    await this.httpApi.start();
  }
  async stopAllServices() {
    await this.peerManager.stop();
    await this.httpApi.stop();
  }
}

export default Polykey;
export {
  KeyManager,
  VaultManager,
  PeerManager,
  PeerInfo,
  PeerInfoReadOnly,
  PolykeyAgent,
  Address,
  promisifyGrpc,
};
