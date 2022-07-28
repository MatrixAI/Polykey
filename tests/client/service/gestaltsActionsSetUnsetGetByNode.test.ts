import type { NodeId, NodeInfo } from '@/nodes/types';
import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { IdInternal } from '@matrixai/id';
import { Metadata } from '@grpc/grpc-js';
import GestaltGraph from '@/gestalts/GestaltGraph';
import ACL from '@/acl/ACL';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import gestaltsActionsSetByNode from '@/client/service/gestaltsActionsSetByNode';
import gestaltsActionsGetByNode from '@/client/service/gestaltsActionsGetByNode';
import gestaltsActionsUnsetByNode from '@/client/service/gestaltsActionsUnsetByNode';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as nodesPB from '@/proto/js/polykey/v1/nodes/nodes_pb';
import * as permissionsPB from '@/proto/js/polykey/v1/permissions/permissions_pb';
import * as nodesUtils from '@/nodes/utils';
import * as clientUtils from '@/client/utils/utils';

describe('gestaltsActionsByNode', () => {
  const logger = new Logger('gestaltsActionsByNode test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
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
    // Need node to be set in GG to set permissions for it
    await gestaltGraph.setNode(node);
    const clientService = {
      gestaltsActionsSetByNode: gestaltsActionsSetByNode({
        authenticate,
        gestaltGraph,
        logger,
        db,
      }),
      gestaltsActionsGetByNode: gestaltsActionsGetByNode({
        authenticate,
        gestaltGraph,
        logger,
        db,
      }),
      gestaltsActionsUnsetByNode: gestaltsActionsUnsetByNode({
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
  test('sets/unsets/gets actions by node', async () => {
    // Set permission
    const nodeMessage = new nodesPB.Node();
    nodeMessage.setNodeId(node.id);
    const request = new permissionsPB.ActionSet();
    request.setNode(nodeMessage);
    request.setAction('notify');
    const setResponse = await grpcClient.gestaltsActionsSetByNode(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(setResponse).toBeInstanceOf(utilsPB.EmptyMessage);
    // Check for permission
    const getSetResponse = await grpcClient.gestaltsActionsGetByNode(
      nodeMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(getSetResponse).toBeInstanceOf(permissionsPB.Actions);
    expect(getSetResponse.getActionList()).toContainEqual('notify');
    // Unset permission
    const unsetResponse = await grpcClient.gestaltsActionsUnsetByNode(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(unsetResponse).toBeInstanceOf(utilsPB.EmptyMessage);
    // Check permission was removed
    const getUnsetResponse = await grpcClient.gestaltsActionsGetByNode(
      nodeMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(getUnsetResponse).toBeInstanceOf(permissionsPB.Actions);
    expect(getUnsetResponse.getActionList()).toHaveLength(0);
  });
});
