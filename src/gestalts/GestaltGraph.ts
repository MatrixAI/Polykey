import fs from 'fs';
import path from 'path';
import os from 'os';
import type { IdentityKey, NodeId, ProviderKey } from '../types';
import type {
  LinkClaim,
  LinkInfo,
  LinkInfoIdentity,
  LinkInfoNode,
} from '../links';
import type { IdentityInfo } from '../social';
import { NodeInfo as PeerInfo } from '../nodes/NodeInfo';
import { NodeInfo } from '../nodes';
import type {
  GestaltMatrix,
  GestaltNodes,
  GestaltIdentities,
  Gestalt,
  GestaltKey,
} from './types';

import { ProviderManager } from '../social';
import { gestaltKey } from './utils';
import NodeManager from '../nodes/NodeManager';
import GestaltTrust from './GestaltTrust';
import Logger from '@matrixai/logger';

type VerifyLinkInfoHandler = (linkInfo: LinkInfo) => boolean;

class GestaltGraph {
  public graph: GestaltMatrix = {};
  public nodes: GestaltNodes = {};
  public identities: GestaltIdentities = {};

  protected providerManager: ProviderManager;
  protected verifyLinkInfo: VerifyLinkInfoHandler;
  protected gestaltTrust: GestaltTrust;
  protected peerManager: NodeManager;

  private logger: Logger;
  private graphData: string;
  private nodesData: string;
  private identitiesData: string;

  public constructor(
    gestaltTrust: GestaltTrust,
    peerManager: NodeManager,
    providerManager: ProviderManager,
    verifyLinkInfo: VerifyLinkInfoHandler,
    logger: Logger,
  ) {
    this.gestaltTrust = gestaltTrust;
    this.peerManager = peerManager;
    this.providerManager = providerManager;
    this.verifyLinkInfo = verifyLinkInfo;
    this.logger = logger;

    /** Get persisted data */
    const polykeyPath = `${os.homedir()}/.polykey`;
    this.graphData = path.join(polykeyPath, '.gestalt-graph', 'graph');
    this.nodesData = path.join(polykeyPath, '.gestalt-graph', 'nodes');
    this.identitiesData = path.join(
      polykeyPath,
      '.gestalt-graph',
      'identities',
    );
    this.loadMetadata();
  }

  writeMetadata() {
    if (this.graph) {
      fs.mkdirSync(path.dirname(this.graphData), { recursive: true });
      fs.writeFileSync(this.graphData, JSON.stringify(this.graph));
    }
    if (this.nodes) {
      fs.mkdirSync(path.dirname(this.nodesData), { recursive: true });
      fs.writeFileSync(this.nodesData, JSON.stringify(this.nodes));
    }
    if (this.identities) {
      fs.mkdirSync(path.dirname(this.identitiesData), { recursive: true });
      fs.writeFileSync(this.identitiesData, JSON.stringify(this.identities));
    }
  }

  loadMetadata() {
    if (fs.existsSync(this.graphData)) {
      this.graph = JSON.parse(fs.readFileSync(this.graphData).toString());
    }
    if (fs.existsSync(this.nodesData)) {
      this.nodes = JSON.parse(fs.readFileSync(this.nodesData).toString());
    }
    if (fs.existsSync(this.identitiesData)) {
      this.identities = JSON.parse(
        fs.readFileSync(this.identitiesData).toString(),
      );
    }
  }

  public setNode(nodeInfo: NodeInfo): void {
    const peerId = gestaltKey(nodeInfo.id);
    this.nodes[peerId] = nodeInfo;
    this.graph[peerId] = this.graph[peerId] || {};
    this.writeMetadata();
  }

  public setIdentity(identityInfo: IdentityInfo): void {
    const identityKey = gestaltKey(identityInfo.key, identityInfo.provider);
    this.identities[identityKey] = identityInfo;
    this.graph[identityKey] = this.graph[identityKey] || {};
    this.writeMetadata();
  }

  public setLinkIdentity(
    linkInfo: LinkInfoIdentity,
    nodeInfo: NodeInfo,
    identityInfo: IdentityInfo,
  ): void {
    const peerId = gestaltKey(nodeInfo.id);
    const identityKey = gestaltKey(identityInfo.key, identityInfo.provider);
    this.setNode(nodeInfo);
    this.setIdentity(identityInfo);
    this.graph[peerId][identityKey] = linkInfo;
    this.graph[identityKey][peerId] = linkInfo;
    this.writeMetadata();
  }

  public setLinkNode(
    linkInfo: LinkInfoNode,
    nodeInfo1: NodeInfo,
    nodeInfo2: NodeInfo,
  ): void {
    const peerId1 = gestaltKey(nodeInfo1.id);
    const peerId2 = gestaltKey(nodeInfo2.id);
    this.setNode(nodeInfo1);
    this.setNode(nodeInfo2);
    this.graph[peerId1][peerId2] = linkInfo;
    this.graph[peerId2][peerId1] = linkInfo;
    this.writeMetadata();
  }

  public unsetNode(nodeInfo: NodeInfo): void {
    const peerId_ = gestaltKey(nodeInfo.id);
    for (const [key_, linkClaim] of Object.entries(this.graph[peerId_] ?? {})) {
      if (linkClaim.type === 'identity') {
        delete this.identities[key_];
      } else if (linkClaim.type === 'node') {
        delete this.nodes[key_];
      }
      this.unsetLink(linkClaim);
    }
    delete this.graph[peerId_];
  }

  public unsetIdentity(identityInfo: IdentityInfo): void {
    const identityKey_ = gestaltKey(identityInfo.key, identityInfo.provider);
    for (const [key_, linkClaim] of Object.entries(
      this.graph[identityKey_] ?? {},
    )) {
      if (linkClaim.type === 'identity') {
        delete this.identities[key_];
      } else if (linkClaim.type === 'node') {
        delete this.nodes[key_];
      }
      this.unsetLink(linkClaim);
    }
    delete this.graph[identityKey_];
    this.writeMetadata();
  }

  public unsetLink(linkClaim: LinkClaim) {
    if (linkClaim.type === 'identity') {
      const peerId = gestaltKey(linkClaim.node);
      const identityKey = gestaltKey(linkClaim.identity, linkClaim.provider);
      delete this.graph[peerId][identityKey];
      delete this.graph[identityKey][peerId];
    } else if (linkClaim.type === 'node') {
      const peerId1 = gestaltKey(linkClaim.node1);
      const peerId2 = gestaltKey(linkClaim.node2);
      delete this.graph[peerId1]?.[peerId2];
      delete this.graph[peerId2]?.[peerId1];
    }
    this.writeMetadata();
  }

  public getGestaltByNode(key: NodeId): Gestalt | undefined {
    return this.getGestalt(gestaltKey(key));
  }

  public getGestaltByIdentity(
    key: IdentityKey,
    providerKey: ProviderKey,
  ): Gestalt | undefined {
    return this.getGestalt(gestaltKey(key, providerKey));
  }

  protected getGestalt(key: GestaltKey): Gestalt | undefined {
    if (!this.nodes[key] && !this.identities[key]) {
      return;
    }
    const gestalt: Gestalt = {
      graph: {},
      nodes: {},
      identities: {},
    };
    const queue = [key];
    const visited = new Set();
    while (true) {
      const vertex = queue.shift();
      if (!vertex) {
        break;
      }
      if (this.nodes[vertex]) {
        gestalt.nodes[vertex] = this.nodes[vertex];
      } else if (this.identities[vertex]) {
        gestalt.identities[vertex] = this.identities[vertex];
      }
      gestalt.graph[vertex] = this.graph[vertex];
      visited.add(vertex);
      const neighbours = Object.keys(this.graph[vertex]).filter(
        (k) => !visited.has(k),
      );
      queue.push(...neighbours);
    }
    return gestalt;
  }

  public getGestalts(): Array<Gestalt> {
    const unvisited: Set<GestaltKey> = new Set(Object.keys(this.graph));
    const gestalts: Array<Gestalt> = [];
    let gestalt: Gestalt;
    // we mutate the set while iterating
    // the iteration is updated as the set is mutated
    for (const key of unvisited.values()) {
      gestalt = {
        graph: {},
        nodes: {},
        identities: {},
      };
      const queue = [key];
      while (true) {
        const vertex = queue.shift();
        if (!vertex) {
          gestalts.push(gestalt);
          break;
        }
        if (this.nodes[vertex]) {
          gestalt.nodes[vertex] = this.nodes[vertex];
        } else if (this.identities[vertex]) {
          gestalt.identities[vertex] = this.identities[vertex];
        }
        gestalt.graph[vertex] = this.graph[vertex];
        unvisited.delete(vertex);
        const neighbours = Object.keys(this.graph[vertex]).filter((k) =>
          unvisited.has(k),
        );
        queue.push(...neighbours);
      }
    }
    return gestalts;
  }

  public trusted(key: NodeId | IdentityKey) {
    return this.gestaltTrust.trusted(gestaltKey(key));
  }

  public trust(key: NodeId | IdentityKey) {
    const gestalt = this.getGestalt(key);
    if (gestalt) {
      this.gestaltTrust.trustGestalt(gestalt);
    }
  }

  public untrust(key: NodeId | IdentityKey) {
    const gestalt = this.getGestalt(key);
    if (gestalt) {
      this.gestaltTrust.untrustGestalt(gestalt);
    }
  }

  public discoverGestaltNode(key: NodeId): AsyncGenerator<void, void, void> {
    return this.discoverGestalt(gestaltKey(key));
  }

  public discoverGestaltIdentity(
    key: IdentityKey,
    providerKey: ProviderKey,
  ): AsyncGenerator<void, void, void> {
    return this.discoverGestalt(gestaltKey(key, providerKey));
  }

  protected async *discoverGestalt(
    key: GestaltKey,
  ): AsyncGenerator<void, void, void> {
    if (!this.nodes[key] && !this.identities[key]) {
      return;
    }
    const queue = [key];
    const visited = new Set();
    while (true) {
      const vertex = queue.shift();

      if (!vertex) {
        break;
      }

      let nodeInfo = this.nodes[vertex];
      let identityInfo = this.identities[vertex];

      if (nodeInfo) {
        // need to query the DHT for the node IP
        // contact the IP to get the peer info
        // then acquire all the link infos here
        // assume that this is asynchronous
        const linkInfos = await this.peerManager.getLinkInfos(nodeInfo.id);

        for (const linkInfo of linkInfos) {
          if (linkInfo.type === 'node') {
            throw new Error('UNIMPLEMENTED');
          } else if (linkInfo.type === 'identity') {
            // this has to use md5 hash?
            if (PeerInfo.publicKeyToId(linkInfo.node) !== nodeInfo.id) {
              continue;
            }

            if (!this.verifyLinkInfo(linkInfo)) {
              continue;
            }

            const provider = this.providerManager.getProvider(
              linkInfo.provider,
            );

            const identityInfoNew = await provider.getIdentityInfo(
              linkInfo.identity,
            );

            if (!identityInfoNew) {
              continue;
            }

            identityInfo = this.identities[identityInfoNew.key];

            if (!identityInfo) {
              identityInfo = identityInfoNew;
            } else {
              // merge/update the identityInfo (must be a mutation)
              identityInfo.name = identityInfoNew.name;
              identityInfo.email = identityInfoNew.email;
              identityInfo.url = identityInfoNew.url;
            }

            this.setLinkIdentity(linkInfo, nodeInfo, identityInfo);

            visited.add(vertex);

            if (this.gestaltTrust.trusted(vertex)) {
              this.gestaltTrust.addTrust(gestaltKey(identityInfo.key));
            }

            // push into the queue if it hasn't been visited
            if (!visited.has(identityInfo.key)) {
              queue.push(identityInfo.key);
            }
          }
        }
      } else if (identityInfo) {
        const provider = this.providerManager.getProvider(
          identityInfo.provider,
        );

        // get the new identityInfo
        const identityInfoNew = await provider.getIdentityInfo(
          identityInfo.key,
        );

        if (identityInfoNew) {
          // merge/update the identityInfo (must be a mutation)
          identityInfo.name = identityInfoNew.name;
          identityInfo.email = identityInfoNew.email;
          identityInfo.url = identityInfoNew.url;

          // possible exceptions can occur here
          for await (const linkInfoIdentity of provider.getLinkInfos(
            identityInfo.key,
          )) {
            // if the identity key doesn't match, discard
            if (linkInfoIdentity.identity !== identityInfo.key) {
              continue;
            }

            // if the identity provider doesn't match, discard
            if (linkInfoIdentity.provider !== identityInfo.provider) {
              continue;
            }

            if (!this.verifyLinkInfo(linkInfoIdentity)) {
              continue;
            }

            // TODO:
            // get the new NodeInfo
            // this is not actually the node info yet
            const nodeInfoNew = await this.peerManager.getNodeInfoFromDHT(
              PeerInfo.publicKeyToId(JSON.parse(linkInfoIdentity.node)),
            );

            if (!nodeInfoNew) {
              continue;
            }

            nodeInfo = this.nodes[nodeInfoNew.id];
            if (!nodeInfo) {
              nodeInfo = nodeInfoNew;
            }

            // TODO:
            // this is not removing existing edges
            // it is only adding new edges
            // it should be changed to remove existing edges

            // create gestalt graph edge betwen this DI and the node
            this.setLinkIdentity(linkInfoIdentity, nodeInfo, identityInfo);

            visited.add(vertex);

            if (this.gestaltTrust.trusted(vertex)) {
              this.gestaltTrust.addTrust(gestaltKey(nodeInfo.id));
            }

            // push into the queue if it hasn't been visited
            if (!visited.has(nodeInfo.id)) {
              queue.push(nodeInfo.id);
            }
          }
        }
      }

      // pause for the next step
      yield;
    }
  }

  // public async * gestaltDiscovery (gk: GestaltKey): AsyncGenerator<void, void, void> {

  //   const queue: GraphSearchNode[] = [];
  //   const visitedNodes: string[] = [];

  //   this.getNeighbours(gk).forEach((value) => {
  //     queue.push({
  //       value, parent: null,
  //       isVisited: false
  //     });
  //   });

  //   const notAlreadyVisited = (value: string) => visitedNodes.indexOf(value) === -1;

  //   const linksEqual = (a: LinkClaim, b: LinkClaim) => {
  //     for (let key in a) {
  //       if (a[key] !== b[key]) return false;
  //     }
  //     return true;
  //   }

  //   while (true) {

  //     const currentNode = queue.shift();
  //     if (!currentNode) break;

  //     currentNode.isVisited = true; // this might be pointless... but doesnt hurt

  //     if (notAlreadyVisited(currentNode.value)) {

  //       // DISCOVER FROM DIGITAL IDENTITY / IDENTITY KEY (in the from '{"ns":null,"key":"B"}')
  //       if (this.identities[currentNode.value]) {
  //         const identityInfo = this.identities[currentNode.value];
  //         const provider = this.providerManager.getProvider(identityInfo.provider);
  //         // getLinkInfos
  //         for await (let linkInfo of provider.getLinkInfos(identityInfo.key)) {
  //           // verify and add to graph
  //           const l = await provider.getLinkInfo(linkInfo.key);
  //           if (!l || !linksEqual(l, linkInfo)) continue;
  //           if (this.verifyLinkClaim(linkInfo)) {
  //             this.setLinkIdentity(
  //               linkInfo,
  //               { id: linkInfo.node },
  //               {
  //                 key: linkInfo.identity,
  //                 provider: linkInfo.provider,
  //               }
  //             )
  //             if (this.gestaltTrust.trusted(currentNode.value)) {
  //               const key = gestaltKey(linkInfo.identity, linkInfo.provider);
  //               this.gestaltTrust.addTrust(key);
  //             }
  //           }
  //         }
  //       }

  //       // DISCOVER FROM node / PEER ID (in the from '{"ns":null,"key":"PubKey"}')
  //       if (this.nodes[currentNode.value]) {
  //         const nodeInfo = this.nodes[currentNode.value];
  //         const nodeMD5 = PI.publicKeyToId(nodeInfo.id); //assuming nodeInfo is a pubkey

  //         var links: Array<LinkInfo>;

  //         // if (this.peerManager) links = await this.peerManager.getLinkInfos(nodeMD5)

  //         // PLACEHOLDER FOR ACTUAL LINKCLAIMS
  //          links = []

  //         for (let link of links) {
  //           var key;
  //           if (link.type === "identity") {
  //             const provider = this.providerManager.getProvider(link.provider);
  //             const l = await provider.getLinkInfo(link.key);
  //             if (!l || !linksEqual(l, link)) continue;
  //             if (this.verifyLinkClaim(link)) {
  //               this.setLinkIdentity(
  //                 link,
  //                 { id: link.node },
  //                 {
  //                   key: link.identity,
  //                   provider: link.provider,
  //                 }
  //               );
  //               key = gestaltKey(link.identity, link.provider);
  //             }
  //           } else if (link.type === "node") {
  //             if (this.verifyLinkClaim(link)) {
  //               this.setLinkNode(
  //                 link,
  //                 { id: link.node1 },
  //                 { id: link.node2 },
  //               );
  //               key = gestaltKey(link.node2);
  //             }
  //           } else {
  //             throw Error("This should be seriously impossible");
  //           }
  //           if (key && this.gestaltTrust.trusted(currentNode.value)) {
  //             this.gestaltTrust.addTrust(key);
  //           }
  //         }
  //       }

  //       // GET UNVISITED NEIGHBOURS
  //       const neighbours = this.getNeighbours(currentNode.value).filter(notAlreadyVisited);

  //       // SHOVE IN QUEUE
  //       queue.unshift(
  //         ...neighbours.map((value: string) => ({
  //           value,
  //           parent: currentNode,
  //           isVisited: false
  //         }))
  //       );
  //       console.log("I yield!")
  //       yield;
  //     }
  //   }
  //   return;
  // }

  // protected getNeighbours (vertex: GestaltKey): Array<GestaltKey> {
  //   if (this.graph[vertex]) {
  //     return Object.keys(this.graph[vertex]);
  //   }
  //   return [];
  // }
}

export default GestaltGraph;
