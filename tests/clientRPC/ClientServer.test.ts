import type { ReadableWritablePair } from 'stream/web';
import type { TLSConfig } from '@/network/types';
import type { WebSocket } from 'uWebSockets.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { testProp, fc } from '@fast-check/jest';
import { KeyRing } from '@/keys/index';
import ClientServer from '@/clientRPC/ClientServer';
import * as clientRPCUtils from '@/clientRPC/utils';
import { promise } from '@/utils';
import * as testsUtils from '../utils';

describe('ClientServer', () => {
  const logger = new Logger('websocket test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const loudLogger = new Logger('websocket test', LogLevel.DEBUG, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);

  let dataDir: string;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  const host = '127.0.0.2';
  let clientServer: ClientServer;

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
    await clientServer.destroy(true);
    await keyRing.stop();
    await fs.promises.rm(dataDir, { force: true, recursive: true });
  });

  test('Handles a connection', async () => {
    clientServer = await ClientServer.createWSServer({
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
    const websocket = await clientRPCUtils.startConnection(
      host,
      clientServer.port,
      logger.getChild('Connection'),
    );
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
    clientServer = await ClientServer.createWSServer({
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
    const websocket = await clientRPCUtils.startConnection(
      host,
      clientServer.port,
      logger.getChild('Connection'),
    );
    await websocket.writable.close();
    const reader = websocket.readable.getReader();
    expect((await reader.read()).done).toBeTrue();
    logger.info('ending');
  });
  const messagesArb = fc.array(
    fc.uint8Array({ minLength: 1 }).map((d) => Buffer.from(d)),
  );
  const streamsArb = fc.array(messagesArb, { minLength: 1 }).noShrink();
  testProp(
    'Handles multiple connections',
    [streamsArb],
    async (streamsData) => {
      clientServer = await ClientServer.createWSServer({
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

      const testStream = async (messages: Array<Buffer>) => {
        const websocket = await clientRPCUtils.startConnection(
          host,
          clientServer.port,
          logger.getChild('Connection'),
        );
        const writer = websocket.writable.getWriter();
        const reader = websocket.readable.getReader();
        for (const message of messages) {
          await writer.write(message);
          const response = await reader.read();
          expect(response.done).toBeFalse();
          expect(response.value?.toString()).toStrictEqual(message.toString());
        }
        await writer.close();
        expect((await reader.read()).done).toBeTrue();
      };
      const streams = streamsData.map((messages) => testStream(messages));
      await Promise.all(streams);

      logger.info('ending');
    },
  );
  const asyncReadWrite = async (
    messages: Array<Buffer>,
    streampair: ReadableWritablePair<Uint8Array, Uint8Array>,
  ) => {
    await Promise.allSettled([
      (async () => {
        const writer = streampair.writable.getWriter();
        for (const message of messages) {
          await writer.write(message);
        }
        await writer.close();
      })(),
      (async () => {
        for await (const _ of streampair.readable) {
          // No touch, only consume
        }
      })(),
    ]);
  };
  testProp(
    'allows half closed writable closes first',
    [messagesArb, messagesArb],
    async (messages1, messages2) => {
      clientServer = await ClientServer.createWSServer({
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
      const websocket = await clientRPCUtils.startConnection(
        host,
        clientServer.port,
        logger.getChild('Connection'),
      );
      await asyncReadWrite(messages1, websocket);
      logger.info('ending');
    },
  );
  testProp(
    'allows half closed readable closes first',
    [messagesArb, messagesArb],
    async (messages1, messages2) => {
      clientServer = await ClientServer.createWSServer({
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
      const websocket = await clientRPCUtils.startConnection(
        host,
        clientServer.port,
        logger.getChild('Connection'),
      );
      await asyncReadWrite(messages1, websocket);
      logger.info('ending');
    },
  );
  testProp(
    'handles early close of readable',
    [messagesArb, messagesArb],
    async (messages1, messages2) => {
      clientServer = await ClientServer.createWSServer({
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
      const websocket = await clientRPCUtils.startConnection(
        host,
        clientServer.port,
        logger.getChild('Connection'),
      );
      await asyncReadWrite(messages1, websocket);
      logger.info('ending');
    },
  );
  test('Destroying ClientServer stops all connections', async () => {
    clientServer = await ClientServer.createWSServer({
      connectionCallback: (streamPair) => {
        logger.info('inside callback');
        void streamPair.readable
          .pipeTo(streamPair.writable)
          .catch((e) => logger.error(e));
      },
      basePath: dataDir,
      tlsConfig,
      host,
      logger: loudLogger.getChild('server'),
    });
    logger.info(`Server started on port ${clientServer.port}`);
    const websocket = await clientRPCUtils.startConnection(
      host,
      clientServer.port,
      logger.getChild('Connection'),
    );
    await clientServer.destroy(true);
    for await (const _ of websocket.readable) {
      // No touch, only consume
    }
    logger.info('ending');
  });
  test('Writable backpressure', async () => {
    let context: { writeBackpressure: boolean } | undefined;
    const backpressure = promise<void>();
    const resumeWriting = promise<void>();
    clientServer = await ClientServer.createWSServer({
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
    const websocket = await clientRPCUtils.startConnection(
      host,
      clientServer.port,
      logger.getChild('Connection'),
    );
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
  test.only('Exceeding readable buffer limit causes error', async () => {
    const startReading = promise<void>();
    const handlingProm = promise<void>();
    clientServer = await ClientServer.createWSServer({
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
    const websocket = await clientRPCUtils.startConnection(
      host,
      clientServer.port,
      loudLogger.getChild('Connection'),
    );
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
});
