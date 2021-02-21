import type { AddressInfo } from 'net';

import http from 'http';
import { terminatingHttpServer } from '@/utils';

describe('utils', () => {
  test('Testing that the termination of http server results in a server that is not listening', async () => {
    const server = http.createServer();
    const terminate = terminatingHttpServer(server);
    server.on('request', (request, response) => {
      response.end('hello');
    });
    const serverListen = new Promise<number>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        resolve((server.address() as AddressInfo).port);
      });
    });
    const port = await serverListen;
    const request1 = new Promise<number | undefined>((resolve, reject) => {
      http
        .get(`http://127.0.0.1:${port}`, (resp) => {
          resolve(resp.statusCode);
        })
        .on('error', (e) => {
          reject(e);
        });
    });
    const statusCode = await request1;
    expect(statusCode).toBe(200);
    await terminate();
    const request2 = new Promise<number | undefined>((resolve, reject) => {
      http
        .get(`http://127.0.0.1:${port}`, (resp) => {
          resolve(resp.statusCode);
        })
        .on('error', (e) => {
          reject(e);
        });
    });
    try {
      await request2;
    } catch (e) {
      expect(e.code).toBe('ECONNREFUSED');
    }
  });
});
