import net from 'net';
import tls from 'tls';
import http from 'http';
import https from 'https';
import * as utils from '../utils';

function terminatingHttpServer(
  server: http.Server | https.Server,
): () => Promise<void> {
  let terminating: Promise<void> | void = undefined;
  const sockets = new Set<net.Socket>();
  const secureSockets = new Set<tls.TLSSocket>();
  server.on('connection', (socket) => {
    if (terminating) {
      socket.destroy();
    } else {
      sockets.add(socket);
      socket.once('close', () => {
        sockets.delete(socket);
      });
    }
  });
  server.on('secureConnection', (socket) => {
    if (terminating) {
      socket.destroy();
    } else {
      secureSockets.add(socket);
      socket.once('close', () => {
        secureSockets.delete(socket);
      });
    }
  });
  const destroySocket = (socket) => {
    socket.destroy();
    if (socket instanceof net.Socket) {
      sockets.delete(socket);
    } else {
      secureSockets.delete(socket);
    }
  };
  const terminate = async () => {
    if (terminating) {
      return terminating;
    }
    let resolveTerminating;
    let rejectTerminating;
    terminating = new Promise((resolve, reject) => {
      resolveTerminating = resolve;
      rejectTerminating = reject;
    });
    server.on('request', (incomingMessage, outgoingMessage) => {
      if (!outgoingMessage.headersSent) {
        outgoingMessage.setHeader('connection', 'close');
      }
    });
    for (const socket of sockets) {
      // This is the HTTP CONNECT request socket.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      if (!(socket.server instanceof http.Server)) {
        continue;
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const serverResponse = socket._httpMessage;
      if (serverResponse) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader('connection', 'close');
        }
        continue;
      }
      destroySocket(socket);
    }
    for (const socket of secureSockets) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const serverResponse = socket._httpMessage;
      if (serverResponse) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader('connection', 'close');
        }
        continue;
      }
      destroySocket(socket);
    }
    if (sockets.size) {
      await utils.sleep(1000);
      for (const socket of sockets) {
        destroySocket(socket);
      }
    }
    if (secureSockets.size) {
      await utils.sleep(1000);
      for (const socket of secureSockets) {
        destroySocket(socket);
      }
    }
    server.close((error) => {
      if (error) {
        rejectTerminating(error);
      } else {
        resolveTerminating();
      }
    });
    return terminating;
  };
  return terminate;
}

export { terminatingHttpServer };
