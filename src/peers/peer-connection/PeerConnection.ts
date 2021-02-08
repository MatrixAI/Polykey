import { pki } from 'node-forge';
import { randomBytes } from 'crypto';
import * as grpc from '@grpc/grpc-js';
import { promiseAny } from '../../utils';
import { promisifyGrpc } from '../../bin/utils';
import * as peer from '../../../proto/js/Peer_pb';
import { PeerClient } from '../../../proto/js/Peer_grpc_pb';
import { PeerInfo, PeerInfoReadOnly, Address } from '../PeerInfo';
import PublicKeyInfrastructure from '../pki/PublicKeyInfrastructure';
import Logger from '@matrixai/js-logger';

class PeerConnection {
  private peerId: string;
  private pki: PublicKeyInfrastructure;
  private getPeerInfo: (id: string) => PeerInfoReadOnly | null;
  private findPeerDHT: (
    peerId: string,
  ) => Promise<{
    adjacentPeerInfo?: PeerInfoReadOnly | undefined;
    targetPeerInfo?: PeerInfoReadOnly | undefined;
  }>;
  private logger: Logger;
  // private requestUDPHolePunchViaPeer: (
  //   targetPeerId: string,
  //   adjacentPeerId: string,
  //   timeout?: number | undefined,
  // ) => Promise<Address>;

  // private requestUDPHolePunchDirectly: (targetPeerId: string, timeout?: number | undefined) => Promise<Address>;

  private peerClient: PeerClient;
  async getPeerClient(directOnly: boolean = false): Promise<PeerClient> {
    // connect to peer
    await this.connect(undefined, directOnly);
    return this.peerClient;
  }

  private connected = false;
  private credentials: grpc.ChannelCredentials;

  constructor(
    peerId: string,
    pki: PublicKeyInfrastructure,
    getPeerInfo: (id: string) => PeerInfoReadOnly | null,
    findPeerDHT: (
      peerId: string,
    ) => Promise<{
      adjacentPeerInfo?: PeerInfoReadOnly | undefined;
      targetPeerInfo?: PeerInfoReadOnly | undefined;
    }>,
    logger: Logger,
    // requestUDPHolePunchDirectly: (targetPeerId: string, timeout?: number) => Promise<Address>,
    // requestUDPHolePunchViaPeer: (targetPeerId: string, adjacentPeerId: string, timeout?: number) => Promise<Address>,
  ) {
    this.logger = logger;

    this.peerId = peerId;
    this.pki = pki;
    this.getPeerInfo = getPeerInfo;
    this.findPeerDHT = findPeerDHT;
    // this.requestUDPHolePunchViaPeer = requestUDPHolePunchViaPeer;
    // this.requestUDPHolePunchDirectly = requestUDPHolePunchDirectly;

    const peerInfo = this.getPeerInfo(this.peerId);
    if (!peerInfo) {
      throw Error('peer info was not found in peer store');
    }
    const peerInfoPem = Buffer.from(peerInfo.pem);
    const tlsClientCredentials = this.pki.createClientCredentials();
    this.credentials = grpc.ChannelCredentials.createInsecure();
    // this.credentials = grpc.ChannelCredentials.createSsl(
    //   peerInfoPem,
    //   // these two have to be key from a cert signed by this peers CA cert
    //   Buffer.from(tlsClientCredentials.keypair.private),
    //   Buffer.from(tlsClientCredentials.certificate),
    // );
  }

  // 1st connection option: peerInfo already in peerStore and peerAddress is connected
  private async connectDirectly(peerAddress?: Address): Promise<PeerClient> {
    const address = peerAddress ?? this.getPeerInfo(this.peerId)?.peerAddress;

    const host = address?.host ?? '';
    // this is for testing the public relay or hole punching with 2 local peers
    if (host == '0.0.0.0' || host == '127.0.0.1' || host == 'localhost') {
      throw Error('temporary error to simulate no direct connection ability');
    }
    try {
      // try to create a direct connection
      if (address) {
        this.logger.info(
          'connectingNode: connecting directly to address: ' +
            address.toString(),
        );

        const peerClient = new PeerClient(address.toString(), this.credentials);
        await this.waitForReadyAsync(peerClient);
        this.connected = true;
        return peerClient;
      } else {
        throw Error('peer does not have a connected address');
      }
    } catch (error) {
      throw error;
    }
  }

  // 2nd connection option: kademlia dht
  private async connectDHT(): Promise<PeerClient> {
    try {
      // try to find peer directly from intermediary peers
      const peerId = this.getPeerInfo(this.peerId)?.id;
      if (!peerId) {
        throw Error('connectDHT: peer was not found in peer store');
      }
      const { targetPeerInfo, adjacentPeerInfo } = await this.findPeerDHT(
        peerId,
      );

      // TODO: reenable connectHolePunchDirectly and connectHolePunchViaPeer and connectRelay after the demo
      // we only want relay
      this.logger.info(
        'connectingPeer: found target peer: ' + targetPeerInfo?.toString(),
      );

      const promiseList: Promise<PeerClient>[] = [
        this.connectDirectly(targetPeerInfo?.peerAddress),
        // this.connectHolePunchDirectly(),
      ];
      // if (adjacentPeerInfo?.peerAddress) {
      //   // case 2: target peer has an adjacent peer that can be contacted for nat traversal
      //   promiseList.push(this.connectHolePunchViaPeer(adjacentPeerInfo), this.connectRelay(adjacentPeerInfo));
      // }
      const client = await promiseAny(promiseList);
      return client;
    } catch (error) {
      throw Error(`could not find peer via dht: ${error}`);
    }
  }

  // // 3rd connection option: hole punch directly to the target peer
  // // (will only work if a direct hole punch connection already exists)
  // // triggered by 2nd option
  // private async connectHolePunchDirectly(): Promise<PeerClient> {
  //   // try to hole punch directly to peer via already udp-holepunched connection (if it exists)
  //   try {
  //     if (!this.connected) {
  //       // connect to relay and ask it to create a relay
  //       const connectedAddress = await this.requestUDPHolePunchDirectly(this.getPeerInfo(this.peerId)!.id);
  //       const peerClient = new PeerClient(connectedAddress.toString(), this.credentials);
  //       await this.waitForReadyAsync(peerClient);
  //       this.connected = true;
  //       return peerClient;
  //     } else {
  //       throw Error('peer is already connected');
  //     }
  //   } catch (error) {
  //     throw Error(`connecting hole punch directly failed: ${error}`);
  //   }
  // }

  // // 4th connection option: hole punch facilitated by a peer adjacent (i.e. connected) to the target peer
  // // triggered by 2nd option
  // private async connectHolePunchViaPeer(adjacentPeerInfo: PeerInfoReadOnly): Promise<PeerClient> {
  //   // try to hole punch to peer via relay peer
  //   if (adjacentPeerInfo.peerAddress && !this.connected) {
  //     // connect to relay and ask it to create a relay
  //     const connectedAddress = await this.requestUDPHolePunchViaPeer(
  //       this.getPeerInfo(this.peerId)!.id,
  //       adjacentPeerInfo.id,
  //       10000,
  //     );
  //     const peerClient = new PeerClient(connectedAddress.toString(), this.credentials);
  //     await this.waitForReadyAsync(peerClient);
  //     this.connected = true;
  //     return peerClient;
  //   } else {
  //     throw Error('peer is already connected');
  //   }
  // }

  // // 5th connection option: relay connection facilitated by a peer adjacent (i.e. connected) to the target peer
  // // triggered by 2nd option
  // private async connectRelay(adjacentPeerInfo: PeerInfoReadOnly): Promise<PeerClient> {
  //   // try to hole punch to peer via relay peer
  //   if (adjacentPeerInfo.peerAddress && !this.connected) {
  //     // connect to relay and ask it to create a relay
  //     const connectedAddress = await this.requestUDPHolePunchViaPeer(
  //       this.getPeerInfo(this.peerId)!.id,
  //       adjacentPeerInfo.id,
  //       10000,
  //     );
  //     const peerClient = new PeerClient(connectedAddress.toString(), this.credentials);
  //     await this.waitForReadyAsync(peerClient);
  //     this.connected = true;
  //     return peerClient;
  //   } else {
  //     throw Error('peer is already connected');
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
    throw Error('peer is already connected!');
  }

  private async connect(
    timeout: number = 200000,
    directOnly: boolean = false,
  ): Promise<void> {
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
            this.peerClient = await this.connectFirstChannel(directOnly);
          } catch (error) {
            this.connected = false;
            reject(Error('could not connect to peer'));
          }
        }

        // try a ping
        if (this.connected && (await this.sendPingRequest(50000))) {
          resolve();
        } else {
          try {
            this.connected = false;
            this.peerClient = await this.connectFirstChannel(directOnly);
          } catch (error) {
            // still not connected
            reject(Error('could not connect to peer'));
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

        let peerClient: PeerClient;
        if (directConnectionOnly) {
          peerClient = await this.connectDirectly();
        } else {
          peerClient = this.peerClient;
        }

        const challenge = randomBytes(16).toString('base64');

        // send request
        const req = new peer.PingPeerMessage();
        req.setChallenge(challenge);
        const res = (await promisifyGrpc(peerClient.pingPeer.bind(peerClient))(
          req,
        )) as peer.PingPeerMessage;
        resolve(res.getChallenge() == challenge);
      } catch (error) {
        resolve(false);
      }
    });
  }

  async pingPeer(timeout: number = 50000): Promise<boolean> {
    // connect to peer
    await this.connect(timeout);
    // send ping request
    return await this.sendPingRequest(timeout);
  }

  // ======== Helper Methods ======== //
  private async waitForReadyAsync(
    peerClient: PeerClient,
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
        const req = new peer.PingPeerMessage();
        req.setChallenge(challenge);
        (await promisifyGrpc(peerClient.pingPeer.bind(peerClient))(
          req,
        )) as peer.PingPeerMessage;
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default PeerConnection;
