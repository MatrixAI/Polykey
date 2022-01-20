import type { Socket } from 'net';
import type { KeyPairPem } from '@/keys/types';
import type { Host, Port } from '@/network/types';
import http from 'http';
import net from 'net';
import tls from 'tls';
import UTP from 'utp-native';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import {
  ForwardProxy,
  utils as networkUtils,
  errors as networkErrors,
} from '@/network';
import * as keysUtils from '@/keys/utils';
import { promisify, promise, timerStart, timerStop, poll } from '@/utils';
import { utils as nodesUtils } from '@/nodes';
import * as testUtils from '../utils';

/**
 * Mock HTTP Connect Request
 * This is what clients to the ForwardProxy should be doing
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
  const socket = await new Promise<Socket>((resolve, reject) => {
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
  return socket;
}

describe(ForwardProxy.name, () => {
  const logger = new Logger(`${ForwardProxy.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const nodeIdABC = testUtils.generateRandomNodeId();
  const nodeIdABCEncoded = nodesUtils.encodeNodeId(nodeIdABC);
  const nodeIdSome = testUtils.generateRandomNodeId();
  const nodeIdSomeEncoded = nodesUtils.encodeNodeId(nodeIdSome);
  const nodeIdRandom = testUtils.generateRandomNodeId();
  const authToken = 'abc123';
  let keyPairPem: KeyPairPem;
  let certPem: string;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    keyPairPem = keysUtils.keyPairToPem(globalKeyPair);
    const cert = keysUtils.generateCertificate(
      globalKeyPair.publicKey,
      globalKeyPair.privateKey,
      globalKeyPair.privateKey,
      86400,
    );
    certPem = keysUtils.certToPem(cert);
  });
  test('forward proxy readiness', async () => {
    const fwdProxy = new ForwardProxy({
      authToken,
      logger,
    });
    // Should be a noop (already stopped)
    await fwdProxy.stop();
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    expect(typeof fwdProxy.getProxyHost()).toBe('string');
    expect(typeof fwdProxy.getProxyPort()).toBe('number');
    expect(fwdProxy.getProxyPort()).toBeGreaterThan(0);
    expect(typeof fwdProxy.getEgressHost()).toBe('string');
    expect(typeof fwdProxy.getEgressPort()).toBe('number');
    expect(fwdProxy.getEgressPort()).toBeGreaterThan(0);
    expect(fwdProxy.getConnectionCount()).toBe(0);
    // Should be a noop (already started)
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    await fwdProxy.stop();
    expect(() => {
      fwdProxy.getProxyHost();
    }).toThrow(networkErrors.ErrorForwardProxyNotRunning);
    await expect(async () => {
      await fwdProxy.closeConnection('::1' as Host, 1 as Port);
    }).rejects.toThrow(networkErrors.ErrorForwardProxyNotRunning);
    // Start it again
    await fwdProxy.start({
      proxyHost: '::1' as Host,
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    expect(fwdProxy.getProxyHost()).toBe('::1');
    await fwdProxy.stop();
  });
  test('HTTP CONNECT bad request failures to the forward proxy', async () => {
    // The forward proxy will emit error logs when this occurs
    // In production these connect errors should never happen
    const fwdProxy = new ForwardProxy({
      authToken,
      logger: logger.getChild('ForwardProxy CONNECT bad request'),
    });
    await fwdProxy.start({
      proxyHost: '::1' as Host,
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    // Incorrect auth token
    await expect(() =>
      httpConnect(
        fwdProxy.getProxyHost(),
        fwdProxy.getProxyPort(),
        'incorrect auth token',
        `127.0.0.1:80?nodeId=${encodeURIComponent(nodeIdSomeEncoded)}`,
      ),
    ).rejects.toThrow('407');
    // No node id
    await expect(() =>
      httpConnect(
        fwdProxy.getProxyHost(),
        fwdProxy.getProxyPort(),
        authToken,
        '127.0.0.1:80',
      ),
    ).rejects.toThrow('400');
    // Missing target
    await expect(() =>
      httpConnect(
        fwdProxy.getProxyHost(),
        fwdProxy.getProxyPort(),
        authToken,
        `?nodeId=${encodeURIComponent(nodeIdSomeEncoded)}`,
      ),
    ).rejects.toThrow('400');
    await fwdProxy.stop();
  });
  test('connection to port 0 fails', async () => {
    const fwdProxy = new ForwardProxy({
      authToken,
      logger: logger.getChild('ForwardProxy port 0'),
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    // Cannot open connection to port 0
    await expect(() =>
      fwdProxy.openConnection(nodeIdABC, '127.0.0.1' as Host, 0 as Port),
    ).rejects.toThrow(networkErrors.ErrorConnectionStart);
    await expect(() =>
      httpConnect(
        fwdProxy.getProxyHost(),
        fwdProxy.getProxyPort(),
        authToken,
        `127.0.0.1:0?nodeId=${encodeURIComponent(nodeIdABCEncoded)}`,
      ),
    ).rejects.toThrow('502');
    await fwdProxy.stop();
  });
  test('connection start timeout due to hanging remote', async () => {
    // 1 seconds to wait to establish a connection
    // Must reduce the ping interval time to 100ms
    // Also reduce the end tome to 100ms
    // So that we can test timeouts quicker
    const fwdProxy = new ForwardProxy({
      authToken,
      connConnectTime: 1000,
      connKeepAliveIntervalTime: 100,
      connEndTime: 100,
      logger: logger.getChild('ForwardProxy connection timeout'),
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    // This UTP server will just hang and not respond
    let recievedCount = 0;
    const utpSocketHang = UTP.createServer(() => {
      recievedCount++;
    });
    const utpSocketHangListen = promisify(utpSocketHang.listen).bind(
      utpSocketHang,
    );
    await utpSocketHangListen(0, '127.0.0.1');
    const utpSocketHangPort = utpSocketHang.address().port;
    await expect(() =>
      fwdProxy.openConnection(
        nodeIdABC,
        '127.0.0.1' as Host,
        utpSocketHangPort as Port,
      ),
    ).rejects.toThrow(networkErrors.ErrorConnectionStartTimeout);
    expect(recievedCount).toBe(1);
    // Can override the timer
    const timer = timerStart(2000);
    await expect(() =>
      fwdProxy.openConnection(
        nodeIdABC,
        '127.0.0.1' as Host,
        utpSocketHangPort as Port,
        timer,
      ),
    ).rejects.toThrow(networkErrors.ErrorConnectionStartTimeout);
    timerStop(timer);
    expect(recievedCount).toBe(2);
    await expect(() =>
      httpConnect(
        fwdProxy.getProxyHost(),
        fwdProxy.getProxyPort(),
        authToken,
        `127.0.0.1:${utpSocketHangPort}?nodeId=${encodeURIComponent(
          nodeIdABCEncoded,
        )}`,
      ),
    ).rejects.toThrow('504');
    expect(recievedCount).toBe(3);
    utpSocketHang.close();
    utpSocketHang.unref();
    await fwdProxy.stop();
  });
  test('connection reset due to ending remote', async () => {
    const fwdProxy = new ForwardProxy({
      authToken,
      logger: logger.getChild('ForwardProxy connection reset'),
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    // This UTP Server will immediately end and destroy
    // the connection upon receiving a connection
    let recievedCount = 0;
    const utpSocketEnd = UTP.createServer((utpConn) => {
      recievedCount++;
      utpConn.end();
      utpConn.destroy();
    });
    const utpSocketEndListen = promisify(utpSocketEnd.listen).bind(
      utpSocketEnd,
    );
    await utpSocketEndListen(0, '127.0.0.1');
    const utpSocketEndPort = utpSocketEnd.address().port;
    await expect(() =>
      fwdProxy.openConnection(
        nodeIdABC,
        '127.0.0.1' as Host,
        utpSocketEndPort as Port,
      ),
    ).rejects.toThrow(networkErrors.ErrorConnectionStart);
    expect(recievedCount).toBe(1);
    // The actual error is UTP_ECONNRESET to be precise
    await expect(() =>
      fwdProxy.openConnection(
        nodeIdABC,
        '127.0.0.1' as Host,
        utpSocketEndPort as Port,
      ),
    ).rejects.toThrow(/UTP_ECONNRESET/);
    expect(recievedCount).toBe(2);
    // 502 Bad Gateway on HTTP Connect
    await expect(() =>
      httpConnect(
        fwdProxy.getProxyHost(),
        fwdProxy.getProxyPort(),
        authToken,
        `127.0.0.1:${utpSocketEndPort}?nodeId=${encodeURIComponent(
          nodeIdABCEncoded,
        )}`,
      ),
    ).rejects.toThrow('502');
    expect(recievedCount).toBe(3);
    utpSocketEnd.close();
    utpSocketEnd.unref();
    await fwdProxy.stop();
  });
  test('open connection fails due to missing certificates', async () => {
    const fwdProxy = new ForwardProxy({
      authToken,
      logger: logger.getChild('ForwardProxy missing certificates'),
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const egressHost = fwdProxy.getEgressHost();
    const egressPort = fwdProxy.getEgressPort();
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
      await utpSocketSend(data, 0, data.byteLength, egressPort, egressHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, '127.0.0.1');
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(fwdProxy.getConnectionCount()).toBe(0);
    // This is a TLS handshake failure
    await expect(() =>
      fwdProxy.openConnection(
        nodeIdRandom,
        utpSocketHost as Host,
        utpSocketPort as Port,
      ),
    ).rejects.toThrow(networkErrors.ErrorConnectionStart);
    await expect(remoteClosedP).resolves.toBeUndefined();
    expect(utpConnError.mock.calls.length).toBe(0);
    // The TLS socket throw an error because there's no suitable signature algorithm
    expect(tlsSocketError.mock.calls.length).toBe(1);
    // Expect(tlsSocketError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(tlsSocketError.mock.calls[0][0]).toHaveProperty(
      'code',
      'ERR_SSL_NO_SUITABLE_SIGNATURE_ALGORITHM',
    );
    // The TLS socket end event never was emitted
    expect(tlsSocketEnd.mock.calls.length).toBe(0);
    // The TLS socket close event is emitted with error
    expect(tlsSocketClose.mock.calls.length).toBe(1);
    expect(tlsSocketClose.mock.calls[0][0]).toBe(true);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await fwdProxy.stop();
  });
  test('HTTP CONNECT fails due to missing certificates', async () => {
    const fwdProxy = new ForwardProxy({
      authToken,
      logger: logger.getChild('ForwardProxy missing certificates'),
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const egressHost = fwdProxy.getEgressHost();
    const egressPort = fwdProxy.getEgressPort();
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
      await utpSocketSend(data, 0, data.byteLength, egressPort, egressHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, '127.0.0.1');
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(fwdProxy.getConnectionCount()).toBe(0);
    // This is an TLS handshake failure
    await expect(() =>
      httpConnect(
        fwdProxy.getProxyHost(),
        fwdProxy.getProxyPort(),
        authToken,
        `${utpSocketHost}:${utpSocketPort}?nodeId=${encodeURIComponent(
          nodeIdSomeEncoded,
        )}`,
      ),
    ).rejects.toThrow('502');
    await expect(remoteClosedP).resolves.toBeUndefined();
    expect(utpConnError.mock.calls.length).toBe(0);
    // The TLS socket throw an error because there's no suitable signature algorithm
    expect(tlsSocketError.mock.calls.length).toBe(1);
    // Expect(tlsSocketError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(tlsSocketError.mock.calls[0][0]).toHaveProperty(
      'code',
      'ERR_SSL_NO_SUITABLE_SIGNATURE_ALGORITHM',
    );
    // The TLS socket end event never was emitted
    expect(tlsSocketEnd.mock.calls.length).toBe(0);
    // The TLS socket close event is emitted with error
    expect(tlsSocketClose.mock.calls.length).toBe(1);
    expect(tlsSocketClose.mock.calls[0][0]).toBe(true);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await fwdProxy.stop();
  });
  test('open connection fails due to invalid node id', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(1024);
    const serverKeyPairPem = keysUtils.keyPairToPem(serverKeyPair);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      86400,
    );
    const serverCertPem = keysUtils.certToPem(serverCert);
    const fwdProxy = new ForwardProxy({
      authToken,
      logger: logger.getChild('ForwardProxy invalid node id'),
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const egressHost = fwdProxy.getEgressHost();
    const egressPort = fwdProxy.getEgressPort();
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
        utpConnError(e);
      });
      const tlsSocket = new tls.TLSSocket(utpConn, {
        key: Buffer.from(serverKeyPairPem.privateKey, 'ascii'),
        cert: Buffer.from(serverCertPem, 'ascii'),
        isServer: true,
        requestCert: true,
        rejectUnauthorized: false,
      });
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
      await utpSocketSend(data, 0, data.byteLength, egressPort, egressHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, '127.0.0.1');
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(fwdProxy.getConnectionCount()).toBe(0);
    await expect(() =>
      fwdProxy.openConnection(
        nodeIdRandom,
        utpSocketHost as Host,
        utpSocketPort as Port,
      ),
    ).rejects.toThrow(networkErrors.ErrorCertChainUnclaimed);
    await expect(remoteReadyP).resolves.toBeUndefined();
    expect(secured).toBe(true);
    expect(fwdProxy.getConnectionCount()).toBe(0);
    await expect(remoteClosedP).resolves.toBeUndefined();
    expect(utpConnError.mock.calls.length).toBe(0);
    // No TLS socket errors this time
    // The client side figured that the node id is incorect
    expect(tlsSocketError.mock.calls.length).toBe(0);
    // This time the tls socket is ended from the client side
    expect(tlsSocketEnd.mock.calls.length).toBe(1);
    // The TLS socket close event is emitted without error
    expect(tlsSocketClose.mock.calls.length).toBe(1);
    expect(tlsSocketClose.mock.calls[0][0]).toBe(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await fwdProxy.stop();
  });
  test('HTTP CONNECT fails due to invalid node id', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(1024);
    const serverKeyPairPem = keysUtils.keyPairToPem(serverKeyPair);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      86400,
    );
    const serverCertPem = keysUtils.certToPem(serverCert);
    const fwdProxy = new ForwardProxy({
      authToken,
      logger: logger.getChild('ForwardProxy invalid node id'),
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const egressHost = fwdProxy.getEgressHost();
    const egressPort = fwdProxy.getEgressPort();
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
        utpConnError(e);
      });
      const tlsSocket = new tls.TLSSocket(utpConn, {
        key: Buffer.from(serverKeyPairPem.privateKey, 'ascii'),
        cert: Buffer.from(serverCertPem, 'ascii'),
        isServer: true,
        requestCert: true,
        rejectUnauthorized: false,
      });
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
      await utpSocketSend(data, 0, data.byteLength, egressPort, egressHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, '127.0.0.1');
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(fwdProxy.getConnectionCount()).toBe(0);
    await expect(() =>
      httpConnect(
        fwdProxy.getProxyHost(),
        fwdProxy.getProxyPort(),
        authToken,
        `${utpSocketHost}:${utpSocketPort}?nodeId=${encodeURIComponent(
          nodeIdSomeEncoded,
        )}`,
      ),
    ).rejects.toThrow('526');
    await expect(remoteReadyP).resolves.toBeUndefined();
    expect(secured).toBe(true);
    expect(fwdProxy.getConnectionCount()).toBe(0);
    await expect(remoteClosedP).resolves.toBeUndefined();
    expect(utpConnError.mock.calls.length).toBe(0);
    // No TLS socket errors this time
    // The client side figured taht the node id is incorect
    expect(tlsSocketError.mock.calls.length).toBe(0);
    // This time the tls socket is ended from the client side
    expect(tlsSocketEnd.mock.calls.length).toBe(1);
    // The TLS socket close event is emitted without error
    expect(tlsSocketClose.mock.calls.length).toBe(1);
    expect(tlsSocketClose.mock.calls[0][0]).toBe(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await fwdProxy.stop();
  });
  test('open connection success - forward initiates end', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(1024);
    const serverKeyPairPem = keysUtils.keyPairToPem(serverKeyPair);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      86400,
    );
    const serverCertPem = keysUtils.certToPem(serverCert);
    const serverNodeId = networkUtils.certNodeId(serverCert);
    const fwdProxy = new ForwardProxy({
      authToken,
      logger: logger.getChild(
        'ForwardProxy open connection success - forward initiates end',
      ),
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const egressHost = fwdProxy.getEgressHost();
    const egressPort = fwdProxy.getEgressPort();
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
      const tlsSocket = new tls.TLSSocket(utpConn, {
        key: Buffer.from(serverKeyPairPem.privateKey, 'ascii'),
        cert: Buffer.from(serverCertPem, 'ascii'),
        isServer: true,
        requestCert: true,
        rejectUnauthorized: false,
      });
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
      await utpSocketSend(data, 0, data.byteLength, egressPort, egressHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, '127.0.0.1');
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(fwdProxy.getConnectionCount()).toBe(0);
    await fwdProxy.openConnection(
      serverNodeId,
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    await expect(remoteReadyP).resolves.toBeUndefined();
    await expect(remoteSecureP).resolves.toBeUndefined();
    // Opening a duplicate connection is noop
    await fwdProxy.openConnection(
      serverNodeId,
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    expect(fwdProxy.getConnectionCount()).toBe(1);
    await fwdProxy.closeConnection(
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    expect(fwdProxy.getConnectionCount()).toBe(0);
    await expect(remoteClosedP).resolves.toBeUndefined();
    expect(utpConnError.mock.calls.length).toBe(0);
    expect(tlsSocketError.mock.calls.length).toBe(0);
    expect(tlsSocketEnd.mock.calls.length).toBe(1);
    expect(tlsSocketClose.mock.calls.length).toBe(1);
    expect(tlsSocketClose.mock.calls[0][0]).toBe(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await fwdProxy.stop();
  });
  test('open connection success - reverse initiates end', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(1024);
    const serverKeyPairPem = keysUtils.keyPairToPem(serverKeyPair);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      86400,
    );
    const serverCertPem = keysUtils.certToPem(serverCert);
    const serverNodeId = networkUtils.certNodeId(serverCert);
    const fwdProxy = new ForwardProxy({
      authToken,
      connEndTime: 5000,
      logger: logger.getChild(
        'ForwardProxy open connection success - reverse initiates end',
      ),
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const egressHost = fwdProxy.getEgressHost();
    const egressPort = fwdProxy.getEgressPort();
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
      const tlsSocket = new tls.TLSSocket(utpConn, {
        key: Buffer.from(serverKeyPairPem.privateKey, 'ascii'),
        cert: Buffer.from(serverCertPem, 'ascii'),
        isServer: true,
        requestCert: true,
        rejectUnauthorized: false,
      });
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
      await utpSocketSend(data, 0, data.byteLength, egressPort, egressHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, '127.0.0.1');
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(fwdProxy.getConnectionCount()).toBe(0);
    await fwdProxy.openConnection(
      serverNodeId,
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    await expect(remoteReadyP).resolves.toBeUndefined();
    await expect(remoteSecureP).resolves.toBeUndefined();
    // Opening a duplicate connection is noop
    await fwdProxy.openConnection(
      serverNodeId,
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    expect(fwdProxy.getConnectionCount()).toBe(1);
    // Start the graceful ending of the tls socket
    logger.debug('Reverse: begins tlsSocket ending');
    const { p: endP, resolveP: resolveEndP } = promise<void>();
    tlsSocket_!.removeAllListeners('end');
    tlsSocket_!.once('end', resolveEndP);
    tlsSocket_!.end();
    await endP;
    // Force destroy the socket due to buggy tlsSocket and utpConn
    tlsSocket_!.destroy();
    logger.debug('Reverse: finishes tlsSocket ending');
    await expect(remoteClosedP).resolves.toBeUndefined();
    // Connection count should reach 0 eventually
    await expect(
      poll(
        async () => {
          return fwdProxy.getConnectionCount();
        },
        (_, result) => {
          if (result === 0) return true;
          return false;
        },
        100,
      ),
    ).resolves.toBe(0);
    expect(utpConnError.mock.calls.length).toBe(0);
    expect(tlsSocketError.mock.calls.length).toBe(0);
    // This time the reverse side initiates the end
    // Therefore, this handler is removed
    expect(tlsSocketEnd.mock.calls.length).toBe(0);
    expect(tlsSocketClose.mock.calls.length).toBe(1);
    expect(tlsSocketClose.mock.calls[0][0]).toBe(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await fwdProxy.stop();
  });
  test('HTTP CONNECT success - forward initiates end', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(1024);
    const serverKeyPairPem = keysUtils.keyPairToPem(serverKeyPair);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      86400,
    );
    const serverCertPem = keysUtils.certToPem(serverCert);
    const serverNodeId = networkUtils.certNodeId(serverCert);
    const serverNodeIdEncoded = nodesUtils.encodeNodeId(serverNodeId);
    const fwdProxy = new ForwardProxy({
      authToken,
      logger: logger.getChild(
        'ForwardProxy HTTP CONNECT success - forward initiates end',
      ),
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const egressHost = fwdProxy.getEgressHost();
    const egressPort = fwdProxy.getEgressPort();
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
      const tlsSocket = new tls.TLSSocket(utpConn, {
        key: Buffer.from(serverKeyPairPem.privateKey, 'ascii'),
        cert: Buffer.from(serverCertPem, 'ascii'),
        isServer: true,
        requestCert: true,
        rejectUnauthorized: false,
      });
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
      await utpSocketSend(data, 0, data.byteLength, egressPort, egressHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, '127.0.0.1');
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(fwdProxy.getConnectionCount()).toBe(0);
    const clientSocket = await httpConnect(
      fwdProxy.getProxyHost(),
      fwdProxy.getProxyPort(),
      authToken,
      `${utpSocketHost}:${utpSocketPort}?nodeId=${encodeURIComponent(
        serverNodeIdEncoded,
      )}`,
    );
    await expect(remoteReadyP).resolves.toBeUndefined();
    await expect(remoteSecureP).resolves.toBeUndefined();
    expect(clientSocket).toBeInstanceOf(net.Socket);
    expect(clientSocket.remoteAddress).toBe(fwdProxy.getProxyHost());
    expect(clientSocket.remotePort).toBe(fwdProxy.getProxyPort());
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
    await fwdProxy.openConnection(
      serverNodeId,
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    expect(fwdProxy.getConnectionCount()).toBe(1);
    await fwdProxy.closeConnection(
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    expect(fwdProxy.getConnectionCount()).toBe(0);
    expect(clientSocketEnd.mock.calls.length).toBe(1);
    await expect(localClosedP).resolves.toBeUndefined();
    await expect(remoteClosedP).resolves.toBeUndefined();
    expect(utpConnError.mock.calls.length).toBe(0);
    expect(tlsSocketError.mock.calls.length).toBe(0);
    expect(tlsSocketEnd.mock.calls.length).toBe(1);
    expect(tlsSocketClose.mock.calls.length).toBe(1);
    expect(tlsSocketClose.mock.calls[0][0]).toBe(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await fwdProxy.stop();
  });
  test('HTTP CONNECT success - reverse initiates end', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(1024);
    const serverKeyPairPem = keysUtils.keyPairToPem(serverKeyPair);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      86400,
    );
    const serverCertPem = keysUtils.certToPem(serverCert);
    const serverNodeId = networkUtils.certNodeId(serverCert);
    const serverNodeIdEncoded = nodesUtils.encodeNodeId(serverNodeId);
    const fwdProxy = new ForwardProxy({
      authToken,
      logger: logger.getChild(
        'ForwardProxy HTTP CONNECT success - reverse initiates end',
      ),
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const egressHost = fwdProxy.getEgressHost();
    const egressPort = fwdProxy.getEgressPort();
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
      const tlsSocket = new tls.TLSSocket(utpConn, {
        key: Buffer.from(serverKeyPairPem.privateKey, 'ascii'),
        cert: Buffer.from(serverCertPem, 'ascii'),
        isServer: true,
        requestCert: true,
        rejectUnauthorized: false,
      });
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
      await utpSocketSend(data, 0, data.byteLength, egressPort, egressHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, '127.0.0.1');
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(fwdProxy.getConnectionCount()).toBe(0);
    const clientSocket = await httpConnect(
      fwdProxy.getProxyHost(),
      fwdProxy.getProxyPort(),
      authToken,
      `${utpSocketHost}:${utpSocketPort}?nodeId=${encodeURIComponent(
        serverNodeIdEncoded,
      )}`,
    );
    await expect(remoteReadyP).resolves.toBeUndefined();
    await expect(remoteSecureP).resolves.toBeUndefined();
    expect(clientSocket).toBeInstanceOf(net.Socket);
    expect(clientSocket.remoteAddress).toBe(fwdProxy.getProxyHost());
    expect(clientSocket.remotePort).toBe(fwdProxy.getProxyPort());
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
    await fwdProxy.openConnection(
      serverNodeId,
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    expect(fwdProxy.getConnectionCount()).toBe(1);
    // Start the graceful ending of the tls socket
    logger.debug('Reverse: begins tlsSocket ending');
    const { p: endP, resolveP: resolveEndP } = promise<void>();
    tlsSocket_!.removeAllListeners('end');
    tlsSocket_!.once('end', resolveEndP);
    tlsSocket_!.end();
    await endP;
    // Force destroy the socket due to buggy tlsSocket and utpConn
    tlsSocket_!.destroy();
    logger.debug('Reverse: finishes tlsSocket ending');
    await expect(localClosedP).resolves.toBeUndefined();
    expect(clientSocketEnd.mock.calls.length).toBe(1);
    await expect(remoteClosedP).resolves.toBeUndefined();
    // Connection count should reach 0 eventually
    await expect(
      poll(
        async () => {
          return fwdProxy.getConnectionCount();
        },
        (_, result) => {
          if (result === 0) return true;
          return false;
        },
        100,
      ),
    ).resolves.toBe(0);
    expect(utpConnError.mock.calls.length).toBe(0);
    expect(tlsSocketError.mock.calls.length).toBe(0);
    // This time the reverse side initiates the end
    // Therefore, this handler is removed
    expect(tlsSocketEnd.mock.calls.length).toBe(0);
    expect(tlsSocketClose.mock.calls.length).toBe(1);
    expect(tlsSocketClose.mock.calls[0][0]).toBe(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await fwdProxy.stop();
  });
  test('HTTP CONNECT success - client initiates end', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(1024);
    const serverKeyPairPem = keysUtils.keyPairToPem(serverKeyPair);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      86400,
    );
    const serverCertPem = keysUtils.certToPem(serverCert);
    const serverNodeId = networkUtils.certNodeId(serverCert);
    const serverNodeIdEncoded = nodesUtils.encodeNodeId(serverNodeId);
    const fwdProxy = new ForwardProxy({
      authToken,
      logger: logger.getChild(
        'ForwardProxy HTTP CONNECT success - client initiates end',
      ),
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const egressHost = fwdProxy.getEgressHost();
    const egressPort = fwdProxy.getEgressPort();
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
      const tlsSocket = new tls.TLSSocket(utpConn, {
        key: Buffer.from(serverKeyPairPem.privateKey, 'ascii'),
        cert: Buffer.from(serverCertPem, 'ascii'),
        isServer: true,
        requestCert: true,
        rejectUnauthorized: false,
      });
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
      await utpSocketSend(data, 0, data.byteLength, egressPort, egressHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, '127.0.0.1');
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(fwdProxy.getConnectionCount()).toBe(0);
    const clientSocket = await httpConnect(
      fwdProxy.getProxyHost(),
      fwdProxy.getProxyPort(),
      authToken,
      `${utpSocketHost}:${utpSocketPort}?nodeId=${encodeURIComponent(
        serverNodeIdEncoded,
      )}`,
    );
    await expect(remoteReadyP).resolves.toBeUndefined();
    await expect(remoteSecureP).resolves.toBeUndefined();
    expect(clientSocket).toBeInstanceOf(net.Socket);
    expect(clientSocket.remoteAddress).toBe(fwdProxy.getProxyHost());
    expect(clientSocket.remotePort).toBe(fwdProxy.getProxyPort());
    const { p: localClosedP, resolveP: resolveLocalClosedP } = promise<void>();
    clientSocket.on('close', () => {
      resolveLocalClosedP();
    });
    // Opening a duplicate connection is noop
    await fwdProxy.openConnection(
      serverNodeId,
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    expect(fwdProxy.getConnectionCount()).toBe(1);
    const { p: endP, resolveP: resolveEndP } = promise<void>();
    // By default net sockets have `allowHalfOpen: false`
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
          return fwdProxy.getConnectionCount();
        },
        (_, result) => {
          if (result === 0) return true;
          return false;
        },
        100,
      ),
    ).resolves.toBe(0);
    expect(utpConnError.mock.calls.length).toBe(0);
    expect(tlsSocketError.mock.calls.length).toBe(0);
    expect(tlsSocketEnd.mock.calls.length).toBe(1);
    expect(tlsSocketClose.mock.calls.length).toBe(1);
    expect(tlsSocketClose.mock.calls[0][0]).toBe(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await fwdProxy.stop();
  });
  test('HTTP CONNECT success by opening connection first', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(1024);
    const serverKeyPairPem = keysUtils.keyPairToPem(serverKeyPair);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      86400,
    );
    const serverCertPem = keysUtils.certToPem(serverCert);
    const serverNodeId = networkUtils.certNodeId(serverCert);
    const serverNodeIdEncoded = nodesUtils.encodeNodeId(serverNodeId);
    const fwdProxy = new ForwardProxy({
      authToken,
      logger,
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const egressHost = fwdProxy.getEgressHost();
    const egressPort = fwdProxy.getEgressPort();
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
      const tlsSocket = new tls.TLSSocket(utpConn, {
        key: Buffer.from(serverKeyPairPem.privateKey, 'ascii'),
        cert: Buffer.from(serverCertPem, 'ascii'),
        isServer: true,
        requestCert: true,
        rejectUnauthorized: false,
      });
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
      await utpSocketSend(data, 0, data.byteLength, egressPort, egressHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, '127.0.0.1');
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    await fwdProxy.openConnection(
      serverNodeId,
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    await expect(remoteReadyP).resolves.toBeUndefined();
    await expect(remoteSecureP).resolves.toBeUndefined();
    const clientSocket = await httpConnect(
      fwdProxy.getProxyHost(),
      fwdProxy.getProxyPort(),
      authToken,
      `${utpSocketHost}:${utpSocketPort}?nodeId=${encodeURIComponent(
        serverNodeIdEncoded,
      )}`,
    );
    expect(clientSocket).toBeInstanceOf(net.Socket);
    expect(clientSocket.remoteAddress).toBe(fwdProxy.getProxyHost());
    expect(clientSocket.remotePort).toBe(fwdProxy.getProxyPort());
    const { p: localClosedP, resolveP: resolveLocalClosedP } = promise<void>();
    clientSocket.on('close', () => {
      resolveLocalClosedP();
    });
    await fwdProxy.closeConnection(
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    await expect(localClosedP).resolves.toBeUndefined();
    await expect(remoteClosedP).resolves.toBeUndefined();
    expect(utpConnError.mock.calls.length).toBe(0);
    expect(tlsSocketError.mock.calls.length).toBe(0);
    expect(tlsSocketEnd.mock.calls.length).toBe(1);
    expect(tlsSocketClose.mock.calls.length).toBe(1);
    expect(tlsSocketClose.mock.calls[0][0]).toBe(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await fwdProxy.stop();
  });
  test('open connection keepalive timeout', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(1024);
    const serverKeyPairPem = keysUtils.keyPairToPem(serverKeyPair);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      86400,
    );
    const serverCertPem = keysUtils.certToPem(serverCert);
    const serverNodeId = networkUtils.certNodeId(serverCert);
    const fwdProxy = new ForwardProxy({
      authToken,
      connKeepAliveTimeoutTime: 1000,
      connKeepAliveIntervalTime: 100,
      logger: logger.getChild('ForwardProxy open connection keepalive timeout'),
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const egressHost = fwdProxy.getEgressHost();
    const egressPort = fwdProxy.getEgressPort();
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
      const tlsSocket = new tls.TLSSocket(utpConn, {
        key: Buffer.from(serverKeyPairPem.privateKey, 'ascii'),
        cert: Buffer.from(serverCertPem, 'ascii'),
        isServer: true,
        requestCert: true,
        rejectUnauthorized: false,
      });
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
      await utpSocketSend(data, 0, data.byteLength, egressPort, egressHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, '127.0.0.1');
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(fwdProxy.getConnectionCount()).toBe(0);
    await fwdProxy.openConnection(
      serverNodeId,
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    await expect(remoteReadyP).resolves.toBeUndefined();
    await expect(remoteSecureP).resolves.toBeUndefined();
    expect(fwdProxy.getConnectionCount()).toBe(1);
    // When ErrorConnectionTimeout is triggered
    // This results in the destruction of the socket
    await expect(remoteClosedP).resolves.toBeUndefined();
    expect(utpConnError.mock.calls.length).toBe(0);
    expect(tlsSocketError.mock.calls.length).toBe(0);
    expect(tlsSocketEnd.mock.calls.length).toBe(1);
    expect(tlsSocketClose.mock.calls.length).toBe(1);
    expect(tlsSocketClose.mock.calls[0][0]).toBe(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await fwdProxy.stop();
  });
  test('HTTP CONNECT keepalive timeout', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(1024);
    const serverKeyPairPem = keysUtils.keyPairToPem(serverKeyPair);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      86400,
    );
    const serverCertPem = keysUtils.certToPem(serverCert);
    const serverNodeId = networkUtils.certNodeId(serverCert);
    const serverNodeIdEncoded = nodesUtils.encodeNodeId(serverNodeId);
    const fwdProxy = new ForwardProxy({
      authToken,
      connKeepAliveTimeoutTime: 1000,
      connKeepAliveIntervalTime: 100,
      logger: logger.getChild('ForwardProxy HTTP CONNECT keepalive timeout'),
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const egressHost = fwdProxy.getEgressHost();
    const egressPort = fwdProxy.getEgressPort();
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
      const tlsSocket = new tls.TLSSocket(utpConn, {
        key: Buffer.from(serverKeyPairPem.privateKey, 'ascii'),
        cert: Buffer.from(serverCertPem, 'ascii'),
        isServer: true,
        requestCert: true,
        rejectUnauthorized: false,
      });
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
      await utpSocketSend(data, 0, data.byteLength, egressPort, egressHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, '127.0.0.1');
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(fwdProxy.getConnectionCount()).toBe(0);
    const clientSocket = await httpConnect(
      fwdProxy.getProxyHost(),
      fwdProxy.getProxyPort(),
      authToken,
      `${utpSocketHost}:${utpSocketPort}?nodeId=${encodeURIComponent(
        serverNodeIdEncoded,
      )}`,
    );
    await expect(remoteReadyP).resolves.toBeUndefined();
    await expect(remoteSecureP).resolves.toBeUndefined();
    expect(clientSocket).toBeInstanceOf(net.Socket);
    expect(clientSocket.remoteAddress).toBe(fwdProxy.getProxyHost());
    expect(clientSocket.remotePort).toBe(fwdProxy.getProxyPort());
    const { p: localClosedP, resolveP: resolveLocalClosedP } = promise<void>();
    clientSocket.on('close', () => {
      resolveLocalClosedP();
    });
    expect(fwdProxy.getConnectionCount()).toBe(1);
    // When ErrorConnectionTimeout is triggered
    // This results in the destruction of the socket
    await expect(localClosedP).resolves.toBeUndefined();
    await expect(remoteClosedP).resolves.toBeUndefined();
    // Connection count should reach 0 eventually
    await expect(
      poll(
        async () => {
          return fwdProxy.getConnectionCount();
        },
        (_, result) => {
          if (result === 0) return true;
          return false;
        },
        100,
      ),
    ).resolves.toBe(0);
    expect(utpConnError.mock.calls.length).toBe(0);
    expect(tlsSocketError.mock.calls.length).toBe(0);
    expect(tlsSocketEnd.mock.calls.length).toBe(1);
    expect(tlsSocketClose.mock.calls.length).toBe(1);
    expect(tlsSocketClose.mock.calls[0][0]).toBe(false);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await fwdProxy.stop();
  });
  test('stopping the proxy with open connections', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(1024);
    const serverKeyPairPem = keysUtils.keyPairToPem(serverKeyPair);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      86400,
    );
    const serverCertPem = keysUtils.certToPem(serverCert);
    const serverNodeId = networkUtils.certNodeId(serverCert);
    const fwdProxy = new ForwardProxy({
      authToken,
      logger,
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const egressHost = fwdProxy.getEgressHost();
    const egressPort = fwdProxy.getEgressPort();
    const { p: remoteReadyP, resolveP: resolveRemoteReadyP } = promise<void>();
    const { p: remoteSecureP, resolveP: resolveRemoteSecureP } =
      promise<void>();
    const { p: remoteClosedP, resolveP: resolveRemoteClosedP } =
      promise<void>();
    const utpSocket = UTP.createServer(async (utpConn) => {
      const tlsSocket = new tls.TLSSocket(utpConn, {
        key: Buffer.from(serverKeyPairPem.privateKey, 'ascii'),
        cert: Buffer.from(serverCertPem, 'ascii'),
        isServer: true,
        requestCert: true,
        rejectUnauthorized: false,
      });
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
      await utpSocketSend(data, 0, data.byteLength, egressPort, egressHost);
    };
    const utpSocketListen = promisify(utpSocket.listen).bind(utpSocket);
    await utpSocketListen(0, '127.0.0.1');
    const utpSocketHost = utpSocket.address().address;
    const utpSocketPort = utpSocket.address().port;
    expect(fwdProxy.getConnectionCount()).toBe(0);
    await fwdProxy.openConnection(
      serverNodeId,
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    await expect(remoteReadyP).resolves.toBeUndefined();
    await expect(remoteSecureP).resolves.toBeUndefined();
    expect(fwdProxy.getConnectionCount()).toBe(1);
    await fwdProxy.stop();
    expect(fwdProxy.getConnectionCount()).toBe(0);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await expect(remoteClosedP).resolves.toBeUndefined();
  });
  test('open connection to multiple servers', async () => {
    // First server keys
    const serverKeyPair1 = await keysUtils.generateKeyPair(1024);
    const serverKeyPairPem1 = keysUtils.keyPairToPem(serverKeyPair1);
    const serverCert1 = keysUtils.generateCertificate(
      serverKeyPair1.publicKey,
      serverKeyPair1.privateKey,
      serverKeyPair1.privateKey,
      86400,
    );
    const serverCertPem1 = keysUtils.certToPem(serverCert1);
    const serverNodeId1 = networkUtils.certNodeId(serverCert1);
    // Second server keys
    const serverKeyPair2 = await keysUtils.generateKeyPair(1024);
    const serverKeyPairPem2 = keysUtils.keyPairToPem(serverKeyPair2);
    const serverCert2 = keysUtils.generateCertificate(
      serverKeyPair2.publicKey,
      serverKeyPair2.privateKey,
      serverKeyPair2.privateKey,
      86400,
    );
    const serverCertPem2 = keysUtils.certToPem(serverCert2);
    const serverNodeId2 = networkUtils.certNodeId(serverCert2);
    const fwdProxy = new ForwardProxy({
      authToken,
      logger,
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const egressHost = fwdProxy.getEgressHost();
    const egressPort = fwdProxy.getEgressPort();
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
      const tlsSocket = new tls.TLSSocket(utpConn, {
        key: Buffer.from(serverKeyPairPem1.privateKey, 'ascii'),
        cert: Buffer.from(serverCertPem1, 'ascii'),
        isServer: true,
        requestCert: true,
        rejectUnauthorized: false,
      });
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
      await utpSocketSend(data, 0, data.byteLength, egressPort, egressHost);
    };
    const utpSocketListen1 = promisify(utpSocket1.listen).bind(utpSocket1);
    await utpSocketListen1(0, '127.0.0.1');
    const utpSocketHost1 = utpSocket1.address().address;
    const utpSocketPort1 = utpSocket1.address().port;
    const utpSocket2 = UTP.createServer(async (utpConn) => {
      const tlsSocket = new tls.TLSSocket(utpConn, {
        key: Buffer.from(serverKeyPairPem2.privateKey, 'ascii'),
        cert: Buffer.from(serverCertPem2, 'ascii'),
        isServer: true,
        requestCert: true,
        rejectUnauthorized: false,
      });
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
      await utpSocketSend(data, 0, data.byteLength, egressPort, egressHost);
    };
    const utpSocketListen2 = promisify(utpSocket2.listen).bind(utpSocket2);
    await utpSocketListen2(0, '127.0.0.1');
    const utpSocketHost2 = utpSocket2.address().address;
    const utpSocketPort2 = utpSocket2.address().port;
    expect(fwdProxy.getConnectionCount()).toBe(0);
    await fwdProxy.openConnection(
      serverNodeId1,
      utpSocketHost1 as Host,
      utpSocketPort1 as Port,
    );
    await fwdProxy.openConnection(
      serverNodeId2,
      utpSocketHost2 as Host,
      utpSocketPort2 as Port,
    );
    expect(fwdProxy.getConnectionCount()).toBe(2);
    await expect(remoteReadyP1).resolves.toBeUndefined();
    await expect(remoteReadyP2).resolves.toBeUndefined();
    await fwdProxy.closeConnection(
      utpSocketHost1 as Host,
      utpSocketPort1 as Port,
    );
    await fwdProxy.closeConnection(
      utpSocketHost2 as Host,
      utpSocketPort2 as Port,
    );
    expect(fwdProxy.getConnectionCount()).toBe(0);
    await expect(remoteClosedP1).resolves.toBeUndefined();
    await expect(remoteClosedP2).resolves.toBeUndefined();
    utpSocket1.off('message', handleMessage1);
    utpSocket1.close();
    utpSocket1.unref();
    utpSocket2.off('message', handleMessage2);
    utpSocket2.close();
    utpSocket2.unref();
    await fwdProxy.stop();
  });
});
