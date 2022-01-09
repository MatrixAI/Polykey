import type { Host, Port } from '@/network/types';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import grpc from '@grpc/grpc-js';
import { utils as keysUtils } from '@/keys';
import { ForwardProxy, ReverseProxy, utils as networkUtils } from '@/network';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import { sleep } from '@/utils';
import { openTestServer, closeTestServer, GRPCClientTest } from '../grpc/utils';

describe('network index', () => {
  const logger = new Logger('Network Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const authenticate = async (_metaClient, metaServer = new grpc.Metadata()) =>
    metaServer;
  let clientKeyPairPem;
  let clientCertPem;
  let clientNodeId;
  let serverKeyPairPem;
  let serverCertPem;
  let serverNodeId;
  beforeAll(async () => {
    // Client keys
    const clientKeyPair = await keysUtils.generateKeyPair(1024);
    clientKeyPairPem = keysUtils.keyPairToPem(clientKeyPair);
    const clientCert = keysUtils.generateCertificate(
      clientKeyPair.publicKey,
      clientKeyPair.privateKey,
      clientKeyPair.privateKey,
      12332432423,
    );
    clientCertPem = keysUtils.certToPem(clientCert);
    clientNodeId = networkUtils.certNodeId(clientCert);
    // Server keys
    const serverKeyPair = await keysUtils.generateKeyPair(1024);
    serverKeyPairPem = keysUtils.keyPairToPem(serverKeyPair);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      12332432423,
    );
    serverCertPem = keysUtils.certToPem(serverCert);
    serverNodeId = networkUtils.certNodeId(serverCert);
  });
  let server;
  let revProxy;
  let fwdProxy;
  let client;
  beforeEach(async () => {
    let serverPort;
    [server, serverPort] = await openTestServer(authenticate, logger);
    revProxy = new ReverseProxy({
      logger: logger.getChild('ReverseProxy integration'),
    });
    await revProxy.start({
      serverHost: '127.0.0.1' as Host,
      serverPort: serverPort as Port,
      ingressHost: '127.0.0.1' as Host,
      ingressPort: 0 as Port,
      tlsConfig: {
        keyPrivatePem: serverKeyPairPem.privateKey,
        certChainPem: serverCertPem,
      },
    });
    fwdProxy = new ForwardProxy({
      authToken: 'abc',
      logger: logger.getChild('ForwardProxy integration'),
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: clientKeyPairPem.privateKey,
        certChainPem: clientCertPem,
      },
      proxyHost: '127.0.0.1' as Host,
      proxyPort: 0 as Port,
      egressHost: '127.0.0.1' as Host,
      egressPort: 0 as Port,
    });
    client = await GRPCClientTest.createGRPCClientTest({
      nodeId: serverNodeId,
      host: revProxy.getIngressHost(),
      port: revProxy.getIngressPort(),
      proxyConfig: {
        host: fwdProxy.getProxyHost(),
        port: fwdProxy.getProxyPort(),
        authToken: fwdProxy.authToken,
      },
      logger,
    });
  });
  afterEach(async () => {
    // All calls here are idempotent
    // they will work even when they are already shutdown
    await client.destroy();
    await fwdProxy.stop();
    await revProxy.stop();
    await closeTestServer(server);
  });
  test('grpc integration with unary and stream calls', async () => {
    const m = new utilsPB.EchoMessage();
    const challenge = 'Hello!';
    m.setChallenge(challenge);
    // Unary call
    const unaryResponse = await client.unary(m);
    expect(unaryResponse.getChallenge()).toBe(m.getChallenge());
    // Server stream
    const serverStream = client.serverStream(m);
    for await (const m_ of serverStream) {
      expect(m_.getChallenge()).toBe(m.getChallenge());
    }
    // Client stream
    const [clientStream, clientStreamResponseP] = client.clientStream();
    for (let i = 0; i < 5; i++) {
      await clientStream.next(m);
    }
    await clientStream.next(null);
    const clientStreamResponse = await clientStreamResponseP;
    expect(clientStreamResponse.getChallenge().length).toBe(
      m.getChallenge().length * 5,
    );
    // Duplex stream
    const duplexStream = client.duplexStream();
    await duplexStream.write(m);
    await duplexStream.write(null);
    const duplexStreamResponse = await duplexStream.read();
    expect(duplexStreamResponse.done).toBe(false);
    if (!duplexStreamResponse.done) {
      expect(duplexStreamResponse.value.getChallenge()).toBe(m.getChallenge());
    }
    // Ensure that the connection count is the same
    expect(fwdProxy.getConnectionCount()).toBe(1);
    expect(revProxy.getConnectionCount()).toBe(1);
    expect(
      fwdProxy.getConnectionInfoByIngress(client.host, client.port),
    ).toEqual(
      expect.objectContaining({
        nodeId: serverNodeId,
        egressHost: fwdProxy.getEgressHost(),
        egressPort: fwdProxy.getEgressPort(),
        ingressHost: revProxy.getIngressHost(),
        ingressPort: revProxy.getIngressPort(),
      }),
    );
    expect(
      revProxy.getConnectionInfoByEgress(
        fwdProxy.getEgressHost(),
        fwdProxy.getEgressPort(),
      ),
    ).toEqual(
      expect.objectContaining({
        nodeId: clientNodeId,
        egressHost: fwdProxy.getEgressHost(),
        egressPort: fwdProxy.getEgressPort(),
        ingressHost: revProxy.getIngressHost(),
        ingressPort: revProxy.getIngressPort(),
      }),
    );
  });
  test('client initiates end', async () => {
    // Wait for network to settle
    await sleep(100);
    // GRPC client end simultaneously triggers the server to end the connection
    // This is because the GRPC send ending frames at HTTP2-level
    await client.destroy();
    // Wait for network to settle
    await sleep(100);
  });
  test('server initiates end', async () => {
    // Wait for network to settle
    await sleep(100);
    // Closing the GRPC server will automatically change the state of the client
    // However because the GRPCClient has not integrated state changes of the underlying channel
    // Then the GRPCClient won't be in a destroyed state until we explicitly destroy it
    await closeTestServer(server);
    // Wait for network to settle
    await sleep(100);
  });
  test('forward initiates end', async () => {
    // Wait for network to settle
    await sleep(100);
    await fwdProxy.stop();
    // Wait for network to settle
    await sleep(100);
  });
  test('reverse initiates end', async () => {
    // Wait for network to settle
    await sleep(100);
    await revProxy.stop();
    // Wait for network to settle
    await sleep(100);
  });
});
