import type * as grpc from '@grpc/grpc-js';
import type { NodeManager } from '@/nodes';
import type { TLSConfig } from '@/network/types';
import type { ClientServiceClient } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as keysPB from '@/proto/js/polykey/v1/keys/keys_pb';
import { KeyManager } from '@/keys';
import { ForwardProxy } from '@/network';
import * as grpcUtils from '@/grpc/utils';
import * as testUtils from './utils';

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
describe('Keys client service', () => {
  const password = 'password';
  const logger = new Logger('KeysClientServerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let keysPath: string;
  let client: ClientServiceClient;
  let server: grpc.Server;
  let port: number;
  let dataDir: string;
  let polykeyAgent: PolykeyAgent;
  let keyManager: KeyManager;
  let nodeManager: NodeManager;
  let passwordFile: string;
  let callCredentials: grpc.Metadata;

  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );

    passwordFile = path.join(dataDir, 'password');
    await fs.promises.writeFile(passwordFile, 'password');
    keysPath = path.join(dataDir, 'keys');

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

    [server, port] = await testUtils.openTestClientServer({
      polykeyAgent,
      secure: false,
    });

    client = await testUtils.openSimpleClientClient(port);
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

  test('should get root keypair', async () => {
    const getRootKeyPair = grpcUtils.promisifyUnaryCall<keysPB.KeyPair>(
      client,
      client.keysKeyPairRoot,
    );

    const keyPair = keyManager.getRootKeyPairPem();
    const emptyMessage = new utilsPB.EmptyMessage();
    const key = await getRootKeyPair(emptyMessage, callCredentials);
    expect(key.getPrivate()).toBe(keyPair.privateKey);
    expect(key.getPublic()).toBe(keyPair.publicKey);
  });
  test(
    'should reset root keypair',
    async () => {
      const getRootKeyPair = grpcUtils.promisifyUnaryCall<keysPB.KeyPair>(
        client,
        client.keysKeyPairRoot,
      );

      const resetKeyPair = grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
        client,
        client.keysKeyPairReset,
      );

      const keyPair = keyManager.getRootKeyPairPem();
      const nodeId1 = nodeManager.getNodeId();
      // @ts-ignore - get protected property
      const fwdTLSConfig1 = polykeyAgent.fwdProxy.tlsConfig;
      // @ts-ignore - get protected property
      const revTLSConfig1 = polykeyAgent.revProxy.tlsConfig;
      // @ts-ignore - get protected property
      const serverTLSConfig1 = polykeyAgent.grpcServerClient.tlsConfig;
      const expectedTLSConfig1: TLSConfig = {
        keyPrivatePem: keyPair.privateKey,
        certChainPem: await keyManager.getRootCertChainPem(),
      };
      expect(fwdTLSConfig1).toEqual(expectedTLSConfig1);
      expect(revTLSConfig1).toEqual(expectedTLSConfig1);
      expect(serverTLSConfig1).toEqual(expectedTLSConfig1);
      const keyMessage = new keysPB.Key();
      keyMessage.setName('somepassphrase');
      await resetKeyPair(keyMessage, callCredentials);
      const emptyMessage = new utilsPB.EmptyMessage();
      await fs.promises.writeFile(passwordFile, 'somepassphrase');
      const key = await getRootKeyPair(emptyMessage, callCredentials);
      const nodeId2 = nodeManager.getNodeId();
      // @ts-ignore - get protected property
      const fwdTLSConfig2 = polykeyAgent.fwdProxy.tlsConfig;
      // @ts-ignore - get protected property
      const revTLSConfig2 = polykeyAgent.revProxy.tlsConfig;
      // @ts-ignore - get protected property
      const serverTLSConfig2 = polykeyAgent.grpcServerClient.tlsConfig;
      const expectedTLSConfig2: TLSConfig = {
        keyPrivatePem: key.getPrivate(),
        certChainPem: await keyManager.getRootCertChainPem(),
      };
      expect(fwdTLSConfig2).toEqual(expectedTLSConfig2);
      expect(revTLSConfig2).toEqual(expectedTLSConfig2);
      expect(serverTLSConfig2).toEqual(expectedTLSConfig2);
      expect(key.getPrivate()).not.toBe(keyPair.privateKey);
      expect(key.getPublic()).not.toBe(keyPair.publicKey);
      expect(nodeId1).not.toBe(nodeId2);
    },
    global.defaultTimeout * 3,
  );
  test(
    'should renew root keypair',
    async () => {
      const renewKeyPair = grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
        client,
        client.keysKeyPairRenew,
      );

      const rootKeyPair1 = keyManager.getRootKeyPairPem();
      const nodeId1 = nodeManager.getNodeId();
      // @ts-ignore - get protected property
      const fwdTLSConfig1 = polykeyAgent.fwdProxy.tlsConfig;
      // @ts-ignore - get protected property
      const revTLSConfig1 = polykeyAgent.revProxy.tlsConfig;
      // @ts-ignore - get protected property
      const serverTLSConfig1 = polykeyAgent.grpcServerClient.tlsConfig;
      const expectedTLSConfig1: TLSConfig = {
        keyPrivatePem: rootKeyPair1.privateKey,
        certChainPem: await keyManager.getRootCertChainPem(),
      };
      expect(fwdTLSConfig1).toEqual(expectedTLSConfig1);
      expect(revTLSConfig1).toEqual(expectedTLSConfig1);
      expect(serverTLSConfig1).toEqual(expectedTLSConfig1);
      const keyMessage = new keysPB.Key();
      keyMessage.setName('somepassphrase');
      await renewKeyPair(keyMessage, callCredentials);
      const rootKeyPair2 = keyManager.getRootKeyPairPem();
      const nodeId2 = nodeManager.getNodeId();
      // @ts-ignore - get protected property
      const fwdTLSConfig2 = polykeyAgent.fwdProxy.tlsConfig;
      // @ts-ignore - get protected property
      const revTLSConfig2 = polykeyAgent.revProxy.tlsConfig;
      // @ts-ignore - get protected property
      const serverTLSConfig2 = polykeyAgent.grpcServerClient.tlsConfig;
      const expectedTLSConfig2: TLSConfig = {
        keyPrivatePem: rootKeyPair2.privateKey,
        certChainPem: await keyManager.getRootCertChainPem(),
      };
      expect(fwdTLSConfig2).toEqual(expectedTLSConfig2);
      expect(revTLSConfig2).toEqual(expectedTLSConfig2);
      expect(serverTLSConfig2).toEqual(expectedTLSConfig2);
      expect(rootKeyPair2.privateKey).not.toBe(rootKeyPair1.privateKey);
      expect(rootKeyPair2.publicKey).not.toBe(rootKeyPair1.publicKey);
      expect(nodeId1).not.toBe(nodeId2);
    },
    global.defaultTimeout * 3,
  );
  test('should encrypt and decrypt with root keypair', async () => {
    const encryptWithKeyPair = grpcUtils.promisifyUnaryCall<keysPB.Crypto>(
      client,
      client.keysEncrypt,
    );

    const decryptWithKeyPair = grpcUtils.promisifyUnaryCall<keysPB.Crypto>(
      client,
      client.keysDecrypt,
    );

    const plainText = Buffer.from('abc');
    const cryptoMessage = new keysPB.Crypto();
    cryptoMessage.setData(plainText.toString('binary'));
    const cipherText = await encryptWithKeyPair(cryptoMessage, callCredentials);
    cryptoMessage.setData(cipherText.getData());
    const plainText_ = await decryptWithKeyPair(cryptoMessage, callCredentials);
    expect(plainText_.getData()).toBe(plainText.toString());
  });
  test('should sign and verify with root keypair', async () => {
    const signWithKeyPair = grpcUtils.promisifyUnaryCall<keysPB.Crypto>(
      client,
      client.keysSign,
    );

    const verifyWithKeyPair =
      grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
        client,
        client.keysVerify,
      );

    const data = Buffer.from('abc');
    const cryptoMessage = new keysPB.Crypto();
    cryptoMessage.setData(data.toString('binary'));
    const signature = await signWithKeyPair(cryptoMessage, callCredentials);
    cryptoMessage.setSignature(signature.getSignature());
    const signed = await verifyWithKeyPair(cryptoMessage, callCredentials);
    expect(signed.getSuccess()).toBe(true);
  });
  test('should get the root certificate and chains', async () => {
    const getCerts = grpcUtils.promisifyUnaryCall<keysPB.Certificate>(
      client,
      client.keysCertsGet,
    );

    const getChainCerts =
      grpcUtils.promisifyReadableStreamCall<keysPB.Certificate>(
        client,
        client.keysCertsChainGet,
      );

    const emptyMessage = new utilsPB.EmptyMessage();
    const certChainStream = getChainCerts(emptyMessage, callCredentials);
    const certs: Array<string> = [];
    for await (const cert of certChainStream) {
      certs.push(cert.getCert());
    }
    expect(certs.sort()).toStrictEqual(
      (await keyManager.getRootCertChainPems()).sort(),
    );
    const response = await getCerts(emptyMessage, callCredentials);
    expect(response.getCert()).toBe(keyManager.getRootCertPem());
  });
});
