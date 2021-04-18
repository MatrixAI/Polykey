import net from 'net';
import tls from 'tls';
import http from 'http';
import https from 'https';
import * as utils from '../utils';

function terminatingHttpServer(
  server: http.Server | https.Server,
): () => Promise<void> {
  // Is the server terminating.
  let terminating: Promise<void> | void = undefined;

  // Established sockets.
  const sockets = new Set<net.Socket>();
  const secureSockets = new Set<tls.TLSSocket>();

  // Listen for new TCP connections. Close if server is terminating.
  // Otherwise, keep it, and remove it from record on close.
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

  // Listen for new TLS connections. Close if server is terminating.
  // Otherwise, keep it, and remove it from record on close.
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

  // Given a socket.
  // Close it and delete it from record.
  const destroySocket = (socket) => {
    socket.destroy();
    if (socket instanceof net.Socket) {
      sockets.delete(socket);
    } else {
      secureSockets.delete(socket);
    }
  };

  // Terminate the server.
  const terminate = async () => {
    // Already termianted.
    if (terminating) {
      return terminating;
    }

    // Why the fuck do we take this out of promise...
    // Even tho it works...
    let resolveTerminating;
    let rejectTerminating;
    terminating = new Promise((resolve, reject) => {
      resolveTerminating = resolve;
      rejectTerminating = reject;
    });

    // On new request.
    server.on('request', (incomingMessage, outgoingMessage) => {
      // If this new request have not been responded. Close Connection.
      if (!outgoingMessage.headersSent) {
        outgoingMessage.setHeader('connection', 'close');
      }
    });

    // For each established socket.
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
      // Close Connection
      if (serverResponse) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader('connection', 'close');
        }
        continue;
      }
      // Destroy.
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

    // Wait 1000 ms grace period, and force destroy them.
    if (sockets.size) {
      await utils.sleep(3000);
      for (const socket of sockets) {
        destroySocket(socket);
      }
    }

    // Wait 1000 ms grace period, and force destroy them.
    if (secureSockets.size) {
      await utils.sleep(3000);
      for (const socket of secureSockets) {
        destroySocket(socket);
      }
    }

    // Resove Promise.
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
