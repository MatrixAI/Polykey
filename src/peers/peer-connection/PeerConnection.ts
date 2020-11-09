import PeerInfo, { Address } from '../PeerInfo';
import { randomBytes } from 'crypto';
import * as grpc from '@grpc/grpc-js';
import KeyManager from '../../keys/KeyManager';
import { PeerClient } from '../../../proto/compiled/Peer_grpc_pb';
import { stringToProtobuf, protobufToString, promiseAny } from '../../utils';
import { PeerMessage, SubServiceType } from '../../../proto/compiled/Peer_pb';

class PeerConnection {
  private peerId: string;
  private keyManager: KeyManager;
  private getPeerInfo: () => PeerInfo;
  private getPeer: (id: string) => PeerInfo | null;
  private findPeerDHT: (
    peerId: string,
  ) => Promise<{ adjacentPeerInfo?: PeerInfo | undefined; targetPeerInfo?: PeerInfo | undefined }>;
  private requestUDPHolePunchViaPeer: (
    targetPeerId: string,
    adjacentPeerId: string,
    timeout?: number | undefined,
  ) => Promise<Address>;
  private requestUDPHolePunchDirectly: (targetPeerId: string, timeout?: number | undefined) => Promise<Address>

  private peerClient: PeerClient;
  private connected: boolean = false;
  private credentials: grpc.ChannelCredentials;

  constructor(
    peerId: string,
    keyManager: KeyManager,
    getLocalPeerInfo: () => PeerInfo,
    getPeer: (id: string) => PeerInfo | null,
    findPeerDHT: (
      peerId: string,
    ) => Promise<{
      adjacentPeerInfo?: PeerInfo | undefined;
      targetPeerInfo?: PeerInfo | undefined;
    }>,
    requestUDPHolePunchDirectly: (targetPeerId: string, timeout?: number) => Promise<Address>,
    requestUDPHolePunchViaPeer: (targetPeerId: string, adjacentPeerId: string, timeout?: number) => Promise<Address>,
  ) {
    this.peerId = peerId;
    this.keyManager = keyManager;
    this.getPeerInfo = getLocalPeerInfo;
    this.getPeer = getPeer;
    this.findPeerDHT = findPeerDHT;
    this.requestUDPHolePunchViaPeer = requestUDPHolePunchViaPeer;
    this.requestUDPHolePunchDirectly = requestUDPHolePunchDirectly;

    const credentials = this.keyManager.pki.TLSClientCredentials;
    const peerInfo = this.getPeer(peerId);
    this.credentials = grpc.ChannelCredentials.createInsecure();
    // this.credentials = grpc.ChannelCredentials.createSsl(
    //   Buffer.from(peerInfo!.rootCertificate),
    //   Buffer.from(credentials.keypair.private),
    //   Buffer.from(credentials.certificate),
    // );
  }

  // 1st connection option: peerInfo already in peerStore and peerAddress is connected
  private async connectDirectly(): Promise<PeerClient> {
    // try to create a direct connection
    if (this.getPeer(this.peerId)!.peerAddress) {
      // direct connection attempt
      const address = this.getPeer(this.peerId)!.peerAddress!;
      const peerClient = new PeerClient(address.toString(), this.credentials);
      this.connected = true;
      return peerClient;
    } else {
      throw Error('peer does not have a connected address');
    }
  }

  // 2nd connection option: kademlia dht
  private async connectDHT(): Promise<PeerClient> {
    // try to find peer directly from intermediary peers
    const { targetPeerInfo, adjacentPeerInfo } = await this.findPeerDHT(this.getPeer(this.peerId)!.id);
    // const { targetPeerInfo, adjacentPeerInfo } = await this.peerManager..findPeer(this.getPeer(this.peerId)!.id);
    if (targetPeerInfo?.peerAddress) {
      try {
        // case 1: target peer has been found and has a peerAddress
        const address = targetPeerInfo.peerAddress;
        const peerClient = new PeerClient(address.toString(), this.credentials);
        this.connected = true;
        return peerClient;
      } catch (error) {
        // don't want to throw, just try next method
      }
    }

    if (adjacentPeerInfo?.peerAddress) {
      // case 2: target peer has an adjacent peer that can be contacted for nat traversal
      const promiseList = [
        this.connectHolePunchDirectly(),
        this.connectHolePunchViaPeer(adjacentPeerInfo),
        this.connectRelay(adjacentPeerInfo)
      ];
      const client = await promiseAny(promiseList);
      return client;
    }
    throw Error('could not find peer via dht');
  }

  // 3rd connection option: hole punch directly to the target peer
  // (will only work if a direct hole punch connection already exists)
  // triggered by 2nd option
  private async connectHolePunchDirectly(): Promise<PeerClient> {
    // try to hole punch directly to peer via already udp-holepunched connection (if it exists)
    if (!this.connected) {
      // connect to relay and ask it to create a relay
      const connectedAddress = await this.requestUDPHolePunchDirectly(
        this.getPeer(this.peerId)!.id,
        10000,
      );
      const peerClient = new PeerClient(connectedAddress.toString(), this.credentials);

      this.connected = true;
      return peerClient;
    } else {
      throw Error('peer is already connected');
    }
  }

  // 4th connection option: hole punch facilitated by a peer adjacent (i.e. connected) to the target peer
  // triggered by 2nd option
  private async connectHolePunchViaPeer(adjacentPeerInfo: PeerInfo): Promise<PeerClient> {
    // try to hole punch to peer via relay peer
    if (adjacentPeerInfo.peerAddress && !this.connected) {
      // connect to relay and ask it to create a relay
      const connectedAddress = await this.requestUDPHolePunchViaPeer(
        this.getPeer(this.peerId)!.id,
        adjacentPeerInfo.id,
        10000,
      );
      const peerClient = new PeerClient(connectedAddress.toString(), this.credentials);

      this.connected = true;
      return peerClient;
    } else {
      throw Error('peer is already connected');
    }
  }

  // 5th connection option: relay connection facilitated by a peer adjacent (i.e. connected) to the target peer
  // triggered by 2nd option
  private async connectRelay(adjacentPeerInfo: PeerInfo): Promise<PeerClient> {
    // try to hole punch to peer via relay peer
    if (adjacentPeerInfo.peerAddress && !this.connected) {
      // connect to relay and ask it to create a relay
      const connectedAddress = await this.requestUDPHolePunchViaPeer(
        this.getPeer(this.peerId)!.id,
        adjacentPeerInfo.id,
        10000,
      );
      const peerClient = new PeerClient(connectedAddress.toString(), this.credentials);

      this.connected = true;
      return peerClient;
    } else {
      throw Error('peer is already connected');
    }
  }

  async connectFirstChannel() {
    if (!this.connected) {
      const promiseList = [this.connectDirectly(), this.connectDHT()];
      return await promiseAny(promiseList);
    }
    throw Error('peer is already connected!');
  }

  private async connect(): Promise<void> {
    // connect if not already connected
    if (!this.connected) {
      try {
        this.peerClient = await this.connectFirstChannel();
      } catch (error) {
        console.log(error);
      }
    }

    // try a ping
    if (this.connected && (await this.sendPingRequest(5000))) {
      return;
    } else {
      this.connected = false;
      // still not connected
      throw Error('could not connect to peer');
    }
  }

  private async sendPingRequest(timeout?: number, directConnectionOnly: boolean = false): Promise<boolean> {
    // eslint-disable-next-line
    return await new Promise<boolean>(async (resolve, _) => {
      try {
        if (timeout) {
          setTimeout(() => resolve(false), timeout);
        }

        const challenge = randomBytes(16).toString('base64');

        // encode request
        const peerRequest = await this.encodeRequest(SubServiceType.PING_PEER, stringToProtobuf(challenge));

        let peerClient: PeerClient;
        if (directConnectionOnly) {
          peerClient = await this.connectDirectly();
        } else {
          peerClient = this.peerClient;
        }

        // send request
        peerClient.messagePeer(peerRequest, async (error, peerResponse) => {
          if (error) {
            console.log(error);
            resolve(false);
          } else {
            // decode response
            const { type: responseType, response } = await this.decodeResponse(peerResponse);
            const challengeResponse = protobufToString(response);
            resolve(challenge == challengeResponse);
          }
        });
      } catch (error) {
        console.log(error);
        resolve(false);
      }
    });
  }

  async pingPeer(timeout?: number): Promise<boolean> {
    // connect to peer
    await this.connect();
    // send ping request
    return await this.sendPingRequest(timeout);
  }

  async sendPeerRequest(type: SubServiceType, request: Uint8Array): Promise<Uint8Array> {
    // connect to peer
    await this.connect();

    // encode request
    const peerRequest = await this.encodeRequest(type, request);

    const peerResponse = await new Promise<PeerMessage>((resolve, reject) => {
      this.peerClient.messagePeer(peerRequest, (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    });

    // decode response
    const { type: responseType, response } = await this.decodeResponse(peerResponse);

    // return response
    return response;
  }

  // ======== Helper Methods ======== //

  private async encodeRequest(type: SubServiceType, request: Uint8Array): Promise<PeerMessage> {
    // encrypt message
    const requestString = protobufToString(request);
    const encryptedMessage = await this.keyManager.encryptData(
      Buffer.from(requestString),
      Buffer.from(this.getPeer(this.peerId)!.publicKey),
    );
    // sign message
    const signedMessage = await this.keyManager.signData(encryptedMessage);
    const subMessage = signedMessage.toString();

    // encode and send message
    const peerRequest = new PeerMessage();
    peerRequest.setPublicKey(this.getPeerInfo().publicKey);
    peerRequest.setType(type);
    peerRequest.setSubMessage(subMessage);
    return peerRequest;
  }

  private async decodeResponse(response: PeerMessage): Promise<{ type: SubServiceType; response: Uint8Array }> {
    const { publicKey, type: responseType, subMessage } = response.toObject();
    // decode peerResponse
    if (PeerInfo.formatPublicKey(this.getPeer(this.peerId)!.publicKey) != PeerInfo.formatPublicKey(publicKey)) {
      // drop packet
      throw Error('response public key does not match request public key');
    }

    // verify response
    const verifiedResponse = await this.keyManager.verifyData(Buffer.from(subMessage), Buffer.from(publicKey));
    // decrypt response
    const decryptedResponse = await this.keyManager.decryptData(verifiedResponse);
    const responseBuffer = stringToProtobuf(decryptedResponse.toString());

    return { type: responseType, response: responseBuffer };
  }
}

export default PeerConnection;
