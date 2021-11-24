import type * as grpc from '@grpc/grpc-js';
import type { IdentitiesManager } from '@/identities';
import type { GestaltGraph } from '@/gestalts';
import type { NodeManager } from '@/nodes';
import type { IdentityId, IdentityInfo, ProviderId } from '@/identities/types';
import type { NodeInfo } from '@/nodes/types';
import type * as gestaltsPB from '@/proto/js/polykey/v1/gestalts/gestalts_pb';
import type { ClientServiceClient } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as nodesPB from '@/proto/js/polykey/v1/nodes/nodes_pb';
import * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import * as permissionsPB from '@/proto/js/polykey/v1/permissions/permissions_pb';
import { KeyManager } from '@/keys';
import { ForwardProxy } from '@/network';
import * as grpcUtils from '@/grpc/utils';
import * as gestaltsUtils from '@/gestalts/utils';
import * as nodesErrors from '@/nodes/errors';
import * as nodesUtils from '@/nodes/utils';
import * as testUtils from './utils';
import TestProvider from '../identities/TestProvider';

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
  const logger = new Logger('ClientServerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let client: ClientServiceClient;
  let server: grpc.Server;
  let port: number;
  let dataDir: string;
  let polykeyAgent: PolykeyAgent;
  let keyManager: KeyManager;
  let nodeManager: NodeManager;
  let gestaltGraph: GestaltGraph;
  let identitiesManager: IdentitiesManager;
  let passwordFile: string;
  let callCredentials: grpc.Metadata;

  const nodeId2 = nodesUtils.makeNodeId(
    'vrcacp9vsb4ht25hds6s4lpp2abfaso0mptcfnh499n35vfcn2gkg',
  );

  const testToken = {
    providerId: 'test-provider' as ProviderId,
    identityId: 'test_user' as IdentityId,
    tokenData: {
      accessToken: 'abc123',
    },
  };
  const node2: NodeInfo = {
    id: nodeId2,
    chain: {},
  };
  const identity1: IdentityInfo = {
    providerId: 'github.com' as ProviderId,
    identityId: 'IdentityIdABC' as IdentityId,
    claims: {},
  };
  let node1: NodeInfo;

  async function createGestaltState() {
    await gestaltGraph.setNode(node1);
    await gestaltGraph.setNode(node2);
    await gestaltGraph.setIdentity(identity1);
    await gestaltGraph.linkNodeAndIdentity(node2, identity1);
  }

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
    });

    nodeManager = polykeyAgent.nodeManager;
    gestaltGraph = polykeyAgent.gestaltGraph;
    identitiesManager = polykeyAgent.identitiesManager;

    // Adding provider
    const testProvider = new TestProvider();
    identitiesManager.registerProvider(testProvider);

    [server, port] = await testUtils.openTestClientServer({
      polykeyAgent,
      secure: false,
    });

    client = await testUtils.openSimpleClientClient(port);

    node1 = {
      id: nodeManager.getNodeId(),
      chain: {},
    };
  }, global.polykeyStartupTimeout);
  afterAll(async () => {
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
  });
  afterEach(async () => {
    await gestaltGraph.clearDB();
  });

  test('should get all gestalts', async () => {
    const listGestalts =
      grpcUtils.promisifyReadableStreamCall<gestaltsPB.Gestalt>(
        client,
        client.gestaltsGestaltList,
      );

    await gestaltGraph.setNode(node2);
    await gestaltGraph.setIdentity(identity1);

    const m = new utilsPB.EmptyMessage();

    const res = listGestalts(m, callCredentials);

    const gestalts: Array<string> = [];
    for await (const val of res) {
      gestalts.push(JSON.parse(val.getName()));
    }
    await gestaltGraph.getGestaltByIdentity(
      identity1.providerId,
      identity1.identityId,
    );
    await gestaltGraph.getGestaltByNode(node2.id);
    const gestaltsString = JSON.stringify(gestalts);
    expect(gestaltsString).toContain(identity1.providerId);
    expect(gestaltsString).toContain(identity1.identityId);
    expect(gestaltsString).toContain(node2.id);
    expect(gestalts).toHaveLength(2);

    await gestaltGraph.unsetNode(node2.id);
    await gestaltGraph.unsetIdentity(
      identity1.providerId,
      identity1.identityId,
    );
  });
  test('should set independent node and identity gestalts', async () => {
    await gestaltGraph.setNode(node2);
    await gestaltGraph.setIdentity(identity1);
    const gestaltNode = await gestaltGraph.getGestaltByNode(node2.id);
    const gestaltIdentity = await gestaltGraph.getGestaltByIdentity(
      identity1.providerId,
      identity1.identityId,
    );
    const gkNode = gestaltsUtils.keyFromNode(node2.id);
    const gkIdentity = gestaltsUtils.keyFromIdentity(
      identity1.providerId,
      identity1.identityId,
    );
    expect(gestaltNode).toStrictEqual({
      matrix: { [gkNode]: {} },
      nodes: { [gkNode]: node2 },
      identities: {},
    });
    expect(gestaltIdentity).toStrictEqual({
      matrix: { [gkIdentity]: {} },
      nodes: {},
      identities: { [gkIdentity]: identity1 },
    });
  });
  test('should get gestalt from Node.', async () => {
    const gestaltsGetNode = grpcUtils.promisifyUnaryCall<gestaltsPB.Graph>(
      client,
      client.gestaltsGestaltGetByNode,
    );
    await createGestaltState();

    const nodeMessage = new nodesPB.Node();
    nodeMessage.setNodeId(node2.id);

    // Making the call
    const res = await gestaltsGetNode(nodeMessage, callCredentials);
    const jsonString = res.getGestaltGraph();

    expect(jsonString).toContain('IdentityIdABC'); // Contains IdentityID
    expect(jsonString).toContain('github.com'); // Contains github provider
    expect(jsonString).toContain(node2.id); // Contains NodeId
  });
  test('should get gestalt from identity.', async () => {
    const gestaltsGetIdentity = grpcUtils.promisifyUnaryCall<gestaltsPB.Graph>(
      client,
      client.gestaltsGestaltGetByIdentity,
    );
    await createGestaltState();
    // Testing the call
    const providerMessage = new identitiesPB.Provider();
    providerMessage.setProviderId(identity1.providerId);
    providerMessage.setMessage(identity1.identityId);
    const res = await gestaltsGetIdentity(providerMessage, callCredentials);
    const jsonString = res.getGestaltGraph();

    expect(jsonString).toContain('IdentityIdABC'); // Contains IdentityID
    expect(jsonString).toContain('github.com'); // Contains github provider
    expect(jsonString).toContain(node2.id); // Contains NodeId
  });
  test('should discover gestalt via Node.', async () => {
    const gestaltsDiscoverNode =
      grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
        client,
        client.gestaltsDiscoveryByNode,
      );

    const nodeMessage = new nodesPB.Node();
    nodeMessage.setNodeId(node2.id);
    // I have no idea how to test this. so we just check for expected error for now
    await expect(() =>
      gestaltsDiscoverNode(nodeMessage, callCredentials),
    ).rejects.toThrow(nodesErrors.ErrorNodeGraphEmptyDatabase);
  });
  test('should discover gestalt via Identity.', async () => {
    const gestaltsDiscoverIdentity =
      grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
        client,
        client.gestaltsDiscoveryByIdentity,
      );

    await identitiesManager.putToken(
      testToken.providerId,
      testToken.identityId,
      testToken.tokenData,
    );

    const providerMessage = new identitiesPB.Provider();
    providerMessage.setProviderId(testToken.providerId);
    providerMessage.setMessage(testToken.identityId);
    // Technically contains a node, but no other thing, will succeed with no results
    expect(
      await gestaltsDiscoverIdentity(providerMessage, callCredentials),
    ).toBeInstanceOf(utilsPB.EmptyMessage);
  });
  test('should get gestalt permissions by node.', async () => {
    const gestaltsGetActionsByNode =
      grpcUtils.promisifyUnaryCall<permissionsPB.Actions>(
        client,
        client.gestaltsActionsGetByNode,
      );
    await gestaltGraph.setNode(node1);
    await gestaltGraph.setNode(node2);
    await gestaltGraph.setGestaltActionByNode(node2.id, 'scan');
    await gestaltGraph.setGestaltActionByNode(node2.id, 'notify');

    const nodeMessage = new nodesPB.Node();

    nodeMessage.setNodeId(node2.id);
    // Should have permissions scan and notify as above
    const test1 = await gestaltsGetActionsByNode(nodeMessage, callCredentials);
    expect(test1.getActionList().length).toBe(2);
    expect(test1.getActionList().includes('scan')).toBeTruthy();
    expect(test1.getActionList().includes('notify')).toBeTruthy();

    nodeMessage.setNodeId(nodeManager.getNodeId());
    // Should have no permissions
    const test2 = await gestaltsGetActionsByNode(nodeMessage, callCredentials);
    expect(test2.getActionList().length).toBe(0);
  });
  test('should get gestalt permissions by Identity.', async () => {
    const gestaltsGetActionsByIdentity =
      grpcUtils.promisifyUnaryCall<permissionsPB.Actions>(
        client,
        client.gestaltsActionsGetByIdentity,
      );
    await gestaltGraph.setNode(node1);
    await gestaltGraph.setNode(node2);
    await gestaltGraph.setIdentity(identity1);
    await gestaltGraph.linkNodeAndIdentity(node2, identity1);
    await gestaltGraph.setGestaltActionByIdentity(
      identity1.providerId,
      identity1.identityId,
      'scan',
    );
    await gestaltGraph.setGestaltActionByIdentity(
      identity1.providerId,
      identity1.identityId,
      'notify',
    );

    const providerMessage = new identitiesPB.Provider();
    providerMessage.setProviderId(identity1.providerId);
    providerMessage.setMessage(identity1.identityId);
    // Should have permissions scan and notify as above
    const test1 = await gestaltsGetActionsByIdentity(
      providerMessage,
      callCredentials,
    );
    expect(test1.getActionList().length).toBe(2);
    expect(test1.getActionList().includes('scan')).toBeTruthy();
    expect(test1.getActionList().includes('notify')).toBeTruthy();

    providerMessage.setProviderId(identity1.providerId);
    providerMessage.setMessage('Not a real identity');
    // Should have no permissions
    const test2 = await gestaltsGetActionsByIdentity(
      providerMessage,
      callCredentials,
    );
    expect(test2.getActionList().length).toBe(0);
  });
  test('should set gestalt permissions by node.', async () => {
    const gestaltsSetActionByNode =
      grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
        client,
        client.gestaltsActionsSetByNode,
      );
    await gestaltGraph.setNode(node1);
    await gestaltGraph.setNode(node2);

    const setActionsMessage = new permissionsPB.ActionSet();
    const nodeMessage = new nodesPB.Node();
    nodeMessage.setNodeId(node2.id);
    setActionsMessage.setNode(nodeMessage);
    setActionsMessage.setAction('scan');
    // Should have permissions scan and notify as above
    await gestaltsSetActionByNode(setActionsMessage, callCredentials);

    const check1 = await gestaltGraph.getGestaltActionsByNode(node2.id);
    expect(Object.keys(check1!)).toContain('scan');

    setActionsMessage.setAction('notify');
    await gestaltsSetActionByNode(setActionsMessage, callCredentials);
    const check2 = await gestaltGraph.getGestaltActionsByNode(node2.id);
    expect(Object.keys(check2!)).toContain('notify');
  });
  test('should set gestalt permissions by Identity.', async () => {
    const gestaltsSetActionByIdentity =
      grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
        client,
        client.gestaltsActionsSetByIdentity,
      );
    await gestaltGraph.setNode(node1);
    await gestaltGraph.setNode(node2);
    await gestaltGraph.setIdentity(identity1);
    await gestaltGraph.linkNodeAndIdentity(node2, identity1);

    const providerMessage = new identitiesPB.Provider();
    providerMessage.setProviderId(identity1.providerId);
    providerMessage.setMessage(identity1.identityId);

    const setActionsMessage = new permissionsPB.ActionSet();
    setActionsMessage.setIdentity(providerMessage);
    setActionsMessage.setAction('scan');
    // Should have permissions scan and notify as above
    await gestaltsSetActionByIdentity(setActionsMessage, callCredentials);

    const check1 = await gestaltGraph.getGestaltActionsByIdentity(
      identity1.providerId,
      identity1.identityId,
    );
    expect(Object.keys(check1!)).toContain('scan');

    setActionsMessage.setAction('notify');
    await gestaltsSetActionByIdentity(setActionsMessage, callCredentials);
    const check2 = await gestaltGraph.getGestaltActionsByIdentity(
      identity1.providerId,
      identity1.identityId,
    );
    expect(Object.keys(check2!)).toContain('notify');
  });
  test('should unset gestalt permissions by node.', async () => {
    const gestaltsUnsetActionByNode =
      grpcUtils.promisifyUnaryCall<permissionsPB.Actions>(
        client,
        client.gestaltsActionsUnsetByNode,
      );
    await gestaltGraph.setNode(node1);
    await gestaltGraph.setNode(node2);
    await gestaltGraph.setGestaltActionByNode(node2.id, 'scan');
    await gestaltGraph.setGestaltActionByNode(node2.id, 'notify');

    const nodeMessage = new nodesPB.Node();
    nodeMessage.setNodeId(node2.id);

    const setActionsMessage = new permissionsPB.ActionSet();
    setActionsMessage.setNode(nodeMessage);
    setActionsMessage.setAction('scan');

    // Should have permissions scan and notify as above
    await gestaltsUnsetActionByNode(setActionsMessage, callCredentials);
    const check1 = await gestaltGraph.getGestaltActionsByNode(node2.id);
    const keys = Object.keys(check1!);
    expect(keys.length).toBe(1);
    expect(keys).toContain('notify');
    expect(keys.includes('scan')).toBeFalsy();

    setActionsMessage.setAction('notify');
    await gestaltsUnsetActionByNode(setActionsMessage, callCredentials);
    const check2 = await gestaltGraph.getGestaltActionsByNode(node2.id);
    const keys2 = Object.keys(check2!);
    expect(keys2.length).toBe(0);
  });
  test('should unset gestalt permissions by Identity.', async () => {
    const gestaltsUnsetActionByIdentity =
      grpcUtils.promisifyUnaryCall<permissionsPB.Actions>(
        client,
        client.gestaltsActionsUnsetByIdentity,
      );
    await gestaltGraph.setNode(node1);
    await gestaltGraph.setNode(node2);
    await gestaltGraph.setIdentity(identity1);
    await gestaltGraph.linkNodeAndIdentity(node2, identity1);
    await gestaltGraph.setGestaltActionByIdentity(
      identity1.providerId,
      identity1.identityId,
      'scan',
    );
    await gestaltGraph.setGestaltActionByIdentity(
      identity1.providerId,
      identity1.identityId,
      'notify',
    );

    const providerMessage = new identitiesPB.Provider();
    providerMessage.setProviderId(identity1.providerId);
    providerMessage.setMessage(identity1.identityId);

    const setActionsMessage = new permissionsPB.ActionSet();
    setActionsMessage.setIdentity(providerMessage);
    setActionsMessage.setAction('scan');

    // Should have permissions scan and notify as above
    await gestaltsUnsetActionByIdentity(setActionsMessage, callCredentials);
    const check1 = await gestaltGraph.getGestaltActionsByNode(node2.id);
    const keys = Object.keys(check1!);
    expect(keys.length).toBe(1);
    expect(keys).toContain('notify');
    expect(keys.includes('scan')).toBeFalsy();
    setActionsMessage.setAction('notify');
    await gestaltsUnsetActionByIdentity(setActionsMessage, callCredentials);
    const check2 = await gestaltGraph.getGestaltActionsByNode(node2.id);
    const keys2 = Object.keys(check2!);
    expect(keys2.length).toBe(0);
  });
});
