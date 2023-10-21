import type GestaltGraph from '@/gestalts/GestaltGraph';
import type Sigchain from '@/sigchain/Sigchain';
import type { TLSConfig } from '@/network/types';
import type { CertificatePEM } from '@/keys/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { RPCClient } from '@matrixai/rpc';
import { WebSocketClient } from '@matrixai/ws';
import PolykeyAgent from '@/PolykeyAgent';
import KeyRing from '@/keys/KeyRing';
import CertManager from '@/keys/CertManager';
import TaskManager from '@/tasks/TaskManager';
import NodeManager from '@/nodes/NodeManager';
import IdentitiesManager from '@/identities/IdentitiesManager';
import ClientService from '@/client/ClientService';
import {
  KeysCertsChainGet,
  KeysCertsGet,
  KeysDecrypt,
  KeysEncrypt,
  KeysKeyPair,
  KeysKeyPairRenew,
  KeysKeyPairReset,
  KeysPasswordChange,
  KeysPublicKey,
  KeysSign,
  KeysVerify,
} from '@/client/handlers';
import {
  keysCertsChainGet,
  keysCertsGet,
  keysDecrypt,
  keysEncrypt,
  keysKeyPair,
  keysKeyPairRenew,
  keysKeyPairReset,
  keysPasswordChange,
  keysPublicKey,
  keysSign,
  keysVerify,
} from '@/client/callers';
import * as keysUtils from '@/keys/utils';
import * as keysEvents from '@/keys/events';
import * as networkUtils from '@/network/utils';
import * as utils from '@/utils';
import * as testsUtils from '../../utils';

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
  let rpcClient: RPCClient<{
    keysCertsChainGet: typeof keysCertsChainGet;
  }>;
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
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        keysCertsChainGet: new KeysCertsChainGet({
          certManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        keysCertsChainGet,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    mockedGetRootCertChainPems.mockRestore();
    await certManager.stop();
    await taskManager.stop();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets the root certchain', async () => {
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
  let rpcClient: RPCClient<{
    keysCertsGet: typeof keysCertsGet;
  }>;
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
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        keysCertsGet: new KeysCertsGet({
          certManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        keysCertsGet,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    mockedGetRootCertPem.mockRestore();
    await certManager.stop();
    await taskManager.stop();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets the root certificate', async () => {
    const response = await rpcClient.methods.keysCertsGet({});
    expect(response.cert).toBe('rootCertPem');
  });
});
describe('keysEncrypt and keysDecrypt', () => {
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
  let rpcClient: RPCClient<{
    keysEncrypt: typeof keysEncrypt;
    keysDecrypt: typeof keysDecrypt;
  }>;
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
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        keysEncrypt: new KeysEncrypt({
          keyRing,
        }),
        keysDecrypt: new KeysDecrypt({
          keyRing,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        keysEncrypt,
        keysDecrypt,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('encrypts and decrypts data', async () => {
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
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    keysKeyPair: typeof keysKeyPair;
  }>;
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
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        keysKeyPair: new KeysKeyPair({
          keyRing,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        keysKeyPair,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild('clientRPC'),
    });
  });
  afterEach(async () => {
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets the keypair', async () => {
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
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    keysKeyPairRenew: typeof keysKeyPairRenew;
  }>;
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
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        keysKeyPairRenew: new KeysKeyPairRenew({
          certManager: pkAgent.certManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        keysKeyPairRenew,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    mockedRefreshBuckets.mockRestore();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await pkAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('renews the root key pair', async () => {
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
    const certChangeEventProm = testsUtils.promFromEvent(
      pkAgent.certManager,
      keysEvents.EventCertManagerCertChange,
    );
    // Run command
    await rpcClient.methods.keysKeyPairRenew({
      password: 'somepassphrase',
    });
    // Awaiting change to propagate
    await certChangeEventProm.p;
    // Wait some time after event for domains to update
    await utils.sleep(500);
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
  let rpcClient: RPCClient<{
    keysKeyPairReset: typeof keysKeyPairReset;
  }>;
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
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        keysKeyPairReset: new KeysKeyPairReset({
          certManager: pkAgent.certManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        keysKeyPairReset,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    mockedRefreshBuckets.mockRestore();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await pkAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('resets the root key pair', async () => {
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
    const certChangeEventProm = testsUtils.promFromEvent(
      pkAgent.certManager,
      keysEvents.EventCertManagerCertChange,
    );
    // Run command
    await rpcClient.methods.keysKeyPairReset({
      password: 'somepassphrase',
    });
    // Awaiting change to propagate
    await certChangeEventProm.p;
    // Wait some time after event for domains to update
    await utils.sleep(500);
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
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    keysPasswordChange: typeof keysPasswordChange;
  }>;
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
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        keysPasswordChange: new KeysPasswordChange({
          keyRing,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        keysPasswordChange,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('changes the password', async () => {
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
  let rpcClient: RPCClient<{
    keysPublicKey: typeof keysPublicKey;
  }>;
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
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        keysPublicKey: new KeysPublicKey({
          keyRing,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        keysPublicKey,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets the public key', async () => {
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
describe('keysSign and keysVerify', () => {
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
  let rpcClient: RPCClient<{
    keysSign: typeof keysSign;
    keysVerify: typeof keysVerify;
  }>;
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
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        keysSign: new KeysSign({
          keyRing,
        }),
        keysVerify: new KeysVerify({
          keyRing,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        keysSign,
        keysVerify,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('signs and verifies with root keypair', async () => {
    const data = Buffer.from('abc');
    const signed = await rpcClient.methods.keysSign({
      data: data.toString('binary'),
    });
    const publicKeyJWK = keysUtils.publicKeyToJWK(keyRing.keyPair.publicKey);
    const response = await rpcClient.methods.keysVerify({
      data: data.toString('binary'),
      signature: signed.signature,
      publicKeyJwk: publicKeyJWK,
    });
    expect(response.success).toBeTruthy();
  });
});
