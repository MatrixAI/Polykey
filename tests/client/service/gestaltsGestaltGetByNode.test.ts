import type { Host, Port } from '@/network/types';
import type { GestaltIdentityInfo, GestaltNodeInfo } from '@/gestalts/types';
import type { NodeId } from '@/nodes/types';
import type {
  IdentityId,
  ProviderId,
  ProviderIdentityClaimId,
} from '@/identities/types';
import type { ClaimLinkIdentity } from '@/claims/payloads/index';
import type { ClaimIdEncoded } from '@/ids/index';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Metadata } from '@grpc/grpc-js';
import { DB } from '@matrixai/db';
import { IdInternal } from '@matrixai/id';
import GestaltGraph from '@/gestalts/GestaltGraph';
import ACL from '@/acl/ACL';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import gestaltsGestaltGetByNode from '@/client/service/gestaltsGestaltGetByNode';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as nodesPB from '@/proto/js/polykey/v1/nodes/nodes_pb';
import * as gestaltsPB from '@/proto/js/polykey/v1/gestalts/gestalts_pb';
import * as gestaltUtils from '@/gestalts/utils';
import * as nodesUtils from '@/nodes/utils';
import * as clientUtils from '@/client/utils';
import { encodeProviderIdentityId } from '@/ids/index';
import Token from '@/tokens/Token';
import * as keysUtils from '@/keys/utils';

describe('gestaltsGestaltGetByNode', () => {
  const logger = new Logger('gestaltsGestaltGetByNode test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  const keyPair = keysUtils.generateKeyPair();
  const nodeId = keysUtils.publicKeyToNodeId(keyPair.publicKey);
  const node: GestaltNodeInfo = {
    nodeId: nodeId,
  };
  const identity: GestaltIdentityInfo = {
    identityId: 'identityId' as IdentityId,
    providerId: 'providerId' as ProviderId,
  };
  const nodeKey = gestaltUtils.encodeGestaltId(['node', nodeId]);
  const identityKey = gestaltUtils.encodeGestaltId([
    'identity',
    [identity.providerId, identity.identityId],
  ]);
  const expectedGestalt = {
    matrix: {},
    nodes: {},
    identities: {},
  };
  expectedGestalt.matrix[identityKey] = {};
  expectedGestalt.matrix[nodeKey] = {};
  expectedGestalt.matrix[identityKey][nodeKey] = null;
  expectedGestalt.matrix[nodeKey][identityKey] = null;
  expectedGestalt.nodes[nodeKey] = expect.anything();
  expectedGestalt.identities[identityKey] = expect.anything();
  let dataDir: string;
  let gestaltGraph: GestaltGraph;
  let acl: ACL;
  let db: DB;
  let grpcServer: GRPCServer;
  let grpcClient: GRPCClientClient;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    acl = await ACL.createACL({
      db,
      logger,
    });
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    // Constructing the claim
    const dummyClaim: ClaimLinkIdentity = {
      typ: 'ClaimLinkIdentity',
      iss: nodesUtils.encodeNodeId(nodeId),
      sub: encodeProviderIdentityId([identity.providerId, identity.identityId]),
      jti: '' as ClaimIdEncoded,
      iat: 0,
      nbf: 0,
      exp: 0,
      aud: '',
      seq: 0,
      prevClaimId: null,
      prevDigest: null,
    };
    const token = Token.fromPayload(dummyClaim);
    token.signWithPrivateKey(keyPair);
    const signedClaim = token.toSigned();
    await gestaltGraph.linkNodeAndIdentity(node, identity, {
      claim: signedClaim,
      meta: { providerIdentityClaimId: '' as ProviderIdentityClaimId },
    });
    const clientService = {
      gestaltsGestaltGetByNode: gestaltsGestaltGetByNode({
        authenticate,
        gestaltGraph,
        logger,
        db,
      }),
    };
    grpcServer = new GRPCServer({ logger });
    await grpcServer.start({
      services: [[ClientServiceService, clientService]],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
    });
    grpcClient = await GRPCClientClient.createGRPCClientClient({
      nodeId: IdInternal.create<NodeId>([
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 8,
      ]),
      host: '127.0.0.1' as Host,
      port: grpcServer.getPort(),
      logger,
    });
  });
  afterEach(async () => {
    await grpcClient.destroy();
    await grpcServer.stop();
    await gestaltGraph.stop();
    await acl.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets gestalt by node', async () => {
    const request = new nodesPB.Node();
    request.setNodeId(nodesUtils.encodeNodeId(node.nodeId));
    const response = await grpcClient.gestaltsGestaltGetByNode(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(gestaltsPB.Graph);
    expect(JSON.parse(response.getGestaltGraph())).toMatchObject(
      expectedGestalt,
    );
  });
});
