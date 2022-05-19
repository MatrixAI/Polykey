import type { IdentityId, IdentityInfo, ProviderId } from '@/identities/types';
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
import gestaltsActionsSetByIdentity from '@/client/service/gestaltsActionsSetByIdentity';
import gestaltsActionsGetByIdentity from '@/client/service/gestaltsActionsGetByIdentity';
import gestaltsActionsUnsetByIdentity from '@/client/service/gestaltsActionsUnsetByIdentity';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import * as permissionsPB from '@/proto/js/polykey/v1/permissions/permissions_pb';
import * as nodesUtils from '@/nodes/utils';
import * as clientUtils from '@/client/utils/utils';

describe('gestaltsActionsByIdentity', () => {
  const logger = new Logger('gestaltsActionsByIdentity test', LogLevel.WARN, [
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
  const identity: IdentityInfo = {
    identityId: 'identityId' as IdentityId,
    providerId: 'providerId' as ProviderId,
    claims: {},
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
    // Need identity set in GG with linked node to set permissions
    await gestaltGraph.linkNodeAndIdentity(node, identity);
    const clientService = {
      gestaltsActionsSetByIdentity: gestaltsActionsSetByIdentity({
        authenticate,
        gestaltGraph,
        logger,
        db,
      }),
      gestaltsActionsGetByIdentity: gestaltsActionsGetByIdentity({
        authenticate,
        gestaltGraph,
        logger,
      }),
      gestaltsActionsUnsetByIdentity: gestaltsActionsUnsetByIdentity({
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
  test('sets/unsets/gets actions by identity', async () => {
    // Set permission
    const providerMessage = new identitiesPB.Provider();
    providerMessage.setIdentityId(identity.identityId);
    providerMessage.setProviderId(identity.providerId);
    const request = new permissionsPB.ActionSet();
    request.setIdentity(providerMessage);
    request.setAction('notify');
    const setResponse = await grpcClient.gestaltsActionsSetByIdentity(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(setResponse).toBeInstanceOf(utilsPB.EmptyMessage);
    // Check for permission
    const getSetResponse = await grpcClient.gestaltsActionsGetByIdentity(
      providerMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(getSetResponse).toBeInstanceOf(permissionsPB.Actions);
    expect(getSetResponse.getActionList()).toContainEqual('notify');
    // Unset permission
    const unsetResponse = await grpcClient.gestaltsActionsUnsetByIdentity(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(unsetResponse).toBeInstanceOf(utilsPB.EmptyMessage);
    // Check permission was removed
    const getUnsetResponse = await grpcClient.gestaltsActionsGetByIdentity(
      providerMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(getUnsetResponse).toBeInstanceOf(permissionsPB.Actions);
    expect(getUnsetResponse.getActionList()).toHaveLength(0);
  });
});
