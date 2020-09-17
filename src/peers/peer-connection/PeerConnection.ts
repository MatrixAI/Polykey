import PeerInfo from '../PeerInfo';
import { randomBytes } from 'crypto';
import * as grpc from '@grpc/grpc-js';
import PeerManager from '../PeerManager';
import TurnClient from '../turn/TurnClient';
import KeyManager from '../../keys/KeyManager';
import { stringToProtobuf, protobufToString, promiseAny } from '../../utils';
import { PeerClient } from '../../../proto/compiled/Peer_grpc_pb';
import { PeerMessage, SubServiceType } from '../../../proto/compiled/Peer_pb';

class PeerConnection {
  private publicKey: string;
  private keyManager: KeyManager;
  private peerManager: PeerManager;

  private peerClient: PeerClient;
  private connected: boolean = false;
  private credentials: grpc.ChannelCredentials;

  constructor(publicKey: string, keyManager: KeyManager, peerManager: PeerManager) {
    this.publicKey = publicKey;
    this.keyManager = keyManager;
    this.peerManager = peerManager;

    const pkiInfo = keyManager.PKIInfo;
    if (pkiInfo.caCert && pkiInfo.cert && pkiInfo.key) {
      this.credentials = grpc.credentials.createSsl(pkiInfo.caCert, pkiInfo.key, pkiInfo.cert);
    } else {
      this.credentials = grpc.credentials.createInsecure();
    }
  }

  private async connectDirectly(): Promise<PeerClient> {
    // try to create a direct connection
    if (this.getPeerInfo().peerAddress) {
      // direct connection attempt
      const address = this.getPeerInfo().peerAddress!;
      const peerClient = new PeerClient(address.toString(), this.credentials);
      this.connected = true;
      return peerClient;
    } else if (!this.getPeerInfo().peerAddress) {
      throw Error('peer does not have a connected address');
    } else {
      throw Error('peer is already connected');
    }
  }

  private async connectHolePunch(): Promise<PeerClient> {
    // try to hole punch to peer via relay peer
    if (!this.connected && this.getPeerInfo().relayPublicKey) {
      // connect to relay and ask it to create a relay
      console.log('requesting udp hole punch connection');
      const connectedAddress = await this.peerManager.turnClient.requestHolePunchConnection(
        this.getPeerInfo().relayPublicKey!,
        this.getPeerInfo().publicKey,
      );
      const peerClient = new PeerClient(connectedAddress.toString(), this.credentials);

      this.connected = true;
      return peerClient;
    } else if (!this.getPeerInfo().relayPublicKey) {
      throw Error('peer does not have relay public key specified');
    } else {
      throw Error('peer is already connected');
    }
  }

  private async connectRelay(): Promise<PeerClient> {
    // try to relay to peer via relay peer
    if (!this.connected && this.getPeerInfo().relayPublicKey) {
      // turn relay
      // connect to relay and ask it to create a relay
      const connectedAddress = await this.peerManager.turnClient.requestPeerConnection(
        this.getPeerInfo().publicKey,
        this.getPeerInfo().relayPublicKey!,
      );
      const peerClient = new PeerClient(connectedAddress.toString(), this.credentials);
      this.connected = true;
      return peerClient;
    } else if (!this.getPeerInfo().relayPublicKey) {
      throw Error('peer does not have relay public key specified');
    } else {
      throw Error('peer is already connected');
    }
  }

  private async connect(): Promise<void> {
    // connect if not already connected
    if (!this.connected) {
      try {
        this.peerClient = await promiseAny([this.connectDirectly(), this.connectHolePunch(), this.connectRelay()]);
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

  private getPeerInfo() {
    if (!this.peerManager.hasPeer(this.publicKey)) {
      throw Error('peer does not exist in peer store');
    }
    return this.peerManager.getPeer(this.publicKey)!;
  }

  private async sendPingRequest(timeout?: number): Promise<boolean> {
    // eslint-disable-next-line
    return await new Promise<boolean>(async (resolve, reject) => {
      try {
        if (timeout) {
          setTimeout(() => reject('ping timed out'), timeout);
        }

        const challenge = randomBytes(16).toString('base64');

        // encode request
        const peerRequest = await this.encodeRequest(SubServiceType.PING_PEER, stringToProtobuf(challenge));

        // send request
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
        const challengeResponse = protobufToString(response);

        resolve(challenge == challengeResponse);
      } catch (error) {
        reject(error);
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
    const encryptedMessage = await this.keyManager.encryptData(Buffer.from(requestString), Buffer.from(this.publicKey));
    // sign message
    const signedMessage = await this.keyManager.signData(encryptedMessage);
    const subMessage = signedMessage.toString();

    // encode and send message
    const peerRequest = new PeerMessage();
    peerRequest.setPublickey(this.peerManager.peerInfo.publicKey);
    peerRequest.setType(type);
    peerRequest.setSubmessage(subMessage);
    return peerRequest;
  }

  private async decodeResponse(response: PeerMessage): Promise<{ type: SubServiceType; response: Uint8Array }> {
    const { publickey, type: responseType, submessage } = response.toObject();
    // decode peerResponse
    if (PeerInfo.formatPublicKey(this.getPeerInfo().publicKey) != PeerInfo.formatPublicKey(publickey)) {
      // drop packet
      throw Error('response public key does not match request public key');
    }

    // verify response
    const verifiedResponse = await this.keyManager.verifyData(Buffer.from(submessage), Buffer.from(publickey));
    // decrypt response
    const decryptedResponse = await this.keyManager.decryptData(verifiedResponse);
    const responseBuffer = stringToProtobuf(decryptedResponse.toString());

    return { type: responseType, response: responseBuffer };
  }
}

export default PeerConnection;
