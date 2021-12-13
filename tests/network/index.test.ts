import type { Host, Port } from '@/network/types';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import grpc from '@grpc/grpc-js';
import { utils as keysUtils } from '@/keys';
import { ForwardProxy, ReverseProxy, utils as networkUtils } from '@/network';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import { openTestServer, closeTestServer, GRPCClientTest } from '../grpc/utils';

describe('network index', () => {
  const logger = new Logger('Network Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  test('integration of forward and reverse proxy', async () => {
    // Client keys
    const clientKeyPair = await keysUtils.generateKeyPair(1024);
    const clientKeyPairPem = keysUtils.keyPairToPem(clientKeyPair);
    const clientCert = keysUtils.generateCertificate(
      clientKeyPair.publicKey,
      clientKeyPair.privateKey,
      clientKeyPair.privateKey,
      12332432423,
    );
    const clientCertPem = keysUtils.certToPem(clientCert);
    const clientNodeId = networkUtils.certNodeId(clientCert);
    // Server keys
    const serverKeyPair = await keysUtils.generateKeyPair(1024);
    const serverKeyPairPem = keysUtils.keyPairToPem(serverKeyPair);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      12332432423,
    );
    const serverCertPem = keysUtils.certToPem(serverCert);
    const serverNodeId = networkUtils.certNodeId(serverCert);
    const authenticate = async (metaClient, metaServer = new grpc.Metadata()) =>
      metaServer;
    const [server, serverPort] = await openTestServer(authenticate, logger);
    const revProxy = new ReverseProxy({
      logger,
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
    const fwdProxy = new ForwardProxy({
      authToken: 'abc',
      logger,
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
    const client = await GRPCClientTest.createGRPCClientTest({
      nodeId: serverNodeId,
      host: revProxy.ingressHost,
      port: revProxy.ingressPort,
      proxyConfig: {
        host: fwdProxy.getProxyHost(),
        port: fwdProxy.getProxyPort(),
        authToken: fwdProxy.authToken,
      },
      logger,
    });
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
    expect(revProxy.connectionCount).toBe(1);
    expect(
      fwdProxy.getConnectionInfoByIngress(client.host, client.port),
    ).toEqual(
      expect.objectContaining({
        nodeId: serverNodeId,
        egressHost: fwdProxy.getEgressHost(),
        egressPort: fwdProxy.getEgressPort(),
        ingressHost: revProxy.ingressHost,
        ingressPort: revProxy.ingressPort,
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
        ingressHost: revProxy.ingressHost,
        ingressPort: revProxy.ingressPort,
      }),
    );
    await client.destroy();
    await fwdProxy.stop();
    await revProxy.stop();
    await closeTestServer(server);
  });
});
