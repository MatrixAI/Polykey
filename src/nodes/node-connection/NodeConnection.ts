import { randomBytes } from 'secure-random-bytes';
import * as grpc from '@grpc/grpc-js';
import { promiseAny } from '../../utils';
import { promisifyGrpc } from '../../bin/utils';
import * as node from '../../proto/js/Node_pb';
import { NodeClient } from '../../proto/js/Node_grpc_pb';
import { NodePeer, Address } from '../Node';
import PublicKeyInfrastructure from '../pki/PublicKeyInfrastructure';
import { ErrorFindNode, ErrorConnectionExists } from '../../errors';
import Logger from '@matrixai/logger';

class NodeConnection {
  private nodeId: string;
  private pki: PublicKeyInfrastructure;
  private getNodeInfo: (id: string) => NodePeer | null;
  private findNodeDHT: (
    nodeId: string,
  ) => Promise<{
    adjacentNodeInfo?: NodePeer | undefined;
    targetNodeInfo?: NodePeer | undefined;
  }>;
  private logger: Logger;
  // private requestUDPHolePunchViaNode: (
  //   targetNodeId: string,
  //   adjacentNodeId: string,
  //   timeout?: number | undefined,
  // ) => Promise<Address>;

  // private requestUDPHolePunchDirectly: (targetNodeId: string, timeout?: number | undefined) => Promise<Address>;

  private channelOptions: grpc.ChannelOptions = {
    'grpc.keepalive_permit_without_calls': 0,
    'grpc.keepalive_time_ms': 1000,
  };
  private nodeClient: NodeClient;
  async getNodeClient(directOnly: boolean = false): Promise<NodeClient> {
    // connect to node
    await this.connect(undefined, directOnly);
    return this.nodeClient;
  }

  private connected = false;
  private credentials: grpc.ChannelCredentials;

  constructor(
    nodeId: string,
    pki: PublicKeyInfrastructure,
    getNodeInfo: (id: string) => NodePeer | null,
    findNodeDHT: (
      nodeId: string,
    ) => Promise<{
      adjacentNodeInfo?: NodePeer | undefined;
      targetNodeInfo?: NodePeer | undefined;
    }>,
    logger: Logger,
    // requestUDPHolePunchDirectly: (targetNodeId: string, timeout?: number) => Promise<Address>,
    // requestUDPHolePunchViaNode: (targetNodeId: string, adjacentNodeId: string, timeout?: number) => Promise<Address>,
  ) {
    this.logger = logger;

    this.nodeId = nodeId;
    this.pki = pki;
    this.getNodeInfo = getNodeInfo;
    this.findNodeDHT = findNodeDHT;
    // this.requestUDPHolePunchViaNode = requestUDPHolePunchViaNode;
    // this.requestUDPHolePunchDirectly = requestUDPHolePunchDirectly;

    const nodeInfo = this.getNodeInfo(this.nodeId);
    if (!nodeInfo) {
      throw new ErrorFindNode('node info was not found in node store');
    }
    // const nodeInfoPem = Buffer.from(nodeInfo.pem);
    // const tlsClientCredentials = this.pki.createClientCredentials();
    this.credentials = grpc.ChannelCredentials.createInsecure();
    // this.credentials = grpc.ChannelCredentials.createSsl(
    //   nodeInfoPem,
    //   // these two have to be key from a cert signed by this nodes CA cert
    //   Buffer.from(tlsClientCredentials.keypair.private),
    //   Buffer.from(tlsClientCredentials.certificate),
    // );
  }

  // 1st connection option: nodeInfo already in nodeStore and nodeAddress is connected
  private async connectDirectly(nodeAddress?: Address): Promise<NodeClient> {
    const address = nodeAddress ?? this.getNodeInfo(this.nodeId)?.nodeAddress;

    // this is for testing the public relay or hole punching with 2 local nodes
    const host = address?.host ?? '';
    if (host == '0.0.0.0' || host == '127.0.0.1' || host == 'localhost') {
      throw Error('temporary error to simulate no direct connection ability');
    }
    // try to create a direct connection
    if (address) {
      this.logger.info(
        'connectingNode: connecting directly to address: ' + address.toString(),
      );

      const nodeClient = new NodeClient(
        address.toString(),
        this.credentials,
        this.channelOptions,
      );
      await this.waitForReadyAsync(nodeClient);
      this.connected = true;
      return nodeClient;
    } else {
      throw new ErrorFindNode('node does not have a connected address');
    }
  }

  // 2nd connection option: kademlia dht
  private async connectDHT(): Promise<NodeClient> {
    try {
      // try to find node directly from intermediary nodes
      const nodeId = this.getNodeInfo(this.nodeId)?.id;
      if (!nodeId) {
        throw new ErrorFindNode('connectDHT: node was not found in node store');
      }
      const { targetNodeInfo } = await this.findNodeDHT(nodeId);

      // TODO: reenable connectHolePunchDirectly and connectHolePunchViaNode and connectRelay after the demo
      // we only want relay
      this.logger.info(
        'connectingNode: found target node: ' + targetNodeInfo?.toString(),
      );

      const promiseList: Promise<NodeClient>[] = [
        this.connectDirectly(targetNodeInfo?.nodeAddress),
        // this.connectHolePunchDirectly(),
      ];
      // if (adjacentNodeInfo?.nodeAddress) {
      //   // case 2: target node has an adjacent node that can be contacted for nat traversal
      //   promiseList.push(this.connectHolePunchViaNode(adjacentNodeInfo), this.connectRelay(adjacentNodeInfo));
      // }
      const client = await promiseAny(promiseList);
      return client;
    } catch (error) {
      throw new ErrorFindNode(`could not find node via dht: ${error}`);
    }
  }

  // // 3rd connection option: hole punch directly to the target node
  // // (will only work if a direct hole punch connection already exists)
  // // triggered by 2nd option
  // private async connectHolePunchDirectly(): Promise<NodeClient> {
  //   // try to hole punch directly to node via already udp-holepunched connection (if it exists)
  //   try {
  //     if (!this.connected) {
  //       // connect to relay and ask it to create a relay
  //       const connectedAddress = await this.requestUDPHolePunchDirectly(this.getNodeInfo(this.nodeId)!.id);
  //       const nodeClient = new NodeClient(connectedAddress.toString(), this.credentials);
  //       await this.waitForReadyAsync(nodeClient);
  //       this.connected = true;
  //       return nodeClient;
  //     } else {
  //       throw Error('node is already connected');
  //     }
  //   } catch (error) {
  //     throw Error(`connecting hole punch directly failed: ${error}`);
  //   }
  // }

  // // 4th connection option: hole punch facilitated by a node adjacent (i.e. connected) to the target node
  // // triggered by 2nd option
  // private async connectHolePunchViaNode(adjacentNodeInfo: NodePeer): Promise<NodeClient> {
  //   // try to hole punch to node via relay node
  //   if (adjacentNodeInfo.nodeAddress && !this.connected) {
  //     // connect to relay and ask it to create a relay
  //     const connectedAddress = await this.requestUDPHolePunchViaNode(
  //       this.getNodeInfo(this.nodeId)!.id,
  //       adjacentNodeInfo.id,
  //       10000,
  //     );
  //     const nodeClient = new NodeClient(connectedAddress.toString(), this.credentials);
  //     await this.waitForReadyAsync(nodeClient);
  //     this.connected = true;
  //     return nodeClient;
  //   } else {
  //     throw Error('node is already connected');
  //   }
  // }

  // // 5th connection option: relay connection facilitated by a node adjacent (i.e. connected) to the target node
  // // triggered by 2nd option
  // private async connectRelay(adjacentNodeInfo: NodePeer): Promise<NodeClient> {
  //   // try to hole punch to node via relay node
  //   if (adjacentNodeInfo.nodeAddress && !this.connected) {
  //     // connect to relay and ask it to create a relay
  //     const connectedAddress = await this.requestUDPHolePunchViaNode(
  //       this.getNodeInfo(this.nodeId)!.id,
  //       adjacentNodeInfo.id,
  //       10000,
  //     );
  //     const nodeClient = new NodeClient(connectedAddress.toString(), this.credentials);
  //     await this.waitForReadyAsync(nodeClient);
  //     this.connected = true;
  //     return nodeClient;
  //   } else {
  //     throw Error('node is already connected');
  //   }
  // }

  async connectFirstChannel(directOnly: boolean = false) {
    if (!this.connected) {
      const promiseList = [this.connectDirectly()];
      if (!directOnly) {
        promiseList.push(this.connectDHT());
      }
      return await promiseAny(promiseList);
    }
    throw new ErrorConnectionExists('node is already connected!');
  }

  private async connect(
    timeout: number = 200000,
    directOnly: boolean = false,
  ): Promise<void> {
    // eslint-disable-next-line no-async-promise-executor
    return await new Promise<void>(async (resolve, reject) => {
      if (timeout) {
        setTimeout(
          () => reject(Error('connection request timed out')),
          timeout,
        );
      }
      try {
        // connect if not already connected
        if (!this.connected) {
          try {
            this.nodeClient = await this.connectFirstChannel(directOnly);
          } catch (error) {
            this.connected = false;
            reject(Error('could not connect to node'));
          }
        }

        // try a ping
        if (this.connected) {
          // if (this.connected && (await this.sendPingRequest(50000))) {
          resolve();
        } else {
          try {
            this.connected = false;
            this.nodeClient = await this.connectFirstChannel(directOnly);
          } catch (error) {
            // still not connected
            reject(Error('could not connect to node'));
          }
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  private async sendPingRequest(
    timeout: number = 50000,
    directConnectionOnly = false,
  ): Promise<boolean> {
    // eslint-disable-next-line
    return await new Promise<boolean>(async (resolve, _) => {
      try {
        if (timeout) {
          setTimeout(() => resolve(false), timeout);
        }

        let nodeClient: NodeClient;
        if (directConnectionOnly) {
          nodeClient = await this.connectDirectly();
        } else {
          nodeClient = this.nodeClient;
        }

        const challenge = randomBytes(16).toString('base64');

        // send request
        const req = new node.PingNodeMessage();
        req.setChallenge(challenge);
        const res = (await promisifyGrpc(nodeClient.pingNode.bind(nodeClient))(
          req,
        )) as node.PingNodeMessage;
        resolve(res.getChallenge() == challenge);
      } catch (error) {
        resolve(false);
      }
    });
  }

  async pingNode(timeout: number = 50000): Promise<boolean> {
    // connect to node
    await this.connect(timeout);
    // send ping request
    return await this.sendPingRequest(timeout);
  }

  // ======== Helper Methods ======== //
  private async waitForReadyAsync(
    nodeClient: NodeClient,
    timeout = 100000,
  ): Promise<void> {
    // eslint-disable-next-line
    await new Promise<void>(async (resolve, reject) => {
      try {
        if (timeout) {
          setTimeout(() => reject(new Error('ping timed out')), timeout);
        }

        const challenge = randomBytes(16).toString('base64');

        // send request
        const req = new node.PingNodeMessage();
        req.setChallenge(challenge);
        (await promisifyGrpc(nodeClient.pingNode.bind(nodeClient))(
          req,
        )) as node.PingNodeMessage;
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default NodeConnection;
