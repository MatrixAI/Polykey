import type { ReadableWritablePair } from 'stream/web';
import type { TLSConfig } from '@/network/types';
import type { KeyPair } from '@/keys/types';
import type http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { testProp, fc } from '@fast-check/jest';
import { Timer } from '@matrixai/timer';
import { status } from '@matrixai/async-init';
import { KeyRing } from '@/keys/index';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import { promise } from '@/utils';
import * as keysUtils from '@/keys/utils';
import * as webSocketErrors from '@/websockets/errors';
import * as nodesUtils from '@/nodes/utils';
import * as testNodeUtils from '../nodes/utils';
import * as testsUtils from '../utils';

// This file tests both the client and server together. They're too interlinked
//  to be separate.
describe('WebSocket', () => {
  const logger = new Logger('websocket test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  let dataDir: string;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  const host = '127.0.0.2';
  let webSocketServer: WebSocketServer;
  let webSocketClient: WebSocketClient;

  const messagesArb = fc.array(
    fc.uint8Array({ minLength: 1 }).map((d) => Buffer.from(d)),
  );
  const streamsArb = fc.array(messagesArb, { minLength: 1 }).noShrink();
  const asyncReadWrite = async (
    messages: Array<Buffer>,
    streamPair: ReadableWritablePair<Uint8Array, Uint8Array>,
  ) => {
    await Promise.allSettled([
      (async () => {
        const writer = streamPair.writable.getWriter();
        for (const message of messages) {
          await writer.write(message);
        }
        await writer.close();
      })(),
      (async () => {
        for await (const _ of streamPair.readable) {
          // No touch, only consume
        }
      })(),
    ]);
  };

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      keysPath: keysPath,
      password: 'password',
      logger: logger.getChild('keyRing'),
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
  });
  afterEach(async () => {
    logger.info('AFTEREACH');
    await webSocketServer?.stop(true);
    await webSocketClient?.destroy(true);
    await keyRing.stop();
    await fs.promises.rm(dataDir, { force: true, recursive: true });
  });

  // These tests are share between client and server
  test('makes a connection', async () => {
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair) => {
        logger.info('inside callback');
        void streamPair.readable
          .pipeTo(streamPair.writable)
          .catch(() => {})
          .finally(() => logger.info('STREAM HANDLING ENDED'));
      },
      basePath: dataDir,
      tlsConfig,
      host,
      logger: logger.getChild('server'),
    });
    logger.info(`Server started on port ${webSocketServer.getPort()}`);
    webSocketClient = await WebSocketClient.createWebSocketClient({
      host,
      port: webSocketServer.getPort(),
      expectedNodeIds: [keyRing.getNodeId()],
      logger: logger.getChild('clientClient'),
    });
    const websocket = await webSocketClient.startConnection();

    const writer = websocket.writable.getWriter();
    const reader = websocket.readable.getReader();
    const message1 = Buffer.from('1request1');
    await writer.write(message1);
    expect((await reader.read()).value).toStrictEqual(message1);
    const message2 = Buffer.from('1request2');
    await writer.write(message2);
    expect((await reader.read()).value).toStrictEqual(message2);
    await writer.close();
    expect((await reader.read()).done).toBeTrue();
    logger.info('ending');
  });
  test('makes a connection over IPv6', async () => {
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair) => {
        logger.info('inside callback');
        void streamPair.readable
          .pipeTo(streamPair.writable)
          .catch(() => {})
          .finally(() => logger.info('STREAM HANDLING ENDED'));
      },
      basePath: dataDir,
      tlsConfig,
      host: '::1',
      logger: logger.getChild('server'),
    });
    logger.info(`Server started on port ${webSocketServer.getPort()}`);
    webSocketClient = await WebSocketClient.createWebSocketClient({
      host: '::1',
      port: webSocketServer.getPort(),
      expectedNodeIds: [keyRing.getNodeId()],
      logger: logger.getChild('clientClient'),
    });
    const websocket = await webSocketClient.startConnection();

    const writer = websocket.writable.getWriter();
    const reader = websocket.readable.getReader();
    const message1 = Buffer.from('1request1');
    await writer.write(message1);
    expect((await reader.read()).value).toStrictEqual(message1);
    const message2 = Buffer.from('1request2');
    await writer.write(message2);
    expect((await reader.read()).value).toStrictEqual(message2);
    await writer.close();
    expect((await reader.read()).done).toBeTrue();
    logger.info('ending');
  });
  test('handles a connection and closes before message', async () => {
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair) => {
        logger.info('inside callback');
        void streamPair.readable
          .pipeTo(streamPair.writable)
          .catch(() => {})
          .finally(() => logger.info('STREAM HANDLING ENDED'));
      },
      basePath: dataDir,
      tlsConfig,
      host,
      logger: logger.getChild('server'),
    });
    logger.info(`Server started on port ${webSocketServer.getPort()}`);
    webSocketClient = await WebSocketClient.createWebSocketClient({
      host,
      port: webSocketServer.getPort(),
      expectedNodeIds: [keyRing.getNodeId()],
      logger: logger.getChild('clientClient'),
    });
    const websocket = await webSocketClient.startConnection();
    await websocket.writable.close();
    const reader = websocket.readable.getReader();
    expect((await reader.read()).done).toBeTrue();
    logger.info('ending');
  });
  testProp(
    'handles multiple connections',
    [streamsArb],
    async (streamsData) => {
      try {
        webSocketServer = await WebSocketServer.createWebSocketServer({
          connectionCallback: (streamPair) => {
            logger.info('inside callback');
            void streamPair.readable
              .pipeTo(streamPair.writable)
              .catch(() => {})
              .finally(() => logger.info('STREAM HANDLING ENDED'));
          },
          basePath: dataDir,
          tlsConfig,
          host,
          logger: logger.getChild('server'),
        });
        logger.info(`Server started on port ${webSocketServer.getPort()}`);
        webSocketClient = await WebSocketClient.createWebSocketClient({
          host,
          port: webSocketServer.getPort(),
          expectedNodeIds: [keyRing.getNodeId()],
          logger: logger.getChild('clientClient'),
        });

        const testStream = async (messages: Array<Buffer>) => {
          const websocket = await webSocketClient.startConnection();
          const writer = websocket.writable.getWriter();
          const reader = websocket.readable.getReader();
          for (const message of messages) {
            await writer.write(message);
            const response = await reader.read();
            expect(response.done).toBeFalse();
            expect(response.value?.toString()).toStrictEqual(
              message.toString(),
            );
          }
          await writer.close();
          expect((await reader.read()).done).toBeTrue();
        };
        const streams = streamsData.map((messages) => testStream(messages));
        await Promise.all(streams);

        logger.info('ending');
      } finally {
        await webSocketServer.stop(true);
      }
    },
  );
  test('handles https server failure', async () => {
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair) => {
        logger.info('inside callback');
        void streamPair.readable
          .pipeTo(streamPair.writable)
          .catch(() => {})
          .finally(() => logger.info('STREAM HANDLING ENDED'));
      },
      basePath: dataDir,
      tlsConfig,
      host,
      logger: logger.getChild('server'),
    });
    logger.info(`Server started on port ${webSocketServer.getPort()}`);

    const closeP = promise<void>();
    // @ts-ignore: protected property
    webSocketServer.server.close(() => {
      closeP.resolveP();
    });
    await closeP.p;
    // The webSocketServer should stop itself
    expect(webSocketServer[status]).toBe(null);

    logger.info('ending');
  });
  test('handles webSocketServer server failure', async () => {
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair) => {
        logger.info('inside callback');
        void streamPair.readable
          .pipeTo(streamPair.writable)
          .catch(() => {})
          .finally(() => logger.info('STREAM HANDLING ENDED'));
      },
      basePath: dataDir,
      tlsConfig,
      host,
      logger: logger.getChild('server'),
    });
    logger.info(`Server started on port ${webSocketServer.getPort()}`);

    const closeP = promise<void>();
    // @ts-ignore: protected property
    webSocketServer.webSocketServer.close(() => {
      closeP.resolveP();
    });
    await closeP.p;
    // The webSocketServer should stop itself
    expect(webSocketServer[status]).toBe(null);

    logger.info('ending');
  });
  test('client ends connection abruptly', async () => {
    const streamPairProm =
      promise<ReadableWritablePair<Uint8Array, Uint8Array>>();
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair) => {
        logger.info('inside callback');
        streamPairProm.resolveP(streamPair);
      },
      basePath: dataDir,
      tlsConfig,
      host,
      logger: logger.getChild('server'),
    });
    logger.info(`Server started on port ${webSocketServer.getPort()}`);

    const testProcess = await testsUtils.spawn(
      'ts-node',
      [
        '--project',
        testsUtils.tsConfigPath,
        `${globalThis.testDir}/websockets/testClient.ts`,
      ],
      {
        env: {
          PK_TEST_HOST: host,
          PK_TEST_PORT: `${webSocketServer.getPort()}`,
          PK_TEST_NODE_ID: nodesUtils.encodeNodeId(keyRing.getNodeId()),
        },
      },
      logger,
    );
    const startedProm = promise<string>();
    testProcess.stdout!.on('data', (data) => {
      startedProm.resolveP(data.toString());
    });
    testProcess.stderr!.on('data', (data) =>
      startedProm.rejectP(data.toString()),
    );
    const exitedProm = promise<void>();
    testProcess.once('exit', () => exitedProm.resolveP());
    await startedProm.p;

    // Killing the client
    testProcess.kill('SIGTERM');
    await exitedProm.p;

    const streamPair = await streamPairProm.p;
    // Everything should throw after websocket ends early
    await expect(async () => {
      for await (const _ of streamPair.readable) {
        // No touch, only consume
      }
    }).rejects.toThrow();
    const serverWritable = streamPair.writable.getWriter();
    await expect(serverWritable.write(Buffer.from('test'))).rejects.toThrow();
    logger.info('ending');
  });
  test('server ends connection abruptly', async () => {
    const testProcess = await testsUtils.spawn(
      'ts-node',
      [
        '--project',
        testsUtils.tsConfigPath,
        `${globalThis.testDir}/websockets/testServer.ts`,
      ],
      {
        env: {
          PK_TEST_KEY_PRIVATE_PEM: tlsConfig.keyPrivatePem,
          PK_TEST_CERT_CHAIN_PEM: tlsConfig.certChainPem,
          PK_TEST_HOST: host,
        },
      },
      logger,
    );
    const startedProm = promise<number>();
    testProcess.stdout!.on('data', (data) => {
      startedProm.resolveP(parseInt(data.toString()));
    });
    testProcess.stderr!.on('data', (data) =>
      startedProm.rejectP(data.toString()),
    );
    const exitedProm = promise<void>();
    testProcess.once('exit', () => exitedProm.resolveP());

    logger.info(`Server started on port ${await startedProm.p}`);
    webSocketClient = await WebSocketClient.createWebSocketClient({
      host,
      port: await startedProm.p,
      expectedNodeIds: [keyRing.getNodeId()],
      logger: logger.getChild('clientClient'),
    });
    const websocket = await webSocketClient.startConnection();

    // Killing the server
    testProcess.kill('SIGTERM');
    await exitedProm.p;

    // Waiting for connections to end
    await webSocketClient.destroy();
    // Checking client's response to connection dropping
    await expect(async () => {
      for await (const _ of websocket.readable) {
        // No touch, only consume
      }
    }).rejects.toThrow();
    const clientWritable = websocket.writable.getWriter();
    await expect(clientWritable.write(Buffer.from('test'))).rejects.toThrow();
    logger.info('ending');
  });
  // These describe blocks contains tests specific to either the client or server
  describe('WebSocketServer', () => {
    testProp(
      'allows half closed writable closes first',
      [messagesArb, messagesArb],
      async (messages1, messages2) => {
        try {
          const serverStreamProm = promise<void>();
          webSocketServer = await WebSocketServer.createWebSocketServer({
            connectionCallback: (streamPair) => {
              logger.info('inside callback');
              void (async () => {
                const writer = streamPair.writable.getWriter();
                for await (const val of messages2) {
                  await writer.write(val);
                }
                await writer.close();
                for await (const _ of streamPair.readable) {
                  // No touch, only consume
                }
              })().then(serverStreamProm.resolveP, serverStreamProm.rejectP);
            },
            basePath: dataDir,
            tlsConfig,
            host,
            logger: logger.getChild('server'),
          });
          logger.info(`Server started on port ${webSocketServer.getPort()}`);
          webSocketClient = await WebSocketClient.createWebSocketClient({
            host,
            port: webSocketServer.getPort(),
            expectedNodeIds: [keyRing.getNodeId()],
            logger: logger.getChild('clientClient'),
          });
          const websocket = await webSocketClient.startConnection();
          await asyncReadWrite(messages1, websocket);
          await serverStreamProm.p;
          logger.info('ending');
        } finally {
          await webSocketServer.stop(true);
        }
      },
    );
    testProp(
      'allows half closed readable closes first',
      [messagesArb, messagesArb],
      async (messages1, messages2) => {
        try {
          const serverStreamProm = promise<void>();
          webSocketServer = await WebSocketServer.createWebSocketServer({
            connectionCallback: (streamPair) => {
              logger.info('inside callback');
              void (async () => {
                for await (const _ of streamPair.readable) {
                  // No touch, only consume
                }
                const writer = streamPair.writable.getWriter();
                for await (const val of messages2) {
                  await writer.write(val);
                }
                await writer.close();
              })().then(serverStreamProm.resolveP, serverStreamProm.rejectP);
            },
            basePath: dataDir,
            tlsConfig,
            host,
            logger: logger.getChild('server'),
          });
          logger.info(`Server started on port ${webSocketServer.getPort()}`);
          webSocketClient = await WebSocketClient.createWebSocketClient({
            host,
            port: webSocketServer.getPort(),
            expectedNodeIds: [keyRing.getNodeId()],
            logger: logger.getChild('clientClient'),
          });
          const websocket = await webSocketClient.startConnection();
          await asyncReadWrite(messages1, websocket);
          await serverStreamProm.p;
          logger.info('ending');
        } finally {
          await webSocketServer.stop(true);
        }
      },
    );
    testProp(
      'handles early close of readable',
      [messagesArb, messagesArb],
      async (messages1, messages2) => {
        try {
          const serverStreamProm = promise<void>();
          webSocketServer = await WebSocketServer.createWebSocketServer({
            connectionCallback: (streamPair) => {
              logger.info('inside callback');
              void (async () => {
                await streamPair.readable.cancel();
                const writer = streamPair.writable.getWriter();
                for await (const val of messages2) {
                  await writer.write(val);
                }
                await writer.close();
              })().then(serverStreamProm.resolveP, serverStreamProm.rejectP);
            },
            basePath: dataDir,
            tlsConfig,
            host,
            logger: logger.getChild('server'),
          });
          logger.info(`Server started on port ${webSocketServer.getPort()}`);
          webSocketClient = await WebSocketClient.createWebSocketClient({
            host,
            port: webSocketServer.getPort(),
            expectedNodeIds: [keyRing.getNodeId()],
            logger: logger.getChild('clientClient'),
          });
          const websocket = await webSocketClient.startConnection();
          await asyncReadWrite(messages1, websocket);
          await serverStreamProm.p;
          logger.info('ending');
        } finally {
          await webSocketServer.stop(true);
        }
      },
    );
    test('destroying ClientServer stops all connections', async () => {
      const streamPairProm =
        promise<ReadableWritablePair<Uint8Array, Uint8Array>>();
      webSocketServer = await WebSocketServer.createWebSocketServer({
        connectionCallback: (streamPair) => {
          logger.info('inside callback');
          streamPairProm.resolveP(streamPair);
        },
        basePath: dataDir,
        tlsConfig,
        host,
        logger: logger.getChild('server'),
      });
      logger.info(`Server started on port ${webSocketServer.getPort()}`);
      webSocketClient = await WebSocketClient.createWebSocketClient({
        host,
        port: webSocketServer.getPort(),
        expectedNodeIds: [keyRing.getNodeId()],
        logger: logger.getChild('clientClient'),
      });
      const websocket = await webSocketClient.startConnection();
      await webSocketServer.stop(true);
      const streamPair = await streamPairProm.p;
      // Everything should throw after websocket ends early
      await expect(async () => {
        for await (const _ of websocket.readable) {
          // No touch, only consume
        }
      }).rejects.toThrow();
      await expect(async () => {
        for await (const _ of streamPair.readable) {
          // No touch, only consume
        }
      }).rejects.toThrow();
      const clientWritable = websocket.writable.getWriter();
      const serverWritable = streamPair.writable.getWriter();
      await expect(clientWritable.write(Buffer.from('test'))).rejects.toThrow();
      await expect(serverWritable.write(Buffer.from('test'))).rejects.toThrow();
      logger.info('ending');
    });
    test('server rejects normal HTTPS requests', async () => {
      webSocketServer = await WebSocketServer.createWebSocketServer({
        connectionCallback: (streamPair) => {
          logger.info('inside callback');
          void streamPair.readable
            .pipeTo(streamPair.writable)
            .catch(() => {})
            .finally(() => logger.info('STREAM HANDLING ENDED'));
        },
        basePath: dataDir,
        tlsConfig,
        host,
        logger: logger.getChild('server'),
      });
      logger.info(`Server started on port ${webSocketServer.getPort()}`);
      const getResProm = promise<http.IncomingMessage>();
      https.get(
        `https://${host}:${webSocketServer.getPort()}/`,
        { rejectUnauthorized: false },
        getResProm.resolveP,
      );
      const res = await getResProm.p;
      const contentProm = promise<string>();
      res.once('data', (d) => contentProm.resolveP(d.toString()));
      const endProm = promise<string>();
      res.on('error', endProm.rejectP);
      res.on('close', endProm.resolveP);

      expect(res.statusCode).toBe(426);
      await expect(contentProm.p).resolves.toBe('426 Upgrade Required');
      expect(res.headers['connection']).toBe('Upgrade');
      expect(res.headers['upgrade']).toBe('websocket');
    });
    test('ping timeout', async () => {
      webSocketServer = await WebSocketServer.createWebSocketServer({
        connectionCallback: (_) => {
          logger.info('inside callback');
          // Hang connection
        },
        basePath: dataDir,
        tlsConfig,
        host,
        pingTimeoutTimeTime: 100,
        logger: logger.getChild('server'),
      });
      logger.info(`Server started on port ${webSocketServer.getPort()}`);
      webSocketClient = await WebSocketClient.createWebSocketClient({
        host,
        port: webSocketServer.getPort(),
        expectedNodeIds: [keyRing.getNodeId()],
        logger: logger.getChild('clientClient'),
      });
      await webSocketClient.startConnection();
      await webSocketClient.destroy();
      logger.info('ending');
    });
  });
  describe('WebSocketClient', () => {
    test('destroying ClientClient stops all connections', async () => {
      const streamPairProm =
        promise<ReadableWritablePair<Uint8Array, Uint8Array>>();
      webSocketServer = await WebSocketServer.createWebSocketServer({
        connectionCallback: (streamPair) => {
          logger.info('inside callback');
          streamPairProm.resolveP(streamPair);
        },
        basePath: dataDir,
        tlsConfig,
        host,
        logger: logger.getChild('server'),
      });
      logger.info(`Server started on port ${webSocketServer.getPort()}`);
      webSocketClient = await WebSocketClient.createWebSocketClient({
        host,
        port: webSocketServer.getPort(),
        expectedNodeIds: [keyRing.getNodeId()],
        logger: logger.getChild('clientClient'),
      });
      const websocket = await webSocketClient.startConnection();
      // Destroying the client, force close connections
      await webSocketClient.destroy(true);
      const streamPair = await streamPairProm.p;
      // Everything should throw after websocket ends early
      await expect(async () => {
        for await (const _ of websocket.readable) {
          // No touch, only consume
        }
      }).rejects.toThrow();
      await expect(async () => {
        for await (const _ of streamPair.readable) {
          // No touch, only consume
        }
      }).rejects.toThrow();
      const clientWritable = websocket.writable.getWriter();
      const serverWritable = streamPair.writable.getWriter();
      await expect(clientWritable.write(Buffer.from('test'))).rejects.toThrow();
      await expect(serverWritable.write(Buffer.from('test'))).rejects.toThrow();
      await webSocketServer.stop();
      logger.info('ending');
    });
    test('authentication rejects bad server certificate', async () => {
      const invalidNodeId = testNodeUtils.generateRandomNodeId();
      webSocketServer = await WebSocketServer.createWebSocketServer({
        connectionCallback: (streamPair) => {
          logger.info('inside callback');
          void streamPair.readable
            .pipeTo(streamPair.writable)
            .catch(() => {})
            .finally(() => logger.info('STREAM HANDLING ENDED'));
        },
        basePath: dataDir,
        tlsConfig,
        host,
        logger: logger.getChild('server'),
      });
      logger.info(`Server started on port ${webSocketServer.getPort()}`);
      webSocketClient = await WebSocketClient.createWebSocketClient({
        host,
        port: webSocketServer.getPort(),
        expectedNodeIds: [invalidNodeId],
        logger: logger.getChild('clientClient'),
      });
      await expect(webSocketClient.startConnection()).rejects.toThrow(
        webSocketErrors.ErrorCertChainUnclaimed,
      );
      // @ts-ignore: kidnap protected property
      const activeConnections = webSocketClient.activeConnections;
      expect(activeConnections.size).toBe(0);
      await webSocketServer.stop();
      logger.info('ending');
    });
    test('authenticates with multiple certs in chain', async () => {
      const keyPairs: Array<KeyPair> = [
        keyRing.keyPair,
        keysUtils.generateKeyPair(),
        keysUtils.generateKeyPair(),
        keysUtils.generateKeyPair(),
        keysUtils.generateKeyPair(),
      ];
      const tlsConfig = await testsUtils.createTLSConfigWithChain(keyPairs);
      const nodeId = keysUtils.publicKeyToNodeId(keyPairs[1].publicKey);
      webSocketServer = await WebSocketServer.createWebSocketServer({
        connectionCallback: (streamPair) => {
          logger.info('inside callback');
          void streamPair.readable
            .pipeTo(streamPair.writable)
            .catch(() => {})
            .finally(() => logger.info('STREAM HANDLING ENDED'));
        },
        basePath: dataDir,
        tlsConfig,
        host,
        logger: logger.getChild('server'),
      });
      logger.info(`Server started on port ${webSocketServer.getPort()}`);
      webSocketClient = await WebSocketClient.createWebSocketClient({
        host,
        port: webSocketServer.getPort(),
        expectedNodeIds: [nodeId],
        logger: logger.getChild('clientClient'),
      });
      const connProm = webSocketClient.startConnection();
      await connProm;
      await expect(connProm).toResolve();
      // @ts-ignore: kidnap protected property
      const activeConnections = webSocketClient.activeConnections;
      expect(activeConnections.size).toBe(1);
      logger.info('ending');
    });
    test('authenticates with multiple expected nodes', async () => {
      const alternativeNodeId = testNodeUtils.generateRandomNodeId();
      webSocketServer = await WebSocketServer.createWebSocketServer({
        connectionCallback: (streamPair) => {
          logger.info('inside callback');
          void streamPair.readable
            .pipeTo(streamPair.writable)
            .catch(() => {})
            .finally(() => logger.info('STREAM HANDLING ENDED'));
        },
        basePath: dataDir,
        tlsConfig,
        host,
        logger: logger.getChild('server'),
      });
      logger.info(`Server started on port ${webSocketServer.getPort()}`);
      webSocketClient = await WebSocketClient.createWebSocketClient({
        host,
        port: webSocketServer.getPort(),
        expectedNodeIds: [keyRing.getNodeId(), alternativeNodeId],
        logger: logger.getChild('clientClient'),
      });
      await expect(webSocketClient.startConnection()).toResolve();
      // @ts-ignore: kidnap protected property
      const activeConnections = webSocketClient.activeConnections;
      expect(activeConnections.size).toBe(1);
      logger.info('ending');
    });
    test('connection times out', async () => {
      webSocketClient = await WebSocketClient.createWebSocketClient({
        host,
        port: 12345,
        expectedNodeIds: [keyRing.getNodeId()],
        connectionTimeoutTime: 0,
        logger: logger.getChild('clientClient'),
      });
      await expect(webSocketClient.startConnection({})).rejects.toThrow();
      await expect(
        webSocketClient.startConnection({
          timer: new Timer({ delay: 0 }),
        }),
      ).rejects.toThrow();
      logger.info('ending');
    });
    test('ping timeout', async () => {
      webSocketServer = await WebSocketServer.createWebSocketServer({
        connectionCallback: (_) => {
          logger.info('inside callback');
          // Hang connection
        },
        basePath: dataDir,
        tlsConfig,
        host,
        logger: logger.getChild('server'),
      });
      logger.info(`Server started on port ${webSocketServer.getPort()}`);
      webSocketClient = await WebSocketClient.createWebSocketClient({
        host,
        port: webSocketServer.getPort(),
        expectedNodeIds: [keyRing.getNodeId()],
        pingTimeoutTimeTime: 100,
        logger: logger.getChild('clientClient'),
      });
      await webSocketClient.startConnection();
      await webSocketClient.destroy();
      logger.info('ending');
    });
    test('stream is aborted', async () => {
      webSocketServer = await WebSocketServer.createWebSocketServer({
        connectionCallback: (streamPair) => {
          logger.info('inside callback');
          void Promise.all([
            (async () => {
              for await (const _ of streamPair.readable) {
                // Do nothing
              }
            })().catch(() => {}),
            (async () => {
              const message = Buffer.alloc(5, 123);
              const writer = streamPair.writable.getWriter();
              await writer.write(message);
              await writer.write(message);
              await writer.write(message);
              await writer.close();
            })().catch(() => {}),
          ]);
        },
        basePath: dataDir,
        tlsConfig,
        host,
        logger: logger.getChild('server'),
      });
      logger.info(`Server started on port ${webSocketServer.getPort()}`);
      webSocketClient = await WebSocketClient.createWebSocketClient({
        host,
        port: webSocketServer.getPort(),
        expectedNodeIds: [keyRing.getNodeId()],
        logger: logger.getChild('clientClient'),
      });
      const abortController = new AbortController();
      const websocket = await webSocketClient.startConnection({
        signal: abortController.signal,
      });
      // Signal the connection to end
      abortController.abort('SOME REASON');
      await expect(async () => {
        for await (const _ of websocket.readable) {
          // Await error
        }
      }).rejects.toThrow(webSocketErrors.ErrorClientStreamAborted);
      logger.info('ending');
    });
  });
});
