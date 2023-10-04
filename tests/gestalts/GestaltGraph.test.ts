import type { NodeId } from '@/nodes/types';
import type { ProviderIdentityId } from '@/identities/types';
import type { SignedClaim } from '@/claims/types';
import type { Key } from '@/keys/types';
import type {
  ClaimLinkNode,
  ClaimLinkIdentity,
} from '../../src/claims/payloads/index';
import type {
  GestaltIdentityInfo,
  GestaltInfo,
  GestaltNodeInfo,
  GestaltId,
  GestaltLink,
  GestaltLinkId,
  GestaltLinkNode,
  GestaltLinkIdentity,
} from '../../src/gestalts/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { fc, testProp } from '@fast-check/jest';
import { AsyncIterableX as AsyncIterable } from 'ix/asynciterable';
import GestaltGraph from '@/gestalts/GestaltGraph';
import ACL from '@/acl/ACL';
import * as gestaltsErrors from '@/gestalts/errors';
import * as gestaltsUtils from '@/gestalts/utils';
import * as utils from '@/utils';
import * as keysUtils from '@/keys/utils';
import Token from '@/tokens/Token';
import { encodeGestaltNodeId, encodeGestaltIdentityId } from '@/gestalts/utils';
import * as nodesUtils from '@/nodes/utils';
import * as testsGestaltsUtils from './utils';
import * as testsIdentitiesUtils from '../identities/utils';
import * as testsKeysUtils from '../keys/utils';
import * as ids from '../../src/ids/index';
import * as testsIdsUtils from '../ids/utils';
import 'ix/add/asynciterable-operators/toarray';

describe('GestaltGraph', () => {
  const logger = new Logger('GestaltGraph Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let db: DB;
  let acl: ACL;

  // Composed arbs
  const gestaltNodeInfoComposedArb = testsIdsUtils.nodeIdArb.chain(
    testsGestaltsUtils.gestaltNodeInfoArb,
  );
  const linkNodeComposedArb = fc
    .tuple(testsKeysUtils.keyPairArb, testsKeysUtils.keyPairArb)
    .chain(([keyPair1, keyPair2]) => {
      const nodeId1 = keysUtils.publicKeyToNodeId(keyPair1.publicKey);
      const nodeId2 = keysUtils.publicKeyToNodeId(keyPair2.publicKey);
      return fc.record({
        gestaltNodeInfo1: testsGestaltsUtils.gestaltNodeInfoArb(nodeId1),
        gestaltNodeInfo2: testsGestaltsUtils.gestaltNodeInfoArb(nodeId2),
        linkNode: testsGestaltsUtils.linkNodeArb(keyPair1, keyPair2),
      });
    })
    .noShrink();
  const gestaltIdentityInfoComposedArb = fc
    .tuple(
      testsIdentitiesUtils.providerIdArb,
      testsIdentitiesUtils.identitiyIdArb,
    )
    .chain((item) => testsGestaltsUtils.gestaltIdentityInfoArb(...item))
    .noShrink();
  const linkIdentityComposedArb = fc
    .tuple(
      testsKeysUtils.keyPairArb,
      testsIdentitiesUtils.providerIdArb,
      testsIdentitiesUtils.identitiyIdArb,
    )
    .chain(([keyPair, providerId, identityId]) => {
      const nodeId = keysUtils.publicKeyToNodeId(keyPair.publicKey);
      return fc.record({
        gestaltNodeInfo: testsGestaltsUtils.gestaltNodeInfoArb(nodeId),
        gestaltIdentityInfo: testsGestaltsUtils.gestaltIdentityInfoArb(
          providerId,
          identityId,
        ),
        linkIdentity: testsGestaltsUtils.linkIdentityArb(
          keyPair,
          providerId,
          identityId,
        ),
      });
    })
    .noShrink();
  const gestaltInfoComposedArb = fc.oneof(
    fc.tuple(fc.constant('node'), gestaltNodeInfoComposedArb),
    fc.tuple(fc.constant('identity'), gestaltIdentityInfoComposedArb),
  ) as fc.Arbitrary<
    ['node', GestaltNodeInfo] | ['identity', GestaltIdentityInfo]
  >;
  const linkVertexComposedArb = fc
    .oneof(
      fc.tuple(fc.constant('node'), linkNodeComposedArb),
      fc.tuple(fc.constant('identity'), linkIdentityComposedArb),
    )
    .map((item) => {
      const [type, linkData] = item as any;
      switch (type) {
        case 'node':
          return {
            gestaltVertexInfo1: ['node', linkData.gestaltNodeInfo1] as [
              'node',
              GestaltNodeInfo,
            ],
            gestaltVertexInfo2: [
              'node',
              linkData.gestaltNodeInfo2,
            ] as GestaltInfo,
            gestaltLink: ['node', linkData.linkNode] as GestaltLink,
          };
        case 'identity':
          return {
            gestaltVertexInfo1: ['node', linkData.gestaltNodeInfo] as [
              'node',
              GestaltNodeInfo,
            ],
            gestaltVertexInfo2: [
              'identity',
              linkData.gestaltIdentityInfo,
            ] as GestaltInfo,
            gestaltLink: ['identity', linkData.linkIdentity] as GestaltLink,
          };
        default:
      }
      throw Error();
    })
    .noShrink();

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const dbPath = `${dataDir}/db`;
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: keysUtils.generateKey(),
        ops: {
          encrypt: async (key, plainText) => {
            return keysUtils.encryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(plainText),
            );
          },
          decrypt: async (key, cipherText) => {
            return keysUtils.decryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(cipherText),
            );
          },
        },
      },
    });
    acl = await ACL.createACL({ db, logger });
    //
    // // Initialise some dummy claims:
    // abcDeeSignatures['abc'] = 'abcSignature';
    // abcDeeSignatures['dee'] = 'deeSignature';
    // // Node claim on node abc: abc -> dee
    // nodeClaimAbcToDee = {
    //   payload: {
    //     hPrev: null,
    //     seq: 1,
    //     data: {
    //       type: 'node',
    //       node1: nodeIdABCEncoded,
    //       node2: nodeIdDEEEncoded,
    //     },
    //     iat: 1618203162,
    //   },
    //   signatures: abcDeeSignatures,
    // };
    // // Node claim on node dee: dee -> abc
    // nodeClaimDeeToAbc = {
    //   payload: {
    //     hPrev: null,
    //     seq: 1,
    //     data: {
    //       type: 'node',
    //       node1: nodeIdDEEEncoded, // TODO: use type guards for all `as NodeID` usages here.
    //       node2: nodeIdABCEncoded,
    //     },
    //     iat: 1618203162,
    //   },
    //   signatures: abcDeeSignatures,
    // };
    //
    // abcSignature['abc'] = 'abcSignature';
    // // Identity claim on node abc: abc -> GitHub
    // identityClaimAbcToGH = {
    //   payload: {
    //     hPrev: null,
    //     seq: 1,
    //     data: {
    //       type: 'identity',
    //       node: nodeIdABCEncoded,
    //       provider: 'github.com' as ProviderId,
    //       identity: 'abc' as IdentityId,
    //     },
    //     iat: 1618203162,
    //   },
    //   signatures: abcSignature,
    // };
    // // Identity claim on Github identity: GitHub -> abc
    // identityClaimGHToAbc = {
    //   id: 'abcGistId' as IdentityClaimId,
    //   payload: {
    //     hPrev: null,
    //     seq: 1,
    //     data: {
    //       type: 'identity',
    //       node: nodeIdABCEncoded,
    //       provider: 'github.com' as ProviderId,
    //       identity: 'abc' as IdentityId,
    //     },
    //     iat: 1618203162,
    //   },
    //   signatures: abcSignature,
    // };
  });
  afterEach(async () => {
    await acl.stop();
    await acl.destroy();
    await db.stop();
    await db.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('gestaltGraph readiness', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    await expect(gestaltGraph.destroy()).rejects.toThrow(
      gestaltsErrors.ErrorGestaltsGraphRunning,
    );
    // Should be a noop
    await gestaltGraph.start();
    await gestaltGraph.stop();
    await gestaltGraph.destroy();
    await expect(gestaltGraph.start()).rejects.toThrow(
      gestaltsErrors.ErrorGestaltsGraphDestroyed,
    );
    const getGestalts = async () => {
      for await (const _ of gestaltGraph.getGestalts()) {
        // Do nothing, should throw
      }
    };
    await expect(getGestalts()).rejects.toThrow(
      gestaltsErrors.ErrorGestaltsGraphNotRunning,
    );
  });
  testProp(
    'getNode, setNode and unsetNode',
    [gestaltNodeInfoComposedArb],
    async (gestaltNodeInfo) => {
      const gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger,
        fresh: true,
      });
      expect(await gestaltGraph.setNode(gestaltNodeInfo)).toEqual([
        'node',
        gestaltNodeInfo.nodeId,
      ]);
      expect(await gestaltGraph.getNode(gestaltNodeInfo.nodeId)).toEqual(
        gestaltNodeInfo,
      );
      await gestaltGraph.unsetNode(gestaltNodeInfo.nodeId);
      expect(
        await gestaltGraph.getNode(gestaltNodeInfo.nodeId),
      ).toBeUndefined();
      await gestaltGraph.stop();
    },
  );
  testProp(
    'setNode updates node information',
    [gestaltNodeInfoComposedArb],
    async (gestaltNodeInfo) => {
      const gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger,
        fresh: true,
      });
      expect(await gestaltGraph.setNode(gestaltNodeInfo)).toEqual([
        'node',
        gestaltNodeInfo.nodeId,
      ]);
      const gestaltNodeInfo_ = {
        ...gestaltNodeInfo,
        foo: 'bar',
      };
      expect(await gestaltGraph.setNode(gestaltNodeInfo_)).toEqual([
        'node',
        gestaltNodeInfo.nodeId,
      ]);
      expect(await gestaltGraph.getNode(gestaltNodeInfo.nodeId)).toEqual(
        gestaltNodeInfo_,
      );
      await gestaltGraph.stop();
    },
  );
  testProp(
    'linkNodeAndNode and unlinkNodeAndNode',
    [linkNodeComposedArb],
    async ({ gestaltNodeInfo1, gestaltNodeInfo2, linkNode }) => {
      const gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger,
        fresh: true,
      });
      const gestaltLinkId = await gestaltGraph.linkNodeAndNode(
        gestaltNodeInfo1,
        gestaltNodeInfo2,
        linkNode,
      );
      const gestaltLink = await gestaltGraph.getLinkById(gestaltLinkId);
      expect(gestaltLink).toBeDefined();
      expect(gestaltLink).toMatchObject([
        'node',
        {
          id: gestaltLinkId,
          claim: {
            payload: {
              typ: 'ClaimLinkNode',
              iss: ids.encodeNodeId(gestaltNodeInfo1.nodeId),
              sub: ids.encodeNodeId(gestaltNodeInfo2.nodeId),
            },
            signatures: expect.toSatisfy((signatures) => {
              return signatures.length === 2;
            }),
          },
          meta: expect.any(Object),
        },
      ]);
      const token = Token.fromSigned(
        gestaltLink![1].claim as SignedClaim<ClaimLinkNode>,
      );
      expect(
        token.verifyWithPublicKey(
          keysUtils.publicKeyFromNodeId(gestaltNodeInfo1.nodeId),
        ),
      ).toBe(true);
      expect(
        token.verifyWithPublicKey(
          keysUtils.publicKeyFromNodeId(gestaltNodeInfo2.nodeId),
        ),
      ).toBe(true);
      await gestaltGraph.unlinkNodeAndNode(
        gestaltNodeInfo1.nodeId,
        gestaltNodeInfo2.nodeId,
      );
      expect(await gestaltGraph.getLinkById(gestaltLinkId)).toBeUndefined();
      await gestaltGraph.stop();
    },
  );
  testProp(
    'get, set and unset identity',
    [gestaltIdentityInfoComposedArb],
    async (gestaltIdentityInfo) => {
      const gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger,
        fresh: true,
      });
      try {
        // Setting
        const [type, providerIdentityId] =
          await gestaltGraph.setIdentity(gestaltIdentityInfo);
        expect(type).toBe('identity');
        expect(providerIdentityId[0]).toBe(gestaltIdentityInfo.providerId);
        expect(providerIdentityId[1]).toBe(gestaltIdentityInfo.identityId);
        // Getting should return the same data
        expect(
          await gestaltGraph.getIdentity(providerIdentityId),
        ).toMatchObject(gestaltIdentityInfo);
        // Unsetting should remove the identity
        await gestaltGraph.unsetIdentity(providerIdentityId);
        expect(
          await gestaltGraph.getIdentity(providerIdentityId),
        ).toBeUndefined();
      } finally {
        await gestaltGraph.stop();
      }
    },
  );
  testProp(
    'setIdentity updates identity info',
    [gestaltIdentityInfoComposedArb],
    async (gestaltIdentityInfo) => {
      const gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger,
        fresh: true,
      });
      try {
        // Setting
        const [type, providerIdentityId] =
          await gestaltGraph.setIdentity(gestaltIdentityInfo);
        expect(type).toBe('identity');
        expect(providerIdentityId[0]).toBe(gestaltIdentityInfo.providerId);
        expect(providerIdentityId[1]).toBe(gestaltIdentityInfo.identityId);
        // Getting should return the same data
        expect(
          await gestaltGraph.getIdentity(providerIdentityId),
        ).toMatchObject(gestaltIdentityInfo);
        // Updating
        const newGestaltIdentityInfo = {
          ...gestaltIdentityInfo,
          foo: 'bar',
        };
        const [type_, providerIdentityId_] = await gestaltGraph.setIdentity(
          newGestaltIdentityInfo,
        );
        expect(type_).toBe('identity');
        expect(providerIdentityId_[0]).toBe(gestaltIdentityInfo.providerId);
        expect(providerIdentityId_[1]).toBe(gestaltIdentityInfo.identityId);
        // Getting should return the new data
        expect(
          await gestaltGraph.getIdentity(providerIdentityId),
        ).toMatchObject(newGestaltIdentityInfo);
      } finally {
        await gestaltGraph.stop();
      }
    },
  );
  testProp(
    'linkNodeAndIdentity and unlinkNodeAndIdentity',
    [linkIdentityComposedArb],
    async ({ gestaltNodeInfo, gestaltIdentityInfo, linkIdentity }) => {
      const gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger,
        fresh: true,
      });
      try {
        const gestaltLinkId = await gestaltGraph.linkNodeAndIdentity(
          gestaltNodeInfo,
          gestaltIdentityInfo,
          linkIdentity,
        );
        const gestaltLink = await gestaltGraph.getLinkById(gestaltLinkId);
        expect(gestaltLink).toBeDefined();
        expect(gestaltLink).toMatchObject([
          'identity',
          {
            id: gestaltLinkId,
            claim: {
              payload: {
                typ: 'ClaimLinkIdentity',
                iss: ids.encodeNodeId(gestaltNodeInfo.nodeId),
                sub: ids.encodeProviderIdentityId([
                  gestaltIdentityInfo.providerId,
                  gestaltIdentityInfo.identityId,
                ]),
              },
              signatures: expect.toSatisfy((signatures) => {
                return signatures.length === 1;
              }),
            },
            meta: expect.any(Object),
          },
        ]);
        const token = Token.fromSigned(
          gestaltLink![1].claim as SignedClaim<ClaimLinkIdentity>,
        );
        expect(
          token.verifyWithPublicKey(
            keysUtils.publicKeyFromNodeId(gestaltNodeInfo.nodeId),
          ),
        ).toBe(true);
        await gestaltGraph.unlinkNodeAndIdentity(gestaltNodeInfo.nodeId, [
          gestaltIdentityInfo.providerId,
          gestaltIdentityInfo.identityId,
        ]);
        expect(await gestaltGraph.getLinkById(gestaltLinkId)).toBeUndefined();
      } finally {
        await gestaltGraph.stop();
      }
    },
  );
  testProp(
    'getVertex, setVertex and unsetVertex',
    [gestaltInfoComposedArb],
    async (gestaltInfo) => {
      const gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger,
        fresh: true,
      });
      const [type, vertexInfo] = gestaltInfo;
      const gestaltId: GestaltId =
        type === 'node'
          ? [type, vertexInfo.nodeId]
          : [type, [vertexInfo.providerId, vertexInfo.identityId]];
      const vertexId = await gestaltGraph.setVertex(gestaltInfo);
      expect(vertexId).toEqual(gestaltId);
      expect(await gestaltGraph.getVertex(vertexId)).toEqual(gestaltInfo);
      await gestaltGraph.unsetVertex(vertexId);
      expect(await gestaltGraph.getVertex(vertexId)).toBeUndefined();
      await gestaltGraph.stop();
    },
  );
  testProp(
    'setVertex updates vertex information',
    [gestaltInfoComposedArb],
    async (gestaltInfo) => {
      const gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger,
        fresh: true,
      });
      const [type, vertexInfo] = gestaltInfo;
      const gestaltId: GestaltId =
        type === 'node'
          ? [type, vertexInfo.nodeId]
          : [type, [vertexInfo.providerId, vertexInfo.identityId]];
      const vertexId = await gestaltGraph.setVertex(gestaltInfo);
      expect(vertexId).toEqual(gestaltId);

      const gestaltInfo_ = [
        type,
        {
          ...gestaltInfo[1],
          foo: 'bar',
        },
      ] as ['node', GestaltNodeInfo] | ['identity', GestaltIdentityInfo];
      expect(await gestaltGraph.setVertex(gestaltInfo_)).toEqual(gestaltId);
      expect(await gestaltGraph.getVertex(vertexId)).toEqual(gestaltInfo_);
      await gestaltGraph.stop();
    },
  );
  testProp(
    'linkVertexAndVertex and unlinkVertexAndVertex',
    [linkVertexComposedArb],
    async ({ gestaltVertexInfo1, gestaltVertexInfo2, gestaltLink }) => {
      const gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger,
        fresh: true,
      });
      const [type] = gestaltVertexInfo2;
      // There is no generic form available for this method.
      //  We need to cast to the proper types.
      let gestaltLinkId: GestaltLinkId;
      switch (type) {
        case 'node':
          gestaltLinkId = await gestaltGraph.linkVertexAndVertex(
            gestaltVertexInfo1 as ['node', GestaltNodeInfo],
            gestaltVertexInfo2 as ['node', GestaltNodeInfo],
            gestaltLink as ['node', GestaltLinkNode],
          );
          break;
        case 'identity':
          gestaltLinkId = await gestaltGraph.linkVertexAndVertex(
            gestaltVertexInfo1 as ['node', GestaltNodeInfo],
            gestaltVertexInfo2 as ['identity', GestaltIdentityInfo],
            gestaltLink as ['identity', GestaltLinkIdentity],
          );
          break;
        default:
          fail('invalid logic');
      }
      const gestaltLinkNew = await gestaltGraph.getLinkById(gestaltLinkId);
      expect(gestaltLinkNew).toBeDefined();
      expect(gestaltLinkNew).toMatchObject([
        type,
        {
          id: gestaltLinkId,
          claim: {
            payload: gestaltLink[1].claim.payload,
            signatures: expect.toSatisfy((signatures) => {
              return signatures.length >= 1;
            }),
          },
          meta: expect.any(Object),
        },
      ]);
      const token = Token.fromSigned(
        gestaltLinkNew![1].claim as SignedClaim<ClaimLinkNode>,
      );
      const nodeId1 = gestaltVertexInfo1[1].nodeId as NodeId;
      expect(
        token.verifyWithPublicKey(keysUtils.publicKeyFromNodeId(nodeId1)),
      ).toBe(true);
      let nodeId2: NodeId | null = null;
      if (type === 'node') {
        nodeId2 = gestaltVertexInfo2[1].nodeId as NodeId;
        expect(
          token.verifyWithPublicKey(keysUtils.publicKeyFromNodeId(nodeId2)),
        ).toBe(true);
      }
      // There is no generic form for this method so we need to be type explicit
      if (nodeId2 != null) {
        await gestaltGraph.unlinkVertexAndVertex(
          ['node', nodeId1],
          ['node', nodeId2],
        );
      } else {
        await gestaltGraph.unlinkVertexAndVertex(['node', nodeId1], [
          'identity',
          [gestaltVertexInfo2[1].providerId, gestaltVertexInfo2[1].identityId],
        ] as ['identity', ProviderIdentityId]);
      }
      expect(await gestaltGraph.getLinkById(gestaltLinkId)).toBeUndefined();
      await gestaltGraph.stop();
    },
  );
  testProp(
    'getGestaltByNode',
    [gestaltNodeInfoComposedArb],
    async (gestaltNodeInfo) => {
      const gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger,
        fresh: true,
      });
      expect(await gestaltGraph.setNode(gestaltNodeInfo)).toEqual([
        'node',
        gestaltNodeInfo.nodeId,
      ]);
      const gestalt = await gestaltGraph.getGestaltByNode(
        gestaltNodeInfo.nodeId,
      );
      const gestaltNodeId = encodeGestaltNodeId([
        'node',
        gestaltNodeInfo.nodeId,
      ]);
      expect(gestalt).toMatchObject({
        matrix: {
          [gestaltNodeId]: {},
        },
        nodes: {
          [gestaltNodeId]: gestaltNodeInfo,
        },
        identities: {},
      });
    },
  );
  testProp(
    'getGestaltByIdentity',
    [gestaltIdentityInfoComposedArb],
    async (gestaltIdentityInfo) => {
      const gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger,
        fresh: true,
      });
      const providerIdentitiyId: ProviderIdentityId = [
        gestaltIdentityInfo.providerId,
        gestaltIdentityInfo.identityId,
      ];
      expect(await gestaltGraph.setIdentity(gestaltIdentityInfo)).toEqual([
        'identity',
        providerIdentitiyId,
      ]);
      const gestalt =
        await gestaltGraph.getGestaltByIdentity(providerIdentitiyId);
      const gestaltIdentityId = encodeGestaltIdentityId([
        'identity',
        providerIdentitiyId,
      ]);
      expect(gestalt).toMatchObject({
        matrix: {
          [gestaltIdentityId]: {},
        },
        nodes: {},
        identities: {
          [gestaltIdentityId]: gestaltIdentityInfo,
        },
      });
    },
  );
  testProp('getGestalt', [gestaltInfoComposedArb], async (gestaltInfo) => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
      fresh: true,
    });
    const gestaltId = await gestaltGraph.setVertex(gestaltInfo);
    const gestalt = await gestaltGraph.getGestalt(gestaltId);
    const [type] = gestaltInfo;
    switch (type) {
      case 'node':
        {
          const gestaltNodeId = encodeGestaltNodeId([
            'node',
            gestaltInfo[1].nodeId,
          ]);
          expect(gestalt).toMatchObject({
            matrix: {
              [gestaltNodeId]: {},
            },
            nodes: {
              [gestaltNodeId]: gestaltInfo[1],
            },
            identities: {},
          });
        }
        break;
      case 'identity':
        {
          const providerIdentitiyId: ProviderIdentityId = [
            gestaltInfo[1].providerId,
            gestaltInfo[1].identityId,
          ];
          const gestaltIdentityId = encodeGestaltIdentityId([
            'identity',
            providerIdentitiyId,
          ]);
          expect(gestalt).toMatchObject({
            matrix: {
              [gestaltIdentityId]: {},
            },
            nodes: {},
            identities: {
              [gestaltIdentityId]: gestaltInfo[1],
            },
          });
        }
        break;
      default:
        fail('invalid type');
    }
  });
  testProp(
    'getGestalts with nodes',
    [fc.array(gestaltNodeInfoComposedArb, { minLength: 2, maxLength: 10 })],
    async (gestaltNodeInfos) => {
      const ids = new Set<string>();
      for (const gestaltNodeInfo of gestaltNodeInfos) {
        ids.add(nodesUtils.encodeNodeId(gestaltNodeInfo.nodeId));
      }
      fc.pre(ids.size === gestaltNodeInfos.length);
      const gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger,
        fresh: true,
      });
      for (const gestaltNodeInfo of gestaltNodeInfos) {
        await gestaltGraph.setNode(gestaltNodeInfo);
      }
      const gestalts = await AsyncIterable.as(
        gestaltGraph.getGestalts(),
      ).toArray();
      expect(gestalts).toHaveLength(gestaltNodeInfos.length);
      for (const gestalt of gestalts) {
        const gestaltId = Object.keys(gestalt.nodes)[0];
        const [, nodeId] = gestaltsUtils.decodeGestaltNodeId(gestaltId)!;
        expect(gestalt).toMatchObject({
          matrix: {
            [gestaltId]: {},
          },
          nodes: {
            [gestaltId]: { nodeId },
          },
          identities: {},
        });
      }
    },
  );
  testProp(
    'getGestalts with identities',
    [
      fc
        .array(gestaltIdentityInfoComposedArb, { minLength: 2, maxLength: 10 })
        .noShrink(),
    ],
    async (gestaltIdentityInfos) => {
      const ids = new Set<string>();
      for (const gestaltIdentityInfo of gestaltIdentityInfos) {
        ids.add(
          gestaltIdentityInfo.providerId + gestaltIdentityInfo.identityId,
        );
      }
      fc.pre(ids.size === gestaltIdentityInfos.length);
      const gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger,
        fresh: true,
      });
      for (const gestaltIdentityInfo of gestaltIdentityInfos) {
        await gestaltGraph.setIdentity(gestaltIdentityInfo);
      }
      const gestalts = await AsyncIterable.as(
        gestaltGraph.getGestalts(),
      ).toArray();
      expect(gestalts).toHaveLength(gestaltIdentityInfos.length);
      for (const gestalt of gestalts) {
        const gestaltId = Object.keys(gestalt.identities)[0];
        const [, providerIdentityId] =
          gestaltsUtils.decodeGestaltIdentityId(gestaltId)!;
        expect(gestalt).toMatchObject({
          matrix: {
            [gestaltId]: {},
          },
          nodes: {},
          identities: {
            [gestaltId]: {
              providerId: providerIdentityId[0],
              identityId: providerIdentityId[1],
            },
          },
        });
      }
    },
  );
  testProp(
    'getGestalts with nodes and identities',
    [fc.array(gestaltInfoComposedArb, { minLength: 2, maxLength: 10 })],
    async (gestaltInfos) => {
      const ids = new Set<string>();
      for (const gestaltInfo of gestaltInfos) {
        const [type, data] = gestaltInfo;
        switch (type) {
          case 'identity':
            ids.add(data.providerId + data.identityId);
            break;
          case 'node':
            ids.add(nodesUtils.encodeNodeId(data.nodeId));
            break;
          default:
            break;
        }
      }
      fc.pre(ids.size === gestaltInfos.length);
      const gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger,
        fresh: true,
      });
      for (const gestaltinfo of gestaltInfos) {
        await gestaltGraph.setVertex(gestaltinfo);
      }
      const gestalts = await AsyncIterable.as(
        gestaltGraph.getGestalts(),
      ).toArray();
      expect(gestalts).toHaveLength(gestaltInfos.length);
      for (const gestalt of gestalts) {
        const gestaltId = Object.keys(gestalt.matrix)[0];
        const [type, id] = gestaltsUtils.decodeGestaltId(gestaltId)!;
        switch (type) {
          case 'node':
            {
              expect(gestalt).toMatchObject({
                matrix: {
                  [gestaltId]: {},
                },
                nodes: {
                  [gestaltId]: { nodeId: id },
                },
                identities: {},
              });
            }
            break;
          case 'identity':
            {
              expect(gestalt).toMatchObject({
                matrix: {
                  [gestaltId]: {},
                },
                nodes: {},
                identities: {
                  [gestaltId]: {
                    providerId: id[0],
                    identityId: id[1],
                  },
                },
              });
            }
            break;
          default:
            fail('invalid type');
        }
      }
    },
  );
  testProp(
    'getGestalt with node links',
    [linkNodeComposedArb],
    async ({ gestaltNodeInfo1, gestaltNodeInfo2, linkNode }) => {
      const gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger,
        fresh: true,
      });
      await gestaltGraph.linkNodeAndNode(
        gestaltNodeInfo1,
        gestaltNodeInfo2,
        linkNode,
      );

      const gestalt = (await gestaltGraph.getGestaltByNode(
        gestaltNodeInfo1.nodeId,
      ))!;
      const gestaltId1 = gestaltsUtils.encodeGestaltNodeId([
        'node',
        gestaltNodeInfo1.nodeId,
      ]);
      const gestaltId2 = gestaltsUtils.encodeGestaltNodeId([
        'node',
        gestaltNodeInfo2.nodeId,
      ]);
      // We expect that the links exist, don't care about details for this test
      expect(gestalt).toMatchObject({
        matrix: {
          [gestaltId1]: { [gestaltId2]: expect.any(Array) },
          [gestaltId2]: { [gestaltId1]: expect.any(Array) },
        },
        nodes: {
          [gestaltId1]: expect.any(Object),
          [gestaltId2]: expect.any(Object),
        },
        identities: {},
      });
      // Unlinking should split the gestalts
      await gestaltGraph.unlinkNodeAndNode(
        gestaltNodeInfo1.nodeId,
        gestaltNodeInfo2.nodeId,
      );
      expect(
        await gestaltGraph.getGestaltByNode(gestaltNodeInfo1.nodeId),
      ).toMatchObject({
        matrix: expect.toSatisfy((item) => {
          const keys = Object.keys(item);
          if (keys.length !== 1) return false;
          return keys[0] === gestaltId1;
        }),
        nodes: expect.toSatisfy((item) => {
          const keys = Object.keys(item);
          if (keys.length !== 1) return false;
          return keys[0] === gestaltId1;
        }),
        identities: {},
      });
      await gestaltGraph.stop();
    },
  );
  testProp(
    'getGestalt with identity links',
    [linkIdentityComposedArb],
    async ({ gestaltNodeInfo, gestaltIdentityInfo, linkIdentity }) => {
      const gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger,
        fresh: true,
      });
      await gestaltGraph.linkNodeAndIdentity(
        gestaltNodeInfo,
        gestaltIdentityInfo,
        linkIdentity,
      );
      const gestalt = (await gestaltGraph.getGestaltByIdentity([
        gestaltIdentityInfo.providerId,
        gestaltIdentityInfo.identityId,
      ]))!;
      const gestaltId1 = gestaltsUtils.encodeGestaltNodeId([
        'node',
        gestaltNodeInfo.nodeId,
      ]);
      const gestaltId2 = gestaltsUtils.encodeGestaltIdentityId([
        'identity',
        [gestaltIdentityInfo.providerId, gestaltIdentityInfo.identityId],
      ]);
      // We expect that the links exist, don't care about details for this test
      expect(gestalt).toMatchObject({
        matrix: {
          [gestaltId1]: { [gestaltId2]: expect.any(Array) },
          [gestaltId2]: { [gestaltId1]: expect.any(Array) },
        },
        nodes: {
          [gestaltId1]: expect.any(Object),
        },
        identities: {
          [gestaltId2]: expect.any(Object),
        },
      });
      // Unlinking should split the gestalts
      await gestaltGraph.unlinkNodeAndIdentity(gestaltNodeInfo.nodeId, [
        gestaltIdentityInfo.providerId,
        gestaltIdentityInfo.identityId,
      ]);
      expect(
        await gestaltGraph.getGestaltByNode(gestaltNodeInfo.nodeId),
      ).toMatchObject({
        matrix: expect.toSatisfy((item) => {
          const keys = Object.keys(item);
          if (keys.length !== 1) return false;
          return keys[0] === gestaltId1;
        }),
        nodes: expect.toSatisfy((item) => {
          const keys = Object.keys(item);
          if (keys.length !== 1) return false;
          return keys[0] === gestaltId1;
        }),
        identities: {},
      });
      await gestaltGraph.stop();
    },
  );
  testProp(
    'getGestalt with node and identity links',
    [linkVertexComposedArb],
    async ({ gestaltVertexInfo1, gestaltVertexInfo2, gestaltLink }) => {
      const gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger,
        fresh: true,
      });
      const [type, info] = gestaltVertexInfo2;
      switch (type) {
        case 'node':
          await gestaltGraph.linkVertexAndVertex(
            gestaltVertexInfo1 as ['node', GestaltNodeInfo],
            gestaltVertexInfo2 as ['node', GestaltNodeInfo],
            gestaltLink as ['node', GestaltLinkNode],
          );
          break;
        case 'identity':
          await gestaltGraph.linkVertexAndVertex(
            gestaltVertexInfo1 as ['node', GestaltNodeInfo],
            gestaltVertexInfo2 as ['identity', GestaltIdentityInfo],
            gestaltLink as ['identity', GestaltLinkIdentity],
          );
          break;
        default:
          fail('invalid type');
      }

      const gestalt = (await gestaltGraph.getGestalt([
        'node',
        gestaltVertexInfo1[1].nodeId,
      ]))!;
      const gestaltId1 = gestaltsUtils.encodeGestaltNodeId([
        'node',
        gestaltVertexInfo1[1].nodeId,
      ]);
      switch (type) {
        case 'node':
          {
            const gestaltId2 = gestaltsUtils.encodeGestaltNodeId([
              'node',
              info.nodeId,
            ]);
            // We expect that the links exist, don't care about details for this test
            expect(gestalt).toMatchObject({
              matrix: {
                [gestaltId1]: { [gestaltId2]: expect.any(Array) },
                [gestaltId2]: { [gestaltId1]: expect.any(Array) },
              },
              nodes: {
                [gestaltId1]: expect.any(Object),
                [gestaltId2]: expect.any(Object),
              },
              identities: {},
            });
            // Unlinking should split the gestalts
            await gestaltGraph.unlinkVertexAndVertex(
              ['node', gestaltVertexInfo1[1].nodeId],
              ['node', info.nodeId],
            );
            expect(
              await gestaltGraph.getGestalt([
                'node',
                gestaltVertexInfo1[1].nodeId,
              ]),
            ).toMatchObject({
              matrix: expect.toSatisfy((item) => {
                const keys = Object.keys(item);
                if (keys.length !== 1) return false;
                return keys[0] === gestaltId1;
              }),
              nodes: expect.toSatisfy((item) => {
                const keys = Object.keys(item);
                if (keys.length !== 1) return false;
                return keys[0] === gestaltId1;
              }),
              identities: {},
            });
          }
          break;
        case 'identity':
          {
            const gestaltId2 = gestaltsUtils.encodeGestaltIdentityId([
              'identity',
              [info.providerId, info.identityId],
            ]);
            // We expect that the links exist, don't care about details for this test
            expect(gestalt).toMatchObject({
              matrix: {
                [gestaltId1]: { [gestaltId2]: expect.any(Array) },
                [gestaltId2]: { [gestaltId1]: expect.any(Array) },
              },
              nodes: {
                [gestaltId1]: expect.any(Object),
              },
              identities: {
                [gestaltId2]: expect.any(Object),
              },
            });
            // Unlinking should split the gestalts
            await gestaltGraph.unlinkVertexAndVertex(
              ['node', gestaltVertexInfo1[1].nodeId],
              ['identity', [info.providerId, info.identityId]],
            );
            expect(
              await gestaltGraph.getGestalt([
                'node',
                gestaltVertexInfo1[1].nodeId,
              ]),
            ).toMatchObject({
              matrix: expect.toSatisfy((item) => {
                const keys = Object.keys(item);
                if (keys.length !== 1) return false;
                return keys[0] === gestaltId1;
              }),
              nodes: expect.toSatisfy((item) => {
                const keys = Object.keys(item);
                if (keys.length !== 1) return false;
                return keys[0] === gestaltId1;
              }),
              identities: {},
            });
          }
          break;
        default:
          fail('invalid type');
      }
      await gestaltGraph.stop();
    },
  );

  describe('Model based testing', () => {
    const altCommandsArb =
      // Use a record to generate a constrained set of vertices
      fc
        .record({
          keyPairs: fc.array(testsKeysUtils.keyPairArb, {
            minLength: 2,
            maxLength: 10,
          }),
          identityInfos: fc
            .array(gestaltIdentityInfoComposedArb, {
              minLength: 1,
              maxLength: 2,
            })
            .filter((v) => {
              const ids = new Set<string>();
              for (const identityInfo of v) {
                ids.add(identityInfo.providerId + identityInfo.identityId);
              }
              return ids.size === v.length;
            }),
        })
        .chain((verticies) => {
          const { keyPairs, identityInfos } = verticies;
          const nodeInfos = keyPairs.map((keyPair) => {
            const nodeId = keysUtils.publicKeyToNodeId(keyPair.publicKey);
            const nodeInfo: GestaltNodeInfo = { nodeId };
            return nodeInfo;
          });
          const vertexInfos = [
            ...nodeInfos.map((nodeInfo) => ['node', nodeInfo]),
            ...identityInfos.map((identityInfo) => ['identity', identityInfo]),
          ] as Array<GestaltInfo>;

          // Random selection arbs
          const randomNodeInfoArb = fc.constantFrom(...nodeInfos);
          const randomNodeIdArb = randomNodeInfoArb.map(
            (nodeInfo) => nodeInfo.nodeId,
          );
          const randomIdentityInfoArb = fc.constantFrom(...identityInfos);
          const randomProviderIdentityIdArb = randomIdentityInfoArb.map(
            (identityInfo) =>
              [
                identityInfo.providerId,
                identityInfo.identityId,
              ] as ProviderIdentityId,
          );
          const randomVertexInfo = fc.constantFrom(...vertexInfos);
          const randomVertexId = fc.oneof(
            fc.tuple(fc.constant('node'), randomNodeIdArb),
            fc.tuple(fc.constant('identity'), randomProviderIdentityIdArb),
          ) as fc.Arbitrary<GestaltId>;
          const randomKeyPair = fc.constantFrom(...keyPairs);

          const setVertexCommandArb = fc
            .tuple(randomVertexInfo, testsGestaltsUtils.gestaltActionsArb(1))
            .map((args) => new testsGestaltsUtils.SetVertexCommand(...args));
          const unsetVertexCommandArb = randomVertexId.map(
            (args) => new testsGestaltsUtils.UnsetVertexCommand(args),
          );
          const linkNodesParamsArb = fc
            .tuple(randomKeyPair, randomKeyPair)
            .filter(([a, b]) => !a.privateKey.equals(b.privateKey))
            .chain(([keyPair1, keyPair2]) => {
              const nodeInfo1 = {
                nodeId: keysUtils.publicKeyToNodeId(keyPair1.publicKey),
              };
              const nodeInfo2 = {
                nodeId: keysUtils.publicKeyToNodeId(keyPair2.publicKey),
              };
              return fc.tuple(
                fc.constant(nodeInfo1),
                fc.constant(nodeInfo2),
                testsGestaltsUtils.gestaltLinkNodeArb(keyPair1, keyPair2),
              );
            });
          const linkNodesCommandArb = linkNodesParamsArb.map(
            ([nodeInfo1, nodeInfo2, linkNode]) =>
              new testsGestaltsUtils.LinkNodeAndNodeCommand(
                nodeInfo1,
                nodeInfo2,
                linkNode,
              ),
          );

          const linkIdentitiesParamsArb = fc
            .tuple(randomKeyPair, randomIdentityInfoArb)
            .chain(([keyPair, identityInfo]) => {
              const nodeInfo = {
                nodeId: keysUtils.publicKeyToNodeId(keyPair.publicKey),
              };
              return fc.tuple(
                fc.constant(nodeInfo),
                fc.constant(identityInfo),
                testsGestaltsUtils.gestaltLinkIdentityArb(
                  keyPair,
                  identityInfo.providerId,
                  identityInfo.identityId,
                ),
              );
            });
          const linkIdentitiiesCommandArb = linkIdentitiesParamsArb.map(
            ([nodeInfo, identitiyInfo, linkIdentity]) =>
              new testsGestaltsUtils.LinkNodeAndIdentityCommand(
                nodeInfo,
                identitiyInfo,
                linkIdentity,
              ),
          );

          const linkVertexCommandArb = fc
            .oneof(
              linkNodesParamsArb.map(
                ([info1, info2, link]) =>
                  [
                    ['node', info1],
                    ['node', info2],
                    ['node', link],
                  ] as [GestaltInfo, GestaltInfo, GestaltLink],
              ),
              linkIdentitiesParamsArb.map(
                ([info1, info2, link]) =>
                  [
                    ['node', info1],
                    ['identity', info2],
                    ['identity', link],
                  ] as [GestaltInfo, GestaltInfo, GestaltLink],
              ),
            )
            .map(
              ([gestaltInfo1, gestaltInfo2, gestaltLink]) =>
                new testsGestaltsUtils.LinkVertexAndVertexCommand(
                  gestaltInfo1 as ['node', GestaltNodeInfo],
                  gestaltInfo2,
                  gestaltLink,
                ),
            );

          const unlinkNodeCommandArb = fc
            .tuple(randomNodeIdArb, randomNodeIdArb)
            .map(
              ([nodeId1, nodeId2]) =>
                new testsGestaltsUtils.UnlinkNodeAndNodeCommand(
                  nodeId1,
                  nodeId2,
                ),
            );

          const unlinkIdentityCommandArb = fc
            .tuple(randomNodeIdArb, randomProviderIdentityIdArb)
            .map(
              ([nodeId, identityId]) =>
                new testsGestaltsUtils.UnlinkNodeAndIdentityCommand(
                  nodeId,
                  identityId,
                ),
            );

          const unlinkVertexCommandArb = fc
            .tuple(
              randomNodeIdArb.map(
                (nodeId) => ['node', nodeId] as ['node', NodeId],
              ),
              randomVertexId,
            )
            .map(
              ([gestaltId1, gestaltId2]) =>
                new testsGestaltsUtils.UnlinkVertexAndVertexCommand(
                  gestaltId1,
                  gestaltId2,
                ),
            );

          const commandsUnlink = fc.commands(
            [
              unsetVertexCommandArb,
              unlinkNodeCommandArb,
              unlinkIdentityCommandArb,
              unlinkVertexCommandArb,
            ],
            { size: '+1' },
          );

          const commandsLink = fc.commands(
            [
              setVertexCommandArb,
              linkNodesCommandArb,
              linkIdentitiiesCommandArb,
              linkVertexCommandArb,
            ],
            { size: '=' },
          );
          return fc.tuple(commandsLink, commandsUnlink);
        })
        .map(([commandsLink, commandsUnlink]) => {
          return [...commandsLink, ...commandsUnlink];
        })
        .noShrink();

    testProp(
      'model',
      [altCommandsArb],
      async (cmds) => {
        await acl.start({ fresh: true });
        const gestaltGraph = await GestaltGraph.createGestaltGraph({
          db,
          acl,
          logger,
          fresh: true,
        });
        try {
          const model: testsGestaltsUtils.GestaltGraphModel = {
            matrix: {},
            nodes: {},
            identities: {},
            permissions: {},
          };
          const modelSetup = async () => {
            return {
              model,
              real: gestaltGraph,
            };
          };
          await fc.asyncModelRun(modelSetup, cmds);
        } finally {
          await gestaltGraph.stop();
          await acl.stop();
        }
      },
      { numRuns: 20 },
    );
  });
});
