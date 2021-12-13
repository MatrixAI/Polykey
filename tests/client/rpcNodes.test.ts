import type * as grpc from '@grpc/grpc-js';
import type { NodeAddress } from '@/nodes/types';
import type { Host, Port } from '@/network/types';
import type * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import type { NodeManager } from '@/nodes';
import type { ClientServiceClient } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { PolykeyAgent } from '@';
import * as nodesPB from '@/proto/js/polykey/v1/nodes/nodes_pb';
import { KeyManager } from '@/keys';
import { ForwardProxy } from '@/network';

import * as grpcUtils from '@/grpc/utils';
import * as nodesErrors from '@/nodes/errors';
import { makeNodeId } from '@/nodes/utils';
import config from '@/config';
import { Status } from '@/status';
import * as testUtils from './utils';
import * as testKeynodeUtils from '../utils';
import { sleep } from '@/utils';

// Mocks.
jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

/**
 * This test file has been optimised to use only one instance of PolykeyAgent where posible.
 * Setting up the PolykeyAgent has been done in a beforeAll block.
 * Keep this in mind when adding or editing tests.
 * Any side effects need to be undone when the test has completed.
 * Preferably within a `afterEach()` since any cleanup will be skipped inside a failing test.
 *
 * - left over state can cause a test to fail in certain cases.
 * - left over state can cause similar tests to succeed when they should fail.
 * - starting or stopping the agent within tests should be done on a new instance of the polykey agent.
 * - when in doubt test each modified or added test on it's own as well as the whole file.
 * - Looking into adding a way to safely clear each domain's DB information with out breaking modules.
 */
describe('Client service', () => {
  const password = 'password';
  const logger = new Logger('rpcNodes Test', LogLevel.DEBUG, [
    new StreamHandler(),
  ]);
  let client: ClientServiceClient;
  let server: grpc.Server;
  let port: number;

  let dataDir: string;

  let polykeyAgent: PolykeyAgent;
  let keyManager: KeyManager;
  let nodeManager: NodeManager;
  let polykeyServer: PolykeyAgent;

  let passwordFile: string;

  let callCredentials: grpc.Metadata;

  // Node and identity infos.
  const nodeId1 = makeNodeId(
    'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0',
  );
  const dummyNode = makeNodeId(
    'vi3et1hrpv2m2lrplcm7cu913kr45v51cak54vm68anlbvuf83ra0',
  );

  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );

    passwordFile = path.join(dataDir, 'password');
    await fs.promises.writeFile(passwordFile, 'password');
    const keysPath = path.join(dataDir, 'keys');

    keyManager = await KeyManager.createKeyManager({
      keysPath,
      password,
      logger,
    });

    const fwdProxy = new ForwardProxy({
      authToken: 'abc',
      logger: logger,
    });

    polykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: dataDir,
      logger,
      fwdProxy,
      keyManager,
      forwardProxyConfig: {
        connTimeoutTime: 2000,
      },
    });

    nodeManager = polykeyAgent.nodeManager;

    [server, port] = await testUtils.openTestClientServer({
      polykeyAgent,
      secure: false,
    });

    client = await testUtils.openSimpleClientClient(port);

    polykeyServer = await testKeynodeUtils.setupRemoteKeynode({
      logger: logger,
    });
    await polykeyAgent.acl.setNodePerm(polykeyServer.nodeManager.getNodeId(), {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await polykeyServer.acl.setNodePerm(nodeManager.getNodeId(), {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
  }, global.polykeyStartupTimeout);
  afterAll(async () => {
    await testKeynodeUtils.cleanupRemoteKeynode(polykeyServer);

    await testUtils.closeTestClientServer(server);
    testUtils.closeSimpleClientClient(client);

    await polykeyAgent.stop();
    await polykeyAgent.destroy();

    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    await fs.promises.rm(passwordFile);
  });
  beforeEach(async () => {
    const sessionToken = await polykeyAgent.sessionManager.createToken();
    callCredentials = testUtils.createCallCredentials(sessionToken);
    await polykeyAgent.notificationsManager.clearNotifications();
    await polykeyServer.notificationsManager.clearNotifications();
  });
  afterEach(async () => {
    await polykeyServer.start({ password });
    await polykeyAgent.acl.setNodePerm(polykeyServer.nodeManager.getNodeId(), {
      gestalt: {},
      vaults: {},
    });
    await polykeyAgent.nodeManager.clearDB();
    await polykeyServer.nodeManager.clearDB();
  });

  test('should add a node', async () => {
    const nodesAdd = grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      client,
      client.nodesAdd,
    );
    const nodeId = nodeId1;
    const host = '127.0.0.1';
    const port = 11111;
    const nodeAddressMessage = new nodesPB.NodeAddress();
    nodeAddressMessage.setNodeId(nodeId);
    const addressMessage = new nodesPB.Address();
    addressMessage.setHost(host);
    addressMessage.setPort(port);
    nodeAddressMessage.setAddress(addressMessage);

    await nodesAdd(nodeAddressMessage, callCredentials);
    const nodeAddress = await nodeManager.getNode(nodeId);
    expect(nodeAddress).toBeDefined();
    expect(nodeAddress!.host).toBe(host);
    expect(nodeAddress!.port).toBe(port);
  });
  test.skip(
    'should ping a node (online + offline)',
    async () => {
      const serverNodeId = polykeyServer.nodeManager.getNodeId();
      await testKeynodeUtils.addRemoteDetails(polykeyAgent, polykeyServer);
      await polykeyServer.stop();
      const statusPath = path.join(polykeyServer.nodePath, config.defaults.statusBase);
      const status = new Status({
        statusPath,
        fs,
        logger,
      });
      await status.waitFor('DEAD', 10000);

      // Case 1: cannot establish new connection, so offline
      const nodesPing = grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
        client,
        client.nodesPing,
      );
      const nodeMessage = new nodesPB.Node();
      nodeMessage.setNodeId(serverNodeId);
      const res1 = await nodesPing(nodeMessage, callCredentials);
      expect(res1.getSuccess()).toEqual(false);

      // Case 2: can establish new connection, so online
      await polykeyServer.start({ password: 'password' });
      await status.waitFor('LIVE', 10000);
      // Update the details (changed because we started again)
      await testKeynodeUtils.addRemoteDetails(polykeyAgent, polykeyServer);
      const res2 = await nodesPing(nodeMessage, callCredentials);
      expect(res2.getSuccess()).toEqual(true);
      // Case 3: pre-existing connection no longer active, so offline
      await polykeyServer.stop();
      await status.waitFor('DEAD', 10000);
      // Currently need this timeout - also set COnnectionForward setTImeout to 1000
      await sleep(3000);
      const res3 = await nodesPing(nodeMessage, callCredentials);
      expect(res3.getSuccess()).toEqual(false);
    },
    global.failedConnectionTimeout * 2,
  ); // Ping needs to timeout, so longer test timeout required
  test('should find a node (local)', async () => {
    const nodesFind = grpcUtils.promisifyUnaryCall<nodesPB.NodeAddress>(
      client,
      client.nodesFind,
    );
    // Case 1: node already exists in the local node graph (no contact required)
    const nodeId = nodeId1;
    const nodeAddress: NodeAddress = {
      host: '127.0.0.1' as Host,
      port: 11111 as Port,
    };
    await nodeManager.setNode(nodeId, nodeAddress);

    const nodeMessage = new nodesPB.Node();
    nodeMessage.setNodeId(nodeId);
    const res = await nodesFind(nodeMessage, callCredentials);
    expect(res.getNodeId()).toEqual(nodeId);
    expect(res.getAddress()?.getHost()).toEqual(nodeAddress.host);
    expect(res.getAddress()?.getPort()).toEqual(nodeAddress.port);
  });
  test(
    'should find a node (contacts remote node)',
    async () => {
      await testKeynodeUtils.addRemoteDetails(polykeyAgent, polykeyServer);
      // Case 2: node can be found on the remote node
      const nodeId = nodeId1;
      const nodeAddress: NodeAddress = {
        host: '127.0.0.1' as Host,
        port: 11111 as Port,
      };
      // Setting the information on a remote node.
      await polykeyServer.nodeManager.setNode(nodeId, nodeAddress);
      const nodesFind = grpcUtils.promisifyUnaryCall<nodesPB.NodeAddress>(
        client,
        client.nodesFind,
      );
      const nodeMessage = new nodesPB.Node();
      nodeMessage.setNodeId(nodeId);
      const res = await nodesFind(nodeMessage, callCredentials);
      expect(res.getNodeId()).toEqual(nodeId);
      expect(res.getAddress()?.getHost()).toEqual(nodeAddress.host);
      expect(res.getAddress()?.getPort()).toEqual(nodeAddress.port);
    },
    global.failedConnectionTimeout * 2,
  );
  test(
    'should fail to find a node (contacts remote node)',
    async () => {
      await testKeynodeUtils.addRemoteDetails(polykeyAgent, polykeyServer);
      // Case 3: node exhausts all contacts and cannot find node
      const nodeId = nodeId1;
      // Add a single dummy node to the server node graph database
      // Server will not be able to connect to this node (the only node in its
      // database), and will therefore not be able to locate the node.
      await polykeyServer.nodeManager.setNode(dummyNode, {
        host: '127.0.0.2' as Host,
        port: 22222 as Port,
      });
      const nodesFind = grpcUtils.promisifyUnaryCall<nodesPB.Address>(
        client,
        client.nodesFind,
      );
      const nodeMessage = new nodesPB.Node();
      nodeMessage.setNodeId(nodeId);
      // So unfindableNode cannot be found
      await expect(() =>
        nodesFind(nodeMessage, callCredentials),
      ).rejects.toThrow(nodesErrors.ErrorNodeGraphNodeNotFound);
    },
    global.failedConnectionTimeout * 2,
  );
  test('should send a gestalt invite (no existing invitation)', async () => {
    await testKeynodeUtils.addRemoteDetails(polykeyAgent, polykeyServer);
    // Node Claim Case 1: No invitations have been received
    const nodesClaim = grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      client,
      client.nodesClaim,
    );
    const nodeClaimMessage = new nodesPB.Claim();
    nodeClaimMessage.setNodeId(polykeyServer.nodeManager.getNodeId());
    nodeClaimMessage.setForceInvite(false);
    const res = await nodesClaim(nodeClaimMessage, callCredentials);
    // We expect to send a gestalt invite, not to claim the node, so expect false
    expect(res.getSuccess()).not.toBeTruthy();
  });
  test('should send a gestalt invite (existing invitation)', async () => {
    await testKeynodeUtils.addRemoteDetails(polykeyAgent, polykeyServer);
    await testKeynodeUtils.addRemoteDetails(polykeyServer, polykeyAgent);
    // Node Claim Case 2: Already received an invite; force invite
    await polykeyServer.notificationsManager.sendNotification(
      nodeManager.getNodeId(),
      {
        type: 'GestaltInvite',
      },
    );
    const nodesClaim = grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      client,
      client.nodesClaim,
    );
    const nodeClaimMessage = new nodesPB.Claim();
    nodeClaimMessage.setNodeId(polykeyServer.nodeManager.getNodeId());
    nodeClaimMessage.setForceInvite(true);
    const res = await nodesClaim(nodeClaimMessage, callCredentials);
    // We expect to send a gestalt invite, not to claim the node, so expect false
    expect(res.getSuccess()).not.toBeTruthy();
  });
  test('should claim node', async () => {
    await polykeyAgent.acl.setNodePerm(polykeyServer.nodeManager.getNodeId(), {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await polykeyServer.acl.setNodePerm(nodeManager.getNodeId(), {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await testKeynodeUtils.addRemoteDetails(polykeyAgent, polykeyServer);
    await testKeynodeUtils.addRemoteDetails(polykeyServer, polykeyAgent);
    // Node Claim Case 3: Already received an invite; claim node
    await polykeyServer.notificationsManager.sendNotification(
      nodeManager.getNodeId(),
      {
        type: 'GestaltInvite',
      },
    );
    const nodesClaim = grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
      client,
      client.nodesClaim,
    );
    const nodeClaimMessage = new nodesPB.Claim();
    nodeClaimMessage.setNodeId(polykeyServer.nodeManager.getNodeId());
    nodeClaimMessage.setForceInvite(false);
    const res = await nodesClaim(nodeClaimMessage, callCredentials);
    // We expect to claim the node, so expect true
    expect(res.getSuccess()).toBeTruthy();
  });
});
