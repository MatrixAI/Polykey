import { Address, PeerInfoReadOnly } from '../PeerInfo';
import * as grpc from '@grpc/grpc-js';
import PeerManager from '../PeerManager';
import * as peer from '../../../proto/js/Peer_pb';
import * as agent from '../../../proto/js/Agent_pb';
import { PeerService, IPeerServer } from '../../../proto/js/Peer_grpc_pb';

class PeerServer implements IPeerServer {
  private peerManager: PeerManager;

  private server: grpc.Server;

  handleGitInfoRequest: (vaultName: string) => Promise<Uint8Array>;
  handleGitPackRequest: (vaultName: string, body: Buffer) => Promise<Uint8Array>;
  handleGetVaultNames: () => Promise<string[]>;

  constructor(peerManager: PeerManager) {
    this.peerManager = peerManager;

    /////////////////
    // GRPC Server //
    /////////////////
    this.server = new grpc.Server();
    this.server.addService(PeerService, (this as any) as grpc.UntypedServiceImplementation);
  }

  async start() {
    return new Promise<void>((resolve, reject) => {
      try {
        // get the server credentials
        const tlsServerCredentials = this.peerManager.pki.createServerCredentials()
        const credentials = grpc.ServerCredentials.createInsecure()
        // const credentials = grpc.ServerCredentials.createSsl(
        //   Buffer.from(tlsServerCredentials.rootCertificate),
        //   // this has to be key/cert pair signed by this peers CA cert for
        //   // the web of trust system to work because the client peer has
        //   // already trusted this peers CA cert when it creates the connection
        //   [
        //     {
        //       private_key: Buffer.from(tlsServerCredentials.keypair.private),
        //       cert_chain: Buffer.from(tlsServerCredentials.certificate),
        //     },
        //   ],
        //   false,
        // );
        // start the server
        const port = process.env.PK_PEER_PORT ?? this.peerManager.peerInfo?.peerAddress?.port ?? 0;
        const host = process.env.PK_PEER_HOST ?? this.peerManager.peerInfo?.peerAddress?.host ?? 'localhost';
        this.server.bindAsync(`${host}:${port}`, credentials, async (err, boundPort) => {
          if (err) {
            reject(err);
          } else {
            try {
              const address = new Address(host, boundPort);
              if (this.peerManager.peerInfo) {
                this.peerManager.peerInfo.peerAddress = address;
                this.peerManager.writeMetadata();
              }
              this.server.start();
              console.log(`Peer Server running on: ${address}`);
              resolve()
            } catch (error) {
              reject(error);
            }
          }
        });
      } catch (error) {
        reject(error)
      }
    })
  }

  async stop() {
    this.server.forceShutdown()
  }

  async pingPeer(
    call: grpc.ServerUnaryCall<peer.PingPeerMessage, peer.PingPeerMessage>,
    callback: grpc.sendUnaryData<peer.PingPeerMessage>,
  ) {
    try {
      callback(null, call.request);
    } catch (error) {
      callback(error, null);
    }
  }

  async getGitInfo(
    call: grpc.ServerUnaryCall<peer.InfoRequest, peer.InfoReply>,
    callback: grpc.sendUnaryData<peer.InfoReply>,
  ) {
    try {
      const { vaultName } = call.request!.toObject();
      const responseBody = await this.handleGitInfoRequest(vaultName)
      const response = new peer.InfoReply();
      response.setBody(responseBody)
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getGitPack(
    call: grpc.ServerUnaryCall<peer.PackRequest, peer.PackReply>,
    callback: grpc.sendUnaryData<peer.PackReply>,
  ) {
    try {
      const vaultName = call.request.getVaultName()
      const body = call.request.getBody_asU8()
      const responseBody = await this.handleGitPackRequest(vaultName, Buffer.from(body))
      const response = new peer.PackReply();
      response.setBody(responseBody)
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getVaultNames(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, peer.VaultNamesReply>,
    callback: grpc.sendUnaryData<peer.VaultNamesReply>,
  ) {
    try {
      const response = new peer.VaultNamesReply();
      response.setVaultNameListList(await this.handleGetVaultNames())
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getUDPAddress(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, agent.StringMessage>,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    try {
      const response = new agent.StringMessage();
      response.setS(this.peerManager.natTraversal.handleGetUDPAddress())
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async requestPublicRelay(
    call: grpc.ServerUnaryCall<peer.PublicRelayRequest, peer.PublicRelayReply>,
    callback: grpc.sendUnaryData<peer.PublicRelayReply>,
  ) {
    try {
      throw Error('not supported')
      // const { originPeerId, targetPeerId } = call.request!.toObject();
      // const response = new peer.PublicRelayReply();
      // const relayAddress = await this.peerManager.natTraversal.handlePublicRelayRequest(originPeerId, targetPeerId)
      // response.setRelayAddress(relayAddress)
      // callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getRootCertificate(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, agent.StringMessage>,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    try {
      const response = new agent.StringMessage();
      response.setS(this.peerManager.pki.RootCertificatePem)
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async requestCertificateSigning(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.StringMessage>,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    try {
      const { s } = call.request!.toObject();
      const response = new agent.StringMessage();
      const signedCertificate = this.peerManager.pki.handleCSR(s)
      response.setS(signedCertificate)
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async peerDHTFindNode(
    call: grpc.ServerUnaryCall<peer.PeerDHTFindNodeRequest, peer.PeerDHTFindNodeReply>,
    callback: grpc.sendUnaryData<peer.PeerDHTFindNodeReply>,
  ) {
    try {
      const { targetPeerId } = call.request!.toObject();
      const peerInfoList = this.peerManager.peerDHT.handleFindNodeMessage(targetPeerId)
      const response = new peer.PeerDHTFindNodeReply();
      response.setClosestPeersList(peerInfoList)
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async addPeerInfo(
    call: grpc.ServerUnaryCall<agent.PeerInfoReadOnlyMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    try {
      // only want to accept this if peer is a public relay node
      if (process.env.PUBLIC_RELAY_NODE) {
        try {
          const { pem, unsignedAlias, unsignedApiAddress, unsignedPeerAddress } = call.request!.toObject();
          const peerInfo = new PeerInfoReadOnly(pem)
          if (unsignedAlias) {
            peerInfo.alias = unsignedAlias
          }
          if (unsignedApiAddress) {
            peerInfo.apiAddress = Address.parse(unsignedApiAddress)
          }
          if (unsignedPeerAddress) {
            peerInfo.peerAddress = Address.parse(unsignedPeerAddress)
          }
          if (this.peerManager.hasPeer(peerInfo.id)) {
            this.peerManager.updatePeer(peerInfo)
          } else {
            this.peerManager.addPeer(peerInfo, peerInfo.alias)
          }
        } catch (error) {
          // no throw
        }
      }
      callback(null, new agent.EmptyMessage);
    } catch (error) {
      callback(error, null);
    }
  }
}

export default PeerServer;
