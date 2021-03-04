import * as grpc from '@grpc/grpc-js';
import Logger from '@matrixai/logger';
import NodeManager from '../NodeManager';
import * as node from '../../../proto/js/Node_pb';
import * as agent from '../../../proto/js/Agent_pb';
import NodeNotifications from '../NodeNotifications';
import { Address, NodePeer } from '../Node';
import { NodeService, INodeServer } from '../../../proto/js/Node_grpc_pb';

class NodeServer implements INodeServer {
  private nodeManager: NodeManager;
  private logger: Logger;
  private nodeNotification: NodeNotifications;
  private server: grpc.Server;

  handleGitInfoRequest: (vaultName: string) => Promise<Uint8Array>;
  handleGitPackRequest: (
    vaultName: string,
    body: Buffer,
  ) => Promise<Uint8Array>;
  handleGetVaultNames: () => Promise<string[]>;

  constructor(
    nodeManager: NodeManager,
    nodeNotification: NodeNotifications,
    logger: Logger,
  ) {
    this.nodeManager = nodeManager;
    this.nodeNotification = nodeNotification;
    this.logger = logger;

    /////////////////
    // GRPC Server //
    /////////////////
    this.server = new grpc.Server();
    this.server.addService(
      NodeService,
      (this as any) as grpc.UntypedServiceImplementation,
    );
  }

  async start() {
    return new Promise<void>((resolve, reject) => {
      try {
        // get the server credentials
        // const tlsServerCredentials = this.nodeManager.pki.createServerCredentials();
        const credentials = grpc.ServerCredentials.createInsecure();
        // const credentials = grpc.ServerCredentials.createSsl(
        //   Buffer.from(tlsServerCredentials.rootCertificate),
        //   // this has to be key/cert pair signed by this nodes CA cert for
        //   // the web of trust system to work because the client node has
        //   // already trusted this nodes CA cert when it creates the connection
        //   [
        //     {
        //       private_key: Buffer.from(tlsServerCredentials.keypair.private),
        //       cert_chain: Buffer.from(tlsServerCredentials.certificate),
        //     },
        //   ],
        //   false,
        // );
        // start the server
        const port =
          process.env.PK_PEER_PORT ??
          this.nodeManager.nodeInfo?.nodeAddress?.port ??
          0;
        const host =
          process.env.PK_PEER_HOST ??
          this.nodeManager.nodeInfo?.nodeAddress?.host ??
          'localhost';
        this.server.bindAsync(
          `${host}:${port}`,
          credentials,
          async (err, boundPort) => {
            if (err) {
              reject(err);
            } else {
              try {
                const address = new Address(host, boundPort);
                if (this.nodeManager.nodeInfo) {
                  this.nodeManager.nodeInfo.nodeAddress = address;
                  this.nodeManager.writeMetadata();
                }
                this.server.start();
                this.logger.info(`Node Server running on: ${address}`);
                resolve();
              } catch (error) {
                reject(error);
              }
            }
          },
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop() {
    this.server.forceShutdown();
  }

  async pingNode(
    call: grpc.ServerUnaryCall<node.PingNodeMessage, node.PingNodeMessage>,
    callback: grpc.sendUnaryData<node.PingNodeMessage>,
  ) {
    try {
      callback(null, call.request);
    } catch (error) {
      callback(error, null);
    }
  }

  async getGitInfo(
    call: grpc.ServerUnaryCall<node.InfoRequest, node.InfoReply>,
    callback: grpc.sendUnaryData<node.InfoReply>,
  ) {
    try {
      const { vaultName } = call.request!.toObject();
      const responseBody = await this.handleGitInfoRequest(vaultName);
      const response = new node.InfoReply();
      response.setBody(responseBody);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getGitPack(
    call: grpc.ServerUnaryCall<node.PackRequest, node.PackReply>,
    callback: grpc.sendUnaryData<node.PackReply>,
  ) {
    try {
      const vaultName = call.request.getVaultName();
      const body = call.request.getBody_asU8();
      const responseBody = await this.handleGitPackRequest(
        vaultName,
        Buffer.from(body),
      );
      const response = new node.PackReply();
      response.setBody(responseBody);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getVaultNames(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, node.VaultNamesReply>,
    callback: grpc.sendUnaryData<node.VaultNamesReply>,
  ) {
    try {
      const response = new node.VaultNamesReply();
      response.setVaultNameListList(await this.handleGetVaultNames());
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  // This is strictly a public relay node method so don't want
  // to return if not a public relay node
  async getUDPAddress(
    call: grpc.ServerUnaryCall<
      agent.NodeInfoReadOnlyMessage,
      agent.StringMessage
    >,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    try {
      if (!process.env.PUBLIC_RELAY_NODE) {
        throw Error('node is not a public relay');
      } else {
        const nodeInfoReadOnly = NodePeer.fromNodeInfoReadOnlyMessage(
          call.request.toObject(),
        );
        if (!this.nodeManager.hasNode(nodeInfoReadOnly.id)) {
          this.nodeManager.addNode(nodeInfoReadOnly);
        }
        const response = new agent.StringMessage();
        const udpAddress = await this.nodeManager.network.handleGetUDPAddress(
          nodeInfoReadOnly.id,
        );
        if (process.env.PK_PEER_HOST) {
          udpAddress.updateHost(process.env.PK_PEER_HOST);
        }
        response.setS(udpAddress.toString());
        callback(null, response);
      }
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
      response.setS(this.nodeManager.pki.RootCertificatePem);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async receiveMessage(
    call: grpc.ServerUnaryCall<node.MessageRequest, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    try {
      const { message } = call.request!.toObject();
      await this.nodeNotification.receive(message);
      callback(null, new agent.EmptyMessage());
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
      const signedCertificate = this.nodeManager.pki.handleCSR(s);
      response.setS(signedCertificate);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async nodeDHTFindNode(
    call: grpc.ServerUnaryCall<
      node.NodeDHTFindNodeRequest,
      node.NodeDHTFindNodeReply
    >,
    callback: grpc.sendUnaryData<node.NodeDHTFindNodeReply>,
  ) {
    try {
      const { targetPeerId } = call.request!.toObject();
      const nodeInfoList = this.nodeManager.nodeDHT.handleFindNodeMessage(
        targetPeerId,
      );
      const response = new node.NodeDHTFindNodeReply();
      response.setClosestPeersList(nodeInfoList);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }
}

export default NodeServer;
