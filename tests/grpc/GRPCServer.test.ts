import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { GRPCServer, utils as grpcUtils } from '@/grpc';
import { utils as keysUtils } from '@/keys';
import { utils as networkUtils } from '@/network';
import * as testPB from '@/proto/js/Test_pb';
import * as utils from './utils';

describe('GRPCServer', () => {
  const logger = new Logger('GRPCServer Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  test('starting and stopping the server', async () => {
    const server = new GRPCServer({
      services: [[utils.TestService, utils.testService]],
      logger: logger,
    });
    const keyPair = await keysUtils.generateKeyPair(4096);
    const cert = keysUtils.generateCertificate(
      keyPair.publicKey,
      keyPair.privateKey,
      keyPair.privateKey,
      31536000,
    );
    await server.start({
      host: '127.0.0.1',
      port: 0,
      keyPrivatePem: keysUtils.privateKeyToPem(keyPair.privateKey),
      certChainPem: keysUtils.certToPem(cert),
    });
    expect(typeof server.getPort()).toBe('number');
    expect(server.getPort()).toBeGreaterThan(0);
    await server.stop();
  });
  test('connecting to the server securely', async () => {
    const server = new GRPCServer({
      services: [[utils.TestService, utils.testService]],
      logger: logger,
    });
    const serverKeyPair = await keysUtils.generateKeyPair(4096);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      31536000,
    );
    await server.start({
      host: '127.0.0.1',
      port: 0,
      keyPrivatePem: keysUtils.privateKeyToPem(serverKeyPair.privateKey),
      certChainPem: keysUtils.certToPem(serverCert),
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
      server.getPort(),
      keysUtils.privateKeyToPem(clientKeyPair.privateKey),
      keysUtils.certToPem(clientCert),
    );
    const unary = grpcUtils.promisifyUnaryCall<testPB.EchoMessage>(
      client,
      client.unary,
    );
    const m = new testPB.EchoMessage();
    m.setChallenge('a98u3e4d');
    const pCall = unary(m);
    expect(pCall.call.getPeer()).toBe(`dns:127.0.0.1:${server.getPort()}`);
    const m_ = await pCall;
    expect(m_.getChallenge()).toBe(m.getChallenge());
    utils.closeTestClientSecure(client);
    await server.stop();
  });
  test('changing the private key and certificate on the fly', async () => {
    const server = new GRPCServer({
      services: [[utils.TestService, utils.testService]],
      logger: logger,
    });
    const serverKeyPair1 = await keysUtils.generateKeyPair(4096);
    const serverCert1 = keysUtils.generateCertificate(
      serverKeyPair1.publicKey,
      serverKeyPair1.privateKey,
      serverKeyPair1.privateKey,
      31536000,
    );
    await server.start({
      host: '127.0.0.1',
      port: 0,
      keyPrivatePem: keysUtils.privateKeyToPem(serverKeyPair1.privateKey),
      certChainPem: keysUtils.certToPem(serverCert1),
    });
    const clientKeyPair = await keysUtils.generateKeyPair(4096);
    const clientCert = keysUtils.generateCertificate(
      clientKeyPair.publicKey,
      clientKeyPair.privateKey,
      clientKeyPair.privateKey,
      31536000,
    );
    // first client connection
    const nodeIdServer1 = networkUtils.certNodeId(serverCert1);
    const client1 = await utils.openTestClientSecure(
      nodeIdServer1,
      server.getPort(),
      keysUtils.privateKeyToPem(clientKeyPair.privateKey),
      keysUtils.certToPem(clientCert),
    );
    const unary1 = grpcUtils.promisifyUnaryCall<testPB.EchoMessage>(
      client1,
      client1.unary,
    );
    const m1 = new testPB.EchoMessage();
    m1.setChallenge('98f7g98dfg71');
    const pCall1 = unary1(m1);
    expect(pCall1.call.getPeer()).toBe(`dns:127.0.0.1:${server.getPort()}`);
    const m1_ = await pCall1;
    expect(m1_.getChallenge()).toBe(m1.getChallenge());
    // change key and certificate
    const serverKeyPair2 = await keysUtils.generateKeyPair(4096);
    const serverCert2 = keysUtils.generateCertificate(
      serverKeyPair2.publicKey,
      serverKeyPair2.privateKey,
      serverKeyPair2.privateKey,
      31536000,
    );
    server.setCredentials(
      keysUtils.privateKeyToPem(serverKeyPair2.privateKey),
      keysUtils.certToPem(serverCert2),
    );
    // still using first connection
    const m2 = new testPB.EchoMessage();
    m2.setChallenge('12308947239847');
    const pCall2 = unary1(m2);
    expect(pCall2.call.getPeer()).toBe(`dns:127.0.0.1:${server.getPort()}`);
    const m2_ = await pCall2;
    expect(m2_.getChallenge()).toBe(m2.getChallenge());
    // second client connection
    const nodeIdServer2 = networkUtils.certNodeId(serverCert2);
    const client2 = await utils.openTestClientSecure(
      nodeIdServer2,
      server.getPort(),
      keysUtils.privateKeyToPem(clientKeyPair.privateKey),
      keysUtils.certToPem(clientCert),
    );
    const unary2 = grpcUtils.promisifyUnaryCall<testPB.EchoMessage>(
      client2,
      client2.unary,
    );
    const m3 = new testPB.EchoMessage();
    m3.setChallenge('aa89fusd98f');
    const pCall3 = unary2(m3);
    expect(pCall3.call.getPeer()).toBe(`dns:127.0.0.1:${server.getPort()}`);
    const m3_ = await pCall3;
    expect(m3_.getChallenge()).toBe(m3.getChallenge());
    utils.closeTestClientSecure(client1);
    utils.closeTestClientSecure(client2);
    await server.stop();
  });
});
