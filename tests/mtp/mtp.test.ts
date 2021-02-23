import dgram from 'dgram';
import crypto from 'crypto';
import Logger from '@matrixai/logger';
import {
  MTPServer,
  MTPConnection,
} from '../../src/network/micro-transport-protocol/MTPServer';

describe('micro transport protocol', () => {
  test('simple - server client', (done) => {
    new MTPServer((conn) => {
      conn.on('data', (data) => {
        expect(data.toString()).toEqual('client');
        conn.write('server');
      });
    }, new Logger('Mock Logger')).listenPort(0, 'localhost', (a) => {
      const connection = MTPConnection.connect(
        'bacebd0a4af7939e1c5ae8a301bd757d',
        a.port,
        a.host,
      );
      connection.write('client');
      connection.on('data', (data) => {
        expect(data.toString()).toEqual('server');
        done();
      });
    });
  });
  test('existing server socket - server client', (done) => {
    const existingServerSocket = dgram.createSocket('udp4');
    existingServerSocket.bind(0, 'localhost', () => {
      new MTPServer((conn) => {
        conn.on('data', (data) => {
          expect(data.toString()).toEqual('client');
          conn.write('server');
        });
      }, new Logger('Mock Logger')).listenSocket(
        existingServerSocket,
        (a) => {
          const connection = MTPConnection.connect(
            'bacebd0a4af7939e1c5ae8a301bd757d',
            a.port,
            a.host,
          );
          connection.write('client');
          connection.on('data', (data) => {
            expect(data.toString()).toEqual('server');
            done();
          });
        },
        true,
      );
    });
  });
  test('existing client socket', (done) => {
    const logger = new Logger('Mock Logger');
    const existingClientSocket = dgram.createSocket('udp4');
    existingClientSocket.bind(0, 'localhost', () => {
      new MTPServer((conn) => {
        conn.on('data', (data) => {
          expect(data.toString()).toEqual('client');
          conn.write('server');
        });
      }, logger).listenPort(0, 'localhost', (a) => {
        const connection = MTPConnection.connect(
          'bacebd0a4af7939e1c5ae8a301bd757d',
          a.port,
          a.host,
          existingClientSocket,
        );
        connection.write('client');
        connection.on('data', (data) => {
          expect(data.toString()).toEqual('server');
          done();
        });
      });
    });
  });
  test('sequence writing - server client', (done) => {
    const max = 1000;
    new MTPServer((conn) => {
      let serverStep = 0;
      conn.on('data', (data) => {
        expect(data.toString()).toEqual(serverStep.toString());
        conn.write(data);
        serverStep += 1;
        if (serverStep === max) {
          conn.end();
        }
      });
    }, new Logger('Mock Logger')).listenPort(0, 'localhost', (a) => {
      let clientStep = 0;
      const connection = MTPConnection.connect(
        'bacebd0a4af7939e1c5ae8a301bd757d',
        a.port,
        a.host,
      );
      for (let i = 0; i < max; i++) {
        connection.write(i.toString());
      }
      connection.on('data', (data) => {
        expect(data.toString()).toEqual(clientStep.toString());
        clientStep += 1;
      });
      connection.on('end', () => {
        done();
      });
    });
  });
  test('bulk sequence writing - 256 byte packet length - server client', (done) => {
    const buffer: Buffer[] = [...Array(50).keys()].map(() =>
      crypto.randomBytes(256),
    );
    new MTPServer((conn) => {
      let serverStep = 0;
      conn.on('data', (data) => {
        expect(data).toEqual(buffer[serverStep]);
        conn.write(data);
        serverStep += 1;
        if (serverStep >= buffer.length) {
          conn.end();
        }
      });
    }, new Logger('Mock Logger')).listenPort(0, 'localhost', (a) => {
      let clientStep = 0;
      const connection = MTPConnection.connect(
        'bacebd0a4af7939e1c5ae8a301bd757d',
        a.port,
        a.host,
      );
      connection.on('data', (data) => {
        expect(data).toEqual(buffer[clientStep]);
        clientStep += 1;
      });
      connection.on('end', () => {
        done();
      });
      for (const [, buf] of buffer.entries()) {
        connection.write(buf);
      }
    });
  });
  test('bulk sequence writing - 1024 byte packet length - server client', (done) => {
    const buffer: Buffer[] = [...Array(50).keys()].map(() =>
      crypto.randomBytes(1024),
    );
    new MTPServer((conn) => {
      let serverStep = 0;
      conn.on('data', (data) => {
        expect(data).toEqual(buffer[serverStep]);
        conn.write(data);
        serverStep += 1;
        if (serverStep >= buffer.length) {
          conn.end();
        }
      });
    }, new Logger('Mock Logger')).listenPort(0, 'localhost', (a) => {
      let clientStep = 0;
      const connection = MTPConnection.connect(
        'bacebd0a4af7939e1c5ae8a301bd757d',
        a.port,
        a.host,
      );
      connection.on('data', (data) => {
        expect(data).toEqual(buffer[clientStep]);
        clientStep += 1;
      });
      connection.on('end', () => {
        done();
      });
      for (const [, buf] of buffer.entries()) {
        connection.write(buf);
      }
    });
  });
  test('big packets - 16384 byte packet length - server client', (done) => {
    const buffer: Buffer = crypto.randomBytes(16384);
    const MTU = 1400;
    let packetsReceived = 0;
    new MTPServer((conn) => {
      let serverBytesRead = 0;
      conn.on('data', (data: Buffer) => {
        packetsReceived += 1;
        expect(data).toEqual(
          buffer.slice(serverBytesRead, serverBytesRead + data.length),
        );
        conn.write(data);
        serverBytesRead += data.length;
        if (serverBytesRead >= buffer.length) {
          conn.end();
        }
      });
    }, new Logger('Mock Logger')).listenPort(0, 'localhost', (a) => {
      let clientBytesRead = 0;
      const connection = MTPConnection.connect(
        'bacebd0a4af7939e1c5ae8a301bd757d',
        a.port,
        a.host,
      );
      connection.on('data', (data: Buffer) => {
        expect(data).toEqual(
          buffer.slice(clientBytesRead, clientBytesRead + data.length),
        );
        clientBytesRead += data.length;
      });
      connection.on('end', () => {
        // packets received should be ceil of buffer length divided by MTU
        expect(packetsReceived).toEqual(Math.ceil(buffer.length / MTU));
        done();
      });
      connection.write(buffer);
    });
  });
});
