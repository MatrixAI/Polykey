import GitRequest from './GitRequest';
import { promisifyGrpc } from '../bin/utils';
import * as peerInterface from '../../proto/js/Peer_pb';
import * as agentInterface from '../../proto/js/Agent_pb';
import PeerConnection from '../peers/peer-connection/PeerConnection';

/**
 * Responsible for converting HTTP messages from isomorphic-git into requests and sending them to a specific peer.
 */
class GitFrontend {
  private connectToPeer: (peerId: string) => PeerConnection;

  constructor(connectToPeer: (peerId: string) => PeerConnection) {
    this.connectToPeer = connectToPeer;
  }

  /**
   * Requests remote info from the connected peer for the named vault.
   * @param vaultName Name of the desired vault
   * @param peerConnection A connection object to the peer
   */
  private async requestInfo(vaultName: string, peerConnection: PeerConnection): Promise<Uint8Array> {
    const client = await peerConnection.getPeerClient();
    const request = new peerInterface.InfoRequest
    request.setVaultName(vaultName)
    const response = await promisifyGrpc(client.getGitInfo.bind(client))(request) as peerInterface.InfoReply
    return response.getBody_asU8();
  }

  /**
   * Requests a pack from the connected peer for the named vault.
   * @param vaultName Name of the desired vault
   * @param body Contains the pack request
   * @param peerConnection A connection object to the peer
   */
  private async requestPack(vaultName: string, body: Uint8Array, peerConnection: PeerConnection): Promise<Uint8Array> {
    const client = await peerConnection.getPeerClient();
    const request = new peerInterface.PackRequest
    request.setVaultName(vaultName)
    request.setBody(body)
    const response = await promisifyGrpc(client.getGitPack.bind(client))(request) as peerInterface.PackReply
    return response.getBody_asU8();
  }

  /**
   * Requests a pack from the connected peer for the named vault.
   * @param vaultName Name of the desired vault
   * @param body Contains the pack request
   * @param peerConnection A connection object to the peer
   */
  private async requestVaultNames(peerConnection: PeerConnection): Promise<string[]> {
    const client = await peerConnection.getPeerClient();
    const request = new agentInterface.EmptyMessage
    const response = await promisifyGrpc(client.getVaultNames.bind(client))(request) as peerInterface.VaultNamesReply
    return response.getVaultNameListList();
  }

  connectToPeerGit(peerId: string): GitRequest {
    const peerConnection = this.connectToPeer(peerId);
    const gitRequest = new GitRequest(
      ((vaultName: string) => this.requestInfo(vaultName, peerConnection)).bind(this),
      ((vaultName: string, body: Buffer) => this.requestPack(vaultName, body, peerConnection)).bind(this),
      (() => this.requestVaultNames(peerConnection)).bind(this),
    );
    return gitRequest;
  }
}

export default GitFrontend;
