import type { Gestalt, GestaltKey } from './types';
import * as agent from '../proto/js/Agent_pb';
import { LinkInfoIdentity, LinkInfoNode, LinkInfo } from '../links';
import type { IdentityKey, ProviderKey, NodeId } from '../types';

function gestaltKey(
  key: NodeId | IdentityKey,
  providerKey: ProviderKey | null = null,
): GestaltKey {
  return JSON.stringify({ p: providerKey, key: key });
}

function ungestaltKey(gestaltKey: GestaltKey): NodeId | IdentityKey {
  return JSON.parse(gestaltKey).key;
}

function gestaltToProtobuf(gestalt: Gestalt): agent.GestaltMessage {
  const message = new agent.GestaltMessage();
  // encode gestalt matrix
  const encodedGestaltMatrix = message.getGestaltMatrixMap();
  Object.keys(gestalt.graph).forEach((key) => {
    const edge = gestalt.graph[key];
    const encodedEdge = new agent.GestaltMatrixEdgeMessage();
    Object.keys(edge).forEach((innerKey) => {
      const linkInfo = edge[innerKey];
      const linkInfoMessage = new agent.LinkInfoMessage();
      if (linkInfo.type == 'identity') {
        const linkInfoIdentity = linkInfo as LinkInfoIdentity;
        const linkInfoIdentityMessage = new agent.LinkInfoIdentityMessage();
        linkInfoIdentityMessage.setDateissued(linkInfoIdentity.dateIssued);
        linkInfoIdentityMessage.setIdentity(linkInfoIdentity.identity);
        linkInfoIdentityMessage.setKey(linkInfoIdentity.key);
        linkInfoIdentityMessage.setNode(linkInfoIdentity.node);
        linkInfoIdentityMessage.setProvider(linkInfoIdentity.provider);
        linkInfoIdentityMessage.setSignature(linkInfoIdentity.signature);
        linkInfoIdentityMessage.setType(linkInfoIdentity.type);
        if (linkInfoIdentity.url) {
          linkInfoIdentityMessage.setUrl(linkInfoIdentity.url);
        }
        linkInfoMessage.setLinkInfoIdentity(linkInfoIdentityMessage);
      } else {
        const linkInfoNode = linkInfo as LinkInfoNode;
        const linkInfoNodeMessage = new agent.LinkInfoNodeMessage();
        linkInfoNodeMessage.setDateissued(linkInfoNode.dateIssued);
        linkInfoNodeMessage.setKey(linkInfoNode.key);
        linkInfoNodeMessage.setNode1(linkInfoNode.node1);
        linkInfoNodeMessage.setNode2(linkInfoNode.node2);
        linkInfoNodeMessage.setSignature(linkInfoNode.signature);
        linkInfoNodeMessage.setType(linkInfoNode.type);
        if (linkInfoNode.url) {
          linkInfoNodeMessage.setUrl(linkInfoNode.url);
        }
        linkInfoMessage.setLinkInfoNode(linkInfoNodeMessage);
      }
      encodedEdge.getPairsMap().set(innerKey, linkInfoMessage);
    });
    encodedGestaltMatrix.set(key, encodedEdge);
  });

  // encode gestalt identities
  Object.keys(gestalt.identities).forEach((k) => {
    const identity = gestalt.identities[k];
    const identityInfoMessage = new agent.IdentityInfoMessage();
    if (identity.email) {
      identityInfoMessage.setEmail(identity.email);
    }
    identityInfoMessage.setKey(identity.key);
    if (identity.name) {
      identityInfoMessage.setName(identity.name);
    }
    identityInfoMessage.setProvider(identity.provider);
    if (identity.url) {
      identityInfoMessage.setUrl(identity.url);
    }
    message.getIdentitiesMap().set(k, identityInfoMessage);
  });

  // encode gestalt nodes
  Object.keys(gestalt.nodes).forEach((k) => {
    const node = gestalt.nodes[k];
    const gestaltNodeMessage = new agent.GestaltNodeMessage();
    gestaltNodeMessage.setId(node.id);
    message.getGestaltNodesMap().set(k, gestaltNodeMessage);
  });

  return message;
}

function protobufToGestalt(message: agent.GestaltMessage): Gestalt {
  const gestalt: Gestalt = { graph: {}, identities: {}, nodes: {} };
  // decode gestalt matrix
  message
    .getGestaltMatrixMap()
    .toArray()
    .forEach(([key, encodedEdge]) => {
      const edge: { [key: string]: LinkInfo } = {};
      encodedEdge
        .getPairsMap()
        .toArray()
        .forEach(([innerKey, linkInfoMessage]) => {
          if (linkInfoMessage.getLinkInfoIdentity()) {
            const linkInfoIdentityMessage = linkInfoMessage.getLinkInfoIdentity();
            const linkInfoIdentity: LinkInfoIdentity = {
              dateIssued: linkInfoIdentityMessage?.getDateissued() ?? '',
              identity: linkInfoIdentityMessage?.getIdentity() ?? '',
              key: linkInfoIdentityMessage?.getKey() ?? '',
              node: linkInfoIdentityMessage?.getNode() ?? '',
              provider: linkInfoIdentityMessage?.getProvider() ?? '',
              signature: linkInfoIdentityMessage?.getSignature() ?? '',
              type: 'identity',
              url: linkInfoIdentityMessage?.getUrl(),
            };
            edge[innerKey] = linkInfoIdentity;
          } else {
            const linkInfoNodeMessage = linkInfoMessage.getLinkInfoNode();
            const linkInfoNode: LinkInfoNode = {
              dateIssued: linkInfoNodeMessage?.getDateissued() ?? '',
              key: linkInfoNodeMessage?.getKey() ?? '',
              node1: linkInfoNodeMessage?.getNode1() ?? '',
              node2: linkInfoNodeMessage?.getNode2() ?? '',
              signature: linkInfoNodeMessage?.getSignature() ?? '',
              type: 'node',
              url: linkInfoNodeMessage?.getUrl(),
            };
            edge[innerKey] = linkInfoNode;
          }
        });
      gestalt.graph[key] = edge;
    });

  // decode gestalt identities
  message
    .getIdentitiesMap()
    .toArray()
    .forEach(([key, identityInfoMessage]) => {
      gestalt.identities[key] = {
        key: identityInfoMessage.getKey(),
        provider: identityInfoMessage.getProvider(),
        email: identityInfoMessage.getEmail(),
        name: identityInfoMessage.getName(),
        url: identityInfoMessage.getUrl(),
      };
    });

  // decode gestalt nodes
  message
    .getGestaltNodesMap()
    .toArray()
    .forEach(([key, gestaltNodeMessage]) => {
      gestalt.nodes[key] = {
        id: gestaltNodeMessage.getId(),
      };
    });

  return gestalt;
}

export { gestaltKey, ungestaltKey, gestaltToProtobuf, protobufToGestalt };
