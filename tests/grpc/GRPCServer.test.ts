import type { Host, Port } from '@/network/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';

import { GRPCServer, utils as grpcUtils } from '@/grpc';
import { KeyManager, utils as keysUtils } from '@/keys';
import { utils as networkUtils } from '@/network';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as grpcErrors from '@/grpc/errors';
import { SessionManager } from '@/sessions';
import * as clientUtils from '@/client/utils';
import * as utils from './utils';

describe('GRPCServer', () => {
  const password = 'password';
  let dataDir: string;
  let keyManager: KeyManager;
  let db: DB;
  let sessionManager: SessionManager;
  let authenticate: clientUtils.Authenticate;
  const logger = new Logger('GRPCServer Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  beforeAll(async () => {
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
  });
  test('GRPCServer readiness', async () => {
    const server = new GRPCServer({
      logger: logger,
    });
    await server.stop();
    // Noop
    await server.stop();
    expect(() => {
      server.port;
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
          utils.TestServiceService,
          utils.createTestService({ authenticate, logger }),
        ],
      ],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
      tlsConfig: {
        keyPrivatePem: keysUtils.privateKeyToPem(keyPair.privateKey),
        certChainPem: keysUtils.certToPem(cert),
      },
    });
    expect(typeof server.port).toBe('number');
    expect(server.port).toBeGreaterThan(0);
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
          utils.TestServiceService,
          utils.createTestService({ authenticate, logger }),
        ],
      ],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
      tlsConfig: {
        keyPrivatePem: keysUtils.privateKeyToPem(serverKeyPair.privateKey),
        certChainPem: keysUtils.certToPem(serverCert),
      },
    });
    const nodeIdServer = networkUtils.certNodeId(serverCert);
    const clientKeyPair = await keysUtils.generateKeyPair(4096);
    const clientCert = keysUtils.generateCertificate(
      clientKeyPair.publicKey,
      clientKeyPair.privateKey,
      clientKeyPair.privateKey,
      31536000,
    );
    const client = await utils.openTestClientSecure(
      nodeIdServer,
      server.port,
      keysUtils.privateKeyToPem(clientKeyPair.privateKey),
      keysUtils.certToPem(clientCert),
    );
    const unary = grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      client,
      client.unary,
    );
    const m = new utilsPB.EchoMessage();
    m.setChallenge('a98u3e4d');
    const pCall = unary(m);
    expect(pCall.call.getPeer()).toBe(`dns:127.0.0.1:${server.port}`);
    const m_ = await pCall;
    expect(m_.getChallenge()).toBe(m.getChallenge());
    utils.closeTestClientSecure(client);
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
          utils.TestServiceService,
          utils.createTestService({ authenticate, logger }),
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
    const nodeIdServer1 = networkUtils.certNodeId(serverCert1);
    const client1 = await utils.openTestClientSecure(
      nodeIdServer1,
      server.port,
      keysUtils.privateKeyToPem(clientKeyPair.privateKey),
      keysUtils.certToPem(clientCert),
    );
    const unary1 = grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      client1,
      client1.unary,
    );
    const m1 = new utilsPB.EchoMessage();
    m1.setChallenge('98f7g98dfg71');
    const pCall1 = unary1(m1);
    expect(pCall1.call.getPeer()).toBe(`dns:127.0.0.1:${server.port}`);
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
    expect(pCall2.call.getPeer()).toBe(`dns:127.0.0.1:${server.port}`);
    const m2_ = await pCall2;
    expect(m2_.getChallenge()).toBe(m2.getChallenge());
    // Second client connection
    const nodeIdServer2 = networkUtils.certNodeId(serverCert2);
    const client2 = await utils.openTestClientSecure(
      nodeIdServer2,
      server.port,
      keysUtils.privateKeyToPem(clientKeyPair.privateKey),
      keysUtils.certToPem(clientCert),
    );
    const unary2 = grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      client2,
      client2.unary,
    );
    const m3 = new utilsPB.EchoMessage();
    m3.setChallenge('aa89fusd98f');
    const pCall3 = unary2(m3);
    expect(pCall3.call.getPeer()).toBe(`dns:127.0.0.1:${server.port}`);
    const m3_ = await pCall3;
    expect(m3_.getChallenge()).toBe(m3.getChallenge());
    utils.closeTestClientSecure(client1);
    utils.closeTestClientSecure(client2);
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
          utils.TestServiceService,
          utils.createTestService({ authenticate, logger }),
        ],
      ],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
      tlsConfig: {
        keyPrivatePem: keysUtils.privateKeyToPem(serverKeyPair.privateKey),
        certChainPem: keysUtils.certToPem(serverCert),
      },
    });
    const nodeIdServer = networkUtils.certNodeId(serverCert);
    const clientKeyPair = await keysUtils.generateKeyPair(4096);
    const clientCert = keysUtils.generateCertificate(
      clientKeyPair.publicKey,
      clientKeyPair.privateKey,
      clientKeyPair.privateKey,
      31536000,
    );
    const client = await utils.openTestClientSecure(
      nodeIdServer,
      server.port,
      keysUtils.privateKeyToPem(clientKeyPair.privateKey),
      keysUtils.certToPem(clientCert),
    );
    const unary = grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      client,
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
    utils.closeTestClientSecure(client);
    await server.stop();
  });
});
