import type { Authenticate } from '@/client/types';
import type { Host, Port } from '@/network/types';
import type { Key, CertificatePEMChain } from '@/keys/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import GRPCServer from '@/grpc/GRPCServer';
import KeyRing from '@/keys/KeyRing';
import SessionManager from '@/sessions/SessionManager';
import * as testsUtils from '../utils';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as grpcErrors from '@/grpc/errors';
import * as grpcUtils from '@/grpc/utils';
import * as keysUtils from '@/keys/utils';
import * as clientUtils from '@/client/utils';
import * as utils from '@/utils/index';
import * as testGrpcUtils from './utils';

describe('GRPCServer', () => {
  const logger = new Logger('GRPCServer Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'password';
  let dataDir: string;
  let keyRing: KeyRing;
  let db: DB;
  let sessionManager: SessionManager;
  let authenticate: Authenticate;
  const generateCertId = keysUtils.createCertIdGenerator();

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: keyRing.dbKey,
        ops: {
          encrypt: async (key, plainText) => {
            return keysUtils.encryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(plainText),
            );
          },
          decrypt: async (key, cipherText) => {
            return keysUtils.decryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(cipherText),
            );
          },
        },
      },
    });
    sessionManager = await SessionManager.createSessionManager({
      db,
      keyRing,
      logger,
      expiry: 60000,
    });
    authenticate = clientUtils.authenticator(sessionManager, keyRing);
  });
  afterEach(async () => {
    await sessionManager.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
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
      tlsConfig: await testsUtils.createTLSConfig(await keysUtils.generateKeyPair()),
    });
    expect(typeof server.getPort()).toBe('number');
    expect(server.getPort()).toBeGreaterThan(0);
    await server.stop();
  });
  test('connecting to the server securely', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair();
    const serverCert = await keysUtils.generateCertificate({
      certId: generateCertId(),
      duration: 31536000,
      issuerPrivateKey: serverKeyPair.privateKey,
      subjectKeyPair: { privateKey: serverKeyPair.privateKey, publicKey: serverKeyPair.publicKey }
    });
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
      tlsConfig: await testsUtils.createTLSConfig(await keysUtils.generateKeyPair()),
    });
    const nodeIdServer = keysUtils.certNodeId(serverCert)!;
    const clientKeyPair = await keysUtils.generateKeyPair();
    const clientCert = await keysUtils.generateCertificate({
      certId: generateCertId(),
      duration: 31536000,
      issuerPrivateKey: clientKeyPair.privateKey,
      subjectKeyPair: { privateKey: clientKeyPair.privateKey, publicKey: clientKeyPair.publicKey }
    });
    const client = await testGrpcUtils.openTestClientSecure(
      nodeIdServer,
      server.getPort(),
      keysUtils.privateKeyToPEM(clientKeyPair.privateKey),
      keysUtils.certToPEM(clientCert),
    );
    const unary = grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      client,
      {
        nodeId: nodeIdServer,
        host: server.getHost(),
        port: server.getPort(),
        command: 'unary',
      },
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
    const serverKeyPair1 = await keysUtils.generateKeyPair();
    const serverCert1 = await keysUtils.generateCertificate({
      certId: generateCertId(),
      duration: 31536000,
      issuerPrivateKey: serverKeyPair1.privateKey,
      subjectKeyPair: { privateKey: serverKeyPair1.privateKey, publicKey: serverKeyPair1.publicKey }
    });
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
        keyPrivatePem: keysUtils.privateKeyToPEM(serverKeyPair1.privateKey),
        certChainPem: keysUtils.certToPEM(serverCert1) as unknown as CertificatePEMChain,
      },
    });
    const clientKeyPair = await keysUtils.generateKeyPair();
    const clientCert = await keysUtils.generateCertificate({
      certId: generateCertId(),
      duration: 31536000,
      issuerPrivateKey: clientKeyPair.privateKey,
      subjectKeyPair: { privateKey: clientKeyPair.privateKey, publicKey: clientKeyPair.publicKey }
    });
    // First client connection
    const nodeIdServer1 = keysUtils.certNodeId(serverCert1)!;
    const client1 = await testGrpcUtils.openTestClientSecure(
      nodeIdServer1,
      server.getPort(),
      keysUtils.privateKeyToPEM(clientKeyPair.privateKey),
      keysUtils.certToPEM(clientCert),
    );
    const unary1 = grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      client1,
      {
        nodeId: nodeIdServer1,
        host: server.getHost(),
        port: server.getPort(),
        command: 'unary1',
      },
      client1.unary,
    );
    const m1 = new utilsPB.EchoMessage();
    m1.setChallenge('98f7g98dfg71');
    const pCall1 = unary1(m1);
    expect(pCall1.call.getPeer()).toBe(`dns:127.0.0.1:${server.getPort()}`);
    const m1_ = await pCall1;
    expect(m1_.getChallenge()).toBe(m1.getChallenge());
    // Change key and certificate
    const serverKeyPair2 = await keysUtils.generateKeyPair();
    const serverCert2 = await keysUtils.generateCertificate({
      certId: generateCertId(),
      duration: 31536000,
      issuerPrivateKey: serverKeyPair2.privateKey,
      subjectKeyPair: { privateKey: serverKeyPair2.privateKey, publicKey: serverKeyPair2.publicKey }
    });
    server.setTLSConfig({
      keyPrivatePem: keysUtils.privateKeyToPEM(serverKeyPair2.privateKey),
      certChainPem: keysUtils.certToPEM(serverCert2) as unknown as CertificatePEMChain,
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
      keysUtils.privateKeyToPEM(clientKeyPair.privateKey),
      keysUtils.certToPEM(clientCert),
    );
    const unary2 = grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      client2,
      {
        nodeId: nodeIdServer2,
        host: server.getHost(),
        port: server.getPort(),
        command: 'unary2',
      },
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
    const serverKeyPair = await keysUtils.generateKeyPair();
    const serverCert = await keysUtils.generateCertificate({
      certId: generateCertId(),
      duration: 31536000,
      issuerPrivateKey: serverKeyPair.privateKey,
      subjectKeyPair: { privateKey: serverKeyPair.privateKey, publicKey: serverKeyPair.publicKey }
    });
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
        keyPrivatePem: keysUtils.privateKeyToPEM(serverKeyPair.privateKey),
        certChainPem: keysUtils.certToPEM(serverCert) as unknown as CertificatePEMChain,
      },
    });
    const nodeIdServer = keysUtils.certNodeId(serverCert)!;
    const clientKeyPair = await keysUtils.generateKeyPair();
    const clientCert = await keysUtils.generateCertificate({
      certId: generateCertId(),
      duration: 31536000,
      issuerPrivateKey: clientKeyPair.privateKey,
      subjectKeyPair: { privateKey: clientKeyPair.privateKey, publicKey: clientKeyPair.publicKey }
    });
    const client = await testGrpcUtils.openTestClientSecure(
      nodeIdServer,
      server.getPort(),
      keysUtils.privateKeyToPEM(clientKeyPair.privateKey),
      keysUtils.certToPEM(clientCert),
    );
    const unary = grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      client,
      {
        nodeId: nodeIdServer,
        host: server.getHost(),
        port: server.getPort(),
        command: 'unary',
      },
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
