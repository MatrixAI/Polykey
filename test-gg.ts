import fc from 'fast-check';
import type { ClaimIdEncoded, IdentityId, NodeId, ProviderId } from './src/ids';
import { DB } from '@matrixai/db';
import ACL from './src/acl/ACL';
import GestaltGraph from './src/gestalts/GestaltGraph';
import { IdInternal }  from '@matrixai/id';
import Logger, { LogLevel, StreamHandler, formatting } from '@matrixai/logger';
import * as ids from './src/ids';

const nodeIdArb = fc.uint8Array({ minLength: 32, maxLength: 32 }).map(
  IdInternal.create
) as fc.Arbitrary<NodeId>;

// const nodeId = IdInternal.fromBuffer<NodeId>(Buffer.allocUnsafe(32));

async function main() {

  // Top level
  // but we cannot raise the bottom level
  // we can only hide levels
  // or filter
  // You could also set a filter

  const logger = new Logger(
    'TEST',
    LogLevel.DEBUG,
    [
      new StreamHandler(
        formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`
      ),
    ]
  );

  const dbLogger = logger.getChild('DB');
  dbLogger.setLevel(LogLevel.INFO);

  const db = await DB.createDB({
    dbPath: 'tmp/db',
    logger: dbLogger,
    fresh: true,
  });

  const aclLogger = logger.getChild('ACL');
  aclLogger.setLevel(LogLevel.INFO);

  const acl = await ACL.createACL({
    db,
    logger: aclLogger,
  });


  const ggLogger = logger.getChild('GestaltGraph');
  ggLogger.setLevel(LogLevel.DEBUG);

  const gg = await GestaltGraph.createGestaltGraph({
    db,
    acl,
    logger: ggLogger,
  });

  const nodeId1 = fc.sample(nodeIdArb, 1)[0];


  await gg.setNode({
    nodeId: nodeId1
  });

  const nodeId2 = fc.sample(nodeIdArb, 1)[0];

  await gg.setNode({
    nodeId: nodeId2,
  });

  const nodeId3 = fc.sample(nodeIdArb, 1)[0];

  await gg.setNode({
    nodeId: nodeId3,
  });

  const nodeId4 = fc.sample(nodeIdArb, 1)[0];

  await gg.setNode({
    nodeId: nodeId4,
  });

  const nodeId5 = fc.sample(nodeIdArb, 1)[0];

  await gg.setNode({
    nodeId: nodeId5,
  });

  await gg.setIdentity({
    providerId: '123' as ProviderId,
    identityId: 'abc' as IdentityId
  });

  await gg.linkNodeAndNode(
    {
      nodeId: nodeId1
    },
    {
      nodeId: nodeId2
    },
    {
      meta: {},
      claim: {
        payload: {
          iss: ids.encodeNodeId(nodeId1),
          sub: ids.encodeNodeId(nodeId2),
          jti: 'asfoiuadf' as ClaimIdEncoded,
          iat: 123,
          nbf: 123,
          seq: 123,
          prevClaimId: null,
          prevDigest: null
        },
        signatures: []
      }
    }
  );

  await gg.linkNodeAndNode(
    {
      nodeId: nodeId1
    },
    {
      nodeId: nodeId3
    },
    {
      meta: {},
      claim: {
        payload: {
          iss: ids.encodeNodeId(nodeId1),
          sub: ids.encodeNodeId(nodeId3),
          jti: 'asfoiuadf' as ClaimIdEncoded,
          iat: 123,
          nbf: 123,
          seq: 123,
          prevClaimId: null,
          prevDigest: null
        },
        signatures: []
      }
    }
  );

  await gg.linkNodeAndNode(
    {
      nodeId: nodeId2
    },
    {
      nodeId: nodeId3
    },
    {
      meta: {},
      claim: {
        payload: {
          iss: ids.encodeNodeId(nodeId2),
          sub: ids.encodeNodeId(nodeId3),
          jti: 'asfoiuadf' as ClaimIdEncoded,
          iat: 123,
          nbf: 123,
          seq: 123,
          prevClaimId: null,
          prevDigest: null
        },
        signatures: []
      }
    }
  );

  // await gg.linkNodeAndNode(
  //   {
  //     nodeId: nodeId1
  //   },
  //   {
  //     nodeId: nodeId2
  //   },
  //   {
  //     type: 'node',
  //     meta: {},
  //     claim: {
  //       payload: {
  //         jti: 's8d9sf98s7fd98sfd7' as ClaimIdEncoded,
  //         iss: ids.encodeNodeId(nodeId1),
  //         sub: ids.encodeNodeId(nodeId2),
  //         iat: 123,
  //         nbf: 123,
  //         seq: 123,
  //         prevClaimId: null,
  //         prevDigest: null
  //       },
  //       signatures: []
  //     }
  //   }
  // );

  console.log(await db.dump(gg.dbMatrixPath, true));
  // console.log(await db.dump(gg.dbNodesPath, true));
  // console.log(await db.dump(gg.dbLinksPath, true));

  for await (const gestalt of gg.getGestalts()) {
    console.group('Gestalt');
    console.dir(gestalt, { depth: null });
    // console.log('nodes', gestalt.nodes);
    console.groupEnd();
  }

}

main();
