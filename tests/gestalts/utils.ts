import type {
  NodeId,
  ProviderId,
  IdentityId,
  GestaltId,
  ProviderIdentityId,
} from '@/ids/types';
import type { KeyPair } from '@/keys/types';
import type { ClaimLinkNode, ClaimLinkIdentity } from '@/claims/payloads';
import type { SignedClaim } from '@/claims/types';
import type {
  GestaltNodeInfo,
  GestaltIdentityInfo,
  GestaltNodes,
  GestaltIdentities,
  GestaltLinkIdentity,
  GestaltLinkNode,
  GestaltInfo,
  GestaltLink,
  GestaltActions,
} from '@/gestalts/types';
import type { GestaltIdEncoded } from '@/ids/types';
import type { GestaltGraph } from '../../src/gestalts';
import fc from 'fast-check';
import * as ids from '@/ids';
import { gestaltActions } from '@/gestalts/types';
import Token from '@/tokens/Token';
import * as keysUtils from '@/keys/utils';
import * as nodesUtils from '@/nodes/utils';
import * as gestaltsUtils from '@/gestalts/utils';
import { never } from '@/utils';
import * as testsIdsUtils from '../ids/utils';
import * as testsClaimsUtils from '../claims/utils';

const gestaltNodeInfoArb = (nodeId: NodeId): fc.Arbitrary<GestaltNodeInfo> =>
  fc.record({
    nodeId: fc.constant(nodeId),
  });

const gestaltIdentityInfoArb = (
  providerId: ProviderId,
  identityId: IdentityId,
): fc.Arbitrary<GestaltIdentityInfo> =>
  fc.record(
    {
      providerId: fc.constant(providerId),
      identityId: fc.constant(identityId),
      name: fc.webFragments(),
      email: fc.emailAddress(),
      url: fc.domain(),
    },
    {
      requiredKeys: ['identityId', 'providerId'],
    },
  );

const gestaltLinkNodeArb = (
  keyPair1: KeyPair,
  keyPair2: KeyPair,
): fc.Arbitrary<GestaltLinkNode> => {
  const signedClaimLinkNode = testsClaimsUtils.claimArb
    .map((claim) => {
      return {
        typ: 'ClaimLinkNode',
        iss: ids.encodeNodeId(keysUtils.publicKeyToNodeId(keyPair1.publicKey)),
        sub: ids.encodeNodeId(keysUtils.publicKeyToNodeId(keyPair2.publicKey)),
        ...claim,
      };
    })
    .map((payload) => Token.fromPayload(payload))
    .map((token) => {
      token.signWithPrivateKey(keyPair1);
      token.signWithPrivateKey(keyPair2);
      return token.toSigned();
    }) as fc.Arbitrary<SignedClaim<ClaimLinkNode>>;
  return fc.record({
    id: testsIdsUtils.gestaltLinkIdArb,
    claim: signedClaimLinkNode,
    meta: fc.constant({}),
  });
};

const linkNodeArb = (keyPair1: KeyPair, keyPair2: KeyPair) =>
  gestaltLinkNodeArb(keyPair1, keyPair2).map((gestaltLinkNode) => ({
    claim: gestaltLinkNode.claim,
    meta: gestaltLinkNode.meta,
  }));

const gestaltLinkIdentityArb = (
  keyPair: KeyPair,
  providerId: ProviderId,
  identityId: IdentityId,
): fc.Arbitrary<GestaltLinkIdentity> => {
  const signedClaimLinkIdentity = testsClaimsUtils.claimArb
    .map((claim) => {
      return {
        typ: 'ClaimLinkIdentity',
        iss: ids.encodeNodeId(keysUtils.publicKeyToNodeId(keyPair.publicKey)),
        sub: ids.encodeProviderIdentityId([providerId, identityId]),
        ...claim,
      };
    })
    .map((payload) => Token.fromPayload(payload))
    .map((token) => {
      token.signWithPrivateKey(keyPair);
      return token.toSigned();
    }) as fc.Arbitrary<SignedClaim<ClaimLinkIdentity>>;
  return fc.record({
    id: testsIdsUtils.gestaltLinkIdArb,
    claim: signedClaimLinkIdentity,
    meta: fc.record({
      providerIdentityClaimId: testsIdsUtils.providerIdentityClaimIdArb,
    }),
  });
};

const linkIdentityArb = (
  keyPair: KeyPair,
  providerId: ProviderId,
  identityId: IdentityId,
) =>
  gestaltLinkIdentityArb(keyPair, providerId, identityId).map(
    (gestaltLinkIdentity) => ({
      claim: gestaltLinkIdentity.claim,
      meta: gestaltLinkIdentity.meta,
    }),
  );

const gestaltActionsArb = (max?: number) =>
  fc.dictionary(
    fc.oneof(...gestaltActions.map((action) => fc.constant(action))),
    fc.constant(null),
    { minKeys: 1, maxKeys: max ?? gestaltActions.length },
  );

type GestaltGraphModel = {
  matrix: Record<GestaltIdEncoded, Record<GestaltIdEncoded, null>>;
  nodes: GestaltNodes;
  identities: GestaltIdentities;
  permissions: Record<GestaltIdEncoded, GestaltActions>;
};

type GestaltGraphCommand = fc.AsyncCommand<GestaltGraphModel, GestaltGraph>;

/**
 * Used to set vertex info and actions.
 */
class SetVertexCommand implements GestaltGraphCommand {
  constructor(
    public readonly vertexInfo: GestaltInfo,
    public readonly actions?: GestaltActions,
  ) {}

  check() {
    return true;
  }

  async run(model: GestaltGraphModel, real: GestaltGraph) {
    const [type, data] = this.vertexInfo;
    const gestaltId =
      type === 'node'
        ? (['node', data.nodeId] as ['node', NodeId])
        : (['identity', [data.providerId, data.identityId]] as [
            'identity',
            ProviderIdentityId,
          ]);

    // Apply the mutation
    await real.setVertex(this.vertexInfo);

    // Update the model
    modelSetVertex(model, this.vertexInfo);
    if (this.actions != null) modelSetActions(model, gestaltId, this.actions);
  }

  toString() {
    let gestaltInfo: any = this.vertexInfo;
    if (this.vertexInfo[0] === 'node') {
      gestaltInfo = [
        'node',
        { nodeId: nodesUtils.encodeNodeId(this.vertexInfo[1].nodeId) },
      ];
    }
    return `setVertexCommand(${JSON.stringify(gestaltInfo)}, ${JSON.stringify(
      this.actions,
    )})`;
  }
}

class UnsetVertexCommand implements GestaltGraphCommand {
  constructor(public readonly gestaltId: GestaltId) {}

  check() {
    return true;
  }

  async run(model: GestaltGraphModel, real: GestaltGraph) {
    const gestaltIdEncoded = gestaltsUtils.encodeGestaltId(this.gestaltId);
    // Apply the mutation
    await real.unsetVertex(this.gestaltId);

    // Update the model
    const gestaltModelOld = getGestaltFromModel(model, this.gestaltId);
    // If no gestalt then vertex didn't exist
    if (gestaltModelOld == null) return;
    modelUnsetVertex(model, this.gestaltId);

    // Expectations
    // We need to check that if the gestalt split
    const vertices: Set<GestaltIdEncoded> = new Set();
    Object.keys(gestaltModelOld.nodes).forEach((vertex) =>
      vertices.add(vertex as GestaltIdEncoded),
    );
    Object.keys(gestaltModelOld.identities).forEach((vertex) =>
      vertices.add(vertex as GestaltIdEncoded),
    );
    vertices.delete(gestaltIdEncoded);
    let randomVertex1: GestaltIdEncoded | undefined;
    for (const vertex of vertices) {
      randomVertex1 = vertex;
    }
    // If null then there was no gestalt to begin with
    if (randomVertex1 == null) return;
    // Starting from the random vertex we want to delete vertices existing in the new gestalt
    const gestalt1ModelNew = getGestaltFromModel(
      model,
      gestaltsUtils.decodeGestaltId(randomVertex1)!,
    )!;
    Object.keys(gestalt1ModelNew.nodes).forEach((vertex) =>
      vertices.delete(vertex as GestaltIdEncoded),
    );
    Object.keys(gestalt1ModelNew.identities).forEach((vertex) =>
      vertices.delete(vertex as GestaltIdEncoded),
    );
    // Whatever is left is part of a new gestalt, if empty then stop here
    if (vertices.size === 0) return;
    let randomVertex2: GestaltIdEncoded | undefined;
    for (const vertex of vertices) {
      randomVertex2 = vertex;
    }
    if (randomVertex2 == null) never('randomVertex2 must be defined');
    const gestalt2ModelNew = getGestaltFromModel(
      model,
      gestaltsUtils.decodeGestaltId(randomVertex2)!,
    )!;

    // From here we can check if the two gestalts are mutually exclusive
    const gestalt1New = (await real.getGestalt(
      gestaltsUtils.decodeGestaltId(randomVertex1)!,
    ))!;
    const gestalt2New = (await real.getGestalt(
      gestaltsUtils.decodeGestaltId(randomVertex2)!,
    ))!;
    expect(gestalt1New).toMatchObject(gestalt1ModelNew);
    expect(gestalt1New).not.toMatchObject(gestalt2ModelNew);
    expect(gestalt2New).not.toMatchObject(gestalt1ModelNew);
    expect(gestalt2New).toMatchObject(gestalt2ModelNew);
    // Permission should be removed
    expect(await real.getGestaltActions(this.gestaltId)).toStrictEqual({});
  }

  toString() {
    const gestaltId =
      this.gestaltId[0] === 'node'
        ? ['node', nodesUtils.encodeNodeId(this.gestaltId[1])]
        : this.gestaltId;
    return `unsetVertexCommand(${JSON.stringify(gestaltId)})`;
  }
}

class LinkNodeAndNodeCommand implements GestaltGraphCommand {
  constructor(
    public readonly nodeInfo1: GestaltNodeInfo,
    public readonly nodeInfo2: GestaltNodeInfo,
    public readonly nodeLink: Omit<GestaltLinkNode, 'id'>,
  ) {}

  check() {
    return true;
  }

  async run(model: GestaltGraphModel, real: GestaltGraph) {
    const gestaltId1: GestaltId = ['node', this.nodeInfo1.nodeId];
    const gestaltId2: GestaltId = ['node', this.nodeInfo2.nodeId];

    // Apply the mutation
    await real.linkNodeAndNode(this.nodeInfo1, this.nodeInfo2, this.nodeLink);

    // Expectations
    await expectLinkBeforeModel(model, real, gestaltId1, gestaltId2);

    // Update the model
    modelLink(model, ['node', this.nodeInfo1], ['node', this.nodeInfo2]);
  }

  toString() {
    const nodeInfo1 = {
      nodeId: nodesUtils.encodeNodeId(this.nodeInfo1.nodeId),
    };
    const nodeInfo2 = {
      nodeId: nodesUtils.encodeNodeId(this.nodeInfo2.nodeId),
    };
    // Ignoring the claim here, it's complex not really needed here
    return `linkNodeAndNodeCommand(${JSON.stringify(
      nodeInfo1,
    )}, ${JSON.stringify(nodeInfo2)})`;
  }
}

class UnlinkNodeAndNodeCommand implements GestaltGraphCommand {
  constructor(
    public readonly nodeId1: NodeId,
    public readonly nodeId2: NodeId,
  ) {}

  check() {
    return true;
  }

  async run(model: GestaltGraphModel, real: GestaltGraph) {
    const gestaltId1: GestaltId = ['node', this.nodeId1];
    const gestaltId2: GestaltId = ['node', this.nodeId2];

    // Apply the mutation
    await real.unlinkNodeAndNode(gestaltId1[1], gestaltId2[1]);

    // Update the model
    modelUnlink(model, gestaltId1, gestaltId2);

    // Expectation
    await expectUnlinkAfterModel(model, real, gestaltId1, gestaltId2);
  }

  toString() {
    return `unlinkNodeAndNodeCommand(${nodesUtils.encodeNodeId(
      this.nodeId1,
    )}, ${nodesUtils.encodeNodeId(this.nodeId2)})`;
  }
}

class LinkNodeAndIdentityCommand implements GestaltGraphCommand {
  constructor(
    public readonly nodeInfo: GestaltNodeInfo,
    public readonly identityInfo: GestaltIdentityInfo,
    public readonly identityLink: Omit<GestaltLinkIdentity, 'id'>,
  ) {}

  check() {
    return true;
  }

  async run(model: GestaltGraphModel, real: GestaltGraph) {
    const gestaltId1: GestaltId = ['node', this.nodeInfo.nodeId];
    const providerIdentityId: ProviderIdentityId = [
      this.identityInfo.providerId,
      this.identityInfo.identityId,
    ];
    const gestaltId2: GestaltId = ['identity', providerIdentityId];

    // Apply the mutation
    await real.linkNodeAndIdentity(
      this.nodeInfo,
      this.identityInfo,
      this.identityLink,
    );

    // Expectations
    await expectLinkBeforeModel(model, real, gestaltId1, gestaltId2);

    // Update the model
    modelLink(model, ['node', this.nodeInfo], ['identity', this.identityInfo]);
  }

  toString() {
    const nodeInfo = { nodeId: this.nodeInfo.nodeId };
    // Ignoring the claim here, it's complex not really needed here
    return `linkNodeAndIdentityCommand(${JSON.stringify(
      nodeInfo,
    )}, ${JSON.stringify(this.identityInfo)})`;
  }
}

class UnlinkNodeAndIdentityCommand implements GestaltGraphCommand {
  constructor(
    public readonly nodeId: NodeId,
    public readonly providerIdentityId: ProviderIdentityId,
  ) {}

  check() {
    return true;
  }

  async run(model: GestaltGraphModel, real: GestaltGraph) {
    const gestaltId1: GestaltId = ['node', this.nodeId];
    const gestaltId2: GestaltId = ['identity', this.providerIdentityId];

    // Apply the mutation
    await real.unlinkNodeAndIdentity(gestaltId1[1], gestaltId2[1]);

    // Update the model
    modelUnlink(model, gestaltId1, gestaltId2);

    // Expectation
    await expectUnlinkAfterModel(model, real, gestaltId1, gestaltId2);
  }

  toString() {
    return `unlinkNodeAndIdentityCommand(${nodesUtils.encodeNodeId(
      this.nodeId,
    )}, ${JSON.stringify(this.providerIdentityId)})`;
  }
}

class LinkVertexAndVertexCommand implements GestaltGraphCommand {
  constructor(
    public readonly nodeInfo: ['node', GestaltNodeInfo],
    public readonly vertexInfo: GestaltInfo,
    public readonly gestaltLink: GestaltLink,
  ) {}

  check() {
    return true;
  }

  async run(model: GestaltGraphModel, real: GestaltGraph) {
    const gestaltId1: GestaltId = ['node', this.nodeInfo[1].nodeId];
    const [type, data] = this.vertexInfo;
    const gestaltId2: GestaltId =
      type === 'node'
        ? ['node', data.nodeId]
        : ['identity', [data.providerId, data.identityId]];

    // Apply the mutation
    if (type === 'node') {
      await real.linkVertexAndVertex(
        this.nodeInfo,
        this.vertexInfo,
        this.gestaltLink as ['node', GestaltLinkNode],
      );
    } else {
      await real.linkVertexAndVertex(
        this.nodeInfo,
        this.vertexInfo,
        this.gestaltLink as ['identity', GestaltLinkIdentity],
      );
    }

    // Expectation
    await expectLinkBeforeModel(model, real, gestaltId1, gestaltId2);

    // Update the model
    modelLink(model, this.nodeInfo, this.vertexInfo);
  }

  toString() {
    const nodeId1 = this.nodeInfo[1].nodeId;
    const nodeInfo = ['node', { nodeId: nodesUtils.encodeNodeId(nodeId1) }];
    let vertexInfo = this.vertexInfo;
    if (this.vertexInfo[0] === 'node') {
      vertexInfo = ['node', { nodeId: this.vertexInfo[1].nodeId }];
    }
    // Ignoring the claim here, it's complex not really needed here
    return `linkVertexAndVertexCommand(${JSON.stringify(
      nodeInfo,
    )}, ${JSON.stringify(vertexInfo)})`;
  }
}

class UnlinkVertexAndVertexCommand implements GestaltGraphCommand {
  constructor(
    public readonly gestaltId1: ['node', NodeId],
    public readonly gestaltId2: GestaltId,
  ) {}

  check() {
    return true;
  }

  async run(model: GestaltGraphModel, real: GestaltGraph) {
    // Apply the mutation
    if (this.gestaltId2[0] === 'node') {
      await real.unlinkVertexAndVertex(this.gestaltId1, this.gestaltId2);
    } else {
      await real.unlinkVertexAndVertex(this.gestaltId1, this.gestaltId2);
    }

    // Update the model
    modelUnlink(model, this.gestaltId1, this.gestaltId2);

    // Expectation
    await expectUnlinkAfterModel(model, real, this.gestaltId1, this.gestaltId2);
  }

  toString() {
    const gestaltId1 = ['node', nodesUtils.encodeNodeId(this.gestaltId1[1])];
    const gestaltId2 =
      this.gestaltId2[0] === 'node'
        ? ['node', nodesUtils.encodeNodeId(this.gestaltId1[1])]
        : this.gestaltId2;
    return `unlinkVertexAndVertexCommand(${JSON.stringify(
      gestaltId1,
    )}, ${JSON.stringify(gestaltId2)})`;
  }
}

async function expectLinkBeforeModel(
  model: GestaltGraphModel,
  real: GestaltGraph,
  gestaltId1: GestaltId,
  gestaltId2: GestaltId,
): Promise<void> {
  // Getting gestalts from model
  const gestalt1Old = getGestaltFromModel(model, gestaltId1) ?? {};
  const gestalt2Old = getGestaltFromModel(model, gestaltId2) ?? {};
  const gestalt1ActionsOld = await real.getGestaltActions(gestaltId1);
  const gestalt2ActionsOld = await real.getGestaltActions(gestaltId2);
  const gestaltNew = (await real.getGestalt(gestaltId1))!;
  // We want to do the following checks
  // 1. the gestaltNew must be a union of gestalt1 and gestalt2.
  expect(gestaltNew).toMatchObject(gestalt1Old);
  expect(gestaltNew).toMatchObject(gestalt2Old);
  // 2. check if the resulting permissions are the union of the gestalt1 and gestalt2 permissions.
  const gestalt1ActionsNew = await real.getGestaltActions(gestaltId1);
  const gestalt2ActionsNew = await real.getGestaltActions(gestaltId2);
  // New permissions are a union of the old ones
  expect(gestalt1ActionsNew).toMatchObject(gestalt1ActionsOld);
  expect(gestalt1ActionsNew).toMatchObject(gestalt2ActionsOld);
  expect(gestalt2ActionsNew).toMatchObject(gestalt1ActionsOld);
  expect(gestalt2ActionsNew).toMatchObject(gestalt2ActionsOld);
  // 3. Check that the gestalt actions are the same for every vertex of the gestaltNew
  const keys = [
    ...Object.keys(gestaltNew.nodes),
    ...Object.keys(gestaltNew.identities),
  ];
  for (const gestaltIdEncoded of keys) {
    const gestaltId = gestaltsUtils.decodeGestaltId(gestaltIdEncoded)!;
    const actions = await real.getGestaltActions(gestaltId);
    expect(actions).toStrictEqual(gestalt1ActionsNew);
  }
}

async function expectUnlinkAfterModel(
  model: GestaltGraphModel,
  real: GestaltGraph,
  gestaltId1: GestaltId,
  gestaltId2: GestaltId,
) {
  // If either gestalt is missing then the link never existed
  const gestalt1New = await real.getGestalt(gestaltId1);
  if (gestalt1New == null) return;
  const gestalt2New = await real.getGestalt(gestaltId2);
  if (gestalt2New == null) return;
  const gestalt1ModelNew = getGestaltFromModel(model, gestaltId1) ?? {};
  const gestalt2ModelNew = getGestaltFromModel(model, gestaltId2) ?? {};
  expect(gestalt1New).toMatchObject(gestalt1ModelNew);
  expect(gestalt2New).toMatchObject(gestalt2ModelNew);
  if (gestalt2New.nodes[gestaltsUtils.encodeGestaltId(gestaltId1)] == null) {
    // If they are separate gestalts then they should be mutually exclusive
    if (gestalt2ModelNew != null) {
      expect(gestalt1New).not.toMatchObject(gestalt2ModelNew);
    }
    if (gestalt1ModelNew != null) {
      expect(gestalt2New).not.toMatchObject(gestalt1ModelNew);
    }
  }
}

function gestaltInfoToId(
  gestaltInfo: ['node', GestaltNodeInfo],
): ['node', NodeId];
function gestaltInfoToId(
  gestaltInfo: ['identity', GestaltIdentityInfo],
): ['identity', ProviderIdentityId];
function gestaltInfoToId(gestaltInfo: GestaltInfo): GestaltId;
function gestaltInfoToId(gestaltInfo: GestaltInfo): GestaltId {
  if (gestaltInfo[0] === 'node') {
    return ['node', gestaltInfo[1].nodeId];
  } else {
    return ['identity', [gestaltInfo[1].providerId, gestaltInfo[1].identityId]];
  }
}

function modelSetVertex(
  model: GestaltGraphModel,
  gestaltInfo: GestaltInfo,
): void {
  if (gestaltInfo[0] === 'node') {
    const gestaltIdEncoded = gestaltsUtils.encodeGestaltNodeId(
      gestaltInfoToId(gestaltInfo),
    );
    model.nodes[gestaltIdEncoded] = gestaltInfo[1];
  } else {
    const gestaltIdEncoded = gestaltsUtils.encodeGestaltIdentityId(
      gestaltInfoToId(gestaltInfo),
    );
    model.identities[gestaltIdEncoded] = gestaltInfo[1];
  }
}

function modelUnsetVertex(
  model: GestaltGraphModel,
  gestaltId: GestaltId,
): void {
  const gestaltIdEncoded = gestaltsUtils.encodeGestaltId(gestaltId);
  // Break all links for this vertex
  const link = model.matrix[gestaltIdEncoded];
  if (link != null) {
    for (const key of Object.keys(link)) {
      const link2 = model.matrix[key];
      if (link2 != null) delete link2[gestaltIdEncoded];
    }
    delete model.matrix[gestaltIdEncoded];
  }
  // Remove the vertex
  if (gestaltId[0] === 'node') delete model.nodes[gestaltIdEncoded];
  else delete model.identities[gestaltIdEncoded];
  // Remove permissions
  delete model.permissions[gestaltIdEncoded];
}

function modelSetActions(
  model: GestaltGraphModel,
  gestaltId: GestaltId,
  actions: GestaltActions,
) {
  const actionsOld =
    model.permissions[gestaltsUtils.encodeGestaltId(gestaltId)] ?? {};
  const actionsNew = { ...actionsOld, ...actions };
  const expectedGestalt = getGestaltFromModel(model, gestaltId);
  const keys =
    expectedGestalt != null
      ? [
          ...Object.keys(expectedGestalt.nodes),
          ...Object.keys(expectedGestalt.identities),
        ]
      : [];
  for (const key of keys) {
    model.permissions[key] = actionsNew;
  }
}

function modelLink(
  model: GestaltGraphModel,
  gestaltInfo1: GestaltInfo,
  gestaltInfo2: GestaltInfo,
) {
  const gestaltId1 = gestaltInfoToId(gestaltInfo1);
  const gestaltId1Encoded = gestaltsUtils.encodeGestaltId(gestaltId1);
  const gestaltId2 = gestaltInfoToId(gestaltInfo2);
  const gestaltId2Encoded = gestaltsUtils.encodeGestaltId(gestaltId2);
  // This needs to:
  // 1. set infos for each vertex
  modelSetVertex(model, gestaltInfo1);
  modelSetVertex(model, gestaltInfo2);
  // 2. create the link
  let links1 = model.matrix[gestaltId1Encoded];
  if (links1 == null) {
    links1 = {};
    model.matrix[gestaltId1Encoded] = links1;
  }
  let links2 = model.matrix[gestaltId2Encoded];
  if (links2 == null) {
    links2 = {};
    model.matrix[gestaltId2Encoded] = links2;
  }
  links2[gestaltId1Encoded] = null;
  links1[gestaltId2Encoded] = null;
  // 3. union the permissions for every vertex in the gestalt
  const permissions1Old = model.permissions[gestaltId1Encoded] ?? {};
  const permissions2Old = model.permissions[gestaltId2Encoded] ?? {};
  const permissionsNew = { ...permissions1Old, ...permissions2Old };
  modelSetActions(model, gestaltId1, permissionsNew);
}

function modelUnlink(
  model: GestaltGraphModel,
  gestaltId1: GestaltId,
  gestaltId2: GestaltId,
): void {
  // This just needs to break the link between vertices
  const gestaltId1Encoded = gestaltsUtils.encodeGestaltId(gestaltId1);
  const gestaltId2Encoded = gestaltsUtils.encodeGestaltId(gestaltId2);
  const links1 = model.matrix[gestaltId1Encoded];
  if (links1 != null) {
    delete links1[gestaltId2Encoded];
    if (Object.keys(links1).length === 0) {
      delete model.matrix[gestaltId1Encoded];
    }
  }
  const links2 = model.matrix[gestaltId2Encoded];
  if (links2 != null) {
    delete links2[gestaltId1Encoded];
    if (Object.keys(links2).length === 0) {
      delete model.matrix[gestaltId2Encoded];
    }
  }
}

function getGestaltFromModel(
  model: GestaltGraphModel,
  gestaltId: GestaltId,
):
  | {
      matrix: Record<GestaltIdEncoded, Record<GestaltIdEncoded, any>>;
      nodes: Record<GestaltIdEncoded, GestaltNodeInfo>;
      identities: Record<GestaltIdEncoded, GestaltIdentityInfo>;
    }
  | undefined {
  // This must closely mimic the Gestalt type.
  // Any specific data must be replaced with a expect.anything()
  const visited: Set<GestaltIdEncoded> = new Set();
  const gestaltIdEncoded = gestaltsUtils.encodeGestaltId(gestaltId);
  if (
    model.nodes[gestaltIdEncoded] == null &&
    model.identities[gestaltIdEncoded] == null
  ) {
    return;
  }
  const queue = [gestaltsUtils.encodeGestaltId(gestaltId)];
  const gestalt: {
    matrix: Record<GestaltIdEncoded, Record<GestaltIdEncoded, any>>;
    nodes: Record<GestaltIdEncoded, GestaltNodeInfo>;
    identities: Record<GestaltIdEncoded, GestaltIdentityInfo>;
  } = {
    matrix: {},
    nodes: {},
    identities: {},
  };
  while (true) {
    const gestaltIdEncoded = queue.shift();
    if (gestaltIdEncoded == null) break;
    if (
      model.nodes[gestaltIdEncoded] == null &&
      model.identities[gestaltIdEncoded] == null
    ) {
      continue;
    }
    const [type] = gestaltsUtils.decodeGestaltId(gestaltIdEncoded)!;
    if (type === 'node') {
      gestalt.nodes[gestaltIdEncoded] = model.nodes[gestaltIdEncoded];
    } else {
      gestalt.identities[gestaltIdEncoded] = model.identities[gestaltIdEncoded];
    }
    // Checking links

    let gestaltLinks = gestalt.matrix[gestaltIdEncoded];
    if (gestaltLinks == null) {
      gestaltLinks = {};
      gestalt.matrix[gestaltIdEncoded] = gestaltLinks;
    }
    const links = model.matrix[gestaltIdEncoded];
    if (links == null) continue;
    for (const linkIdEncoded of Object.keys(links) as Array<GestaltIdEncoded>) {
      // Adding the links
      gestaltLinks[linkIdEncoded] = expect.anything();
      let gestaltLinks2 = gestalt.matrix[linkIdEncoded];
      if (gestaltLinks2 == null) {
        gestaltLinks2 = {};
        gestalt.matrix[linkIdEncoded] = gestaltLinks2;
      }
      gestaltLinks2[gestaltIdEncoded] = expect.anything();
      // Adding to queue
      if (!visited.has(linkIdEncoded)) queue.push(linkIdEncoded);
      visited.add(linkIdEncoded);
    }
  }
  return gestalt;
}

export type { GestaltGraphModel, GestaltGraphCommand };
export {
  gestaltNodeInfoArb,
  gestaltIdentityInfoArb,
  gestaltLinkNodeArb,
  gestaltLinkIdentityArb,
  linkNodeArb,
  linkIdentityArb,
  gestaltActionsArb,
  SetVertexCommand,
  UnsetVertexCommand,
  LinkNodeAndNodeCommand,
  UnlinkNodeAndNodeCommand,
  LinkNodeAndIdentityCommand,
  UnlinkNodeAndIdentityCommand,
  LinkVertexAndVertexCommand,
  UnlinkVertexAndVertexCommand,
};
