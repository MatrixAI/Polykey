import Logger from '@matrixai/logger';

/** Libs */
import GestaltTrust from '../gestalts/GestaltTrust';
import GestaltGraph from '../gestalts/GestaltGraph';
import { gestaltKey } from '../gestalts/utils';
import NodeManager from '../nodes/NodeManager';
import { ProviderManager } from '../social';
import { NodeInfo } from '../nodes/NodeInfo';

/** Types */
import type { IdentityKey, NodeId, ProviderKey } from '../types';
import type { LinkInfo } from '../links';
import type { GestaltKey } from '../gestalts/types';

type VerifyLinkInfoHandler = (linkInfo: LinkInfo) => boolean;

class Discovery {
  protected peerManager: NodeManager;
  protected providerManager: ProviderManager;
  protected verifyLinkInfo: VerifyLinkInfoHandler;
  protected gestaltTrust: GestaltTrust;
  protected gestaltGraph: GestaltGraph;
  protected logger: Logger;

  public constructor(
    gestaltTrust: GestaltTrust,
    peerManager: NodeManager,
    providerManager: ProviderManager,
    verifyLinkInfo: VerifyLinkInfoHandler,
    gestaltGraph: GestaltGraph,
    logger: Logger,
  ) {
    this.gestaltTrust = gestaltTrust;
    this.peerManager = peerManager;
    this.providerManager = providerManager;
    this.verifyLinkInfo = verifyLinkInfo;
    this.gestaltGraph = gestaltGraph;
    this.logger = logger;
  }

  public discoverNode(key: NodeId): AsyncGenerator<void, void, void> {
    return this.discoverGestalt(gestaltKey(key));
  }

  public discoverIdentity(
    key: IdentityKey,
    providerKey: ProviderKey,
  ): AsyncGenerator<void, void, void> {
    this.logger.info(`discoverIdentity ${key} ${providerKey}`);
    return this.discoverGestalt(gestaltKey(key, providerKey));
  }

  protected async *discoverGestalt(
    key: GestaltKey,
  ): AsyncGenerator<void, void, void> {
    this.logger.info(`discovering in gestalt key ${key}`);
    if (!this.gestaltGraph.nodes[key] && !this.gestaltGraph.identities[key]) {
      this.logger.info(`not found in gestalt graph`);
      return;
    }

    // 1. Intitialize with the search key
    this.logger.info(`init queue`);
    const queue = [key];
    const visited = new Set();

    while (true) {
      this.logger.info(`starting generator`);

      // 2. Process the queue
      const vertex = queue.shift();
      this.logger.info(`running vertex ${vertex}`);

      // 3. If vertex is not existing return;
      if (!vertex) {
        this.logger.info(`non existing vertex ${vertex}`);
        break;
      }

      // 4. Get the identity
      let nodeInfo = this.gestaltGraph.nodes[vertex];
      let identityInfo = this.gestaltGraph.identities[vertex];

      if (nodeInfo) {
        this.logger.info(`node info existing`);
        // need to query the DHT for the node IP
        // contact the IP to get the peer info
        // then acquire all the link infos here
        // assume that this is asynchronous
        const linkInfos = await this.peerManager.getLinkInfos(nodeInfo.id);

        for (const linkInfo of linkInfos) {
          if (linkInfo.type === 'node') {
            const nodeInfoNew = this.peerManager.getNodeInfo(linkInfo.node2);
            /** There is a possibility that there is no NodeInfo */
            if (nodeInfoNew) {
              this.gestaltGraph.setLinkNode(linkInfo, nodeInfo, nodeInfoNew);

              visited.add(vertex);

              if (this.gestaltTrust.trusted(vertex)) {
                this.gestaltTrust.addTrust(gestaltKey(linkInfo.node2));
              }

              // push into the queue if it hasn't been visited
              if (!visited.has(linkInfo.node2)) {
                queue.push(linkInfo.node2);
              }
            }
          } else if (linkInfo.type === 'identity') {
            // this has to use md5 hash?
            if (NodeInfo.publicKeyToId(linkInfo.node) !== nodeInfo.id) {
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

            identityInfo = this.gestaltGraph.identities[identityInfoNew.key];

            if (!identityInfo) {
              identityInfo = identityInfoNew;
            } else {
              // merge/update the identityInfo (must be a mutation)
              identityInfo.name = identityInfoNew.name;
              identityInfo.email = identityInfoNew.email;
              identityInfo.url = identityInfoNew.url;
            }

            this.gestaltGraph.setLinkIdentity(linkInfo, nodeInfo, identityInfo);

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
      }

      // 5. Check if identity is existing
      if (identityInfo) {
        this.logger.info(`identity info existing`);

        // 6. Get the provider adapter
        const provider = this.providerManager.getProvider(
          identityInfo.provider,
        );
        this.logger.info(`provider used ${identityInfo.provider}`);

        // 7. check if the key is existing in that provider
        const identityInfoNew = await provider.getIdentityInfo(
          identityInfo.key,
        );

        // 8. Now check if that identity is existing
        if (identityInfoNew) {
          this.logger.info(`identityInfoNew ${identityInfo.key}`);

          identityInfo.name = identityInfoNew.name;
          identityInfo.email = identityInfoNew.email;
          identityInfo.url = identityInfoNew.url;
          // 9. Search all the link infos and check
          for await (const linkInfoIdentity of provider.getLinkInfos(
            identityInfo.key,
          )) {
            // 10. Check if linkInfo matches the current identity
            // if the identity key doesn't match, discard
            if (linkInfoIdentity.identity !== identityInfo.key) {
              this.logger.info(`identity doesnt match key`);
              continue;
            }
            // if the identity provider doesn't match, discard
            if (linkInfoIdentity.provider !== identityInfo.provider) {
              this.logger.info(`identity doesnt match provider`);
              continue;
            }

            // 11. Verify Linkinfo
            if (!this.verifyLinkInfo(linkInfoIdentity)) {
              this.logger.info(`verifyLinkInfo not valid`);
              continue;
            }

            // 12. Get the NodeInfo
            this.logger.info(`getting link info for ${linkInfoIdentity.node}`);
            const nodeInfoNew = this.peerManager.getNodeInfo(
              linkInfoIdentity.node,
            );

            // 13. skip if there is no nodeInfo
            if (!nodeInfoNew) {
              this.logger.info(`node info does not exist`);
              continue;
            }

            // 14. If its not existing then add it
            nodeInfo = this.gestaltGraph.nodes[nodeInfoNew.id];
            if (!nodeInfo) {
              nodeInfo = nodeInfoNew;
            }

            this.logger.info(`setLinkIdentity`);
            // 15. Attach it to the gestalt graph
            this.gestaltGraph.setLinkIdentity(
              linkInfoIdentity,
              nodeInfo,
              identityInfo,
            );

            visited.add(vertex);

            // 16.
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
      yield;
    }
  }

  public test(): number {
    return 4;
  }
}

export default Discovery;
