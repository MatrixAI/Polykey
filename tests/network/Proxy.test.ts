import type { AddressInfo, Socket } from 'net';
import type { KeyPair } from '@/keys/types';
import type { ConnectionData, Host, Port, TLSConfig } from '@/network/types';
import net from 'net';
import http from 'http';
import tls from 'tls';
import UTP from 'utp-native';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Timer } from '@matrixai/timer';
import Proxy from '@/network/Proxy';
import * as networkUtils from '@/network/utils';
import * as networkErrors from '@/network/errors';
import * as keysUtils from '@/keys/utils';
import * as nodesUtils from '@/nodes/utils';
import { poll, promise, promisify } from '@/utils';
import * as testsUtils from '../utils';
import * as testNodesUtils from '../nodes/utils';

/**
 * Mock HTTP Connect Request
 * This is what clients to the Proxy should be doing
 * Returns the network socket established
 * @throws Error on failure to connect, may contain status code as message
 */
async function httpConnect(
  host: string,
  port: number,
  token: string,
  path: string,
): Promise<Socket> {
  const tokenEncoded = Buffer.from(token, 'utf-8').toString('base64');
  return await new Promise<Socket>((resolve, reject) => {
    const req = http.request({
      method: 'CONNECT',
      path: path,
      host: host,
      port: port,
      headers: {
        'Proxy-Authorization': `Basic ${tokenEncoded}`,
      },
    });
    req.end();
    req.once('connect', (res, clientSocket) => {
      if (res.statusCode === 200) {
        resolve(clientSocket);
      } else {
        reject(new Error(res.statusCode!.toString()));
      }
    });
    req.once('error', (e) => {
      reject(e);
    });
  });
}

/**
 * Mock TCP server
 * This is the server that the Proxy will be proxying to
 */
function tcpServer(end: boolean = false) {
  const { p: serverConnP, resolveP: resolveServerConnP } = promise<void>();
  const { p: serverConnEndP, resolveP: resolveServerConnEndP } =
    promise<void>();
  const { p: serverConnClosedP, resolveP: resolveServerConnClosedP } =
    promise<void>();
  const server = net.createServer(
    {
      allowHalfOpen: false,
    },
    (conn) => {
      resolveServerConnP();
      conn.on('end', () => {
        resolveServerConnEndP();
        conn.end();
        conn.destroy();
      });
      conn.once('close', () => {
        resolveServerConnClosedP();
      });
      if (end) {
        conn.removeAllListeners('end');
        conn.on('end', () => {
          resolveServerConnEndP();
          conn.destroy();
        });
        conn.end();
      }
    },
  );
  const serverClose = promisify(server.close).bind(server);
  const serverListen = promisify(server.listen).bind(server);
  const serverHost = () => {
    return (server.address() as AddressInfo).address as Host;
  };
  const serverPort = () => {
    return (server.address() as AddressInfo).port as Port;
  };
  return {
    serverListen,
    serverClose,
    serverConnP,
    serverConnEndP,
    serverConnClosedP,
    serverHost,
    serverPort,
  };
}

const generateCertId = keysUtils.createCertIdGenerator();

async function createTLSSocketConfig(serverKeyPair: KeyPair) {
  const serverKeyPairPem = keysUtils.keyPairToPEM(serverKeyPair);
  const serverCert = (await keysUtils.generateCertificate({
    certId: generateCertId(),
    duration: 31536000,
    issuerPrivateKey: serverKeyPair.privateKey,
    subjectKeyPair: { privateKey: serverKeyPair.privateKey, publicKey: serverKeyPair.publicKey }
  }));
  const serverCertPem = keysUtils.certToPEM(serverCert);
  return {
    key: Buffer.from(serverKeyPairPem.privateKey, 'ascii'),
    cert: Buffer.from(serverCertPem, 'ascii'),
    isServer: true,
    requestCert: true,
    rejectUnauthorized: false,
  }
}

describe(Proxy.name, () => {
  const localHost = '127.0.0.1' as Host;
  const port = 0 as Port;
  const logger = new Logger(`${Proxy.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const nodeIdABC = testNodesUtils.generateRandomNodeId();
  const nodeIdABCEncoded = nodesUtils.encodeNodeId(nodeIdABC);
  const nodeIdSome = testNodesUtils.generateRandomNodeId();
  const nodeIdSomeEncoded = nodesUtils.encodeNodeId(nodeIdSome);
  const nodeIdRandom = testNodesUtils.generateRandomNodeId();
  const authToken = 'abc123';
  // The Proxy acts like both a client and a server.
  // This is the TLSConfig for the Proxy.
  let tlsConfig: TLSConfig;
  let certPem: string;
  beforeEach(async () => {
    tlsConfig = await testsUtils.createTLSConfig(keysUtils.generateKeyPair());
  });
  test('proxy readiness', async () => {
    const proxy = new Proxy({
      authToken,
      logger,
    });
    // Should be a noop (already stopped)
    await proxy.stop();
    await proxy.start({
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    expect(typeof proxy.getForwardHost()).toBe('string');
    expect(typeof proxy.getForwardPort()).toBe('number');
    expect(proxy.getForwardPort()).toBeGreaterThan(0);
    expect(typeof proxy.getProxyHost()).toBe('string');
    expect(typeof proxy.getProxyPort()).toBe('number');
    expect(proxy.getProxyPort()).toBeGreaterThan(0);
    expect(proxy.getConnectionForwardCount()).toBe(0);
    // Should be a noop (already started)
    await proxy.start({
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    await proxy.stop();
    expect(() => {
      proxy.getForwardHost();
    }).toThrow(networkErrors.ErrorProxyNotRunning);
    await expect(async () => {
      await proxy.closeConnectionForward('::1' as Host, 1 as Port);
    }).rejects.toThrow(networkErrors.ErrorProxyNotRunning);
    // Start it again
    await proxy.start({
      forwardHost: '::1' as Host,
      proxyHost: localHost,
      serverHost: localHost,
      serverPort: port,
      tlsConfig,
    });
    expect(proxy.getForwardHost()).toBe('::1');
    await proxy.stop();
  });
  test('HTTP CONNECT bad request failures to the forward proxy', async () => {
    // The forward proxy will emit error logs when this occurs
    // In production these connect errors should never happen
    const proxy = new Proxy({
      authToken,
      logger: logger.getChild('Proxy CONNECT bad request'),
    });
    await proxy.start({
      forwardHost: '::1' as Host,
      tlsConfig,
      proxyHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    // Incorrect auth token
    await expect(() =>
      httpConnect(
        proxy.getForwardHost(),
        proxy.getForwardPort(),
        'incorrect auth token',
        `127.0.0.1:80?nodeId=${encodeURIComponent(nodeIdSomeEncoded)}`,
      ),
    ).rejects.toThrow('407');
    // Wildcard as host
    await expect(() =>
      httpConnect(
        proxy.getForwardHost(),
        proxy.getForwardPort(),
        authToken,
        `0.0.0.0:80?nodeId=${encodeURIComponent(nodeIdSomeEncoded)}`,
      ),
    ).rejects.toThrow('400');
    // No node id
    await expect(() =>
      httpConnect(
        proxy.getForwardHost(),
        proxy.getForwardPort(),
        authToken,
        '127.0.0.1:80',
      ),
    ).rejects.toThrow('400');
    // Missing target
    await expect(() =>
      httpConnect(
        proxy.getForwardHost(),
        proxy.getForwardPort(),
        authToken,
        `?nodeId=${encodeURIComponent(nodeIdSomeEncoded)}`,
      ),
    ).rejects.toThrow('400');
    await proxy.stop();
  });
  test('connection to port 0 fails', async () => {
    const proxy = new Proxy({
      authToken,
      logger: logger.getChild('Proxy port 0'),
    });
    await proxy.start({
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    // Cannot open connection to port 0
    await expect(() =>
      proxy.openConnectionForward([nodeIdABC], localHost, 0 as Port),
    ).rejects.toThrow(networkErrors.ErrorConnectionStart);
    await expect(() =>
      httpConnect(
        proxy.getForwardHost(),
        proxy.getForwardPort(),
        authToken,
        `127.0.0.1:0?nodeId=${encodeURIComponent(nodeIdABCEncoded)}`,
      ),
    ).rejects.toThrow('502');
    await proxy.stop();
  });
  test('connection start timeout due to hanging remote', async () => {
    // 1 seconds to wait to establish a connection
    // Must reduce the ping interval time to 100ms
    // Also reduce the end tome to 100ms
    // So that we can test timeouts quicker
    const proxy = new Proxy({
      authToken,
      connConnectTime: 1000,
      connKeepAliveIntervalTime: 100,
      connEndTime: 100,
      logger: logger.getChild('Proxy connection timeout'),
    });
    await proxy.start({
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    // This UTP server will just hang and not respond
    let receivedCount = 0;
    const utpSocketHang = UTP.createServer(() => {
      receivedCount++;
    });
    const utpSocketHangListen = promisify(utpSocketHang.listen).bind(
      utpSocketHang,
    );
    await utpSocketHangListen(0, localHost);
    const utpSocketHangPort = utpSocketHang.address().port;
    await expect(() =>
      proxy.openConnectionForward(
        [nodeIdABC],
        localHost,
        utpSocketHangPort as Port,
      ),
    ).rejects.toThrow(networkErrors.ErrorConnectionStartTimeout);
    expect(receivedCount).toBe(1);
    // Can override the timer
    const timer = new Timer({ delay: 2000 });
    await expect(() =>
      proxy.openConnectionForward(
        [nodeIdABC],
        localHost,
        utpSocketHangPort as Port,
        { timer },
      ),
    ).rejects.toThrow(networkErrors.ErrorConnectionStartTimeout);
    timer.cancel();
    expect(receivedCount).toBe(2);
    await expect(() =>
      httpConnect(
        proxy.getForwardHost(),
        proxy.getForwardPort(),
        authToken,
        `127.0.0.1:${utpSocketHangPort}?nodeId=${encodeURIComponent(
          nodeIdABCEncoded,
        )}`,
      ),
    ).rejects.toThrow('504');
    expect(receivedCount).toBe(3);
    utpSocketHang.close();
    utpSocketHang.unref();
    await proxy.stop();
  });
  test('connection reset due to ending remote', async () => {
    const proxy = new Proxy({
      authToken,
      logger: logger.getChild('Proxy connection reset'),
      connConnectTime: 10000,
    });
    await proxy.start({
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    // This UTP Server will immediately end and destroy
    // the connection upon receiving a connection
    let receivedCount = 0;
    const utpSocketEnd = UTP.createServer((utpConn) => {
      receivedCount++;
      utpConn.end();
      utpConn.destroy();
    });
    const utpSocketEndListen = promisify(utpSocketEnd.listen).bind(
      utpSocketEnd,
    );
    await utpSocketEndListen(0, localHost);
    const utpSocketEndPort = utpSocketEnd.address().port;
    await expect(() =>
      proxy.openConnectionForward(
        [nodeIdABC],
        localHost,
        utpSocketEndPort as Port,
      ),
    ).rejects.toThrow(networkErrors.ErrorConnectionStart);
    expect(receivedCount).toBe(1);
    // The actual error is UTP_ECONNRESET to be precise
    await expect(() =>
      proxy.openConnectionForward(
        [nodeIdABC],
        localHost,
        utpSocketEndPort as Port,
      ),
    ).rejects.toThrow(networkErrors.ErrorConnectionStart);
    expect(receivedCount).toBe(2);
    // 502 Bad Gateway on HTTP Connect
    await expect(() =>
      httpConnect(
        proxy.getForwardHost(),
        proxy.getForwardPort(),
        authToken,
        `127.0.0.1:${utpSocketEndPort}?nodeId=${encodeURIComponent(
          nodeIdABCEncoded,
        )}`,
      ),
    ).rejects.toThrow('502');
    expect(receivedCount).toBe(3);
    utpSocketEnd.close();
    utpSocketEnd.unref();
    await proxy.stop();
  });
  test('open connection fails due to missing certificates', async () => {
    const proxy = new Proxy({
      authToken,
      logger: logger.getChild('Proxy missing certificates'),
    });
    await proxy.start({
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    const { p: remoteReadyP, resolveP: resolveRemoteReadyP } = promise<void>();
    const { p: remoteClosedP, resolveP: resolveRemoteClosedP } =
      promise<void>();
    const utpConnError = jest.fn();
    const tlsSocketError = jest.fn();
    const tlsSocketEnd = jest.fn();
    const tlsSocketClose = jest.fn();
    // This UTP server will hold the connection
    const utpSocket = UTP.createServer(async (utpConn) => {
      utpConn.on('error', (e) => {
        utpConnError(e);
      });
      // All TLS servers must have a certificate and associated key
      // This is TLS socket is therefore dead on arrival by not providing
      // any certificate nor key
      const tlsSocket = new tls.TLSSocket(utpConn, {
        isServer: true,
        requestCert: true,
        rejectUnauthorized: false,
      });
      tlsSocket.on('error', (e) => {
        tlsSocketError(e);
      });
      // TLS socket will be closed as soon as error is emitted
      // Therefore this will never be called
      // However the socket is ended anyway automatically
      tlsSocket.on('end', () => {
        tlsSocketEnd();
        if (utpConn.destroyed) {
          tlsSocket.destroy();
        } else {
          tlsSocket.end();
          tlsSocket.destroy();
        }
      });
      tlsSocket.on('close', (hadError) => {
        tlsSocketClose(hadError);
        resolveRemoteClosedP();
      });
      await send(networkUtils.pingBuffer);
      const punchInterval = setInterval(async () => {
        await send(networkUtils.pingBuffer);
      }, 1000);
      await remoteReadyP;
      clearInterval(punchInterval);
    });
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        await send(networkUtils.pongBuffer);
      } else if (msg.type === 'pong') {
        resolveRemoteReadyP();
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, localHost);
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(proxy.getConnectionForwardCount()).toBe(0);
    // This is a TLS handshake failure
    await expect(() =>
      proxy.openConnectionForward(
        [nodeIdRandom],
        utpSocketHost as Host,
        utpSocketPort as Port,
      ),
    ).rejects.toThrow(networkErrors.ErrorConnectionStart);
    await expect(remoteClosedP).resolves.toBeUndefined();
    expect(utpConnError).toHaveBeenCalledTimes(0);
    // The TLS socket throw an error because there's no suitable signature algorithm
    expect(tlsSocketError).toHaveBeenCalledTimes(1);
    // Expect(tlsSocketError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(tlsSocketError.mock.calls[0][0]).toHaveProperty(
      'code',
      'ERR_SSL_NO_SUITABLE_SIGNATURE_ALGORITHM',
    );
    // The TLS socket end event never was emitted
    expect(tlsSocketEnd).toHaveBeenCalledTimes(0);
    // The TLS socket close event is emitted with error
    expect(tlsSocketClose).toHaveBeenCalledTimes(1);
    expect(tlsSocketClose).toHaveBeenCalledWith(true);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await proxy.stop();
  });
  test('HTTP CONNECT fails due to missing certificates', async () => {
    const proxy = new Proxy({
      authToken,
      logger: logger.getChild('Proxy missing certificates'),
    });
    await proxy.start({
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    const { p: remoteReadyP, resolveP: resolveRemoteReadyP } = promise<void>();
    const { p: remoteClosedP, resolveP: resolveRemoteClosedP } =
      promise<void>();
    const utpConnError = jest.fn();
    const tlsSocketError = jest.fn();
    const tlsSocketEnd = jest.fn();
    const tlsSocketClose = jest.fn();
    // This UTP server will hold the connection
    const utpSocket = UTP.createServer(async (utpConn) => {
      utpConn.on('error', (e) => {
        utpConnError(e);
      });
      // All TLS servers must have a certificate and associated key
      // This is TLS socket is therefore dead on arrival by not providing
      // any certificate nor key
      const tlsSocket = new tls.TLSSocket(utpConn, {
        isServer: true,
        requestCert: true,
        rejectUnauthorized: false,
      });
      tlsSocket.on('error', (e) => {
        tlsSocketError(e);
      });
      // TLS socket will be closed as soon as error is emitted
      // Therefore this will never be called
      // However the socket is ended anyway automatically
      tlsSocket.on('end', () => {
        tlsSocketEnd();
        if (utpConn.destroyed) {
          tlsSocket.destroy();
        } else {
          tlsSocket.end();
          tlsSocket.destroy();
        }
      });
      tlsSocket.on('close', (hadError) => {
        tlsSocketClose(hadError);
        resolveRemoteClosedP();
      });
      await send(networkUtils.pingBuffer);
      const punchInterval = setInterval(async () => {
        await send(networkUtils.pingBuffer);
      }, 1000);
      await remoteReadyP;
      clearInterval(punchInterval);
    });
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        await send(networkUtils.pongBuffer);
      } else if (msg.type === 'pong') {
        resolveRemoteReadyP();
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, localHost);
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(proxy.getConnectionForwardCount()).toBe(0);
    // This is an TLS handshake failure
    await expect(() =>
      httpConnect(
        proxy.getForwardHost(),
        proxy.getForwardPort(),
        authToken,
        `${utpSocketHost}:${utpSocketPort}?nodeId=${encodeURIComponent(
          nodeIdSomeEncoded,
        )}`,
      ),
    ).rejects.toThrow('502');
    await expect(remoteClosedP).resolves.toBeUndefined();
    expect(utpConnError).toHaveBeenCalledTimes(0);
    // The TLS socket throw an error because there's no suitable signature algorithm
    expect(tlsSocketError).toHaveBeenCalledTimes(1);
    // Expect(tlsSocketError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(tlsSocketError.mock.calls[0][0]).toHaveProperty(
      'code',
      'ERR_SSL_NO_SUITABLE_SIGNATURE_ALGORITHM',
    );
    // The TLS socket end event never was emitted
    expect(tlsSocketEnd).toHaveBeenCalledTimes(0);
    // The TLS socket close event is emitted with error
    expect(tlsSocketClose).toHaveBeenCalledTimes(1);
    expect(tlsSocketClose).toHaveBeenCalledWith(true);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await proxy.stop();
  });
  test('open connection fails due to invalid node id', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair();
    const proxy = new Proxy({
      authToken,
      logger: logger.getChild('Proxy invalid node id'),
    });
    await proxy.start({
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    const { p: remoteReadyP, resolveP: resolveRemoteReadyP } = promise<void>();
    const { p: remoteClosedP, resolveP: resolveRemoteClosedP } =
      promise<void>();
    const utpConnError = jest.fn();
    const tlsSocketError = jest.fn();
    const tlsSocketEnd = jest.fn();
    const tlsSocketClose = jest.fn();
    // This UTP server will hold the connection
    let secured = false;
    const utpSocket = UTP.createServer(async (utpConn) => {
      utpConn.on('error', (e) => {
        logger.warn('utpConn threw: ' + e.message);
        // UTP implementation is buggy,
        // we sometimes expect to see write after end error
        if (e.message === 'Cannot call write after a stream was destroyed') {
          return;
        }
        utpConnError(e);
      });
      utpConn.on('end', async () => {
        utpConn.destroy();
      });
      const tlsSocket = new tls.TLSSocket(utpConn, await createTLSSocketConfig(serverKeyPair));
      tlsSocket.on('secure', () => {
        secured = true;
      });
      tlsSocket.on('error', (e) => {
        tlsSocketError(e);
      });
      tlsSocket.on('end', () => {
        logger.debug('Reverse: receives tlsSocket ending');
        tlsSocketEnd();
        if (utpConn.destroyed) {
          logger.debug('Reverse: destroys tlsSocket');
          tlsSocket.destroy();
        } else {
          logger.debug('Reverse: responds tlsSocket ending');
          tlsSocket.end();
          tlsSocket.destroy();
        }
      });
      tlsSocket.on('close', (hadError) => {
        tlsSocketClose(hadError);
        resolveRemoteClosedP();
      });
      await send(networkUtils.pingBuffer);
      const punchInterval = setInterval(async () => {
        await send(networkUtils.pingBuffer);
      }, 1000);
      await remoteReadyP;
      clearInterval(punchInterval);
    });
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        await send(networkUtils.pongBuffer);
      } else if (msg.type === 'pong') {
        resolveRemoteReadyP();
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, localHost);
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(proxy.getConnectionForwardCount()).toBe(0);
    await expect(() =>
      proxy.openConnectionForward(
        [nodeIdRandom],
        utpSocketHost as Host,
        utpSocketPort as Port,
      ),
    ).rejects.toThrow(networkErrors.ErrorCertChainUnclaimed);
    await expect(remoteReadyP).resolves.toBeUndefined();
    expect(secured).toBe(true);
    expect(proxy.getConnectionForwardCount()).toBe(0);
    await expect(remoteClosedP).resolves.toBeUndefined();
    expect(utpConnError).toHaveBeenCalledTimes(0);
    // No TLS socket errors this time
    // The client side figured that the node id is incorrect
    expect(tlsSocketError).toHaveBeenCalledTimes(0);
    // This time the tls socket is ended from the client side
    expect(tlsSocketEnd).toHaveBeenCalledTimes(1);
    // The TLS socket close event is emitted without error
    expect(tlsSocketClose).toHaveBeenCalledTimes(1);
    expect(tlsSocketClose).toHaveBeenCalledWith(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await proxy.stop();
  });
  test('HTTP CONNECT fails due to invalid node id', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair();
    const proxy = new Proxy({
      authToken,
      logger: logger.getChild('Proxy invalid node id'),
    });
    await proxy.start({
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    const { p: remoteReadyP, resolveP: resolveRemoteReadyP } = promise<void>();
    const { p: remoteClosedP, resolveP: resolveRemoteClosedP } =
      promise<void>();
    const utpConnError = jest.fn();
    const tlsSocketError = jest.fn();
    const tlsSocketEnd = jest.fn();
    const tlsSocketClose = jest.fn();
    // This UTP server will hold the connection
    let secured = false;
    const utpSocket = UTP.createServer(async (utpConn) => {
      utpConn.on('error', (e) => {
        logger.warn('utpConn threw: ' + e.message);
        // UTP implementation is buggy,
        // we sometimes expect to see write after end error
        if (e.message === 'Cannot call write after a stream was destroyed') {
          return;
        }
        utpConnError(e);
      });
      utpConn.on('end', async () => {
        utpConn.destroy();
      });
      const tlsSocket = new tls.TLSSocket(utpConn, await createTLSSocketConfig(serverKeyPair));
      tlsSocket.on('secure', () => {
        secured = true;
      });
      tlsSocket.on('error', (e) => {
        tlsSocketError(e);
      });
      tlsSocket.on('end', () => {
        logger.debug('Reverse: receives tlsSocket ending');
        tlsSocketEnd();
        if (utpConn.destroyed) {
          logger.debug('Reverse: destroys tlsSocket');
          tlsSocket.destroy();
        } else {
          logger.debug('Reverse: responds tlsSocket ending');
          tlsSocket.end();
          tlsSocket.destroy();
        }
      });
      tlsSocket.on('close', (hadError) => {
        tlsSocketClose(hadError);
        resolveRemoteClosedP();
      });
      await send(networkUtils.pingBuffer);
      const punchInterval = setInterval(async () => {
        await send(networkUtils.pingBuffer);
      }, 1000);
      await remoteReadyP;
      clearInterval(punchInterval);
    });
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        await send(networkUtils.pongBuffer);
      } else if (msg.type === 'pong') {
        resolveRemoteReadyP();
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, localHost);
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(proxy.getConnectionForwardCount()).toBe(0);
    await expect(() =>
      httpConnect(
        proxy.getForwardHost(),
        proxy.getForwardPort(),
        authToken,
        `${utpSocketHost}:${utpSocketPort}?nodeId=${encodeURIComponent(
          nodeIdSomeEncoded,
        )}`,
      ),
    ).rejects.toThrow('526');
    await expect(remoteReadyP).resolves.toBeUndefined();
    expect(secured).toBe(true);
    expect(proxy.getConnectionForwardCount()).toBe(0);
    await expect(remoteClosedP).resolves.toBeUndefined();
    expect(utpConnError).toHaveBeenCalledTimes(0);
    // No TLS socket errors this time
    // The client side figured that the node id is incorrect
    expect(tlsSocketError).toHaveBeenCalledTimes(0);
    // This time the tls socket is ended from the client side
    expect(tlsSocketEnd).toHaveBeenCalledTimes(1);
    // The TLS socket close event is emitted without error
    expect(tlsSocketClose).toHaveBeenCalledTimes(1);
    expect(tlsSocketClose).toHaveBeenCalledWith(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await proxy.stop();
  });
  test('open connection success - forward initiates end', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair();
    const serverNodeId = keysUtils.publicKeyToNodeId(serverKeyPair.publicKey)!;
    const proxy = new Proxy({
      authToken,
      logger: logger.getChild(
        'Proxy open connection success - forward initiates end',
      ),
    });
    await proxy.start({
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    const { p: remoteReadyP, resolveP: resolveRemoteReadyP } = promise<void>();
    const { p: remoteSecureP, resolveP: resolveRemoteSecureP } =
      promise<void>();
    const { p: remoteClosedP, resolveP: resolveRemoteClosedP } =
      promise<void>();
    const utpConnError = jest.fn();
    const tlsSocketError = jest.fn();
    const tlsSocketEnd = jest.fn();
    const tlsSocketClose = jest.fn();
    // This UTP server will hold the connection
    const utpSocket = UTP.createServer(async (utpConn) => {
      utpConn.on('error', (e) => {
        logger.warn('utpConn threw: ' + e.message);
        // UTP implementation is buggy,
        // we sometimes expect to see write after end error
        if (e.message === 'Cannot call write after a stream was destroyed') {
          return;
        }
        utpConnError(e);
      });
      utpConn.on('end', async () => {
        utpConn.destroy();
      });
      const tlsSocket = new tls.TLSSocket(utpConn, await createTLSSocketConfig(serverKeyPair));
      tlsSocket.on('secure', () => {
        resolveRemoteSecureP();
      });
      tlsSocket.on('error', (e) => {
        tlsSocketError(e);
      });
      tlsSocket.on('end', () => {
        logger.debug('Reverse: receives tlsSocket ending');
        tlsSocketEnd();
        if (utpConn.destroyed) {
          logger.debug('Reverse: destroys tlsSocket');
          tlsSocket.destroy();
        } else {
          logger.debug('Reverse: responds tlsSocket ending');
          tlsSocket.end();
          tlsSocket.destroy();
          logger.debug('Reverse: responded tlsSocket ending');
        }
      });
      tlsSocket.on('close', (hadError) => {
        tlsSocketClose(hadError);
        resolveRemoteClosedP();
      });
      await send(networkUtils.pingBuffer);
      const punchInterval = setInterval(async () => {
        await send(networkUtils.pingBuffer);
      }, 1000);
      await remoteReadyP;
      clearInterval(punchInterval);
    });
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        await send(networkUtils.pongBuffer);
      } else if (msg.type === 'pong') {
        resolveRemoteReadyP();
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, localHost);
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(proxy.getConnectionForwardCount()).toBe(0);
    await proxy.openConnectionForward(
      [serverNodeId],
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    await expect(remoteReadyP).resolves.toBeUndefined();
    await expect(remoteSecureP).resolves.toBeUndefined();
    // Opening a duplicate connection is noop
    await proxy.openConnectionForward(
      [serverNodeId],
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    expect(proxy.getConnectionForwardCount()).toBe(1);
    await proxy.closeConnectionForward(
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    expect(proxy.getConnectionForwardCount()).toBe(0);
    await expect(remoteClosedP).resolves.toBeUndefined();
    expect(utpConnError).toHaveBeenCalledTimes(0);
    expect(tlsSocketError).toHaveBeenCalledTimes(0);
    expect(tlsSocketEnd).toHaveBeenCalledTimes(1);
    expect(tlsSocketClose).toHaveBeenCalledTimes(1);
    expect(tlsSocketClose).toHaveBeenCalledWith(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await proxy.stop();
  });
  test('open connection success - reverse initiates end', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair();
    const serverNodeId = keysUtils.publicKeyToNodeId(serverKeyPair.publicKey)!;
    const proxy = new Proxy({
      authToken,
      connEndTime: 5000,
      logger: logger.getChild(
        'Proxy open connection success - reverse initiates end',
      ),
    });
    await proxy.start({
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    const { p: remoteReadyP, resolveP: resolveRemoteReadyP } = promise<void>();
    const { p: remoteSecureP, resolveP: resolveRemoteSecureP } =
      promise<void>();
    const { p: remoteClosedP, resolveP: resolveRemoteClosedP } =
      promise<void>();
    const utpConnError = jest.fn();
    const tlsSocketError = jest.fn();
    const tlsSocketEnd = jest.fn();
    const tlsSocketClose = jest.fn();
    // Will use this to simulate reverse initiating end
    let tlsSocket_: tls.TLSSocket;
    // This UTP server will hold the connection
    const utpSocket = UTP.createServer(async (utpConn) => {
      utpConn.on('error', (e) => {
        utpConnError(e);
      });
      const tlsSocket = new tls.TLSSocket(utpConn, await createTLSSocketConfig(serverKeyPair));
      tlsSocket_ = tlsSocket;
      tlsSocket.on('secure', () => {
        resolveRemoteSecureP();
      });
      tlsSocket.on('error', (e) => {
        tlsSocketError(e);
      });
      tlsSocket.on('end', () => {
        logger.debug('Reverse: receives tlsSocket ending');
        tlsSocketEnd();
        if (utpConn.destroyed) {
          logger.debug('Reverse: destroys tlsSocket');
          tlsSocket.destroy();
        } else {
          logger.debug('Reverse: responds tlsSocket ending');
          utpConn.end();
          tlsSocket.destroy();
          logger.debug('Reverse: responded tlsSocket ending');
        }
      });
      tlsSocket.on('close', (hadError) => {
        tlsSocketClose(hadError);
        resolveRemoteClosedP();
      });
      await send(networkUtils.pingBuffer);
      const punchInterval = setInterval(async () => {
        await send(networkUtils.pingBuffer);
      }, 1000);
      await remoteReadyP;
      clearInterval(punchInterval);
    });
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        await send(networkUtils.pongBuffer);
      } else if (msg.type === 'pong') {
        resolveRemoteReadyP();
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, localHost);
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(proxy.getConnectionForwardCount()).toBe(0);
    await proxy.openConnectionForward(
      [serverNodeId],
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    await expect(remoteReadyP).resolves.toBeUndefined();
    await expect(remoteSecureP).resolves.toBeUndefined();
    // Opening a duplicate connection is noop
    await proxy.openConnectionForward(
      [serverNodeId],
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    expect(proxy.getConnectionForwardCount()).toBe(1);
    // Start the graceful ending of the tls socket
    logger.debug('Reverse: begins tlsSocket ending');
    const { p: endP, resolveP: resolveEndP } = promise<void>();
    tlsSocket_!.removeAllListeners('end');
    tlsSocket_!.once('end', resolveEndP);
    tlsSocket_!.end();
    await endP;
    // Force destroys the socket due to buggy tlsSocket and utpConn
    tlsSocket_!.destroy();
    logger.debug('Reverse: finishes tlsSocket ending');
    await expect(remoteClosedP).resolves.toBeUndefined();
    // Connection count should reach 0 eventually
    await expect(
      poll(
        async () => {
          return proxy.getConnectionForwardCount();
        },
        (_, result) => {
          return result === 0;
        },
        100,
      ),
    ).resolves.toBe(0);
    expect(utpConnError).toHaveBeenCalledTimes(0);
    expect(tlsSocketError).toHaveBeenCalledTimes(0);
    // This time the reverse side initiates the end
    // Therefore, this handler is removed
    expect(tlsSocketEnd).toHaveBeenCalledTimes(0);
    expect(tlsSocketClose).toHaveBeenCalledTimes(1);
    expect(tlsSocketClose).toHaveBeenCalledWith(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await proxy.stop();
  });
  test('HTTP CONNECT success - forward initiates end', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair();
    const serverNodeId = keysUtils.publicKeyToNodeId(serverKeyPair.publicKey)!;
    const serverNodeIdEncoded = nodesUtils.encodeNodeId(serverNodeId);
    const proxy = new Proxy({
      authToken,
      logger: logger.getChild(
        'Proxy HTTP CONNECT success - forward initiates end',
      ),
    });
    await proxy.start({
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    const { p: remoteReadyP, resolveP: resolveRemoteReadyP } = promise<void>();
    const { p: remoteSecureP, resolveP: resolveRemoteSecureP } =
      promise<void>();
    const { p: remoteClosedP, resolveP: resolveRemoteClosedP } =
      promise<void>();
    const utpConnError = jest.fn();
    const tlsSocketError = jest.fn();
    const tlsSocketEnd = jest.fn();
    const tlsSocketClose = jest.fn();
    // This UTP server will hold the connection
    const utpSocket = UTP.createServer(async (utpConn) => {
      utpConn.on('error', (e) => {
        logger.warn('utpConn threw: ' + e.message);
        // UTP implementation is buggy,
        // we sometimes expect to see write after end error
        if (e.message === 'Cannot call write after a stream was destroyed') {
          return;
        }
        utpConnError(e);
      });
      utpConn.on('end', async () => {
        utpConn.destroy();
      });
      const tlsSocket = new tls.TLSSocket(utpConn, await createTLSSocketConfig(serverKeyPair));
      tlsSocket.on('secure', () => {
        resolveRemoteSecureP();
      });
      tlsSocket.on('error', (e) => {
        tlsSocketError(e);
      });
      tlsSocket.on('end', () => {
        logger.debug('Reverse: receives tlsSocket ending');
        tlsSocketEnd();
        if (utpConn.destroyed) {
          logger.debug('Reverse: destroys tlsSocket');
          tlsSocket.destroy();
        } else {
          logger.debug('Reverse: responds tlsSocket ending');
          tlsSocket.end();
          tlsSocket.destroy();
          logger.debug('Reverse: responded tlsSocket ending');
        }
      });
      tlsSocket.on('close', (hadError) => {
        tlsSocketClose(hadError);
        resolveRemoteClosedP();
      });
      await send(networkUtils.pingBuffer);
      const punchInterval = setInterval(async () => {
        await send(networkUtils.pingBuffer);
      }, 1000);
      await remoteReadyP;
      clearInterval(punchInterval);
    });
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        await send(networkUtils.pongBuffer);
      } else if (msg.type === 'pong') {
        resolveRemoteReadyP();
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, localHost);
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(proxy.getConnectionForwardCount()).toBe(0);
    const clientSocket = await httpConnect(
      proxy.getForwardHost(),
      proxy.getForwardPort(),
      authToken,
      `${utpSocketHost}:${utpSocketPort}?nodeId=${encodeURIComponent(
        serverNodeIdEncoded,
      )}`,
    );
    await expect(remoteReadyP).resolves.toBeUndefined();
    await expect(remoteSecureP).resolves.toBeUndefined();
    expect(clientSocket).toBeInstanceOf(net.Socket);
    expect(clientSocket.remoteAddress).toBe(proxy.getForwardHost());
    expect(clientSocket.remotePort).toBe(proxy.getForwardPort());
    const { p: localClosedP, resolveP: resolveLocalClosedP } = promise<void>();
    // Normal sockets defaults to `allowHalfOpen: false`
    // Therefore this isn't strictly necessary
    // Here we are just adding it in ensure consistent behaviour
    // If this wasn't done by default, then there should be an error
    // emitted on the ConnectionForward tlsSocket as ErrorConnectionEndTimeout
    const clientSocketEnd = jest.fn();
    clientSocket.on('end', () => {
      clientSocketEnd();
      clientSocket.end();
    });
    clientSocket.on('close', () => {
      resolveLocalClosedP();
    });
    // Opening a duplicate connection is noop
    await proxy.openConnectionForward(
      [serverNodeId],
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    expect(proxy.getConnectionForwardCount()).toBe(1);
    await proxy.closeConnectionForward(
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    expect(proxy.getConnectionForwardCount()).toBe(0);
    expect(clientSocketEnd).toHaveBeenCalledTimes(1);
    await expect(localClosedP).resolves.toBeUndefined();
    await expect(remoteClosedP).resolves.toBeUndefined();
    expect(utpConnError).toHaveBeenCalledTimes(0);
    expect(tlsSocketError).toHaveBeenCalledTimes(0);
    expect(tlsSocketEnd).toHaveBeenCalledTimes(1);
    expect(tlsSocketClose).toHaveBeenCalledTimes(1);
    expect(tlsSocketClose).toHaveBeenCalledWith(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await proxy.stop();
  });
  test('HTTP CONNECT success - reverse initiates end', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair();
    const serverNodeId = keysUtils.publicKeyToNodeId(serverKeyPair.publicKey)!;
    const serverNodeIdEncoded = nodesUtils.encodeNodeId(serverNodeId);
    const proxy = new Proxy({
      authToken,
      logger: logger.getChild(
        'Proxy HTTP CONNECT success - reverse initiates end',
      ),
    });
    await proxy.start({
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    const { p: remoteReadyP, resolveP: resolveRemoteReadyP } = promise<void>();
    const { p: remoteSecureP, resolveP: resolveRemoteSecureP } =
      promise<void>();
    const { p: remoteClosedP, resolveP: resolveRemoteClosedP } =
      promise<void>();
    const utpConnError = jest.fn();
    const tlsSocketError = jest.fn();
    const tlsSocketEnd = jest.fn();
    const tlsSocketClose = jest.fn();
    // Will use this to simulate reverse initiating end
    let tlsSocket_: tls.TLSSocket;
    // This UTP server will hold the connection
    const utpSocket = UTP.createServer(async (utpConn) => {
      utpConn.on('error', (e) => {
        utpConnError(e);
      });
      const tlsSocket = new tls.TLSSocket(utpConn, await createTLSSocketConfig(serverKeyPair));
      tlsSocket_ = tlsSocket;
      tlsSocket.on('secure', () => {
        resolveRemoteSecureP();
      });
      tlsSocket.on('error', (e) => {
        tlsSocketError(e);
      });
      tlsSocket.on('end', () => {
        logger.debug('Reverse: receives tlsSocket ending');
        tlsSocketEnd();
        if (utpConn.destroyed) {
          logger.debug('Reverse: destroys tlsSocket');
          tlsSocket.destroy();
        } else {
          logger.debug('Reverse: responds tlsSocket ending');
          tlsSocket.end();
          tlsSocket.destroy();
          logger.debug('Reverse: responded tlsSocket ending');
        }
      });
      tlsSocket.on('close', (hadError) => {
        tlsSocketClose(hadError);
        resolveRemoteClosedP();
      });
      await send(networkUtils.pingBuffer);
      const punchInterval = setInterval(async () => {
        await send(networkUtils.pingBuffer);
      }, 1000);
      await remoteReadyP;
      clearInterval(punchInterval);
    });
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        await send(networkUtils.pongBuffer);
      } else if (msg.type === 'pong') {
        resolveRemoteReadyP();
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, localHost);
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(proxy.getConnectionForwardCount()).toBe(0);
    const clientSocket = await httpConnect(
      proxy.getForwardHost(),
      proxy.getForwardPort(),
      authToken,
      `${utpSocketHost}:${utpSocketPort}?nodeId=${encodeURIComponent(
        serverNodeIdEncoded,
      )}`,
    );
    await expect(remoteReadyP).resolves.toBeUndefined();
    await expect(remoteSecureP).resolves.toBeUndefined();
    expect(clientSocket).toBeInstanceOf(net.Socket);
    expect(clientSocket.remoteAddress).toBe(proxy.getForwardHost());
    expect(clientSocket.remotePort).toBe(proxy.getForwardPort());
    const { p: localClosedP, resolveP: resolveLocalClosedP } = promise<void>();
    // Normal sockets defaults to `allowHalfOpen: false`
    // Therefore this isn't strictly necessary
    // Here we are just adding it in ensure consistent behaviour
    // If this wasn't done by default, then there should be an error
    // emitted on the ConnectionForward tlsSocket as ErrorConnectionEndTimeout
    const clientSocketEnd = jest.fn();
    clientSocket.on('end', () => {
      clientSocketEnd();
      clientSocket.end();
    });
    clientSocket.on('close', () => {
      resolveLocalClosedP();
    });
    // Opening a duplicate connection is noop
    await proxy.openConnectionForward(
      [serverNodeId],
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    expect(proxy.getConnectionForwardCount()).toBe(1);
    // Start the graceful ending of the tls socket
    logger.debug('Reverse: begins tlsSocket ending');
    const { p: endP, resolveP: resolveEndP } = promise<void>();
    tlsSocket_!.removeAllListeners('end');
    tlsSocket_!.once('end', resolveEndP);
    tlsSocket_!.end();
    await endP;
    // Force destroys the socket due to buggy tlsSocket and utpConn
    tlsSocket_!.destroy();
    logger.debug('Reverse: finishes tlsSocket ending');
    await expect(localClosedP).resolves.toBeUndefined();
    expect(clientSocketEnd).toHaveBeenCalledTimes(1);
    await expect(remoteClosedP).resolves.toBeUndefined();
    // Connection count should reach 0 eventually
    await expect(
      poll(
        async () => {
          return proxy.getConnectionForwardCount();
        },
        (_, result) => {
          return result === 0;
        },
        100,
      ),
    ).resolves.toBe(0);
    expect(utpConnError).toHaveBeenCalledTimes(0);
    expect(tlsSocketError).toHaveBeenCalledTimes(0);
    // This time the reverse side initiates the end
    // Therefore, this handler is removed
    expect(tlsSocketEnd).toHaveBeenCalledTimes(0);
    expect(tlsSocketClose).toHaveBeenCalledTimes(1);
    expect(tlsSocketClose).toHaveBeenCalledWith(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await proxy.stop();
  });
  test('HTTP CONNECT success - client initiates end', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair();
    const serverNodeId = keysUtils.publicKeyToNodeId(serverKeyPair.publicKey)!;
    const serverNodeIdEncoded = nodesUtils.encodeNodeId(serverNodeId);
    const proxy = new Proxy({
      authToken,
      logger: logger.getChild(
        'Proxy HTTP CONNECT success - client initiates end',
      ),
    });
    await proxy.start({
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    const { p: remoteReadyP, resolveP: resolveRemoteReadyP } = promise<void>();
    const { p: remoteSecureP, resolveP: resolveRemoteSecureP } =
      promise<void>();
    const { p: remoteClosedP, resolveP: resolveRemoteClosedP } =
      promise<void>();
    const utpConnError = jest.fn();
    const tlsSocketError = jest.fn();
    const tlsSocketEnd = jest.fn();
    const tlsSocketClose = jest.fn();
    // This UTP server will hold the connection
    const utpSocket = UTP.createServer(async (utpConn) => {
      utpConn.on('error', (e) => {
        utpConnError(e);
      });
      const tlsSocket = new tls.TLSSocket(utpConn, await createTLSSocketConfig(serverKeyPair));
      tlsSocket.on('secure', () => {
        resolveRemoteSecureP();
      });
      tlsSocket.on('error', (e) => {
        tlsSocketError(e);
      });
      tlsSocket.on('end', () => {
        logger.debug('Reverse: receives tlsSocket ending');
        tlsSocketEnd();
        if (utpConn.destroyed) {
          logger.debug('Reverse: destroys tlsSocket');
          tlsSocket.destroy();
        } else {
          logger.debug('Reverse: responds tlsSocket ending');
          tlsSocket.end();
          tlsSocket.destroy();
          logger.debug('Reverse: responded tlsSocket ending');
        }
      });
      tlsSocket.on('close', (hadError) => {
        tlsSocketClose(hadError);
        resolveRemoteClosedP();
      });
      await send(networkUtils.pingBuffer);
      const punchInterval = setInterval(async () => {
        await send(networkUtils.pingBuffer);
      }, 1000);
      await remoteReadyP;
      clearInterval(punchInterval);
    });
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        await send(networkUtils.pongBuffer);
      } else if (msg.type === 'pong') {
        resolveRemoteReadyP();
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, localHost);
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(proxy.getConnectionForwardCount()).toBe(0);
    const clientSocket = await httpConnect(
      proxy.getForwardHost(),
      proxy.getForwardPort(),
      authToken,
      `${utpSocketHost}:${utpSocketPort}?nodeId=${encodeURIComponent(
        serverNodeIdEncoded,
      )}`,
    );
    await expect(remoteReadyP).resolves.toBeUndefined();
    await expect(remoteSecureP).resolves.toBeUndefined();
    expect(clientSocket).toBeInstanceOf(net.Socket);
    expect(clientSocket.remoteAddress).toBe(proxy.getForwardHost());
    expect(clientSocket.remotePort).toBe(proxy.getForwardPort());
    const { p: localClosedP, resolveP: resolveLocalClosedP } = promise<void>();
    clientSocket.on('close', () => {
      resolveLocalClosedP();
    });
    // Opening a duplicate connection is noop
    await proxy.openConnectionForward(
      [serverNodeId],
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    expect(proxy.getConnectionForwardCount()).toBe(1);
    const { p: endP, resolveP: resolveEndP } = promise<void>();
    // By default, net sockets have `allowHalfOpen: false`
    // Here we override the behaviour by removing the end listener
    // And replacing it with our own, and remember to also force destroy
    clientSocket.removeAllListeners('end');
    clientSocket.on('end', () => {
      resolveEndP();
      clientSocket.destroy();
    });
    logger.debug('Client: begins clientSocket ending');
    clientSocket.end();
    await endP;
    logger.debug('Client: finishes clientSocket ending');
    await expect(localClosedP).resolves.toBeUndefined();
    await expect(remoteClosedP).resolves.toBeUndefined();
    // Connection count should reach 0 eventually
    await expect(
      poll(
        async () => {
          return proxy.getConnectionForwardCount();
        },
        (_, result) => {
          return result === 0;
        },
        100,
      ),
    ).resolves.toBe(0);
    expect(utpConnError).toHaveBeenCalledTimes(0);
    expect(tlsSocketError).toHaveBeenCalledTimes(0);
    expect(tlsSocketEnd).toHaveBeenCalledTimes(1);
    expect(tlsSocketClose).toHaveBeenCalledTimes(1);
    expect(tlsSocketClose).toHaveBeenCalledWith(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await proxy.stop();
  });
  test('HTTP CONNECT success by opening connection first', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair();
    const serverNodeId = keysUtils.publicKeyToNodeId(serverKeyPair.publicKey)!;
    const serverNodeIdEncoded = nodesUtils.encodeNodeId(serverNodeId);
    const proxy = new Proxy({
      authToken,
      logger,
    });
    await proxy.start({
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    const { p: remoteReadyP, resolveP: resolveRemoteReadyP } = promise<void>();
    const { p: remoteSecureP, resolveP: resolveRemoteSecureP } =
      promise<void>();
    const { p: remoteClosedP, resolveP: resolveRemoteClosedP } =
      promise<void>();
    const utpConnError = jest.fn();
    const tlsSocketError = jest.fn();
    const tlsSocketEnd = jest.fn();
    const tlsSocketClose = jest.fn();
    // This UTP server will hold the connection
    const utpSocket = UTP.createServer(async (utpConn) => {
      utpConn.on('error', (e) => {
        utpConnError(e);
      });
      const tlsSocket = new tls.TLSSocket(utpConn, await createTLSSocketConfig(serverKeyPair));
      tlsSocket.on('secure', () => {
        resolveRemoteSecureP();
      });
      tlsSocket.on('error', (e) => {
        tlsSocketError(e);
      });
      tlsSocket.on('end', () => {
        logger.debug('Reverse: receives tlsSocket ending');
        tlsSocketEnd();
        if (utpConn.destroyed) {
          logger.debug('Reverse: destroys tlsSocket');
          tlsSocket.destroy();
        } else {
          logger.debug('Reverse: responds tlsSocket ending');
          tlsSocket.end();
          tlsSocket.destroy();
        }
      });
      tlsSocket.on('close', (hadError) => {
        tlsSocketClose(hadError);
        resolveRemoteClosedP();
      });
      await send(networkUtils.pingBuffer);
      const punchInterval = setInterval(async () => {
        await send(networkUtils.pingBuffer);
      }, 1000);
      await remoteReadyP;
      clearInterval(punchInterval);
    });
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        await send(networkUtils.pongBuffer);
      } else if (msg.type === 'pong') {
        resolveRemoteReadyP();
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, localHost);
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    await proxy.openConnectionForward(
      [serverNodeId],
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    await expect(remoteReadyP).resolves.toBeUndefined();
    await expect(remoteSecureP).resolves.toBeUndefined();
    const clientSocket = await httpConnect(
      proxy.getForwardHost(),
      proxy.getForwardPort(),
      authToken,
      `${utpSocketHost}:${utpSocketPort}?nodeId=${encodeURIComponent(
        serverNodeIdEncoded,
      )}`,
    );
    expect(clientSocket).toBeInstanceOf(net.Socket);
    expect(clientSocket.remoteAddress).toBe(proxy.getForwardHost());
    expect(clientSocket.remotePort).toBe(proxy.getForwardPort());
    const { p: localClosedP, resolveP: resolveLocalClosedP } = promise<void>();
    clientSocket.on('close', () => {
      resolveLocalClosedP();
    });
    await proxy.closeConnectionForward(
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    await expect(localClosedP).resolves.toBeUndefined();
    await expect(remoteClosedP).resolves.toBeUndefined();
    expect(utpConnError).toHaveBeenCalledTimes(0);
    expect(tlsSocketError).toHaveBeenCalledTimes(0);
    expect(tlsSocketEnd).toHaveBeenCalledTimes(1);
    expect(tlsSocketClose).toHaveBeenCalledTimes(1);
    expect(tlsSocketClose).toHaveBeenCalledWith(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await proxy.stop();
  });
  test('open connection keepalive timeout', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair();
    const serverNodeId = keysUtils.publicKeyToNodeId(serverKeyPair.publicKey)!;
    const proxy = new Proxy({
      authToken,
      connKeepAliveTimeoutTime: 1000,
      connKeepAliveIntervalTime: 100,
      logger: logger.getChild('Proxy open connection keepalive timeout'),
    });
    await proxy.start({
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    const { p: remoteReadyP, resolveP: resolveRemoteReadyP } = promise<void>();
    const { p: remoteSecureP, resolveP: resolveRemoteSecureP } =
      promise<void>();
    const { p: remoteClosedP, resolveP: resolveRemoteClosedP } =
      promise<void>();
    const utpConnError = jest.fn();
    const tlsSocketError = jest.fn();
    const tlsSocketEnd = jest.fn();
    const tlsSocketClose = jest.fn();
    // This UTP server will hold the connection
    const utpSocket = UTP.createServer(async (utpConn) => {
      utpConn.on('error', (e) => {
        utpConnError(e);
      });
      const tlsSocket = new tls.TLSSocket(utpConn, await createTLSSocketConfig(serverKeyPair));
      tlsSocket.on('secure', () => {
        resolveRemoteSecureP();
      });
      tlsSocket.on('error', (e) => {
        tlsSocketError(e);
      });
      tlsSocket.on('end', () => {
        logger.debug('Reverse: receives tlsSocket ending');
        tlsSocketEnd();
        if (utpConn.destroyed) {
          logger.debug('Reverse: destroys tlsSocket');
          tlsSocket.destroy();
        } else {
          logger.debug('Reverse: responds tlsSocket ending');
          tlsSocket.end();
          tlsSocket.destroy();
        }
      });
      tlsSocket.on('close', (hadError) => {
        tlsSocketClose(hadError);
        resolveRemoteClosedP();
      });
      await send(networkUtils.pingBuffer);
      const punchInterval = setInterval(async () => {
        await send(networkUtils.pingBuffer);
      }, 1000);
      await remoteReadyP;
      clearInterval(punchInterval);
    });
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        // Do nothing here
        // To trigger keep alive timeout
      } else if (msg.type === 'pong') {
        resolveRemoteReadyP();
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, localHost);
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(proxy.getConnectionForwardCount()).toBe(0);
    await proxy.openConnectionForward(
      [serverNodeId],
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    await expect(remoteReadyP).resolves.toBeUndefined();
    await expect(remoteSecureP).resolves.toBeUndefined();
    expect(proxy.getConnectionForwardCount()).toBe(1);
    // When ErrorConnectionTimeout is triggered
    // This results in the destruction of the socket
    await expect(remoteClosedP).resolves.toBeUndefined();
    expect(utpConnError).toHaveBeenCalledTimes(0);
    expect(tlsSocketError).toHaveBeenCalledTimes(0);
    expect(tlsSocketEnd).toHaveBeenCalledTimes(1);
    expect(tlsSocketClose).toHaveBeenCalledTimes(1);
    expect(tlsSocketClose).toHaveBeenCalledWith(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await proxy.stop();
  });
  test('HTTP CONNECT keepalive timeout', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair();
    const serverNodeId = keysUtils.publicKeyToNodeId(serverKeyPair.publicKey)!;
    const serverNodeIdEncoded = nodesUtils.encodeNodeId(serverNodeId);
    const proxy = new Proxy({
      authToken,
      connKeepAliveTimeoutTime: 1000,
      connKeepAliveIntervalTime: 100,
      logger: logger.getChild('Proxy HTTP CONNECT keepalive timeout'),
    });
    await proxy.start({
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    const { p: remoteReadyP, resolveP: resolveRemoteReadyP } = promise<void>();
    const { p: remoteSecureP, resolveP: resolveRemoteSecureP } =
      promise<void>();
    const { p: remoteClosedP, resolveP: resolveRemoteClosedP } =
      promise<void>();
    const utpConnError = jest.fn();
    const tlsSocketError = jest.fn();
    const tlsSocketEnd = jest.fn();
    const tlsSocketClose = jest.fn();
    // This UTP server will hold the connection
    const utpSocket = UTP.createServer(async (utpConn) => {
      utpConn.on('error', (e) => {
        utpConnError(e);
      });
      const tlsSocket = new tls.TLSSocket(utpConn, await createTLSSocketConfig(serverKeyPair));
      tlsSocket.on('secure', () => {
        resolveRemoteSecureP();
      });
      tlsSocket.on('error', (e) => {
        tlsSocketError(e);
      });
      tlsSocket.on('end', () => {
        logger.debug('Reverse: receives tlsSocket ending');
        tlsSocketEnd();
        if (utpConn.destroyed) {
          logger.debug('Reverse: destroys tlsSocket');
          tlsSocket.destroy();
        } else {
          logger.debug('Reverse: responds tlsSocket ending');
          tlsSocket.end();
          tlsSocket.destroy();
        }
      });
      tlsSocket.on('close', (hadError) => {
        tlsSocketClose(hadError);
        resolveRemoteClosedP();
      });
      await send(networkUtils.pingBuffer);
      const punchInterval = setInterval(async () => {
        await send(networkUtils.pingBuffer);
      }, 1000);
      await remoteReadyP;
      clearInterval(punchInterval);
    });
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        // Do nothing here
        // To trigger keep alive timeout
      } else if (msg.type === 'pong') {
        resolveRemoteReadyP();
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, localHost);
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(proxy.getConnectionForwardCount()).toBe(0);
    const clientSocket = await httpConnect(
      proxy.getForwardHost(),
      proxy.getForwardPort(),
      authToken,
      `${utpSocketHost}:${utpSocketPort}?nodeId=${encodeURIComponent(
        serverNodeIdEncoded,
      )}`,
    );
    await expect(remoteReadyP).resolves.toBeUndefined();
    await expect(remoteSecureP).resolves.toBeUndefined();
    expect(clientSocket).toBeInstanceOf(net.Socket);
    expect(clientSocket.remoteAddress).toBe(proxy.getForwardHost());
    expect(clientSocket.remotePort).toBe(proxy.getForwardPort());
    const { p: localClosedP, resolveP: resolveLocalClosedP } = promise<void>();
    clientSocket.on('close', () => {
      resolveLocalClosedP();
    });
    expect(proxy.getConnectionForwardCount()).toBe(1);
    // When ErrorConnectionTimeout is triggered
    // This results in the destruction of the socket
    await expect(localClosedP).resolves.toBeUndefined();
    await expect(remoteClosedP).resolves.toBeUndefined();
    // Connection count should reach 0 eventually
    await expect(
      poll(
        async () => {
          return proxy.getConnectionForwardCount();
        },
        (_, result) => {
          return result === 0;
        },
        100,
      ),
    ).resolves.toBe(0);
    expect(utpConnError).toHaveBeenCalledTimes(0);
    expect(tlsSocketError).toHaveBeenCalledTimes(0);
    expect(tlsSocketEnd).toHaveBeenCalledTimes(1);
    expect(tlsSocketClose).toHaveBeenCalledTimes(1);
    expect(tlsSocketClose).toHaveBeenCalledWith(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await proxy.stop();
  });
  test('stopping the proxy with open forward connections', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair();
    const serverNodeId = keysUtils.publicKeyToNodeId(serverKeyPair.publicKey)!;
    const proxy = new Proxy({
      authToken,
      logger,
    });
    await proxy.start({
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    const { p: remoteReadyP, resolveP: resolveRemoteReadyP } = promise<void>();
    const { p: remoteSecureP, resolveP: resolveRemoteSecureP } =
      promise<void>();
    const { p: remoteClosedP, resolveP: resolveRemoteClosedP } =
      promise<void>();
    const utpSocket = UTP.createServer(async (utpConn) => {
      const tlsSocket = new tls.TLSSocket(utpConn, await createTLSSocketConfig(serverKeyPair));
      tlsSocket.on('secure', () => {
        resolveRemoteSecureP();
      });
      tlsSocket.on('close', () => {
        resolveRemoteClosedP();
      });
      tlsSocket.on('end', () => {
        logger.debug('Reverse: receives tlsSocket ending');
        if (utpConn.destroyed) {
          logger.debug('Reverse: destroys tlsSocket');
          tlsSocket.destroy();
        } else {
          logger.debug('Reverse: responds tlsSocket ending');
          tlsSocket.end();
          tlsSocket.destroy();
        }
      });
      await send(networkUtils.pingBuffer);
      const punchInterval = setInterval(async () => {
        await send(networkUtils.pingBuffer);
      }, 1000);
      await remoteReadyP;
      clearInterval(punchInterval);
    });
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        await send(networkUtils.pongBuffer);
      } else if (msg.type === 'pong') {
        resolveRemoteReadyP();
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, localHost);
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(proxy.getConnectionForwardCount()).toBe(0);
    await proxy.openConnectionForward(
      [serverNodeId],
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    await expect(remoteReadyP).resolves.toBeUndefined();
    await expect(remoteSecureP).resolves.toBeUndefined();
    expect(proxy.getConnectionForwardCount()).toBe(1);
    await proxy.stop();
    expect(proxy.getConnectionForwardCount()).toBe(0);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await expect(remoteClosedP).resolves.toBeUndefined();
  });
  test('open connection to multiple servers', async () => {
    // First server keys
    const serverKeyPair1 = await keysUtils.generateKeyPair();
    const serverNodeId1 = keysUtils.publicKeyToNodeId(serverKeyPair1.publicKey)!;
    // Second server keys
    const serverKeyPair2 = await keysUtils.generateKeyPair();
    const serverNodeId2 = keysUtils.publicKeyToNodeId(serverKeyPair2.publicKey)!;
    const proxy = new Proxy({
      authToken,
      logger,
    });
    await proxy.start({
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
      serverHost: localHost,
      serverPort: port,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    // First signals
    const { p: remoteReadyP1, resolveP: resolveRemoteReadyP1 } =
      promise<void>();
    const { p: remoteClosedP1, resolveP: resolveRemoteClosedP1 } =
      promise<void>();
    // Second signals
    const { p: remoteReadyP2, resolveP: resolveRemoteReadyP2 } =
      promise<void>();
    const { p: remoteClosedP2, resolveP: resolveRemoteClosedP2 } =
      promise<void>();
    const utpSocket1 = UTP.createServer(async (utpConn) => {
      const tlsSocket = new tls.TLSSocket(utpConn, await createTLSSocketConfig(serverKeyPair1));
      tlsSocket.on('close', () => {
        resolveRemoteClosedP1();
      });
      tlsSocket.on('end', () => {
        if (utpConn.destroyed) {
          tlsSocket.destroy();
        } else {
          tlsSocket.end();
          tlsSocket.destroy();
        }
      });
      await send1(networkUtils.pingBuffer);
      const punchInterval = setInterval(async () => {
        await send1(networkUtils.pingBuffer);
      }, 1000);
      await remoteReadyP1;
      clearInterval(punchInterval);
    });
    const handleMessage1 = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        await send1(networkUtils.pongBuffer);
      } else if (msg.type === 'pong') {
        resolveRemoteReadyP1();
      }
    };
    utpSocket1.on('message', handleMessage1);
    const send1 = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket1.send).bind(utpSocket1);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketListen1 = promisify(utpSocket1.listen).bind(utpSocket1);
    await utpSocketListen1(0, localHost);
    const utpSocketHost1 = utpSocket1.address().address;
    const utpSocketPort1 = utpSocket1.address().port;
    const utpSocket2 = UTP.createServer(async (utpConn) => {
      const tlsSocket = new tls.TLSSocket(utpConn, await createTLSSocketConfig(serverKeyPair2));
      tlsSocket.on('close', () => {
        resolveRemoteClosedP2();
      });
      tlsSocket.on('end', () => {
        if (utpConn.destroyed) {
          tlsSocket.destroy();
        } else {
          tlsSocket.end();
          tlsSocket.destroy();
        }
      });
      await send2(networkUtils.pingBuffer);
      const punchInterval = setInterval(async () => {
        await send2(networkUtils.pingBuffer);
      }, 2000);
      await remoteReadyP2;
      clearInterval(punchInterval);
    });
    const handleMessage2 = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        await send2(networkUtils.pongBuffer);
      } else if (msg.type === 'pong') {
        resolveRemoteReadyP2();
      }
    };
    utpSocket2.on('message', handleMessage2);
    const send2 = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket2.send).bind(utpSocket2);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketListen2 = promisify(utpSocket2.listen).bind(utpSocket2);
    await utpSocketListen2(0, localHost);
    const utpSocketHost2 = utpSocket2.address().address;
    const utpSocketPort2 = utpSocket2.address().port;
    expect(proxy.getConnectionForwardCount()).toBe(0);
    await proxy.openConnectionForward(
      [serverNodeId1],
      utpSocketHost1 as Host,
      utpSocketPort1 as Port,
    );
    await proxy.openConnectionForward(
      [serverNodeId2],
      utpSocketHost2 as Host,
      utpSocketPort2 as Port,
    );
    expect(proxy.getConnectionForwardCount()).toBe(2);
    await expect(remoteReadyP1).resolves.toBeUndefined();
    await expect(remoteReadyP2).resolves.toBeUndefined();
    await proxy.closeConnectionForward(
      utpSocketHost1 as Host,
      utpSocketPort1 as Port,
    );
    await proxy.closeConnectionForward(
      utpSocketHost2 as Host,
      utpSocketPort2 as Port,
    );
    expect(proxy.getConnectionForwardCount()).toBe(0);
    await expect(remoteClosedP1).resolves.toBeUndefined();
    await expect(remoteClosedP2).resolves.toBeUndefined();
    utpSocket1.off('message', handleMessage1);
    utpSocket1.close();
    utpSocket1.unref();
    utpSocket2.off('message', handleMessage2);
    utpSocket2.close();
    utpSocket2.unref();
    await proxy.stop();
  });
  test('open connection to port 0 fails', async () => {
    const proxy = new Proxy({
      logger: logger.getChild('Proxy port 0'),
      authToken: '',
    });
    const {
      serverListen,
      serverClose,
      serverConnP,
      serverConnClosedP,
      serverHost,
      serverPort,
    } = tcpServer();
    await serverListen(0);
    await proxy.start({
      serverHost: serverHost(),
      serverPort: serverPort(),
      proxyHost: localHost,
      forwardHost: localHost,
      tlsConfig,
    });
    await expect(
      proxy.openConnectionReverse(localHost, 0 as Port),
    ).rejects.toThrow(networkErrors.ErrorConnectionStart);
    await expect(serverConnP).resolves.toBeUndefined();
    await expect(serverConnClosedP).resolves.toBeUndefined();
    await proxy.stop();
    await serverClose();
  });
  test('open connection timeout due to lack of ready signal', async () => {
    const proxy = new Proxy({
      logger: logger,
      authToken: '',
    });
    const {
      serverListen,
      serverClose,
      serverConnP,
      serverConnClosedP,
      serverHost,
      serverPort,
    } = tcpServer();
    await serverListen(0);
    await proxy.start({
      serverHost: serverHost(),
      serverPort: serverPort(),
      proxyHost: localHost,
      forwardHost: localHost,
      tlsConfig,
    });
    // This UTP client will just hang and not respond
    const utpSocket = UTP();
    const utpSocketBind = promisify(utpSocket.bind).bind(utpSocket);
    await utpSocketBind(0, localHost);
    const utpSocketPort = utpSocket.address().port;
    const timer = new Timer({ delay: 2000 });
    await expect(
      proxy.openConnectionReverse(localHost, utpSocketPort as Port, { timer }),
    ).rejects.toThrow(networkErrors.ErrorConnectionStartTimeout);
    timer.cancel();
    await expect(serverConnP).resolves.toBeUndefined();
    await expect(serverConnClosedP).resolves.toBeUndefined();
    utpSocket.close();
    utpSocket.unref();
    await proxy.stop();
    await serverClose();
  });
  test('open connection success', async () => {
    const proxy = new Proxy({
      logger: logger,
      authToken: '',
    });
    const {
      serverListen,
      serverClose,
      serverConnP,
      serverConnClosedP,
      serverHost,
      serverPort,
    } = tcpServer();
    await serverListen(0);
    await proxy.start({
      serverHost: serverHost(),
      serverPort: serverPort(),
      proxyHost: localHost,
      forwardHost: localHost,

      tlsConfig,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    const utpSocket = UTP();
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        await send(networkUtils.pongBuffer);
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketBind = promisify(utpSocket.bind).bind(utpSocket);
    await utpSocketBind(0, localHost);
    const utpSocketPort = utpSocket.address().port;
    await proxy.openConnectionReverse(localHost, utpSocketPort as Port);
    expect(proxy.getConnectionReverseCount()).toBe(1);
    await proxy.closeConnectionReverse(localHost, utpSocketPort as Port);
    await expect(serverConnP).resolves.toBeUndefined();
    await expect(serverConnClosedP).resolves.toBeUndefined();
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await proxy.stop();
    await serverClose();
  });
  test('open connection to multiple clients', async () => {
    const proxy = new Proxy({
      logger: logger,
      authToken: '',
    });
    const {
      serverListen,
      serverClose,
      serverConnP,
      serverConnClosedP,
      serverHost,
      serverPort,
    } = tcpServer();
    await serverListen(0);
    await proxy.start({
      serverHost: serverHost(),
      serverPort: serverPort(),
      proxyHost: localHost,
      forwardHost: localHost,

      tlsConfig,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    // First client
    const utpSocket1 = UTP();
    const handleMessage1 = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        await send1(networkUtils.pongBuffer);
      }
    };
    utpSocket1.on('message', handleMessage1);
    const send1 = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket1.send).bind(utpSocket1);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketBind1 = promisify(utpSocket1.bind).bind(utpSocket1);
    await utpSocketBind1(0, localHost);
    const utpSocketPort1 = utpSocket1.address().port;
    // Second client
    const utpSocket2 = UTP();
    const handleMessage2 = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        await send2(networkUtils.pongBuffer);
      }
    };
    utpSocket2.on('message', handleMessage2);
    const send2 = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket2.send).bind(utpSocket2);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketBind2 = promisify(utpSocket2.bind).bind(utpSocket2);
    await utpSocketBind2(0, localHost);
    const utpSocketPort2 = utpSocket2.address().port;
    await proxy.openConnectionReverse(localHost, utpSocketPort1 as Port);
    await proxy.openConnectionReverse(localHost, utpSocketPort2 as Port);
    expect(proxy.getConnectionReverseCount()).toBe(2);
    await proxy.closeConnectionReverse(localHost, utpSocketPort1 as Port);
    await proxy.closeConnectionReverse(localHost, utpSocketPort2 as Port);
    expect(proxy.getConnectionReverseCount()).toBe(0);
    await expect(serverConnP).resolves.toBeUndefined();
    await expect(serverConnClosedP).resolves.toBeUndefined();
    utpSocket1.off('message', handleMessage1);
    utpSocket1.close();
    utpSocket1.unref();
    utpSocket2.off('message', handleMessage2);
    utpSocket2.close();
    utpSocket2.unref();
    await proxy.stop();
    await serverClose();
  });
  test('closed connection due to ending server', async () => {
    const proxy = new Proxy({
      logger: logger,
      authToken: '',
    });
    // This server will force end
    const {
      serverListen,
      serverClose,
      serverConnP,
      serverConnEndP,
      serverConnClosedP,
      serverHost,
      serverPort,
    } = tcpServer(true);
    await serverListen(0);
    await proxy.start({
      serverHost: serverHost(),
      serverPort: serverPort(),
      proxyHost: localHost,
      forwardHost: localHost,

      tlsConfig,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    const utpSocket = UTP();
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        await send(networkUtils.pongBuffer);
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketBind = promisify(utpSocket.bind).bind(utpSocket);
    await utpSocketBind(0, localHost);
    const utpSocketPort = utpSocket.address().port;
    await proxy.openConnectionReverse(localHost, utpSocketPort as Port);
    expect(proxy.getConnectionReverseCount()).toBe(1);
    await expect(serverConnP).resolves.toBeUndefined();
    // The server receives the end confirmation for graceful exit
    await expect(serverConnEndP).resolves.toBeUndefined();
    // The server is closed
    await expect(serverConnClosedP).resolves.toBeUndefined();
    // The rev proxy won't have this connection
    expect(proxy.getConnectionReverseCount()).toBe(0);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await proxy.stop();
    await serverClose();
  });
  test('connect timeout due to hanging client', async () => {
    // `connConnectTime` will affect ErrorConnectionComposeTimeout
    // `connKeepAliveTimeoutTime` will affect ErrorConnectionTimeout which is needed
    // This should trigger both ErrorConnectionComposeTimeout and ErrorConnectionTimeout
    // ErrorConnectionComposeTimeout results in a failed composition
    // ErrorConnectionTimeout results in stopping the connection
    // Failing to connect to the open connection doesn't
    // automatically mean the connection is destroyed
    const proxy = new Proxy({
      connConnectTime: 3000,
      connKeepAliveTimeoutTime: 3000,
      logger: logger,
      authToken: '',
    });
    const {
      serverListen,
      serverClose,
      serverConnP,
      serverConnEndP,
      serverConnClosedP,
      serverHost,
      serverPort,
    } = tcpServer();
    await serverListen(0);
    await proxy.start({
      serverHost: serverHost(),
      serverPort: serverPort(),
      forwardHost: localHost,
      proxyHost: localHost,
      tlsConfig,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    const utpSocket = UTP();
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        await send(networkUtils.pongBuffer);
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    const utpSocketBind = promisify(utpSocket.bind).bind(utpSocket);
    await utpSocketBind(0, localHost);
    const utpSocketPort = utpSocket.address().port;
    await proxy.openConnectionReverse(localHost, utpSocketPort as Port);
    expect(proxy.getConnectionReverseCount()).toBe(1);
    // This retries multiple times
    // This will eventually fail and trigger a ErrorConnectionComposeTimeout
    const utpConn = utpSocket.connect(proxyPort, proxyHost);
    utpConn.setTimeout(2000, () => {
      utpConn.emit('error', new Error('TIMED OUT'));
    });
    const { p: utpConnClosedP, resolveP: resolveUtpConnClosedP } =
      promise<void>();
    const { p: utpConnErrorP, rejectP: rejectUtpConnErrorP } = promise<void>();
    utpConn.on('error', (e) => {
      rejectUtpConnErrorP(e);
      utpConn.destroy();
    });
    utpConn.on('close', () => {
      resolveUtpConnClosedP();
    });
    // The client connection times out
    await expect(utpConnErrorP).rejects.toThrow(/TIMED OUT/);
    await utpConnClosedP;
    await expect(serverConnP).resolves.toBeUndefined();
    await expect(serverConnEndP).resolves.toBeUndefined();
    await expect(serverConnClosedP).resolves.toBeUndefined();
    // Connection count should reach 0 eventually
    await expect(
      poll(
        async () => {
          return proxy.getConnectionReverseCount();
        },
        (_, result) => {
          return result === 0;
        },
        100,
      ),
    ).resolves.toBe(0);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await proxy.stop();
    await serverClose();
  });
  test('connect fails due to missing client certificates', async () => {
    // `connKeepAliveTimeoutTime` will affect ErrorConnectionTimeout
    // Note that failing to connect to the open connection
    // doesn't automatically mean the connection is destroyed
    // reverse proxy keeps the connection alive until `connKeepAliveTimeoutTime` expires
    const proxy = new Proxy({
      connKeepAliveTimeoutTime: 2000,
      logger: logger,
      authToken: '',
    });
    const {
      serverListen,
      serverClose,
      serverConnP,
      serverConnEndP,
      serverConnClosedP,
      serverHost,
      serverPort,
    } = tcpServer();
    await serverListen(0);
    await proxy.start({
      serverHost: serverHost(),
      serverPort: serverPort(),
      tlsConfig,
      proxyHost: localHost,
      forwardHost: localHost,
    });
    const externalHost = proxy.getProxyHost();
    const externalPort = proxy.getProxyPort();
    const utpSocket = UTP();
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        await send(networkUtils.pongBuffer);
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, externalPort, externalHost);
    };
    const utpSocketBind = promisify(utpSocket.bind).bind(utpSocket);
    await utpSocketBind(0, localHost);
    const utpSocketPort = utpSocket.address().port;
    await proxy.openConnectionReverse(localHost, utpSocketPort as Port);
    expect(proxy.getConnectionReverseCount()).toBe(1);
    const { p: tlsSocketClosedP, resolveP: resolveTlsSocketClosedP } =
      promise<void>();
    const utpConn = utpSocket.connect(externalPort, externalHost);
    // This will send an empty certificate chain
    // Expect `ErrorCertChainEmpty`
    let secureConnection = false;
    const tlsSocket = tls.connect(
      {
        socket: utpConn,
        rejectUnauthorized: false,
      },
      () => {
        secureConnection = true;
      },
    );
    let errored = false;
    tlsSocket.on('error', () => {
      errored = true;
      tlsSocket.destroy();
    });
    tlsSocket.on('end', () => {
      if (utpConn.destroyed) {
        tlsSocket.destroy();
      } else {
        tlsSocket.end();
        tlsSocket.destroy();
      }
    });
    tlsSocket.on('close', () => {
      resolveTlsSocketClosedP();
    });
    // Reverse proxy will close the connection
    await tlsSocketClosedP;
    // We won't receive an error because it will be closed
    expect(errored).toBe(false);
    expect(secureConnection).toBe(true);
    await expect(serverConnP).resolves.toBeUndefined();
    // Eventually `ErrorConnectionTimeout` occurs, and these will be gracefully closed
    await expect(serverConnEndP).resolves.toBeUndefined();
    await expect(serverConnClosedP).resolves.toBeUndefined();
    // Connection count should reach 0 eventually
    await expect(
      poll(
        async () => {
          return proxy.getConnectionReverseCount();
        },
        (_, result) => {
          return result === 0;
        },
        100,
      ),
    ).resolves.toBe(0);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await proxy.stop();
    await serverClose();
  });
  test('connect success', async () => {
    const clientKeyPair = await keysUtils.generateKeyPair();
    const clientKeyPairPem = keysUtils.keyPairToPEM(clientKeyPair);
    const clientCert = (await keysUtils.generateCertificate({
      certId: generateCertId(),
      duration: 31536000,
      issuerPrivateKey: clientKeyPair.privateKey,
      subjectKeyPair: { privateKey: clientKeyPair.privateKey, publicKey: clientKeyPair.publicKey }
    }));
    const clientCertPem = keysUtils.certToPEM(clientCert);
    const {
      serverListen,
      serverClose,
      serverConnP,
      serverConnEndP,
      serverConnClosedP,
      serverHost,
      serverPort,
    } = tcpServer();
    await serverListen(0, localHost);
    const proxy = new Proxy({
      logger: logger,
      authToken: '',
    });
    await proxy.start({
      serverHost: serverHost(),
      serverPort: serverPort(),
      proxyHost: localHost,
      forwardHost: localHost,
      tlsConfig,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    const { p: clientReadyP, resolveP: resolveClientReadyP } = promise<void>();
    const { p: clientSecureConnectP, resolveP: resolveClientSecureConnectP } =
      promise<void>();
    const { p: clientCloseP, resolveP: resolveClientCloseP } = promise<void>();
    const utpSocket = UTP({ allowHalfOpen: true });
    const utpSocketBind = promisify(utpSocket.bind).bind(utpSocket);
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        resolveClientReadyP();
        await send(networkUtils.pongBuffer);
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    await utpSocketBind(0, localHost);
    const utpSocketPort = utpSocket.address().port;
    await proxy.openConnectionReverse(localHost, utpSocketPort as Port);
    const utpConn = utpSocket.connect(proxyPort, proxyHost);
    const tlsSocket = tls.connect(
      {
        key: Buffer.from(clientKeyPairPem.privateKey, 'ascii'),
        cert: Buffer.from(clientCertPem, 'ascii'),
        socket: utpConn,
        rejectUnauthorized: false,
      },
      () => {
        resolveClientSecureConnectP();
      },
    );
    let tlsSocketEnded = false;
    tlsSocket.on('end', () => {
      tlsSocketEnded = true;
      if (utpConn.destroyed) {
        tlsSocket.destroy();
      } else {
        tlsSocket.end();
        tlsSocket.destroy();
      }
    });
    tlsSocket.on('close', () => {
      resolveClientCloseP();
    });
    await send(networkUtils.pingBuffer);
    expect(proxy.getConnectionReverseCount()).toBe(1);
    await clientReadyP;
    await clientSecureConnectP;
    await serverConnP;
    await proxy.closeConnectionReverse(localHost, utpSocketPort as Port);
    expect(proxy.getConnectionReverseCount()).toBe(0);
    await clientCloseP;
    await serverConnEndP;
    await serverConnClosedP;
    expect(tlsSocketEnded).toBe(true);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await proxy.stop();
    await serverClose();
  });
  test('stopping the proxy with open reverse connections', async () => {
    const clientKeyPair = await keysUtils.generateKeyPair();
    const clientKeyPairPem = keysUtils.keyPairToPEM(clientKeyPair);
    const clientCert = (await keysUtils.generateCertificate({
      certId: generateCertId(),
      duration: 31536000,
      issuerPrivateKey: clientKeyPair.privateKey,
      subjectKeyPair: { privateKey: clientKeyPair.privateKey, publicKey: clientKeyPair.publicKey }
    }));
    const clientCertPem = keysUtils.certToPEM(clientCert);
    const {
      serverListen,
      serverClose,
      serverConnP,
      serverConnEndP,
      serverConnClosedP,
      serverHost,
      serverPort,
    } = tcpServer();
    await serverListen(0, localHost);
    const proxy = new Proxy({
      logger: logger,
      authToken: '',
    });
    await proxy.start({
      serverHost: serverHost(),
      serverPort: serverPort(),
      proxyHost: localHost,
      tlsConfig,
    });
    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    const { p: clientReadyP, resolveP: resolveClientReadyP } = promise<void>();
    const { p: clientSecureConnectP, resolveP: resolveClientSecureConnectP } =
      promise<void>();
    const { p: clientCloseP, resolveP: resolveClientCloseP } = promise<void>();
    const utpSocket = UTP({ allowHalfOpen: true });
    const utpSocketBind = promisify(utpSocket.bind).bind(utpSocket);
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        resolveClientReadyP();
        await send(networkUtils.pongBuffer);
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    await utpSocketBind(0, localHost);
    const utpSocketPort = utpSocket.address().port;
    await proxy.openConnectionReverse(localHost, utpSocketPort as Port);
    const utpConn = utpSocket.connect(proxyPort, proxyHost);
    const tlsSocket = tls.connect(
      {
        key: Buffer.from(clientKeyPairPem.privateKey, 'ascii'),
        cert: Buffer.from(clientCertPem, 'ascii'),
        socket: utpConn,
        rejectUnauthorized: false,
      },
      () => {
        resolveClientSecureConnectP();
      },
    );
    let tlsSocketEnded = false;
    tlsSocket.on('end', () => {
      tlsSocketEnded = true;
      if (utpConn.destroyed) {
        tlsSocket.destroy();
      } else {
        tlsSocket.end();
        tlsSocket.destroy();
      }
    });
    tlsSocket.on('close', () => {
      resolveClientCloseP();
    });
    await send(networkUtils.pingBuffer);
    expect(proxy.getConnectionReverseCount()).toBe(1);
    await clientReadyP;
    await clientSecureConnectP;
    await serverConnP;
    // Stopping with 1 active connection (not just opened)
    await proxy.stop();
    expect(proxy.getConnectionReverseCount()).toBe(0);
    await clientCloseP;
    await expect(serverConnEndP).resolves.toBeUndefined();
    await expect(serverConnClosedP).resolves.toBeUndefined();
    expect(tlsSocketEnded).toBe(true);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await serverClose();
  });
  test('connectionEstablishedCallback is called when a ReverseConnection is established', async () => {
    const clientKeyPair = await keysUtils.generateKeyPair();
    const clientKeyPairPem = keysUtils.keyPairToPEM(clientKeyPair);
    const clientCert = (await keysUtils.generateCertificate({
      certId: generateCertId(),
      duration: 31536000,
      issuerPrivateKey: clientKeyPair.privateKey,
      subjectKeyPair: { privateKey: clientKeyPair.privateKey, publicKey: clientKeyPair.publicKey }
    }));
    const clientCertPem = keysUtils.certToPEM(clientCert);
    const {
      serverListen,
      serverClose,
      serverConnP,
      serverConnEndP,
      serverConnClosedP,
      serverHost,
      serverPort,
    } = tcpServer();
    await serverListen(0, localHost);
    const clientNodeId = keysUtils.certNodeId(clientCert)!;
    let callbackData: ConnectionData | undefined;
    const proxy = new Proxy({
      logger: logger,
      authToken: '',
      connectionEstablishedCallback: (data) => {
        callbackData = data;
      },
    });
    await proxy.start({
      serverHost: serverHost(),
      serverPort: serverPort(),
      proxyHost: localHost,
      tlsConfig,
    });

    const proxyHost = proxy.getProxyHost();
    const proxyPort = proxy.getProxyPort();
    const { p: clientReadyP, resolveP: resolveClientReadyP } = promise<void>();
    const { p: clientSecureConnectP, resolveP: resolveClientSecureConnectP } =
      promise<void>();
    const { p: clientCloseP, resolveP: resolveClientCloseP } = promise<void>();
    const utpSocket = UTP({ allowHalfOpen: true });
    const utpSocketBind = promisify(utpSocket.bind).bind(utpSocket);
    const handleMessage = async (data: Buffer) => {
      const msg = networkUtils.unserializeNetworkMessage(data);
      if (msg.type === 'ping') {
        resolveClientReadyP();
        await send(networkUtils.pongBuffer);
      }
    };
    utpSocket.on('message', handleMessage);
    const send = async (data: Buffer) => {
      const utpSocketSend = promisify(utpSocket.send).bind(utpSocket);
      await utpSocketSend(data, 0, data.byteLength, proxyPort, proxyHost);
    };
    await utpSocketBind(0, localHost);
    const utpSocketPort = utpSocket.address().port;
    await proxy.openConnectionReverse(localHost, utpSocketPort as Port);
    const utpConn = utpSocket.connect(proxyPort, proxyHost);
    const tlsSocket = tls.connect(
      {
        key: Buffer.from(clientKeyPairPem.privateKey, 'ascii'),
        cert: Buffer.from(clientCertPem, 'ascii'),
        socket: utpConn,
        rejectUnauthorized: false,
      },
      () => {
        resolveClientSecureConnectP();
      },
    );
    let tlsSocketEnded = false;
    tlsSocket.on('end', () => {
      tlsSocketEnded = true;
      if (utpConn.destroyed) {
        tlsSocket.destroy();
      } else {
        tlsSocket.end();
        tlsSocket.destroy();
      }
    });
    tlsSocket.on('close', () => {
      resolveClientCloseP();
    });
    await send(networkUtils.pingBuffer);
    expect(proxy.getConnectionReverseCount()).toBe(1);
    await clientReadyP;
    await clientSecureConnectP;
    await serverConnP;
    await proxy.closeConnectionReverse(localHost, utpSocketPort as Port);
    expect(proxy.getConnectionReverseCount()).toBe(0);
    await clientCloseP;
    await serverConnEndP;
    await serverConnClosedP;
    expect(tlsSocketEnded).toBe(true);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await proxy.stop();
    await serverClose();

    // Checking callback data
    expect(callbackData?.remoteNodeId.equals(clientNodeId)).toBe(true);
    expect(callbackData?.remoteHost).toEqual(localHost);
    expect(callbackData?.remotePort).toEqual(utpSocketPort);
    expect(callbackData?.type).toEqual('reverse');
  });
});
