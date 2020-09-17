import GitRequest from './GitRequest';
import { gitInterface } from '../../proto/js/Git';
import PeerManager from '../peers/PeerManager';
import PeerConnection from '../peers/peer-connection/PeerConnection';
import { SubServiceType } from '../../proto/compiled/Peer_pb';

/**
 * Responsible for converting HTTP messages from isomorphic-git into requests and sending them to a specific peer.
 */
class GitFrontend {
  private peerManager: PeerManager;

  constructor(peerManager: PeerManager) {
    this.peerManager = peerManager;
  }

  /**
   * Requests remote info from the connected peer for the named vault.
   * @param vaultName Name of the desired vault
   * @param peerConnection A connection object to the peer
   */
  private async requestInfo(vaultName: string, peerConnection: PeerConnection): Promise<Uint8Array> {
    const request = gitInterface.InfoRequest.encodeDelimited({ vaultName }).finish();
    const response = await peerConnection.sendPeerRequest(
      SubServiceType.GIT,
      gitInterface.GitMessage.encodeDelimited({ type: gitInterface.GitMessageType.INFO, subMessage: request }).finish(),
    );
    const { type, subMessage } = gitInterface.GitMessage.decodeDelimited(response);

    const { body: responseBody } = gitInterface.InfoReply.decodeDelimited(subMessage);

    return responseBody;
  }

  /**
   * Requests a pack from the connected peer for the named vault.
   * @param vaultName Name of the desired vault
   * @param body Contains the pack request
   * @param peerConnection A connection object to the peer
   */
  private async requestPack(vaultName: string, body: Uint8Array, peerConnection: PeerConnection): Promise<Uint8Array> {
    const request = gitInterface.PackRequest.encodeDelimited({ vaultName, body }).finish();
    const response = await peerConnection.sendPeerRequest(
      SubServiceType.GIT,
      gitInterface.GitMessage.encodeDelimited({ type: gitInterface.GitMessageType.PACK, subMessage: request }).finish(),
    );
    const { type, subMessage } = gitInterface.GitMessage.decodeDelimited(response);

    const { body: responseBody } = gitInterface.PackReply.decodeDelimited(subMessage);

    return responseBody;
  }

  /**
   * Requests a pack from the connected peer for the named vault.
   * @param vaultName Name of the desired vault
   * @param body Contains the pack request
   * @param peerConnection A connection object to the peer
   */
  private async requestVaultNames(peerConnection: PeerConnection): Promise<string[]> {
    const response = await peerConnection.sendPeerRequest(
      SubServiceType.GIT,
      gitInterface.GitMessage.encodeDelimited({
        type: gitInterface.GitMessageType.VAULT_NAMES,
        subMessage: Buffer.from(''),
      }).finish(),
    );
    const { type, subMessage } = gitInterface.GitMessage.decodeDelimited(response);

    const { vaultNameList } = gitInterface.VaultNamesReply.decodeDelimited(subMessage);

    return vaultNameList;
  }

  connectToPeerGit(publicKey: string): GitRequest {
    const peerConnection = this.peerManager.connectToPeer(publicKey);
    const gitRequest = new GitRequest(
      ((vaultName: string) => this.requestInfo(vaultName, peerConnection)).bind(this),
      ((vaultName: string, body: Buffer) => this.requestPack(vaultName, body, peerConnection)).bind(this),
      (() => this.requestVaultNames(peerConnection)).bind(this),
    );
    return gitRequest;
  }
}

export default GitFrontend;
