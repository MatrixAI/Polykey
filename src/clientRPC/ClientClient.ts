import type { ReadableWritablePair } from 'stream/web';
import type { TLSSocket } from 'tls';
import type { NodeId } from 'ids/index';
import { WritableStream, ReadableStream } from 'stream/web';
import { createDestroy } from '@matrixai/async-init';
import Logger from '@matrixai/logger';
import WebSocket from 'ws';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import * as clientRpcUtils from './utils';
import { promise } from '../utils';

interface ClientClient extends createDestroy.CreateDestroy {}
@createDestroy.CreateDestroy()
class ClientClient {
  static async createClientClient({
    host,
    port,
    expectedNodeIds,
    maxReadableStreamBytes = 1000, // About 1kB
    logger = new Logger(this.name),
  }: {
    host: string;
    port: number;
    expectedNodeIds: Array<NodeId>;
    maxReadableStreamBytes?: number;
    logger?: Logger;
  }): Promise<ClientClient> {
    logger.info(`Creating ${this.name}`);
    const clientClient = new this(
      logger,
      host,
      port,
      maxReadableStreamBytes,
      expectedNodeIds,
    );
    logger.info(`Created ${this.name}`);
    return clientClient;
  }

  protected activeConnections: Set<PromiseCancellable<void>> = new Set();

  constructor(
    protected logger: Logger,
    protected host: string,
    protected port: number,
    protected maxReadableStreamBytes: number,
    protected expectedNodeIds: Array<NodeId>,
  ) {}

  public async destroy(force: boolean = false) {
    this.logger.info(`Destroying ${this.constructor.name}`);
    if (force) {
      for (const activeConnection of this.activeConnections) {
        activeConnection.cancel();
      }
    }
    for (const activeConnection of this.activeConnections) {
      await activeConnection;
    }
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @createDestroy.ready(Error('TMP destroyed'))
  public async startConnection(): Promise<
    ReadableWritablePair<Uint8Array, Uint8Array>
  > {
    const address = `wss://${this.host}:${this.port}`;
    this.logger.info(`Connecting to ${address}`);
    const connectProm = promise<void>();
    const authenticateProm = promise<NodeId>();
    const ws = new WebSocket(address, {
      rejectUnauthorized: false,
    });
    // Creating logic for awaiting active connections and terminating them
    const abortHandler = () => {
      ws.terminate();
    };
    const abortController = new AbortController();
    const connectionProm = new PromiseCancellable<void>((resolve) => {
      ws.once('close', () => {
        abortController.signal.removeEventListener('abort', abortHandler);
        resolve();
      });
    }, abortController);
    abortController.signal.addEventListener('abort', abortHandler);
    this.activeConnections.add(connectionProm);
    connectionProm.finally(() => this.activeConnections.delete(connectionProm));
    // Handle connection failure
    const openErrorHandler = (e) => {
      connectProm.rejectP(Error('TMP ERROR Connection failure', { cause: e }));
    };
    ws.once('error', openErrorHandler);
    // Authenticate server's certificates
    ws.once('upgrade', async (request) => {
      const tlsSocket = request.socket as TLSSocket;
      const peerCert = tlsSocket.getPeerCertificate(true);
      clientRpcUtils
        .verifyServerCertificateChain(
          this.expectedNodeIds,
          clientRpcUtils.detailedToCertChain(peerCert),
        )
        .then(authenticateProm.resolveP, authenticateProm.rejectP);
    });
    ws.once('open', () => {
      this.logger.info('starting connection');
      connectProm.resolveP();
    });
    // TODO: Race with a connection timeout here
    try {
      await Promise.all([authenticateProm.p, connectProm.p]);
    } catch (e) {
      // Clean up
      ws.close();
      await connectionProm;
      throw e;
    }

    // Cleaning up connection error
    ws.removeEventListener('error', openErrorHandler);

    let readableClosed = false;
    let writableClosed = false;
    const readableLogger = this.logger.getChild('readable');
    const writableLogger = this.logger.getChild('writable');
    const readableStream = new ReadableStream<Uint8Array>(
      {
        start: (controller) => {
          readableLogger.info('STARTING');
          const messageHandler = (data) => {
            // ReadableLogger.debug(`message: ${data.toString()}`);
            if (controller.desiredSize == null) {
              controller.error(Error('NEVER'));
              return;
            }
            if (controller.desiredSize < 0) {
              // ReadableLogger.debug('PAUSING');
              ws.pause();
            }
            const message = data as Buffer;
            if (message.length === 0) {
              readableLogger.info('CLOSING, NULL MESSAGE');
              ws.removeListener('message', messageHandler);
              if (!readableClosed) {
                controller.close();
                readableClosed = true;
              }
              if (writableClosed) {
                ws.close();
              }
              return;
            }
            controller.enqueue(message);
          };
          ws.on('message', messageHandler);
          ws.once('close', () => {
            readableLogger.info('CLOSED, WS CLOSED');
            ws.removeListener('message', messageHandler);
            if (!readableClosed) {
              controller.close();
              readableClosed = true;
            }
          });
          ws.once('error', (e) => readableLogger.error(e));
        },
        cancel: () => {
          readableLogger.info('CANCELLED');
          if (!readableClosed) {
            ws.close();
            readableClosed = true;
          }
        },
        pull: () => {
          // ReadableLogger.debug('RESUMING');
          ws.resume();
        },
      },
      {
        highWaterMark: this.maxReadableStreamBytes,
        size: (chunk) => chunk?.byteLength ?? 0,
      },
    );
    const writableStream = new WritableStream<Uint8Array>({
      start: (controller) => {
        writableLogger.info('STARTING');
        ws.once('error', (e) => {
          writableLogger.error(`error: ${e}`);
          if (!writableClosed) {
            controller.error(e);
            writableClosed = true;
          }
        });
        ws.once('close', (code, reason) => {
          if (!writableClosed) {
            writableLogger.info(
              `ws closing early! with code: ${code} and reason: ${reason.toString()}`,
            );
            controller.error(Error('TMP WebSocket Closed early'));
          }
        });
      },
      close: () => {
        writableLogger.info('CLOSING');
        ws.send(Buffer.from([]));
        writableClosed = true;
        if (readableClosed) {
          ws.close();
        }
      },
      abort: () => {
        writableLogger.info('ABORTED');
        writableClosed = true;
        if (readableClosed) {
          ws.close();
        }
      },
      write: async (chunk, controller) => {
        // WritableLogger.debug(`writing: ${chunk?.toString()}`);
        const wait = promise<void>();
        ws.send(chunk, (e) => {
          if (e != null) {
            controller.error(e);
          }
          wait.resolveP();
        });
        await wait.p;
      },
    });
    return {
      readable: readableStream,
      writable: writableStream,
    };
  }
}

export default ClientClient;
