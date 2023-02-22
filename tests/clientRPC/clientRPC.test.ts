import type { ReadableWritablePair } from 'stream/web';
import type { TLSConfig } from '@/network/types';
import type { WebSocket } from 'uWebSockets.js';
import type { KeyPair } from '@/keys/types';
import type http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { testProp, fc } from '@fast-check/jest';
import { Timer } from '@matrixai/timer';
import { KeyRing } from '@/keys/index';
import ClientServer from '@/clientRPC/ClientServer';
import { promise } from '@/utils';
import ClientClient from '@/clientRPC/ClientClient';
import * as keysUtils from '@/keys/utils';
import * as networkErrors from '@/network/errors';
import * as testNodeUtils from '../nodes/utils';
import * as testsUtils from '../utils';

// This file tests both the client and server together. They're too interlinked
//  to be separate.
describe('ClientRPC', () => {
  const logger = new Logger('websocket test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const loudLogger = new Logger('websocket test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);

  let dataDir: string;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  const host = '127.0.0.2';
  let clientServer: ClientServer;
  let clientClient: ClientClient;

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
    await clientServer?.stop(true);
    await clientClient?.destroy(true);
    await keyRing.stop();
    await fs.promises.rm(dataDir, { force: true, recursive: true });
  });

  // These tests are share between client and server
  test('makes a connection', async () => {
    clientServer = await ClientServer.createClientServer({
      connectionCallback: (streamPair) => {
        logger.info('inside callback');
        void streamPair.readable
          .pipeTo(streamPair.writable)
          .catch(() => {})
          .finally(() => loudLogger.info('STREAM HANDLING ENDED'));
      },
      basePath: dataDir,
      tlsConfig,
      host,
      logger: loudLogger.getChild('server'),
    });
    logger.info(`Server started on port ${clientServer.port}`);
    clientClient = await ClientClient.createClientClient({
      host,
      port: clientServer.port,
      expectedNodeIds: [keyRing.getNodeId()],
      logger: logger.getChild('clientClient'),
    });
    const websocket = await clientClient.startConnection();

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
  test('Handles a connection and closes before message', async () => {
    clientServer = await ClientServer.createClientServer({
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
      logger: loudLogger.getChild('server'),
    });
    logger.info(`Server started on port ${clientServer.port}`);
    clientClient = await ClientClient.createClientClient({
      host,
      port: clientServer.port,
      expectedNodeIds: [keyRing.getNodeId()],
      logger: logger.getChild('clientClient'),
    });
    const websocket = await clientClient.startConnection();
    await websocket.writable.close();
    const reader = websocket.readable.getReader();
    expect((await reader.read()).done).toBeTrue();
    logger.info('ending');
  });
  testProp(
    'Handles multiple connections',
    [streamsArb],
    async (streamsData) => {
      try {
        clientServer = await ClientServer.createClientServer({
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
          logger: loudLogger.getChild('server'),
        });
        logger.info(`Server started on port ${clientServer.port}`);
        clientClient = await ClientClient.createClientClient({
          host,
          port: clientServer.port,
          expectedNodeIds: [keyRing.getNodeId()],
          logger: logger.getChild('clientClient'),
        });

        const testStream = async (messages: Array<Buffer>) => {
          const websocket = await clientClient.startConnection();
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
        await clientServer.stop(true);
      }
    },
  );
  test('reverse backpressure', async () => {
    let context: { writeBackpressure: boolean } | undefined;
    const backpressure = promise<void>();
    const resumeWriting = promise<void>();
    clientServer = await ClientServer.createClientServer({
      connectionCallback: (streamPair) => {
        logger.info('inside callback');
        void Promise.allSettled([
          (async () => {
            for await (const _ of streamPair.readable) {
              // No touch, only consume
            }
          })(),
          (async () => {
            // Kidnap the context
            let ws: WebSocket<{ writeBackpressure: boolean }> | null = null;
            // @ts-ignore: kidnap protected property
            for (const websocket of clientServer.activeSockets.values()) {
              ws = websocket;
            }
            if (ws == null) {
              await streamPair.writable.close();
              return;
            }
            context = ws.getUserData();
            // Write until backPressured
            const message = Buffer.alloc(128, 0xf0);
            const writer = streamPair.writable.getWriter();
            while (!context.writeBackpressure) {
              await writer.write(message);
            }
            loudLogger.info('BACK PRESSURED');
            backpressure.resolveP();
            await resumeWriting.p;
            for (let i = 0; i < 100; i++) {
              await writer.write(message);
            }
            await writer.close();
            loudLogger.info('WRITING ENDED');
          })(),
        ]).catch((e) => logger.error(e.toString()));
      },
      basePath: dataDir,
      tlsConfig,
      host,
      logger: loudLogger.getChild('server'),
    });
    logger.info(`Server started on port ${clientServer.port}`);
    clientClient = await ClientClient.createClientClient({
      host,
      port: clientServer.port,
      expectedNodeIds: [keyRing.getNodeId()],
      logger: logger.getChild('clientClient'),
    });
    const websocket = await clientClient.startConnection();
    await websocket.writable.close();

    await backpressure.p;
    expect(context?.writeBackpressure).toBeTrue();
    resumeWriting.resolveP();
    // Consume all of the back-pressured data
    for await (const _ of websocket.readable) {
      // No touch, only consume
    }
    expect(context?.writeBackpressure).toBeFalse();
    loudLogger.info('ending');
  });
  // Readable backpressure is not actually supported. We're dealing with it by
  //  using an buffer with a provided limit that can be very large.
  test('Exceeding readable buffer limit causes error', async () => {
    const startReading = promise<void>();
    const handlingProm = promise<void>();
    clientServer = await ClientServer.createClientServer({
      connectionCallback: (streamPair) => {
        logger.info('inside callback');
        Promise.all([
          (async () => {
            await startReading.p;
            loudLogger.info('Starting consumption');
            for await (const _ of streamPair.readable) {
              // No touch, only consume
            }
            loudLogger.info('Reads ended');
          })(),
          (async () => {
            await streamPair.writable.close();
          })(),
        ])
          .catch(() => {})
          .finally(() => handlingProm.resolveP());
      },
      basePath: dataDir,
      tlsConfig,
      host,
      // Setting a really low buffer limit
      maxReadBufferBytes: 1500,
      logger: loudLogger.getChild('server'),
    });
    logger.info(`Server started on port ${clientServer.port}`);
    clientClient = await ClientClient.createClientClient({
      host,
      port: clientServer.port,
      expectedNodeIds: [keyRing.getNodeId()],
      logger: logger.getChild('clientClient'),
    });
    const websocket = await clientClient.startConnection();
    const message = Buffer.alloc(1_000, 0xf0);
    const writer = websocket.writable.getWriter();
    loudLogger.info('Starting writes');
    await expect(async () => {
      for (let i = 0; i < 100; i++) {
        await writer.write(message);
      }
    }).rejects.toThrow();
    startReading.resolveP();
    loudLogger.info('writes ended');
    for await (const _ of websocket.readable) {
      // No touch, only consume
    }
    await handlingProm.p;
    loudLogger.info('ending');
  });
  // To fully test these two I need to start the client or server in a separate process and kill that process.
  // These require the ping/pong connection watchdogs to be implemented.
  test.skip('client ends connection abruptly', async () => {
    const handlerProm = promise<void>();
    clientServer = await ClientServer.createClientServer({
      connectionCallback: (streamPair) => {
        logger.info('inside callback');
        void streamPair.readable
          .pipeTo(streamPair.writable)
          .then(handlerProm.resolveP, handlerProm.rejectP)
          .finally(() => loudLogger.info('STREAM HANDLING ENDED'));
      },
      basePath: dataDir,
      tlsConfig,
      host,
      logger: loudLogger.getChild('server'),
    });
    logger.info(`Server started on port ${clientServer.port}`);
    clientClient = await ClientClient.createClientClient({
      host,
      port: clientServer.port,
      expectedNodeIds: [keyRing.getNodeId()],
      logger: logger.getChild('clientClient'),
    });
    const websocket = await clientClient.startConnection();
    // @ts-ignore: kidnap protected property
    const activeConnections = clientClient.activeConnections;
    for (const activeConnection of activeConnections) {
      activeConnection.cancel();
    }
    await expect(handlerProm.p).toResolve();
    for await (const _ of websocket.readable) {
      // Do nothing
    }
    logger.info('ending');
  });
  test.skip('Server ends connection abruptly', async () => {
    const streamPairProm =
      promise<ReadableWritablePair<Uint8Array, Uint8Array>>();
    clientServer = await ClientServer.createClientServer({
      connectionCallback: (streamPair_) => {
        logger.info('inside callback');
        // Don't do anything with the handler
        streamPairProm.resolveP(streamPair_);
      },
      basePath: dataDir,
      tlsConfig,
      host,
      logger: loudLogger.getChild('server'),
    });
    logger.info(`Server started on port ${clientServer.port}`);
    clientClient = await ClientClient.createClientClient({
      host,
      port: clientServer.port,
      expectedNodeIds: [keyRing.getNodeId()],
      logger: logger.getChild('clientClient'),
    });
    const websocket = await clientClient.startConnection();
    // @ts-ignore: kidnap protected property
    const activeSockets = clientServer.activeSockets;
    for (const activeSocket of activeSockets) {
      activeSocket.close();
    }
    const streamPair = await streamPairProm.p;
    // Expect both readable to throw
    const handlerReadProm = (async () => {
      for await (const _ of streamPair.readable) {
        // Do nothing
      }
    })();
    await expect(handlerReadProm).rejects.toThrow();
    const clientReadProm = (async () => {
      for await (const _ of websocket.readable) {
        // Do nothing
      }
    })();
    await expect(clientReadProm).rejects.toThrow();
    // Both writables should throw.
    const handlerWritable = streamPair.writable.getWriter();
    await expect(handlerWritable.write(Buffer.from('test'))).rejects.toThrow();
    const clientWritable = websocket.writable.getWriter();
    await expect(clientWritable.write(Buffer.from('test'))).rejects.toThrow();
    logger.info('ending');
  });

  // These describe blocks contains tests specific to either the client or server
  describe('ClientServer', () => {
    testProp(
      'allows half closed writable closes first',
      [messagesArb, messagesArb],
      async (messages1, messages2) => {
        try {
          clientServer = await ClientServer.createClientServer({
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
              })().catch((e) => logger.error(e));
            },
            basePath: dataDir,
            tlsConfig,
            host,
            logger: loudLogger.getChild('server'),
          });
          logger.info(`Server started on port ${clientServer.port}`);
          clientClient = await ClientClient.createClientClient({
            host,
            port: clientServer.port,
            expectedNodeIds: [keyRing.getNodeId()],
            logger: logger.getChild('clientClient'),
          });
          const websocket = await clientClient.startConnection();
          await asyncReadWrite(messages1, websocket);
          logger.info('ending');
        } finally {
          await clientServer.stop(true);
        }
      },
    );
    testProp(
      'allows half closed readable closes first',
      [messagesArb, messagesArb],
      async (messages1, messages2) => {
        try {
          clientServer = await ClientServer.createClientServer({
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
              })().catch((e) => logger.error(e));
            },
            basePath: dataDir,
            tlsConfig,
            host,
            logger: loudLogger.getChild('server'),
          });
          logger.info(`Server started on port ${clientServer.port}`);
          clientClient = await ClientClient.createClientClient({
            host,
            port: clientServer.port,
            expectedNodeIds: [keyRing.getNodeId()],
            logger: logger.getChild('clientClient'),
          });
          const websocket = await clientClient.startConnection();
          await asyncReadWrite(messages1, websocket);
          logger.info('ending');
        } finally {
          await clientServer.stop(true);
        }
      },
    );
    testProp(
      'handles early close of readable',
      [messagesArb, messagesArb],
      async (messages1, messages2) => {
        try {
          clientServer = await ClientServer.createClientServer({
            connectionCallback: (streamPair) => {
              logger.info('inside callback');
              void (async () => {
                await streamPair.readable.cancel();
                const writer = streamPair.writable.getWriter();
                for await (const val of messages2) {
                  await writer.write(val);
                }
                await writer.close();
              })().catch((e) => logger.error(e));
            },
            basePath: dataDir,
            tlsConfig,
            host,
            logger: loudLogger.getChild('server'),
          });
          logger.info(`Server started on port ${clientServer.port}`);
          clientClient = await ClientClient.createClientClient({
            host,
            port: clientServer.port,
            expectedNodeIds: [keyRing.getNodeId()],
            logger: logger.getChild('clientClient'),
          });
          const websocket = await clientClient.startConnection();
          await asyncReadWrite(messages1, websocket);
          logger.info('ending');
        } finally {
          await clientServer.stop(true);
        }
      },
    );
    test('Destroying ClientServer stops all connections', async () => {
      const handlerProm = promise<void>();
      clientServer = await ClientServer.createClientServer({
        connectionCallback: (streamPair) => {
          logger.info('inside callback');
          void streamPair.readable
            .pipeTo(streamPair.writable)
            .then(handlerProm.resolveP, handlerProm.rejectP);
        },
        basePath: dataDir,
        tlsConfig,
        host,
        logger: loudLogger.getChild('server'),
      });
      logger.info(`Server started on port ${clientServer.port}`);
      clientClient = await ClientClient.createClientClient({
        host,
        port: clientServer.port,
        expectedNodeIds: [keyRing.getNodeId()],
        logger: logger.getChild('clientClient'),
      });
      const websocket = await clientClient.startConnection();
      await clientServer.stop(true);
      const clientReadProm = (async () => {
        for await (const _ of websocket.readable) {
          // No touch, only consume
        }
      })();
      await expect(clientReadProm).toResolve();
      const writer = websocket.writable.getWriter();
      await expect(handlerProm.p).toResolve();
      await expect(writer.write(Buffer.from('test'))).rejects.toThrow();
      logger.info('ending');
    });
    test('Server rejects normal HTTPS requests', async () => {
      clientServer = await ClientServer.createClientServer({
        connectionCallback: (streamPair) => {
          logger.info('inside callback');
          void streamPair.readable
            .pipeTo(streamPair.writable)
            .catch(() => {})
            .finally(() => loudLogger.info('STREAM HANDLING ENDED'));
        },
        basePath: dataDir,
        tlsConfig,
        host,
        logger: loudLogger.getChild('server'),
      });
      logger.info(`Server started on port ${clientServer.port}`);
      const getResProm = promise<http.IncomingMessage>();
      https.get(
        `https://${host}:${clientServer.port}/`,
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
  });
  describe('ClientClient', () => {
    test('Destroying ClientClient stops all connections', async () => {
      clientServer = await ClientServer.createClientServer({
        connectionCallback: (streamPair) => {
          logger.info('inside callback');
          void streamPair.readable.pipeTo(streamPair.writable).catch((e) => {
            logger.error(e);
          });
        },
        basePath: dataDir,
        tlsConfig,
        host,
        logger: loudLogger.getChild('server'),
      });
      logger.info(`Server started on port ${clientServer.port}`);
      clientClient = await ClientClient.createClientClient({
        host,
        port: clientServer.port,
        expectedNodeIds: [keyRing.getNodeId()],
        logger: logger.getChild('clientClient'),
      });
      const websocket = await clientClient.startConnection();
      await clientClient.destroy(true);
      for await (const _ of websocket.readable) {
        // No touch, only consume
      }
      await clientServer.stop();
      logger.info('ending');
    });
    test('Authentication rejects bad server certificate', async () => {
      const invalidNodeId = testNodeUtils.generateRandomNodeId();
      clientServer = await ClientServer.createClientServer({
        connectionCallback: (streamPair) => {
          logger.info('inside callback');
          void streamPair.readable
            .pipeTo(streamPair.writable)
            .catch(() => {})
            .finally(() => loudLogger.info('STREAM HANDLING ENDED'));
        },
        basePath: dataDir,
        tlsConfig,
        host,
        logger: loudLogger.getChild('server'),
      });
      logger.info(`Server started on port ${clientServer.port}`);
      clientClient = await ClientClient.createClientClient({
        host,
        port: clientServer.port,
        expectedNodeIds: [invalidNodeId],
        logger: logger.getChild('clientClient'),
      });
      await expect(clientClient.startConnection()).rejects.toThrow(
        networkErrors.ErrorCertChainUnclaimed,
      );
      // @ts-ignore: kidnap protected property
      const activeConnections = clientClient.activeConnections;
      expect(activeConnections.size).toBe(0);
      logger.info('ending');
    });
    test('Authenticates with multiple certs in chain', async () => {
      const keyPairs: Array<KeyPair> = [
        keyRing.keyPair,
        keysUtils.generateKeyPair(),
        keysUtils.generateKeyPair(),
        keysUtils.generateKeyPair(),
        keysUtils.generateKeyPair(),
      ];
      const tlsConfig = await testsUtils.createTLSConfigWithChain(keyPairs);
      const nodeId = keysUtils.publicKeyToNodeId(keyPairs[1].publicKey);
      clientServer = await ClientServer.createClientServer({
        connectionCallback: (streamPair) => {
          logger.info('inside callback');
          void streamPair.readable
            .pipeTo(streamPair.writable)
            .catch(() => {})
            .finally(() => loudLogger.info('STREAM HANDLING ENDED'));
        },
        basePath: dataDir,
        tlsConfig,
        host,
        logger: loudLogger.getChild('server'),
      });
      logger.info(`Server started on port ${clientServer.port}`);
      clientClient = await ClientClient.createClientClient({
        host,
        port: clientServer.port,
        expectedNodeIds: [nodeId],
        logger: logger.getChild('clientClient'),
      });
      const connProm = clientClient.startConnection();
      await connProm;
      await expect(connProm).toResolve();
      // @ts-ignore: kidnap protected property
      const activeConnections = clientClient.activeConnections;
      expect(activeConnections.size).toBe(1);
      logger.info('ending');
    });
    test('Authenticates with multiple expected nodes', async () => {
      const alternativeNodeId = testNodeUtils.generateRandomNodeId();
      clientServer = await ClientServer.createClientServer({
        connectionCallback: (streamPair) => {
          logger.info('inside callback');
          void streamPair.readable
            .pipeTo(streamPair.writable)
            .catch(() => {})
            .finally(() => loudLogger.info('STREAM HANDLING ENDED'));
        },
        basePath: dataDir,
        tlsConfig,
        host,
        logger: loudLogger.getChild('server'),
      });
      logger.info(`Server started on port ${clientServer.port}`);
      clientClient = await ClientClient.createClientClient({
        host,
        port: clientServer.port,
        expectedNodeIds: [keyRing.getNodeId(), alternativeNodeId],
        logger: logger.getChild('clientClient'),
      });
      await expect(clientClient.startConnection()).toResolve();
      // @ts-ignore: kidnap protected property
      const activeConnections = clientClient.activeConnections;
      expect(activeConnections.size).toBe(1);
      logger.info('ending');
    });
    test('Connection times out', async () => {
      clientClient = await ClientClient.createClientClient({
        host,
        port: 12345,
        expectedNodeIds: [keyRing.getNodeId()],
        connectionTimeout: 0,
        logger: logger.getChild('clientClient'),
      });
      await expect(clientClient.startConnection({})).rejects.toThrow();
      await expect(
        clientClient.startConnection({
          timeoutTimer: new Timer({ delay: 0 }),
        }),
      ).rejects.toThrow();
      logger.info('ending');
    });
  });
});
