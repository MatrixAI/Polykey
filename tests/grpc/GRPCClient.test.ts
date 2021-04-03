import type { PrivateKeyPem, CertificatePemChain } from '@/keys/types';

import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { GRPCClient, utils as grpcUtils } from '@/grpc';
import { utils as keysUtils } from '@/keys';
import { utils as networkUtils } from '@/network';
import { TestClient } from '@/proto/js/Test_grpc_pb';
import * as testPB from '@/proto/js/Test_pb';
import * as utils from './utils';

class GRPCClientTest extends GRPCClient<TestClient> {
  public async start({
    keyPrivatePem,
    certChainPem,
    timeout = Infinity,
  }: {
    keyPrivatePem: PrivateKeyPem;
    certChainPem: CertificatePemChain;
    timeout?: number;
  }): Promise<void> {
    await super.start({
      clientConstructor: TestClient,
      keyPrivatePem,
      certChainPem,
      timeout,
    });
  }

  public unary(...args) {
    return grpcUtils.promisifyUnaryCall<testPB.EchoMessage>(
      this.client,
      this.client.unary,
    )(...args);
  }

  public serverStream(...args) {
    return grpcUtils.promisifyReadableStreamCall<testPB.EchoMessage>(
      this.client,
      this.client.serverStream,
    )(...args);
  }

  public clientStream(...args) {
    return grpcUtils.promisifyWritableStreamCall<
      testPB.EchoMessage,
      testPB.EchoMessage
    >(
      this.client,
      this.client.clientStream,
    )(...args);
  }

  public duplexStream(...args) {
    return grpcUtils.promisifyDuplexStreamCall<
      testPB.EchoMessage,
      testPB.EchoMessage
    >(
      this.client,
      this.client.duplexStream,
    )(...args);
  }
}

describe('GRPCClient', () => {
  const logger = new Logger('GRPCClient Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  test('starting and stopping the client', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(4096);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      31536000,
    );
    const nodeIdServer = networkUtils.certNodeId(serverCert);
    const [server, port] = await utils.openTestServerSecure(
      keysUtils.privateKeyToPem(serverKeyPair.privateKey),
      keysUtils.certToPem(serverCert),
    );
    const client = new GRPCClientTest({
      nodeId: nodeIdServer,
      host: '127.0.0.1',
      port: port,
      logger,
    });
    const clientKeyPair = await keysUtils.generateKeyPair(4096);
    const clientCert = keysUtils.generateCertificate(
      clientKeyPair.publicKey,
      clientKeyPair.privateKey,
      clientKeyPair.privateKey,
      31536000,
    );
    await client.start({
      keyPrivatePem: keysUtils.privateKeyToPem(clientKeyPair.privateKey),
      certChainPem: keysUtils.certToPem(clientCert),
      timeout: 1000,
    });
    await client.stop();
    await utils.closeTestServerSecure(server);
  });
  test('calling unary', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(4096);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      31536000,
    );
    const nodeIdServer = networkUtils.certNodeId(serverCert);
    const [server, port] = await utils.openTestServerSecure(
      keysUtils.privateKeyToPem(serverKeyPair.privateKey),
      keysUtils.certToPem(serverCert),
    );
    const client = new GRPCClientTest({
      nodeId: nodeIdServer,
      host: '127.0.0.1',
      port: port,
      logger,
    });
    const clientKeyPair = await keysUtils.generateKeyPair(4096);
    const clientCert = keysUtils.generateCertificate(
      clientKeyPair.publicKey,
      clientKeyPair.privateKey,
      clientKeyPair.privateKey,
      31536000,
    );
    await client.start({
      keyPrivatePem: keysUtils.privateKeyToPem(clientKeyPair.privateKey),
      certChainPem: keysUtils.certToPem(clientCert),
      timeout: 1000,
    });
    const m = new testPB.EchoMessage();
    m.setChallenge('a98u3e4d');
    const pCall = client.unary(m);
    expect(pCall.call.getPeer()).toBe(`dns:127.0.0.1:${port}`);
    const m_ = await pCall;
    expect(m_.getChallenge()).toBe(m.getChallenge());
    await client.stop();
    await utils.closeTestServerSecure(server);
  });
});
