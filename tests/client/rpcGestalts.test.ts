import type * as grpc from '@grpc/grpc-js';
import type { IdentitiesManager } from '@/identities';
import type { GestaltGraph } from '@/gestalts';
import type { IdentityId, IdentityInfo, ProviderId } from '@/identities/types';
import type { NodeIdEncoded, NodeInfo } from '@/nodes/types';
import type { Discovery } from '@/discovery';
import type { ClientServiceClient } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import type * as gestaltsPB from '@/proto/js/polykey/v1/gestalts/gestalts_pb';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import { NodeManager } from '@/nodes';
import { KeyManager } from '@/keys';
import { ForwardProxy } from '@/network';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as nodesPB from '@/proto/js/polykey/v1/nodes/nodes_pb';
import * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import * as permissionsPB from '@/proto/js/polykey/v1/permissions/permissions_pb';
import * as grpcUtils from '@/grpc/utils';
import * as gestaltsUtils from '@/gestalts/utils';
import * as nodesUtils from '@/nodes/utils';
import * as testUtils from './utils';
import TestProvider from '../identities/TestProvider';

jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

describe('Client service', () => {
  const password = 'password';
  const logger = new Logger('ClientServerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let client: ClientServiceClient;
  let server: grpc.Server;
  let port: number;
  let dataDir: string;
  let pkAgent: PolykeyAgent;
  let keyManager: KeyManager;
  let gestaltGraph: GestaltGraph;
  let identitiesManager: IdentitiesManager;
  let discovery: Discovery;
  let passwordFile: string;
  let callCredentials: grpc.Metadata;

  const nodeId2Encoded =
    'vrcacp9vsb4ht25hds6s4lpp2abfaso0mptcfnh499n35vfcn2gkg' as NodeIdEncoded;
  const nodeId2 = nodesUtils.decodeNodeId(nodeId2Encoded)!;

  const testToken = {
    providerId: 'test-provider' as ProviderId,
    identityId: 'test_user' as IdentityId,
    tokenData: {
      accessToken: 'abc123',
    },
  };
  const node2: NodeInfo = {
    id: nodeId2Encoded,
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

    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: dataDir,
      logger,
      fwdProxy,
      keyManager,
    });

    gestaltGraph = pkAgent.gestaltGraph;
    identitiesManager = pkAgent.identitiesManager;
    discovery = pkAgent.discovery;

    // Adding provider
    const testProvider = new TestProvider();
    identitiesManager.registerProvider(testProvider);

    [server, port] = await testUtils.openTestClientServer({
      pkAgent,
      secure: false,
    });

    client = await testUtils.openSimpleClientClient(port);

    node1 = {
      id: nodesUtils.encodeNodeId(pkAgent.keyManager.getNodeId()),
      chain: {},
    };
  }, global.polykeyStartupTimeout);
  afterAll(async () => {
    await testUtils.closeTestClientServer(server);
    testUtils.closeSimpleClientClient(client);

    await pkAgent.stop();
    await pkAgent.destroy();

    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    await fs.promises.rm(passwordFile);
  });
  beforeEach(async () => {
    const sessionToken = await pkAgent.sessionManager.createToken();
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
    await gestaltGraph.getGestaltByNode(nodeId2);
    const gestaltsString = JSON.stringify(gestalts);
    expect(gestaltsString).toContain(identity1.providerId);
    expect(gestaltsString).toContain(identity1.identityId);
    expect(gestaltsString).toContain(nodesUtils.encodeNodeId(nodeId2));
    expect(gestalts).toHaveLength(2);

    await gestaltGraph.unsetNode(nodeId2);
    await gestaltGraph.unsetIdentity(
      identity1.providerId,
      identity1.identityId,
    );
  });
  test('should set independent node and identity gestalts', async () => {
    await gestaltGraph.setNode(node2);
    await gestaltGraph.setIdentity(identity1);
    const gestaltNode = await gestaltGraph.getGestaltByNode(nodeId2);
    const gestaltIdentity = await gestaltGraph.getGestaltByIdentity(
      identity1.providerId,
      identity1.identityId,
    );
    const gkNode = gestaltsUtils.keyFromNode(nodeId2);
    const gkIdentity = gestaltsUtils.keyFromIdentity(
      identity1.providerId,
      identity1.identityId,
    );
    expect(gestaltNode).toStrictEqual({
      matrix: { [gkNode]: {} },
      nodes: {
        [gkNode]: {
          id: nodesUtils.encodeNodeId(nodeId2),
          chain: {},
        },
      },
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
    nodeMessage.setNodeId(nodesUtils.encodeNodeId(nodeId2));

    // Making the call
    const res = await gestaltsGetNode(nodeMessage, callCredentials);
    const jsonString = res.getGestaltGraph();

    expect(jsonString).toContain('IdentityIdABC'); // Contains IdentityID
    expect(jsonString).toContain('github.com'); // Contains github provider
    expect(jsonString).toContain(nodesUtils.encodeNodeId(nodeId2)); // Contains NodeId
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
    providerMessage.setIdentityId(identity1.identityId);
    const res = await gestaltsGetIdentity(providerMessage, callCredentials);
    const jsonString = res.getGestaltGraph();

    expect(jsonString).toContain('IdentityIdABC'); // Contains IdentityID
    expect(jsonString).toContain('github.com'); // Contains github provider
    expect(jsonString).toContain(nodesUtils.encodeNodeId(nodeId2)); // Contains NodeId
  });
  test('should discover gestalt via Node.', async () => {
    const mockedRequestChainData = jest
      .spyOn(NodeManager.prototype, 'requestChainData')
      .mockResolvedValue({});

    const gestaltsDiscoverNode =
      grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
        client,
        client.gestaltsDiscoveryByNode,
      );

    const nodeMessage = new nodesPB.Node();
    nodeMessage.setNodeId(nodesUtils.encodeNodeId(nodeId2));
    expect(
      await gestaltsDiscoverNode(nodeMessage, callCredentials),
    ).toBeInstanceOf(utilsPB.EmptyMessage);

    // Revert side-effects
    await discovery.stop();
    await discovery.start({ fresh: true });
    mockedRequestChainData.mockRestore();
  });
  test('should discover gestalt via Identity.', async () => {
    const mockedRequestChainData = jest
      .spyOn(NodeManager.prototype, 'requestChainData')
      .mockResolvedValue({});

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
    providerMessage.setIdentityId(testToken.identityId);
    expect(
      await gestaltsDiscoverIdentity(providerMessage, callCredentials),
    ).toBeInstanceOf(utilsPB.EmptyMessage);

    // Revert side-effects
    await discovery.stop();
    await discovery.start({ fresh: true });
    mockedRequestChainData.mockRestore();
  });
  test('should get gestalt permissions by node.', async () => {
    const gestaltsGetActionsByNode =
      grpcUtils.promisifyUnaryCall<permissionsPB.Actions>(
        client,
        client.gestaltsActionsGetByNode,
      );
    await gestaltGraph.setNode(node1);
    await gestaltGraph.setNode(node2);
    await gestaltGraph.setGestaltActionByNode(nodeId2, 'scan');
    await gestaltGraph.setGestaltActionByNode(nodeId2, 'notify');

    const nodeMessage = new nodesPB.Node();

    nodeMessage.setNodeId(nodesUtils.encodeNodeId(nodeId2));
    // Should have permissions scan and notify as above
    const test1 = await gestaltsGetActionsByNode(nodeMessage, callCredentials);
    expect(test1.getActionList().length).toBe(2);
    expect(test1.getActionList().includes('scan')).toBeTruthy();
    expect(test1.getActionList().includes('notify')).toBeTruthy();

    nodeMessage.setNodeId(
      nodesUtils.encodeNodeId(pkAgent.keyManager.getNodeId()),
    );
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
    providerMessage.setIdentityId(identity1.identityId);
    // Should have permissions scan and notify as above
    const test1 = await gestaltsGetActionsByIdentity(
      providerMessage,
      callCredentials,
    );
    expect(test1.getActionList().length).toBe(2);
    expect(test1.getActionList().includes('scan')).toBeTruthy();
    expect(test1.getActionList().includes('notify')).toBeTruthy();

    providerMessage.setProviderId(identity1.providerId);
    providerMessage.setIdentityId('Not a real identity');
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
    nodeMessage.setNodeId(nodesUtils.encodeNodeId(nodeId2));
    setActionsMessage.setNode(nodeMessage);
    setActionsMessage.setAction('scan');
    // Should have permissions scan and notify as above
    await gestaltsSetActionByNode(setActionsMessage, callCredentials);

    const check1 = await gestaltGraph.getGestaltActionsByNode(nodeId2);
    expect(Object.keys(check1!)).toContain('scan');

    setActionsMessage.setAction('notify');
    await gestaltsSetActionByNode(setActionsMessage, callCredentials);
    const check2 = await gestaltGraph.getGestaltActionsByNode(nodeId2);
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
    providerMessage.setIdentityId(identity1.identityId);

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
    await gestaltGraph.setGestaltActionByNode(nodeId2, 'scan');
    await gestaltGraph.setGestaltActionByNode(nodeId2, 'notify');

    const nodeMessage = new nodesPB.Node();
    nodeMessage.setNodeId(nodesUtils.encodeNodeId(nodeId2));

    const setActionsMessage = new permissionsPB.ActionSet();
    setActionsMessage.setNode(nodeMessage);
    setActionsMessage.setAction('scan');

    // Should have permissions scan and notify as above
    await gestaltsUnsetActionByNode(setActionsMessage, callCredentials);
    const check1 = await gestaltGraph.getGestaltActionsByNode(nodeId2);
    const keys = Object.keys(check1!);
    expect(keys.length).toBe(1);
    expect(keys).toContain('notify');
    expect(keys.includes('scan')).toBeFalsy();

    setActionsMessage.setAction('notify');
    await gestaltsUnsetActionByNode(setActionsMessage, callCredentials);
    const check2 = await gestaltGraph.getGestaltActionsByNode(nodeId2);
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
    providerMessage.setIdentityId(identity1.identityId);

    const setActionsMessage = new permissionsPB.ActionSet();
    setActionsMessage.setIdentity(providerMessage);
    setActionsMessage.setAction('scan');

    // Should have permissions scan and notify as above
    await gestaltsUnsetActionByIdentity(setActionsMessage, callCredentials);
    const check1 = await gestaltGraph.getGestaltActionsByNode(nodeId2);
    const keys = Object.keys(check1!);
    expect(keys.length).toBe(1);
    expect(keys).toContain('notify');
    expect(keys.includes('scan')).toBeFalsy();
    setActionsMessage.setAction('notify');
    await gestaltsUnsetActionByIdentity(setActionsMessage, callCredentials);
    const check2 = await gestaltGraph.getGestaltActionsByNode(nodeId2);
    const keys2 = Object.keys(check2!);
    expect(keys2.length).toBe(0);
  });
});
