import { pki } from 'node-forge';
import Logger from '@matrixai/logger';
import NatTraversal from './nat-traversal/NatTraversal';
import MTPToTCPSocketPipe from './socket-pipes/MTPToTCPSocketPipe';
import NodeConnection from '../nodes/node-connection/NodeConnection';
import { Address, NodeInfo, NodeInfoReadOnly } from '../nodes/NodeInfo';
import { MTPConnection, MTPServer } from './micro-transport-protocol/MTPServer';

// This class is the orchestrator of nat traversal + micro transport
class Network {
  private listNodes: () => string[];
  private getNode: (nodeId: string) => NodeInfoReadOnly | null;
  private updateNode: (nodeInfo: NodeInfoReadOnly) => void;
  private connectToNode: (nodeId: string) => NodeConnection;
  private getLocalNodeInfo: () => NodeInfo;
  private getPrivateKey: () => pki.rsa.PrivateKey;
  private logger: Logger;

  // === NAT Traversal === //
  private natTraversal: NatTraversal;

  // === Micro Transport Protocol === //
  private mtpServer: MTPServer;
  // this map holds a list of nodeIds and connections to those nodes
  private mtpConnectionMap: Map<string, MTPConnection> = new Map();

  // === Socket Pipes === //
  private nodeServerSocketPipes: Map<string, MTPToTCPSocketPipe> = new Map();

  constructor(
    listNodes: () => string[],
    getNode: (nodeId: string) => NodeInfoReadOnly,
    updateNode: (nodeInfo: NodeInfoReadOnly) => void,
    connectToNode: (nodeId: string) => NodeConnection,
    getLocalNodeInfo: () => NodeInfo,
    getPrivateKey: () => pki.rsa.PrivateKey,
    logger: Logger,
  ) {
    this.listNodes = listNodes;
    this.getNode = getNode;
    this.updateNode = updateNode;
    this.connectToNode = connectToNode;
    this.getLocalNodeInfo = getLocalNodeInfo;
    this.getPrivateKey = getPrivateKey;
    this.logger = logger;
    this.natTraversal = new NatTraversal(
      this.listNodes.bind(this),
      this.getNode.bind(this),
      this.updateNode.bind(this),
      this.connectToNode.bind(this),
      this.getLocalNodeInfo.bind(this),
      this.getPrivateKey.bind(this),
      this.logger,
    );
    this.mtpServer = new MTPServer(
      this.connectionHandler.bind(this),
      this.logger,
    );
  }

  async start(): Promise<Address> {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<Address>(async (resolve, reject) => {
      try {
        // start the MTPServer
        const port = parseInt(process.env.PK_PEER_PORT ?? '0');
        const host = process.env.PK_PEER_HOST ?? '0.0.0.0';
        this.mtpServer.listenPort(port, host, async () => {
          const address = this.mtpServer.address();
          this.logger.info(
            `main MTP server is now listening on address: '${address.toString()}'`,
          );
          // start nat traversal service with the socket from the mtp server
          await this.natTraversal.start(this.mtpServer.socket);
          // finally return the address
          resolve(address);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop() {
    this.natTraversal.stop();
    await this.mtpServer.close();
    this.nodeServerSocketPipes.forEach((p) => p.terminate());
    this.nodeServerSocketPipes = new Map();
  }

  async handleGetUDPAddress(nodeId: string): Promise<Address> {
    return await this.natTraversal.getUDPAddressForNode(nodeId);
  }

  // ==== Handler Methods ==== //
  private connectionHandler(conn: MTPConnection) {
    // set up a new socket pipe between this and gRPC
    const pipe = new MTPToTCPSocketPipe(
      conn,
      this.getLocalNodeInfo().nodeAddress!,
      this.logger.getChild('MTPToTCPSocketPipe'),
    );
    this.nodeServerSocketPipes.set(pipe.id, pipe);
  }
}

export default Network;
