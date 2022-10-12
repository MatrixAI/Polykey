import type { Host, Port } from '@/network/types';
import type { NodeId } from '@/ids/index';
import type { KeyPair } from '@/keys/types';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import grpc from '@grpc/grpc-js';
import * as keysUtils from '@/keys/utils';
import Proxy from '@/network/Proxy';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import { sleep } from '@/utils';
import { openTestServer, closeTestServer, GRPCClientTest } from '../grpc/utils';
import * as testsUtils from '../utils';

describe('network index', () => {
  const logger = new Logger('Network Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const authenticate = async (_metaClient, metaServer = new grpc.Metadata()) =>
    metaServer;
  let clientKeyPair: KeyPair;
  let clientNodeId: NodeId;
  let serverKeyPair: KeyPair;
  let serverNodeId: NodeId;
  beforeAll(async () => {
    // Client keys
    clientKeyPair = await keysUtils.generateKeyPair();
    clientNodeId = keysUtils.publicKeyToNodeId(clientKeyPair.publicKey)!;
    // Server keys
    serverKeyPair = await keysUtils.generateKeyPair();
    serverNodeId = keysUtils.publicKeyToNodeId(serverKeyPair.publicKey)!;
  });
  let server;
  let server2;
  let localProxy: Proxy;
  let remoteProxy: Proxy;
  let client;
  beforeEach(async () => {
    let serverPort;
    let serverPort2;
    [server, serverPort] = await openTestServer(authenticate, logger);
    [server2, serverPort2] = await openTestServer(authenticate, logger);
    remoteProxy = new Proxy({
      authToken: 'abc',
      logger: logger.getChild('Proxy integration'),
    });
    remoteProxy = new Proxy({
      authToken: 'abc',
      logger: logger.getChild('Proxy integration'),
    });
    await remoteProxy.start({
      tlsConfig: await testsUtils.createTLSConfig(serverKeyPair),
      forwardHost: '127.0.0.1' as Host,
      forwardPort: 0 as Port,
      proxyHost: '127.0.0.1' as Host,
      proxyPort: 0 as Port,
      serverHost: '127.0.0.1' as Host,
      serverPort: serverPort as Port,
    });
    localProxy = new Proxy({
      authToken: 'abc',
      logger: logger.getChild('Proxy integration'),
    });
    await localProxy.start({
      tlsConfig: await testsUtils.createTLSConfig(clientKeyPair),
      forwardHost: '127.0.0.1' as Host,
      forwardPort: 0 as Port,
      proxyHost: '127.0.0.1' as Host,
      proxyPort: 0 as Port,
      serverHost: '127.0.0.1' as Host,
      serverPort: serverPort2 as Port,
    });
    client = await GRPCClientTest.createGRPCClientTest({
      nodeId: serverNodeId,
      host: remoteProxy.getProxyHost(),
      port: remoteProxy.getProxyPort(),
      proxyConfig: {
        host: localProxy.getForwardHost(),
        port: localProxy.getForwardPort(),
        authToken: localProxy.authToken,
      },
      logger,
    });
  });
  afterEach(async () => {
    // All calls here are idempotent
    // they will work even when they are already shutdown
    await client.destroy();
    await remoteProxy.stop();
    await localProxy.stop();
    await closeTestServer(server);
    await closeTestServer(server2);
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
    expect(localProxy.getConnectionForwardCount()).toBe(1);
    expect(remoteProxy.getConnectionReverseCount()).toBe(1);
    expect(
      localProxy.getConnectionInfoByProxy(client.host, client.port),
    ).toEqual(
      expect.objectContaining({
        remoteNodeId: serverNodeId,
        localHost: localProxy.getProxyHost(),
        localPort: localProxy.getProxyPort(),
        remoteHost: remoteProxy.getProxyHost(),
        remotePort: remoteProxy.getProxyPort(),
      }),
    );
    expect(
      remoteProxy.getConnectionInfoByProxy(
        localProxy.getProxyHost(),
        localProxy.getProxyPort(),
      ),
    ).toEqual(
      expect.objectContaining({
        remoteNodeId: clientNodeId,
        remoteHost: localProxy.getProxyHost(),
        remotePort: localProxy.getProxyPort(),
        localHost: remoteProxy.getProxyHost(),
        localPort: remoteProxy.getProxyPort(),
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
    await localProxy.stop();
    // Wait for network to settle
    await sleep(100);
  });
  test('reverse initiates end', async () => {
    // Wait for network to settle
    await sleep(100);
    await remoteProxy.stop();
    // Wait for network to settle
    await sleep(100);
  });
});
