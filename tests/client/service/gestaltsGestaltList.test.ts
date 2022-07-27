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
import gestaltsGestaltList from '@/client/service/gestaltsGestaltList';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as gestaltsPB from '@/proto/js/polykey/v1/gestalts/gestalts_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as gestaltUtils from '@/gestalts/utils';
import * as clientUtils from '@/client/utils/utils';
import * as nodesUtils from '@/nodes/utils';

describe('gestaltsGestaltList', () => {
  const logger = new Logger('gestaltsGestaltList test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  // Creating gestalts (gestalt1 with one node and gestalt2 with one identity)
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
  const gestalt1: Gestalt = {
    matrix: {},
    nodes: {},
    identities: {},
  };
  gestalt1.matrix[nodeKey] = {};
  gestalt1.nodes[nodeKey] = node;
  const gestalt2: Gestalt = {
    matrix: {},
    nodes: {},
    identities: {},
  };
  gestalt2.matrix[identityKey] = {};
  gestalt2.identities[identityKey] = identity;
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
      // @ts-ignore - version of js-logger is incompatible (remove when EFS logger updates to 3.*)
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
    await gestaltGraph.setNode(node);
    await gestaltGraph.setIdentity(identity);
    const clientService = {
      gestaltsGestaltList: gestaltsGestaltList({
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
  test('lists gestalts', async () => {
    const request = new utilsPB.EmptyMessage();
    const response = grpcClient.gestaltsGestaltList(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    const gestalts: Array<string> = [];
    for await (const gestalt of response) {
      expect(gestalt).toBeInstanceOf(gestaltsPB.Gestalt);
      gestalts.push(JSON.parse(gestalt.getName()));
    }
    expect(gestalts).toHaveLength(2);
    expect(gestalts).toContainEqual(gestalt1);
    expect(gestalts).toContainEqual(gestalt2);
  });
});
