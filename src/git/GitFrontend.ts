import GitRequest from './GitRequest';
import * as gitInterface from '../proto/js/Git_pb';
import { SubServiceType } from '../proto/js/Peer_pb';
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
    const subRequest = new gitInterface.InfoRequest
    subRequest.setVaultname(vaultName)
    const request = new gitInterface.GitMessage
    request.setType(gitInterface.GitMessageType.INFO)
    request.setSubmessage(subRequest.serializeBinary())
    const response = await peerConnection.sendPeerRequest(
      SubServiceType.GIT,
      request.serializeBinary()
    );
    const decodedResponse = gitInterface.GitMessage.deserializeBinary(response)
    const type = decodedResponse.getType()
    const subMessage = decodedResponse.getSubmessage_asU8()

    const responseBody = gitInterface.InfoReply.deserializeBinary(subMessage)

    return responseBody.getBody_asU8();
  }

  /**
   * Requests a pack from the connected peer for the named vault.
   * @param vaultName Name of the desired vault
   * @param body Contains the pack request
   * @param peerConnection A connection object to the peer
   */
  private async requestPack(vaultName: string, body: Uint8Array, peerConnection: PeerConnection): Promise<Uint8Array> {
    const subRequest = new gitInterface.PackRequest

    subRequest.setVaultname(vaultName)
    subRequest.setBody(body)
    const request = new gitInterface.GitMessage
    request.setType(gitInterface.GitMessageType.PACK)
    request.setSubmessage(subRequest.serializeBinary())

    const response = await peerConnection.sendPeerRequest(
      SubServiceType.GIT,
      request.serializeBinary(),
    );
    const decodedResponse = gitInterface.GitMessage.deserializeBinary(response)
    const subMessage = decodedResponse.getSubmessage_asU8()
    const decodedSubResponse = gitInterface.PackReply.deserializeBinary(subMessage)
    const responseBody = decodedSubResponse.getBody_asU8()

    return responseBody;
  }

  /**
   * Requests a pack from the connected peer for the named vault.
   * @param vaultName Name of the desired vault
   * @param body Contains the pack request
   * @param peerConnection A connection object to the peer
   */
  private async requestVaultNames(peerConnection: PeerConnection): Promise<string[]> {
    const request = new gitInterface.GitMessage
    request.setType(gitInterface.GitMessageType.VAULT_NAMES)
    request.setSubmessage(Buffer.from(''))
    const response = await peerConnection.sendPeerRequest(
      SubServiceType.GIT,
      request.serializeBinary()
    );

    const decodedResponse = gitInterface.GitMessage.deserializeBinary(response)
    const subMessage = decodedResponse.getSubmessage_asU8()

    const { vaultNameListList } = gitInterface.VaultNamesReply.deserializeBinary(subMessage).toObject();

    return vaultNameListList;
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
