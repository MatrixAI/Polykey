import type { TLSConfig } from '@/network/types';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import type Sigchain from '@/sigchain/Sigchain';
import type { CertificatePEM } from '@/keys/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import { KeysCertsChainGetHandler } from '@/client/handlers/keysCertsChainGet';
import RPCClient from '@matrixai/rpc/dist/RPCClient';
import WebSocketClient from '@/websockets/WebSocketClient';
import IdentitiesManager from '@/identities/IdentitiesManager';
import CertManager from '@/keys/CertManager';
import TaskManager from '@/tasks/TaskManager';
import {
  keysCertsChainGet,
  keysCertsGet,
  KeysCertsGetHandler,
  keysDecrypt,
  KeysDecryptHandler,
  keysEncrypt,
  KeysEncryptHandler,
  keysKeyPair,
  KeysKeyPairHandler,
  keysKeyPairRenew,
  KeysKeyPairRenewHandler,
  keysKeyPairReset,
  KeysKeyPairResethandler,
  keysPasswordChange,
  KeysPasswordChangeHandler,
  keysPublicKey,
  KeysPublicKeyHandler,
  keysSign,
  KeysSignHandler,
  keysVerify,
  KeysVerifyHandler,
} from '@/client';
import PolykeyAgent from '@/PolykeyAgent';
import { NodeManager } from '@/nodes';
import { publicKeyToJWK } from '@/keys/utils';
import * as testsUtils from '../../utils';
import ClientService from '@/client/ClientService';

describe('keysCertsChainGet', () => {
  const logger = new Logger('keysCertsChainGet test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  const certs = ['cert1', 'cert2', 'cert3'] as Array<CertificatePEM>;
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
  let identitiesManager: IdentitiesManager;
  let taskManager: TaskManager;
  let certManager: CertManager;
  let mockedGetRootCertChainPems: jest.SpyInstance;

  beforeEach(async () => {
    mockedGetRootCertChainPems = jest
      .spyOn(CertManager.prototype, 'getCertPEMsChain')
      .mockResolvedValue(certs);
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
    });
    certManager = await CertManager.createCertManager({
      db,
      keyRing,
      taskManager,
      logger,
    });
  });
  afterEach(async () => {
    mockedGetRootCertChainPems.mockRestore();
    await certManager.stop();
    await taskManager.stop();
    await clientService.stop({ force: true });
    await webSocketClient.destroy(true);
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets the root certchain', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        keysCertsChainGet: new KeysCertsChainGetHandler({
          certManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        keysCertsChainGet,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const response = await rpcClient.methods.keysCertsChainGet({});
    const output = Array<string>();
    for await (const cert of response) {
      output.push(cert.cert);
    }
    expect(output).toEqual(certs);
  });
});
describe('keysCertsGet', () => {
  const logger = new Logger('keysCertsGet test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
  let identitiesManager: IdentitiesManager;
  let taskManager: TaskManager;
  let certManager: CertManager;
  let mockedGetRootCertPem: jest.SpyInstance;

  beforeEach(async () => {
    mockedGetRootCertPem = jest
      .spyOn(CertManager.prototype, 'getCurrentCertPEM')
      .mockResolvedValue('rootCertPem' as CertificatePEM);
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
    });
    certManager = await CertManager.createCertManager({
      db,
      keyRing,
      taskManager,
      logger,
    });
  });
  afterEach(async () => {
    mockedGetRootCertPem.mockRestore();
    await certManager.stop();
    await taskManager.stop();
    await clientService.stop({ force: true });
    await webSocketClient.destroy(true);
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets the root certificate', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        keysCertsGet: new KeysCertsGetHandler({
          certManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        keysCertsGet,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const response = await rpcClient.methods.keysCertsGet({});
    expect(response.cert).toBe('rootCertPem');
  });
});
describe('keysEncryptDecrypt', () => {
  const logger = new Logger('keysEncryptDecrypt test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
  let identitiesManager: IdentitiesManager;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
  });
  afterEach(async () => {
    await clientService.stop({ force: true });
    await webSocketClient.destroy(true);
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('encrypts and decrypts data', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        keysEncrypt: new KeysEncryptHandler({
          keyRing,
        }),
        keysDecrypt: new KeysDecryptHandler({
          keyRing,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        keysEncrypt,
        keysDecrypt,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const plainText = Buffer.from('abc');
    const publicKeyJWK = keysUtils.publicKeyToJWK(keyRing.keyPair.publicKey);
    const encrypted = await rpcClient.methods.keysEncrypt({
      data: plainText.toString('binary'),
      publicKeyJwk: publicKeyJWK,
    });
    const response = await rpcClient.methods.keysDecrypt(encrypted);
    expect(response.data).toBe('abc');
  });
});
describe('keysKeyPair', () => {
  const logger = new Logger('keysKeyPair test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
  let identitiesManager: IdentitiesManager;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
  });
  afterEach(async () => {
    await clientService.stop({ force: true });
    await webSocketClient.destroy(true);
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets the keypair', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        keysKeyPair: new KeysKeyPairHandler({
          keyRing,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        keysKeyPair,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const response = await rpcClient.methods.keysKeyPair({
      password: 'password',
    });
    expect(response.privateKeyJwe).toEqual({
      ciphertext: expect.any(String),
      iv: expect.any(String),
      protected: expect.any(String),
      tag: expect.any(String),
    });
    expect(response.publicKeyJwk).toEqual({
      alg: expect.any(String),
      crv: expect.any(String),
      ext: expect.any(Boolean),
      key_ops: expect.any(Array),
      kty: expect.any(String),
      x: expect.any(String),
    });
  });
});
describe('keysKeyPairRenew', () => {
  const logger = new Logger('keysKeyPairRenew test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let pkAgent: PolykeyAgent;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
  let mockedRefreshBuckets: jest.SpyInstance;

  beforeEach(async () => {
    mockedRefreshBuckets = jest.spyOn(NodeManager.prototype, 'resetBuckets');
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const nodePath = path.join(dataDir, 'polykey');
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      options: {
        nodePath,
        agentServiceHost: localhost,
        clientServiceHost: localhost,
        keys: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      },
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(pkAgent.keyRing.keyPair);
  });
  afterEach(async () => {
    mockedRefreshBuckets.mockRestore();
    await clientService.stop({ force: true });
    await webSocketClient.destroy(true);
    await pkAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('renews the root key pair', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        keysKeyPairRenew: new KeysKeyPairRenewHandler({
          certManager: pkAgent.certManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [pkAgent.keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        keysKeyPairRenew,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const rootKeyPair1 = pkAgent.keyRing.keyPair;
    const nodeId1 = pkAgent.keyRing.getNodeId();
    // @ts-ignore - get protected property
    const config1 = pkAgent.nodeConnectionManager.quicServer.config;
    const fwdTLSConfig1 = {
      keyPrivatePem: config1.key,
      certChainPem: config1.cert,
    };
    const expectedTLSConfig1: TLSConfig = {
      keyPrivatePem: keysUtils.privateKeyToPEM(rootKeyPair1.privateKey),
      certChainPem: await pkAgent.certManager.getCertPEMsChainPEM(),
    };
    const nodeIdStatus1 = pkAgent.keyRing.getNodeId();
    expect(mockedRefreshBuckets).toHaveBeenCalledTimes(0);
    expect(fwdTLSConfig1).toEqual(expectedTLSConfig1);
    expect(nodeId1.equals(nodeIdStatus1)).toBe(true);
    // Run command
    await rpcClient.methods.keysKeyPairRenew({
      password: 'somepassphrase',
    });
    const rootKeyPair2 = pkAgent.keyRing.keyPair;
    const nodeId2 = pkAgent.keyRing.getNodeId();
    // @ts-ignore - get protected property
    const config2 = pkAgent.nodeConnectionManager.quicServer.config;
    const fwdTLSConfig2 = {
      keyPrivatePem: config2.key,
      certChainPem: config2.cert,
    };
    const expectedTLSConfig2: TLSConfig = {
      keyPrivatePem: keysUtils.privateKeyToPEM(rootKeyPair2.privateKey),
      certChainPem: await pkAgent.certManager.getCertPEMsChainPEM(),
    };
    const nodeIdStatus2 = pkAgent.keyRing.getNodeId();
    expect(mockedRefreshBuckets).toHaveBeenCalled();
    expect(fwdTLSConfig2).toEqual(expectedTLSConfig2);
    expect(rootKeyPair2.privateKey).not.toBe(rootKeyPair1.privateKey);
    expect(rootKeyPair2.publicKey).not.toBe(rootKeyPair1.publicKey);
    expect(nodeId1).not.toBe(nodeId2);
    expect(nodeIdStatus1).not.toBe(nodeIdStatus2);
    expect(nodeId2.equals(nodeIdStatus2)).toBe(true);
  });
});
describe('keysKeyPairReset', () => {
  const logger = new Logger('keysKeyPairReset test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let pkAgent: PolykeyAgent;
  let tlsConfig: TLSConfig;
  let mockedRefreshBuckets: jest.SpyInstance;

  beforeEach(async () => {
    mockedRefreshBuckets = jest.spyOn(NodeManager.prototype, 'resetBuckets');
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const nodePath = path.join(dataDir, 'polykey');
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      options: {
        nodePath,
        agentServiceHost: localhost,
        clientServiceHost: localhost,
        keys: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      },
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(pkAgent.keyRing.keyPair);
  });
  afterEach(async () => {
    mockedRefreshBuckets.mockRestore();
    await clientService.stop({ force: true });
    await webSocketClient.destroy(true);
    await pkAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('resets the root key pair', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        keysKeyPairReset: new KeysKeyPairResethandler({
          certManager: pkAgent.certManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [pkAgent.keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        keysKeyPairReset,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const rootKeyPair1 = pkAgent.keyRing.keyPair;
    const nodeId1 = pkAgent.keyRing.getNodeId();
    // @ts-ignore - get protected property
    const config1 = pkAgent.nodeConnectionManager.quicServer.config;
    const fwdTLSConfig1 = {
      keyPrivatePem: config1.key,
      certChainPem: config1.cert,
    };
    const expectedTLSConfig1: TLSConfig = {
      keyPrivatePem: keysUtils.privateKeyToPEM(rootKeyPair1.privateKey),
      certChainPem: await pkAgent.certManager.getCertPEMsChainPEM(),
    };
    const nodeIdStatus1 = (await pkAgent.status.readStatus())!.data.nodeId;
    expect(mockedRefreshBuckets).not.toHaveBeenCalled();
    expect(fwdTLSConfig1).toEqual(expectedTLSConfig1);
    expect(nodeId1.equals(nodeIdStatus1)).toBe(true);
    // Run command
    await rpcClient.methods.keysKeyPairReset({
      password: 'somepassphrase',
    });
    const rootKeyPair2 = pkAgent.keyRing.keyPair;
    const nodeId2 = pkAgent.keyRing.getNodeId();
    // @ts-ignore - get protected property
    const config2 = pkAgent.nodeConnectionManager.quicServer.config;
    const fwdTLSConfig2 = {
      keyPrivatePem: config2.key,
      certChainPem: config2.cert,
    };
    const expectedTLSConfig2: TLSConfig = {
      keyPrivatePem: keysUtils.privateKeyToPEM(rootKeyPair2.privateKey),
      certChainPem: await pkAgent.certManager.getCertPEMsChainPEM(),
    };
    const nodeIdStatus2 = (await pkAgent.status.readStatus())!.data.nodeId;
    expect(mockedRefreshBuckets).toHaveBeenCalled();
    expect(fwdTLSConfig2).toEqual(expectedTLSConfig2);
    expect(rootKeyPair2.privateKey).not.toBe(rootKeyPair1.privateKey);
    expect(rootKeyPair2.publicKey).not.toBe(rootKeyPair1.publicKey);
    expect(nodeId1).not.toBe(nodeId2);
    expect(nodeIdStatus1).not.toBe(nodeIdStatus2);
    expect(nodeId2.equals(nodeIdStatus2)).toBe(true);
  });
});
describe('keysPasswordChange', () => {
  const logger = new Logger('keysPasswordChange test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
  let identitiesManager: IdentitiesManager;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
  });
  afterEach(async () => {
    await clientService.stop({ force: true });
    await webSocketClient.destroy(true);
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('changes the password', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        keysPasswordChange: new KeysPasswordChangeHandler({
          keyRing,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        keysPasswordChange,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    await rpcClient.methods.keysPasswordChange({
      password: 'newpassword',
    });
    await keyRing.stop();
    await keyRing.start({
      password: 'newpassword',
    });
  });
});
describe('keysPublicKey', () => {
  const logger = new Logger('keysPublicKey test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
  let identitiesManager: IdentitiesManager;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
  });
  afterEach(async () => {
    await clientService.stop({ force: true });
    await webSocketClient.destroy(true);
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets the public key', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        keysPublicKey: new KeysPublicKeyHandler({
          keyRing,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        keysPublicKey,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const response = await rpcClient.methods.keysPublicKey({});
    expect(response.publicKeyJwk).toEqual({
      alg: expect.any(String),
      crv: expect.any(String),
      ext: expect.any(Boolean),
      key_ops: expect.any(Array),
      kty: expect.any(String),
      x: expect.any(String),
    });
  });
});
describe('keysSignVerify', () => {
  const logger = new Logger('keysSignVerify test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
  let identitiesManager: IdentitiesManager;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
  });
  afterEach(async () => {
    await clientService.stop({ force: true });
    await webSocketClient.destroy(true);
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('signs and verifies with root keypair', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        keysSign: new KeysSignHandler({
          keyRing,
        }),
        keysVerify: new KeysVerifyHandler({
          keyRing,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        keysSign,
        keysVerify,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const data = Buffer.from('abc');
    const signed = await rpcClient.methods.keysSign({
      data: data.toString('binary'),
    });
    const publicKeyJWK = publicKeyToJWK(keyRing.keyPair.publicKey);
    const response = await rpcClient.methods.keysVerify({
      data: data.toString('binary'),
      signature: signed.signature,
      publicKeyJwk: publicKeyJWK,
    });
    expect(response.success).toBeTruthy();
  });
});
