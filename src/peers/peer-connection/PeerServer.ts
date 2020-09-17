import { Address } from '../PeerInfo';
import * as grpc from '@grpc/grpc-js';
import PeerManager from '../PeerManager';
import TurnServer from '../turn/TurnServer';
import KeyManager from '../../keys/KeyManager';
import { stringToProtobuf, protobufToString } from '../../utils';
import { PeerService } from '../../../proto/compiled/Peer_grpc_pb';
import { PeerMessage, SubServiceType } from '../../../proto/compiled/Peer_pb';

class PeerServer {
  private peerManager: PeerManager;
  private keyManager: KeyManager;

  private server: grpc.Server;
  private credentials: grpc.ServerCredentials;
  private turnServer: TurnServer;
  started: boolean = false;

  handleGitRequest: (request: Uint8Array, publicKey: string) => Promise<Uint8Array>;
  handleNatRequest: (request: Uint8Array) => Promise<Uint8Array>;

  constructor(peerManager: PeerManager, keyManager: KeyManager) {
    this.peerManager = peerManager;
    this.keyManager = keyManager;

    /////////////////
    // GRPC Server //
    /////////////////
    this.server = new grpc.Server();
    this.server.addService(PeerService, {
      messagePeer: this.messagePeer.bind(this),
    });

    // Create the server credentials. SSL only if ca cert exists
    const pkiInfo = this.keyManager.PKIInfo;

    if (pkiInfo.caCert && pkiInfo.cert && pkiInfo.key) {
      this.credentials = grpc.ServerCredentials.createSsl(
        pkiInfo.caCert,
        [
          {
            private_key: pkiInfo.key,
            cert_chain: pkiInfo.cert,
          },
        ],
        true,
      );
    } else {
      this.credentials = grpc.ServerCredentials.createInsecure();
    }

    const port = process.env.PK_PORT ?? this.peerManager.peerInfo.peerAddress?.port ?? 0;
    this.server.bindAsync(`0.0.0.0:${port}`, this.credentials, async (err, boundPort) => {
      if (err) {
        throw err;
      } else {
        const address = new Address('0.0.0.0', boundPort);
        this.server.start();
        this.peerManager.peerInfo.peerAddress = address;
        console.log(`Peer Server running on: ${address}`);
        this.started = true;
        this.turnServer = new TurnServer(this.peerManager);
      }
    });
  }

  private async messagePeer(call, callback) {
    const peerRequest: PeerMessage = call.request;

    const { publickey: publickey, type, submessage } = peerRequest.toObject();

    // if we don't know publicKey, end connection
    if (!this.peerManager.hasPeer(publickey)) {
      throw Error('unknown public key');
    }

    // verify and decrypt request
    const verifiedMessage = await this.keyManager.verifyData(Buffer.from(submessage), Buffer.from(publickey));
    const decryptedMessage = await this.keyManager.decryptData(verifiedMessage);
    const request = stringToProtobuf(decryptedMessage.toString());

    let response: Uint8Array;
    switch (type) {
      case SubServiceType.PING_PEER:
        response = await this.handlePing(request);
        break;
      case SubServiceType.GIT:
        response = await this.handleGitRequest(request, publickey);
        break;
      case SubServiceType.NAT_TRAVERSAL:
        response = await this.handleNatRequest(request);
        break;
      default:
        throw Error('peer message type not identified');
    }

    // encrypt and sign response
    const encryptedResponse = await this.keyManager.encryptData(
      Buffer.from(protobufToString(response)),
      Buffer.from(publickey),
    );
    const signedResponse = await this.keyManager.signData(encryptedResponse);
    const subMessage = signedResponse.toString();

    // composes peer message
    const peerResponse = new PeerMessage();
    peerResponse.setPublickey(this.peerManager.peerInfo.publicKey);
    peerResponse.setType(type);
    peerResponse.setSubmessage(subMessage);

    // return peer response
    callback(null, peerResponse);
  }

  private async handlePing(request: Uint8Array): Promise<Uint8Array> {
    const challenge = Buffer.from(request).toString();
    return request;
  }
}

export default PeerServer;
