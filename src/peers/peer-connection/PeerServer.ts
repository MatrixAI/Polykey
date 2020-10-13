import { Address } from '../PeerInfo';
import * as grpc from '@grpc/grpc-js';
import PeerManager from '../PeerManager';
import TurnServer from '../turn/TurnServer';
import KeyManager from '../../keys/KeyManager';
import { stringToProtobuf, protobufToString } from '../../utils';
import { PeerService, IPeerServer } from '../../../proto/compiled/Peer_grpc_pb';
import { PeerMessage, SubServiceType } from '../../../proto/compiled/Peer_pb';

class PeerServer implements IPeerServer {
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
    this.server.addService(PeerService, <grpc.UntypedServiceImplementation>(<any>this));

    // Create the server credentials. SSL only if ca cert exists
    const credentials = this.keyManager.pki?.TLSServerCredentials;
    if (credentials) {
      this.credentials = grpc.ServerCredentials.createSsl(
        Buffer.from(credentials.rootCertificate),
        [
          {
            private_key: Buffer.from(credentials.keypair.private),
            cert_chain: Buffer.from(credentials.certificate),
          },
        ],
        true,
      );
    } else {
      this.credentials = grpc.ServerCredentials.createInsecure();
    }

    const port = process.env.PK_PEER_PORT ?? this.peerManager.peerInfo?.peerAddress?.port ?? 0;
    const host = process.env.PK_PEER_HOST ?? this.peerManager.peerInfo?.peerAddress?.host ?? 'localhost';
    this.server.bindAsync(`${host}:${port}`, this.credentials, async (err, boundPort) => {
      if (err) {
        throw err;
      } else {
        const address = new Address(host, boundPort);
        this.server.start();
        if (this.peerManager.peerInfo) {
          this.peerManager.peerInfo.peerAddress = address;
        }
        console.log(`Peer Server running on: ${address}`);
        this.started = true;
        this.turnServer = new TurnServer(this.peerManager);
      }
    });
  }

  async messagePeer(call: grpc.ServerUnaryCall<PeerMessage, PeerMessage>, callback: grpc.sendUnaryData<PeerMessage>) {
    const peerRequest: PeerMessage = call.request!;

    const { publicKey, type, subMessage: requestMessage } = peerRequest.toObject();

    // if we don't know publicKey, end connection
    if (!this.peerManager.hasPeer(publicKey)) {
      throw Error('unknown public key');
    }

    // verify and decrypt request
    const verifiedMessage = await this.keyManager.verifyData(Buffer.from(requestMessage), Buffer.from(publicKey));
    const decryptedMessage = await this.keyManager.decryptData(verifiedMessage);
    const request = stringToProtobuf(decryptedMessage.toString());

    let response: Uint8Array;
    switch (type) {
      case SubServiceType.PING_PEER:
        response = await this.handlePing(request);
        break;
      case SubServiceType.GIT:
        response = await this.handleGitRequest(request, publicKey);
        break;
      case SubServiceType.NAT_TRAVERSAL:
        response = await this.handleNatRequest(request);
        break;
      case SubServiceType.CERTIFICATE_AUTHORITY:
        response = await this.keyManager.pki.handleGRPCRequest(request)
        break;
      default:
        throw Error('peer message type not identified');
    }

    // encrypt and sign response
    const encryptedResponse = await this.keyManager.encryptData(
      Buffer.from(protobufToString(response)),
      Buffer.from(publicKey),
    );
    const signedResponse = await this.keyManager.signData(encryptedResponse);
    const subMessage = signedResponse.toString();

    // composes peer message
    const peerResponse = new PeerMessage();
    peerResponse.setPublicKey(this.peerManager.peerInfo.publicKey);
    peerResponse.setType(type);
    peerResponse.setSubMessage(subMessage);

    // return peer response
    callback(null, peerResponse);
  }

  private async handlePing(request: Uint8Array): Promise<Uint8Array> {
    const challenge = Buffer.from(request).toString();
    return request;
  }
}

export default PeerServer;
