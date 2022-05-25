import type { Authenticate } from '@/client/types';
import type { Host, Port } from '@/network/types';
import type { ClientMetadata } from '@/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import GRPCServer from '@/grpc/GRPCServer';
import KeyManager from '@/keys/KeyManager';
import SessionManager from '@/sessions/SessionManager';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as grpcErrors from '@/grpc/errors';
import * as grpcUtils from '@/grpc/utils';
import * as keysUtils from '@/keys/utils';
import * as clientUtils from '@/client/utils';
import * as testGrpcUtils from './utils';
import * as testUtils from '../utils';

describe('GRPCServer', () => {
  const logger = new Logger('GRPCServer Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'password';
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  let dataDir: string;
  let keyManager: KeyManager;
  let db: DB;
  let sessionManager: SessionManager;
  let authenticate: Authenticate;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValue(globalKeyPair);
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: keyManager.dbKey,
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
    });
    sessionManager = await SessionManager.createSessionManager({
      db,
      keyManager,
      logger,
      expiry: 60000,
    });
    authenticate = clientUtils.authenticator(sessionManager, keyManager);
  });
  afterAll(async () => {
    await sessionManager.stop();
    await db.stop();
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
  });
  test('GRPCServer readiness', async () => {
    const server = new GRPCServer({
      logger: logger,
    });
    await server.stop();
    // Noop
    await server.stop();
    expect(() => {
      server.getPort();
    }).toThrow(grpcErrors.ErrorGRPCServerNotRunning);
    expect(() => {
      server.closeServerForce();
    }).toThrow(grpcErrors.ErrorGRPCServerNotRunning);
  });
  test('starting and stopping the server', async () => {
    const keyPair = await keysUtils.generateKeyPair(4096);
    const cert = keysUtils.generateCertificate(
      keyPair.publicKey,
      keyPair.privateKey,
      keyPair.privateKey,
      31536000,
    );
    const server = new GRPCServer({
      logger: logger,
    });
    await server.start({
      services: [
        [
          testGrpcUtils.TestServiceService,
          testGrpcUtils.createTestService({ authenticate, logger }),
        ],
      ],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
      tlsConfig: {
        keyPrivatePem: keysUtils.privateKeyToPem(keyPair.privateKey),
        certChainPem: keysUtils.certToPem(cert),
      },
    });
    expect(typeof server.getPort()).toBe('number');
    expect(server.getPort()).toBeGreaterThan(0);
    await server.stop();
  });
  test('connecting to the server securely', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(4096);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      31536000,
    );
    const server = new GRPCServer({
      logger: logger,
    });
    await server.start({
      services: [
        [
          testGrpcUtils.TestServiceService,
          testGrpcUtils.createTestService({ authenticate, logger }),
        ],
      ],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
      tlsConfig: {
        keyPrivatePem: keysUtils.privateKeyToPem(serverKeyPair.privateKey),
        certChainPem: keysUtils.certToPem(serverCert),
      },
    });
    const nodeIdServer = keysUtils.certNodeId(serverCert)!;
    const clientKeyPair = await keysUtils.generateKeyPair(4096);
    const clientCert = keysUtils.generateCertificate(
      clientKeyPair.publicKey,
      clientKeyPair.privateKey,
      clientKeyPair.privateKey,
      31536000,
    );
    const client = await testGrpcUtils.openTestClientSecure(
      nodeIdServer,
      server.getPort(),
      keysUtils.privateKeyToPem(clientKeyPair.privateKey),
      keysUtils.certToPem(clientCert),
    );
    const unary = grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      client,
      {} as ClientMetadata,
      client.unary,
    );
    const m = new utilsPB.EchoMessage();
    m.setChallenge('a98u3e4d');
    const pCall = unary(m);
    expect(pCall.call.getPeer()).toBe(`dns:127.0.0.1:${server.getPort()}`);
    const m_ = await pCall;
    expect(m_.getChallenge()).toBe(m.getChallenge());
    testGrpcUtils.closeTestClientSecure(client);
    await server.stop();
  });
  test('changing the private key and certificate on the fly', async () => {
    const serverKeyPair1 = await keysUtils.generateKeyPair(4096);
    const serverCert1 = keysUtils.generateCertificate(
      serverKeyPair1.publicKey,
      serverKeyPair1.privateKey,
      serverKeyPair1.privateKey,
      31536000,
    );
    const server = new GRPCServer({
      logger: logger,
    });
    await server.start({
      services: [
        [
          testGrpcUtils.TestServiceService,
          testGrpcUtils.createTestService({ authenticate, logger }),
        ],
      ],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
      tlsConfig: {
        keyPrivatePem: keysUtils.privateKeyToPem(serverKeyPair1.privateKey),
        certChainPem: keysUtils.certToPem(serverCert1),
      },
    });
    const clientKeyPair = await keysUtils.generateKeyPair(4096);
    const clientCert = keysUtils.generateCertificate(
      clientKeyPair.publicKey,
      clientKeyPair.privateKey,
      clientKeyPair.privateKey,
      31536000,
    );
    // First client connection
    const nodeIdServer1 = keysUtils.certNodeId(serverCert1)!;
    const client1 = await testGrpcUtils.openTestClientSecure(
      nodeIdServer1,
      server.getPort(),
      keysUtils.privateKeyToPem(clientKeyPair.privateKey),
      keysUtils.certToPem(clientCert),
    );
    const unary1 = grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      client1,
      {} as ClientMetadata,
      client1.unary,
    );
    const m1 = new utilsPB.EchoMessage();
    m1.setChallenge('98f7g98dfg71');
    const pCall1 = unary1(m1);
    expect(pCall1.call.getPeer()).toBe(`dns:127.0.0.1:${server.getPort()}`);
    const m1_ = await pCall1;
    expect(m1_.getChallenge()).toBe(m1.getChallenge());
    // Change key and certificate
    const serverKeyPair2 = await keysUtils.generateKeyPair(4096);
    const serverCert2 = keysUtils.generateCertificate(
      serverKeyPair2.publicKey,
      serverKeyPair2.privateKey,
      serverKeyPair2.privateKey,
      31536000,
    );
    server.setTLSConfig({
      keyPrivatePem: keysUtils.privateKeyToPem(serverKeyPair2.privateKey),
      certChainPem: keysUtils.certToPem(serverCert2),
    });
    // Still using first connection
    const m2 = new utilsPB.EchoMessage();
    m2.setChallenge('12308947239847');
    const pCall2 = unary1(m2);
    expect(pCall2.call.getPeer()).toBe(`dns:127.0.0.1:${server.getPort()}`);
    const m2_ = await pCall2;
    expect(m2_.getChallenge()).toBe(m2.getChallenge());
    // Second client connection
    const nodeIdServer2 = keysUtils.certNodeId(serverCert2)!;
    const client2 = await testGrpcUtils.openTestClientSecure(
      nodeIdServer2,
      server.getPort(),
      keysUtils.privateKeyToPem(clientKeyPair.privateKey),
      keysUtils.certToPem(clientCert),
    );
    const unary2 = grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      client2,
      {} as ClientMetadata,
      client2.unary,
    );
    const m3 = new utilsPB.EchoMessage();
    m3.setChallenge('aa89fusd98f');
    const pCall3 = unary2(m3);
    expect(pCall3.call.getPeer()).toBe(`dns:127.0.0.1:${server.getPort()}`);
    const m3_ = await pCall3;
    expect(m3_.getChallenge()).toBe(m3.getChallenge());
    testGrpcUtils.closeTestClientSecure(client1);
    testGrpcUtils.closeTestClientSecure(client2);
    await server.stop();
  });
  test('authenticated commands acquire a token', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(4096);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      31536000,
    );
    const server = new GRPCServer({
      logger: logger,
    });
    await server.start({
      services: [
        [
          testGrpcUtils.TestServiceService,
          testGrpcUtils.createTestService({ authenticate, logger }),
        ],
      ],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
      tlsConfig: {
        keyPrivatePem: keysUtils.privateKeyToPem(serverKeyPair.privateKey),
        certChainPem: keysUtils.certToPem(serverCert),
      },
    });
    const nodeIdServer = keysUtils.certNodeId(serverCert)!;
    const clientKeyPair = await keysUtils.generateKeyPair(4096);
    const clientCert = keysUtils.generateCertificate(
      clientKeyPair.publicKey,
      clientKeyPair.privateKey,
      clientKeyPair.privateKey,
      31536000,
    );
    const client = await testGrpcUtils.openTestClientSecure(
      nodeIdServer,
      server.getPort(),
      keysUtils.privateKeyToPem(clientKeyPair.privateKey),
      keysUtils.certToPem(clientCert),
    );
    const unary = grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      client,
      {} as ClientMetadata,
      client.unaryAuthenticated,
    );
    const m = new utilsPB.EchoMessage();
    m.setChallenge('a98u3e4d');
    const auth = clientUtils.encodeAuthFromPassword(password);
    const pCall = unary(m, auth);
    const m_ = await pCall;
    expect(m_.getChallenge()).toBe(m.getChallenge());
    const token = clientUtils.decodeAuthToSession(await pCall.meta);
    expect(typeof token).toBe('string');
    expect(token!.length > 0).toBe(true);
    expect(await sessionManager.verifyToken(token!)).toBe(true);
    testGrpcUtils.closeTestClientSecure(client);
    await server.stop();
  });
});
