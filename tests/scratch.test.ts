import type { IncomingMessage } from 'http';
import type { TLSSocket } from 'tls';
import https from 'https';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as ws from 'ws';
import { sleep } from 'ix/asynciterable/_sleep';
import NodeManager from '@/nodes/NodeManager';
import * as keysUtils from '@/keys/utils';
import { promise } from '@/utils';
import * as testsUtils from './utils';

// This is a 'scratch paper' test file for quickly running tests in the CI
describe('scratch', () => {
  const _logger = new Logger(`${NodeManager.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
});

// We can't have empty test files so here is a sanity test
test('Should avoid empty test suite', async () => {
  expect(1 + 1).toBe(2);
});

test('ws server', async () => {
  const keyPair = keysUtils.generateKeyPair();
  const tlsConfig = await testsUtils.createTLSConfig(keyPair);
  const server = https.createServer({
    key: tlsConfig.keyPrivatePem,
    cert: tlsConfig.certChainPem,
  });
  console.log(tlsConfig);
  const webSocketServer = new ws.WebSocketServer({
    server,
  });
  server.on('listening', (...args) => console.log('listening', args));

  webSocketServer.on(
    'connection',
    function connection(ws, request: IncomingMessage) {
      console.log(request.connection.localAddress);
      console.log(request.connection.localPort);
      console.log(request.connection.remoteAddress);
      console.log(request.connection.remotePort);
      const tlsSocket = request.connection as TLSSocket;
      console.log(tlsSocket.getCertificate());
      console.log(tlsSocket.getPeerCertificate());
      ws.on('error', console.error);

      ws.on('message', function message(data) {
        console.log('received: %s', data);
      });

      ws.send('something');
    },
  );
  const listenProm = promise<void>();
  server.listen(55555, '127.0.0.1', listenProm.resolveP);
  await listenProm.p;
  console.log(server.address());

  // Try connecting!
  const webSocket = new ws.WebSocket('wss://127.0.0.1:55555', {
    rejectUnauthorized: false,
  });
  webSocket.on('error', console.error);

  webSocket.on('open', function open() {
    webSocket.send(Buffer.from('HELLO!'));
  });

  await sleep(2000);
  server.close();
});
