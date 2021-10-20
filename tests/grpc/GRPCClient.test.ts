import type { Host, Port } from '@/network/types';

import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { utils as keysUtils } from '@/keys';
import { utils as networkUtils } from '@/network';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as utils from './utils';

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
    const client = new utils.GRPCClientTest({
      nodeId: nodeIdServer,
      host: '127.0.0.1' as Host,
      port: port as Port,
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
      tlsConfig: {
        keyPrivatePem: keysUtils.privateKeyToPem(clientKeyPair.privateKey),
        certChainPem: keysUtils.certToPem(clientCert),
      },
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
    const client = new utils.GRPCClientTest({
      nodeId: nodeIdServer,
      host: '127.0.0.1' as Host,
      port: port as Port,
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
      tlsConfig: {
        keyPrivatePem: keysUtils.privateKeyToPem(clientKeyPair.privateKey),
        certChainPem: keysUtils.certToPem(clientCert),
      },
      timeout: 1000,
    });
    const m = new utilsPB.EchoMessage();
    m.setChallenge('a98u3e4d');
    const pCall = client.unary(m);
    expect(pCall.call.getPeer()).toBe(`dns:127.0.0.1:${port}`);
    const m_ = await pCall;
    expect(m_.getChallenge()).toBe(m.getChallenge());
    await client.stop();
    await utils.closeTestServerSecure(server);
  });
});
