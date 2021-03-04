import { createModel } from '@xstate/test';
import { Node } from '../../../src/nodes/Node';
import { nodeInterface } from '../../../proto/js/Node';
import NodeDHT from '../../../src/nodes/dht/NodeDHT';
import { SubServiceType } from '../../proto/js/Node_pb';
import { nodeDHTMachine, NodeDHTStateSchema } from '../../../spec/nodes/NodeDHT.spec';

function toNodeInfoMessageList(nodeInfos: Node[]): nodeInterface.INodeInfoMessage[] {
  return nodeInfos
    .map((p) => {
      return {
        publicKey: p.publicKey,
        rootCertificate: p.rootCertificate,
        nodeAddress: p.nodeAddress?.toString(),
        apiAddress: p.apiAddress?.toString(),
      };
    });
}

function createMockNodeStore() {
  const localNodeInfo = new Node(
    `
    -----BEGIN PGP PUBLIC KEY BLOCK-----
    Version: Keybase OpenPGP v2.0.82
    Comment: https://keybase.io/crypto

    xm8EX4/nNRMFK4EEACIDAwQ1Nb9xkYaansKNgu0nVobzT3NFpSLJFuPJN7eFgR3F
    MCRxH8cIBqdnzNZ5qysw5MAau+RWx7LZzkmQVAThDcQDhvfIpkufBtEwsoNxA4F2
    esmrYKthcd5s1J79G3klyTDNBlJvYmJpZcKWBBMTCgAeBQJfj+c1AhsBAwsJBwMV
    CggCHgECF4ADFgIBAhkBAAoJEOqDKVJzZAKR2VkBgKBhcFmMsI9Dkx+6pHWfN7dW
    6uR2b4ZBZqYBmTt3zcwXV04SCp0+/oYesrG0J6WU7wF+KYv0C4FlltolpAyCbV3o
    vXjBs068fcrsRIP9K8UtDJdwKTtotE8Rakr7QCwjgQy3zlYEX4/nNRIIKoZIzj0D
    AQcCAwRPxgwMfXu7V3b3fwMWNoVkIlyUfEmj0wmP6ZF4eUNYcp7t389ny+iYuXrT
    Pf0h+zi6eV4pDhdwWEYsl0EGp4TSAwEKCcKHBBgTCgAPBQJfj+c1BQkPCZwAAhsM
    AAoJEOqDKVJzZAKRVlMBf2Rf9rJohxKJvxL7ZW06+KWal0BAemXM/rl0yinhGNg/
    R3DwoTD0XGyrVj4Wc73saAGA314hhallOJzpQ6evZAOEsiokZeOMDqre6wJpH4/w
    +ErUWcqe0MSksPQGAmV2xgnwzlIEX4/nNRMIKoZIzj0DAQcCAwTKjFLVrl6KMj9A
    7jZPJaTWiEBaCNz7N2BAgnItu86yWAYLDR3Dod6knoUs3s4JyIiAkHhY1YV6FtN1
    JpmdhYrpwsAnBBgTCgAPBQJfj+c1BQkPCZwAAhsiAGoJEOqDKVJzZAKRXyAEGRMK
    AAYFAl+P5zUACgkQrvSMxa2e7bGJTwEAiIz9s6VDCiwnXsVoNzHDAFwulAkn1Yqk
    zYSB0xi84uEBAJ2qEZznS3zvzg4WZweaX6pu25b6qolP0GYaT9D/oouxR6YBgI1s
    ibM44XDnvb2guY07zUN7RXZBZrUwCyHwCfEfsZg0vwkHXD1ib530HgKcZIF21gGA
    rP6oio2zgC7v/WgGPcu1qwOADZCEwYY4BVBIJOEDZ16pVH701JFoBRkBih/sMjAc
    =97N3
    -----END PGP PUBLIC KEY BLOCK-----
    `,
    'rootCertiicate',
    '0.0.0.0:0',
    '0.0.0.0:0',
  )
  const nodeInfo1 = new Node(

    `
    -----BEGIN PGP PUBLIC KEY BLOCK-----
    Version: Keybase OpenPGP v2.0.82
    Comment: https://keybase.io/crypto

    xm8EX4/nNxMFK4EEACIDAwQxOGBYM6yuUgb4fdaYws0Fmmq3JJerQsMRBcMej53b
    UhJZHnlWICh1jvCPBrRTrEg3AMHypaBeDfLJxOBSBFAOflsWQ1wlgjjBQ2IIIgOC
    K5Y5eAcSWzgjni1OLMkiZDXNBlJvYmJpZcKWBBMTCgAeBQJfj+c3AhsBAwsJBwMV
    CggCHgECF4ADFgIBAhkBAAoJEG/32vAUft0JsMkBgMXXNTxqPTkQPEsXpZylclbE
    yVrX2+RwnaR972MtPMkpysMc0NRZC09V8sY1S051RAGA/VKUphAQ75/nlJMYEINp
    7F9Dt4v0XgfHOk495CG3gbtF6GCpDeAF+7UnP7id9+VAzlYEX4/nNxIIKoZIzj0D
    AQcCAwSukjWy3W3km7f3UqDmmUHCtEHVegurJW592YPg8OPBFUbI+Fnprjg04pp9
    Y9MYtOkdzJiytrJVRGJqe797ejJsAwEKCcKHBBgTCgAPBQJfj+c3BQkPCZwAAhsM
    AAoJEG/32vAUft0J1pUBfRdZGUSwS3G9+n56R01aof/5Gs1lmoevn5q6wxxbWask
    DQtgizk+fSRP1MvFtkgxjwGAxvwBblCIZbbFWhSjQvkzVxwyVVy1BO8dt5I8LIja
    HHITWfHuy5k4gIiFz/DYupQtzlIEX4/nNxMIKoZIzj0DAQcCAwTU0TihuXfRa0+J
    DbaM7g3lLgpxMvxmFqE8kZMt5GMuh9zYMlF7kvK5GnvCI1NA91OYfUPt/m6LY9ro
    2eq9ObA4wsAnBBgTCgAPBQJfj+c3BQkPCZwAAhsiAGoJEG/32vAUft0JXyAEGRMK
    AAYFAl+P5zcACgkQEeaJRMyfVoxi4QD/TVvztePuTaStyzQzL5V5SS6LeAcdhT4i
    NoaXSaeqBhwBAO00snBJ+7FysYgPDlZG52NWxxBEmbC6Yh8kWkpEVqT+W00Bf0/j
    a3RLDOu58urhkd08mOgz9HJKT64dVcnbsPRIyo7UCYSXjJFSlGhSnzLz7u4ELQGA
    lpMrop0IhEK5qYHth9z4ew2Rflz1YZfAQeTlYza72LUbKfONKVlyAhiM9SzYvt/+
    =WFki
    -----END PGP PUBLIC KEY BLOCK-----
    `,
    'rootCertiicate',
    '0.0.0.0:0',
    '0.0.0.0:0',
  )
  const nodeInfo2 = new Node(

    `
    -----BEGIN PGP PUBLIC KEY BLOCK-----
    Version: Keybase OpenPGP v2.0.82
    Comment: https://keybase.io/crypto

    xm8EX4/nNxMFK4EEACIDAwQxOGBYM6yuUgb4fdaYws0Fmmq3JJerQsMRBcMej53b
    UhJZHnlWICh1jvCPBrRTrEg3AMHypaBeDfLJxOBSBFAOflsWQ1wlgjjBQ2IIIgOC
    K5Y5eAcSWzgjni1OLMkiZDXNBlJvYmJpZcKWBBMTCgAeBQJfj+c3AhsBAwsJBwMV
    CggCHgECF4ADFgIBAhkBAAoJEG/32vAUft0JsMkBgMXXNTxqPTkQPEsXpZylclbE
    yVrX2+RwnaR972MtPMkpysMc0NRZC09V8sY1S051RAGA/VKUphAQ75/nlJMYEINp
    7F9Dt4v0XgfHOk495CG3gbtF6GCpDeAF+7UnP7id9+VAzlYEX4/nNxIIKoZIzj0D
    AQcCAwSukjWy3W3km7f3UqDmmUHCtEHVegurJW592YPg8OPBFUbI+Fnprjg04pp9
    Y9MYtOkdzJiytrJVRGJqe797ejJsAwEKCcKHBBgTCgAPBQJfj+c3BQkPCZwAAhsM
    AAoJEG/32vAUft0J1pUBfRdZGUSwS3G9+n56R01aof/5Gs1lmoevn5q6wxxbWask
    DQtgizk+fSRP1MvFtkgxjwGAxvwBblCIZbbFWhSjQvkzVxwyVVy1BO8dt5I8LIja
    HHITWfHuy5k4gIiFz/DYupQtzlIEX4/nNxMIKoZIzj0DAQcCAwTU0TihuXfRa0+J
    DbaM7g3lLgpxMvxmFqE8kZMt5GMuh9zYMlF7kvK5GnvCI1NA91OYfUPt/m6LY9ro
    2eq9ObA4wsAnBBgTCgAPBQJfj+c3BQkPCZwAAhsiAGoJEG/32vAUft0JXyAEGRMK
    AAYFAl+P5zcACgkQEeaJRMyfVoxi4QD/TVvztePuTaStyzQzL5V5SS6LeAcdhT4i
    NoaXSaeqBhwBAO00snBJ+7FysYgPDlZG52NWxxBEmbC6Yh8kWkpEVqT+W00Bf0/j
    a3RLDOu58urhkd08mOgz9HJKT64dVcnbsPRIyo7UCYSXjJFSlGhSnzLz7u4ELQGA
    lpMrop0IhEK5qYHth9z4ew2Rflz1YZfAQeTlYza72LUbKfONKVlyAhiM9SzYvt/+
    =WFki
    -----END PGP PUBLIC KEY BLOCK-----
    `,
    'rootCertiicate',
    '0.0.0.0:0',
    '0.0.0.0:0',
  )
  const nodeStore = new Map<string, Node>()
  nodeStore.set(nodeInfo1.id, nodeInfo1)
  nodeStore.set(nodeInfo2.id, nodeInfo2)
  return {nodeStore, localNodeInfo}
}

async function createMockNodeDHT() {
  const {nodeStore, localNodeInfo} = createMockNodeStore()
  const mockConnectToNode = (id: string) => {
    return {
      pingNode: async (timeout?: number) => true,
      sendNodeRequest: async (type: SubServiceType, request: Uint8Array) => {
        // decode response
        const { subMessage: responseSubMessage } = nodeInterface.NodeDHTMessage.decodeDelimited(request);
        const { nodeId: responseNodeId, closestNodes } = nodeInterface.NodeDHTFindNodeMessage.decodeDelimited(
          responseSubMessage,
        );

        // encode request
        const localNodeId=Array.from(nodeStore.keys())[0]
        const subMessage = nodeInterface.NodeDHTFindNodeMessage.encodeDelimited({
          nodeId: localNodeId,
          closestNodes: toNodeInfoMessageList(Array.from(nodeStore.values())),
        }).finish();

        return nodeInterface.NodeDHTMessage.encodeDelimited({
          type: nodeInterface.NodeDHTMessageType.FIND_NODE,
          isResponse: false,
          subMessage: subMessage,
        }).finish();
      }
    }
  }
  const nodeDHT = new NodeDHT(
    () => localNodeInfo.id,
    mockConnectToNode,
    () => localNodeInfo,
    (nodeInfo: Node) => {nodeStore.set(nodeInfo.id, nodeInfo)}
  )
  for (const nodeId of nodeStore.keys()) {
    await nodeDHT.addNode(nodeId)
  }
  return nodeDHT
}

const newPublicKey = `
-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: Keybase OpenPGP v2.1.15
Comment: https://keybase.io/crypto

xsFNBF+aZLgBEADmXYEXWJCEWEyYLc6ta1NCHqk1Ghu8rNSfh0jePGAPZBlIQKME
ePrtOjrgtiolD1o4CN8IiRt76H37ncFy3yKSwR+vxufzK//xtm3SJ/naowXKoojy
a5/EXlnasqUj2xqwZvgw4msmxeBBPcQfEbI/JE925z5xjHh3BI0q4fQpCxeUm2V2
zAnEKMvxfYLn60qnaH0Al+PU+SKp6AYDQTtuIdJt5EoyE761w7A79VbS6kS/CNF7
DJbcOWFzqsWaglGFq3Jk8nwgKHKNioOTDj9ysoawb7etO1Ya5uK5seWj6l+3XgST
P1jGceoBxtBjX11hAB9BuRg+L/OTyY48UQASGty7s3em8a2XC7Tnt2vpv04U6xAR
mcJNyZcPMHWSo2kYVA7l33Uq4AsVLt+vlVsOnjeKeBYvCbDcvHiXpMHEl2SGZBPy
qg8ENmbAymujt7dI4PKdVCBLpmsRknNU5qPgCGRuh5ihxbfuIiwxTIABbagsT2Fq
hA7INIO2IpAdf0zhd0Jnd7g5eB5jBsp0G8A0kQoxkuHZpuR4XHvPh2/9UWykouTd
HipXIvm92d66tdVchfpJpoz2SUDgIFNdB57g2rERJ4KET22QXP5sTC/guhAUa5a+
WxoiyV45Jy1rPojm4Vx7kWL7mqA4Otqmn7AubXrI8A6qcxNn3evbayI7vwARAQAB
zQZyb2Jkb2fCwXQEEwEKAB4FAl+aZLgCGy8DCwkHAxUKCAIeAQIXgAMWAgECGQEA
CgkQ4P7GA98+iODvmRAAnHSCJWGniO6+AVlKcQ/UorCvK7X5+u84yzqHr5srB2Oo
Q4dfJjoSy80KchJeHgoSLROL0WmDSrzuUvKLGR4RHLEbC0eYfxQ3yWPFplYxf5+R
CpTmXlmUjgk1jU8TotlEIunwKUe14ChcsvMTKcZI7mQ2YfqyXBHHYPRb0Akt5FnD
6wgQG1faQlvJInuxoB+y9uiGPV+3A730XDrZVMD3QHcMBbXJhSx1gjzbjtZLoAcq
50TDBt3NS/yxMYxaWhocxB9kDYhr+uyCjYxwTke7AU/CsLfRwR14XptWXqcSyTGP
RV48vX1govoxQFpzGPApvp3IW3Od5EHdoqlgRcO0S0zJCOxzB/JzfZ1HK7NTMkWs
NgbwR1yWGq2sdMO0mSjGbcTHsxBHiLCFQQSsOObHGywJnxcd9oPUoHs7yc50YOlJ
oOkCKua7USXLXaqe2mdd7L6P9sBNar/sn2UvQZ6/slXEHfhJyzZ2l2ouFhMZwROK
z+v74j12YdrmN7Gr0DmH3EN0ZdeNTJz1sc8yJ8LK7QLklArjN6OfWzt7uaeabhIb
XBMAKHwuCyZhojaOkJ8Pjo6AVV5G72R26ZT8MRkLLAnRUOGJOzmhkkyxCAlwsPmU
tcOY3a7GKjSDEhZUQ88B6dG3fwbgtpwZfohN8vPYe9oncjsBwvNjq4DI53hSwhU=
=Znu3
-----END PGP PUBLIC KEY BLOCK-----
`
const nodeId = Node.publicKeyToId(Node.formatPublicKey(newPublicKey))

const nodeDHTModel = createModel<NodeDHT, NodeDHTStateSchema>(nodeDHTMachine).withEvents({
  ADD_PEERS: {
    exec: async (nodeDHT: NodeDHT) => {
      // Do not await, must interrogate while service is running.
      nodeDHT.deleteNode(nodeId).finally(async () => {
        await nodeDHT.addNodes([nodeId])
      })
      return
    },
  },
  ADD_PEER: {
    exec: async (nodeDHT: NodeDHT) => {
      // Do not await, must interrogate while service is running.
      nodeDHT.deleteNode(nodeId).finally(async () => {
        await nodeDHT.addNode(nodeId)
      })
      return
    },
  },
  DELETE_PEER: {
    exec: async (nodeDHT: NodeDHT) => {
      // Do not await, must interrogate while service is running.
      nodeDHT.deleteNode(nodeId)
    },
  },
  FIND_LOCAL_PEER: {
    exec: async (nodeDHT: NodeDHT) => {
      // Do not await, must interrogate while service is running.
      nodeDHT.findLocalNode(nodeId)
    },
  },
  FIND_PEER: {
    exec: async (nodeDHT: NodeDHT) => {
      // Do not await, must interrogate while service is running.
      nodeDHT.findNode(nodeId)
    },
  },
  SUCCESS: {
    exec: async (nodeDHT: NodeDHT) => {
      return;
    },
  },
  FAILURE: {
    exec: async (nodeDHT: NodeDHT) => {
      return;
    },
  },
});

export { nodeDHTModel, createMockNodeDHT };
