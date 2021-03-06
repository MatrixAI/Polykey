import type { Gestalt } from '@/gestalts/types';
import type { NodeId } from '@/nodes/types';
import type { IdentityId, IdentityInfo, ProviderId } from '@/identities/types';
import type { NodeInfo } from '@/nodes/types';
import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import { DB } from '@matrixai/db';
import { Metadata } from '@grpc/grpc-js';
import GestaltGraph from '@/gestalts/GestaltGraph';
import ACL from '@/acl/ACL';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import gestaltsGestaltGetByIdentity from '@/client/service/gestaltsGestaltGetByIdentity';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import * as gestaltsPB from '@/proto/js/polykey/v1/gestalts/gestalts_pb';
import * as gestaltUtils from '@/gestalts/utils';
import * as clientUtils from '@/client/utils/utils';
import * as nodesUtils from '@/nodes/utils';

describe('gestaltsGestaltGetByIdentity', () => {
  const logger = new Logger(
    'gestaltsGestaltGetByIdentity test',
    LogLevel.WARN,
    [new StreamHandler()],
  );
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  const nodeId = IdInternal.create<NodeId>([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 5,
  ]);
  const node: NodeInfo = {
    id: nodesUtils.encodeNodeId(nodeId),
    chain: {},
  };
  const identity: IdentityInfo = {
    identityId: 'identityId' as IdentityId,
    providerId: 'providerId' as ProviderId,
    claims: {},
  };
  const nodeKey = gestaltUtils.keyFromNode(nodeId);
  const identityKey = gestaltUtils.keyFromIdentity(
    identity.providerId,
    identity.identityId,
  );
  const expectedGestalt: Gestalt = {
    matrix: {},
    nodes: {},
    identities: {},
  };
  expectedGestalt.matrix[identityKey] = {};
  expectedGestalt.matrix[nodeKey] = {};
  expectedGestalt.matrix[identityKey][nodeKey] = null;
  expectedGestalt.matrix[nodeKey][identityKey] = null;
  expectedGestalt.nodes[nodeKey] = node;
  expectedGestalt.identities[identityKey] = identity;
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
    await gestaltGraph.linkNodeAndIdentity(node, identity);
    const clientService = {
      gestaltsGestaltGetByIdentity: gestaltsGestaltGetByIdentity({
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
  test('gets gestalt by identity', async () => {
    const request = new identitiesPB.Provider();
    request.setIdentityId(identity.identityId);
    request.setProviderId(identity.providerId);
    const response = await grpcClient.gestaltsGestaltGetByIdentity(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(gestaltsPB.Graph);
    expect(JSON.parse(response.getGestaltGraph())).toEqual(expectedGestalt);
  });
});
