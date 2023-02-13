import type { SessionToken } from '../sessions/types';
import type KeyRing from '../keys/KeyRing';
import type SessionManager from '../sessions/SessionManager';
import type { RPCRequestParams } from './types';
import type { JsonRpcRequest } from '../RPC/types';
import type { ReadableWritablePair } from 'stream/web';
import type Logger from '@matrixai/logger';
import type { ConnectionInfo, Host, Port } from '../network/types';
import type RPCServer from '../RPC/RPCServer';
import type { TLSSocket } from 'tls';
import type { Server } from 'https';
import type net from 'net';
import type https from 'https';
import { ReadableStream, WritableStream } from 'stream/web';
import WebSocket, { WebSocketServer } from 'ws';
import * as clientErrors from '../client/errors';
import { promise } from '../utils';

async function authenticate(
  sessionManager: SessionManager,
  keyRing: KeyRing,
  message: JsonRpcRequest<RPCRequestParams>,
) {
  if (message.params == null) throw new clientErrors.ErrorClientAuthMissing();
  if (message.params.metadata == null) {
    throw new clientErrors.ErrorClientAuthMissing();
  }
  const auth = message.params.metadata.Authorization;
  if (auth == null) {
    throw new clientErrors.ErrorClientAuthMissing();
  }
  if (auth.startsWith('Bearer ')) {
    const token = auth.substring(7) as SessionToken;
    if (!(await sessionManager.verifyToken(token))) {
      throw new clientErrors.ErrorClientAuthDenied();
    }
  } else if (auth.startsWith('Basic ')) {
    const encoded = auth.substring(6);
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const match = decoded.match(/:(.*)/);
    if (match == null) {
      throw new clientErrors.ErrorClientAuthFormat();
    }
    const password = match[1];
    if (!(await keyRing.checkPassword(password))) {
      throw new clientErrors.ErrorClientAuthDenied();
    }
  } else {
    throw new clientErrors.ErrorClientAuthMissing();
  }
  const token = await sessionManager.createToken();
  return `Bearer ${token}`;
}

function decodeAuth(messageParams: RPCRequestParams) {
  const auth = messageParams.metadata?.Authorization;
  if (auth == null || !auth.startsWith('Bearer ')) {
    return;
  }
  return auth.substring(7) as SessionToken;
}

function encodeAuthFromPassword(password: string): string {
  const encoded = Buffer.from(`:${password}`).toString('base64');
  return `Basic ${encoded}`;
}

function readableFromWebSocket(
  ws: WebSocket,
  logger: Logger,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start: (controller) => {
      logger.info('starting');
      const messageHandler = (data) => {
        logger.debug(`message: ${data.toString()}`);
        ws.pause();
        const message = data as Buffer;
        if (message.length === 0) {
          logger.info('ENDING');
          ws.removeAllListeners('message');
          try {
            controller.close();
          } catch {
            // Ignore already closed
          }
          return;
        }
        controller.enqueue(message);
      };
      ws.on('message', messageHandler);
      ws.once('close', () => {
        logger.info('closed');
        ws.removeListener('message', messageHandler);
        try {
          controller.close();
        } catch {
          // Ignore already closed
        }
      });
      ws.once('error', (e) => {
        controller.error(e);
      });
    },
    cancel: () => {
      logger.info('cancelled');
      ws.close();
    },
    pull: () => {
      logger.debug('resuming');
      ws.resume();
    },
  });
}

function writeableFromWebSocket(
  ws: WebSocket,
  holdOpen: boolean,
  logger: Logger,
): WritableStream<Uint8Array> {
  return new WritableStream<Uint8Array>({
    start: (controller) => {
      logger.info('starting');
      ws.once('error', (e) => {
        logger.error(`error: ${e}`);
        controller.error(e);
      });
      ws.once('close', (code, reason) => {
        logger.info(
          `ws closing early! with code: ${code} and reason: ${reason.toString()}`,
        );
        controller.error(Error('TMP WebSocket Closed early'));
      });
    },
    close: () => {
      logger.info('stream closing');
      ws.send(Buffer.from([]));
      if (!holdOpen) ws.terminate();
    },
    abort: () => {
      logger.info('aborting');
      ws.close();
    },
    write: async (chunk, controller) => {
      logger.debug(`writing: ${chunk?.toString()}`);
      const wait = promise<void>();
      ws.send(chunk, (e) => {
        if (e != null) {
          logger.error(`error: ${e}`);
          controller.error(e);
        }
        wait.resolveP();
      });
      await wait.p;
    },
  });
}

function webSocketToWebStreamPair(
  ws: WebSocket,
  holdOpen: boolean,
  logger: Logger,
): ReadableWritablePair<Uint8Array, Uint8Array> {
  return {
    readable: readableFromWebSocket(ws, logger.getChild('readable')),
    writable: writeableFromWebSocket(ws, holdOpen, logger.getChild('writable')),
  };
}

function startConnection(
  host: string,
  port: number,
  logger: Logger,
): Promise<ReadableWritablePair<Uint8Array, Uint8Array>> {
  const ws = new WebSocket(`wss://${host}:${port}`, {
    // CheckServerIdentity: (
    //   servername: string,
    //   cert: WebSocket.CertMeta,
    // ): boolean => {
    //   console.log('CHECKING IDENTITY');
    //   console.log(servername);
    //   console.log(cert);
    //   return false;
    // },
    rejectUnauthorized: false,
    // Ca: tlsConfig.certChainPem
  });
  ws.once('close', () => logger.info('CLOSED'));
  // Ws.once('upgrade', () => {
  //   // Const tlsSocket = request.socket as TLSSocket;
  //   // Console.log(tlsSocket.getPeerCertificate());
  //   logger.info('Test early cancellation');
  //   // Request.destroy(Error('some error'));
  //   // tlsSocket.destroy(Error('some error'));
  //   // ws.close(12345, 'some reason');
  //   // TODO: Use the existing verify method from the GRPC implementation
  //   // TODO: Have this emit an error on verification failure.
  //   //  It's fine for the server side to close abruptly without error
  // });
  const prom = promise<ReadableWritablePair<Uint8Array, Uint8Array>>();
  ws.once('open', () => {
    logger.info('starting connection');
    prom.resolveP(webSocketToWebStreamPair(ws, true, logger));
  });
  return prom.p;
}

function handleConnection(ws: WebSocket, logger: Logger): void {
  ws.once('close', () => logger.info('CLOSED'));
  const readable = readableFromWebSocket(ws, logger.getChild('readable'));
  const writable = writeableFromWebSocket(
    ws,
    false,
    logger.getChild('writable'),
  );
  void readable.pipeTo(writable).catch((e) => logger.error(e));
}

function createClientServer(
  server: Server,
  rpcServer: RPCServer,
  logger: Logger,
) {
  logger.info('created server');
  const wss = new WebSocketServer({
    server,
  });
  wss.on('error', (e) => logger.error(e));
  logger.info('created wss');
  wss.on('connection', (ws, req) => {
    logger.info('connection!');
    const socket = req.socket as TLSSocket;
    const streamPair = webSocketToWebStreamPair(ws, false, logger);
    rpcServer.handleStream(streamPair, {
      localHost: socket.localAddress! as Host,
      localPort: socket.localPort! as Port,
      remoteCertificates: socket.getPeerCertificate(),
      remoteHost: socket.remoteAddress! as Host,
      remotePort: socket.remotePort! as Port,
    } as unknown as ConnectionInfo);
  });
  wss.once('close', () => {
    wss.removeAllListeners('error');
    wss.removeAllListeners('connection');
  });
  return wss;
}

async function listen(server: https.Server, host?: string, port?: number) {
  await new Promise<void>((resolve) => {
    server.listen(port, host ?? '127.0.0.1', undefined, () => resolve());
  });
  const addressInfo = server.address() as net.AddressInfo;
  return addressInfo.port;
}

export {
  authenticate,
  decodeAuth,
  encodeAuthFromPassword,
  startConnection,
  handleConnection,
  createClientServer,
  listen,
};
