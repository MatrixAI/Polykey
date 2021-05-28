import type { Socket } from 'net';
import type { NodeId } from '@/nodes/types';
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
import { promisify, promise, timerStart, timerStop } from '@/utils';

async function connect(
  host: string,
  port: number,
  token: string,
  path: string,
): Promise<Socket> {
  const socket = await new Promise<Socket>((resolve, reject) => {
    const req = http.request({
      method: 'CONNECT',
      path: path,
      host: host,
      port: port,
      headers: {
        'Proxy-Authorization': `Basic ${token}`,
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

describe('ForwardProxy', () => {
  const logger = new Logger('ForwardProxy Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let keyPairPem, certPem;
  beforeAll(async () => {
    const keyPair = await keysUtils.generateKeyPair(4096);
    keyPairPem = keysUtils.keyPairToPem(keyPair);
    const cert = keysUtils.generateCertificate(
      keyPair.publicKey,
      keyPair.privateKey,
      keyPair.privateKey,
      86400,
    );
    certPem = keysUtils.certToPem(cert);
  });
  test('starting and stopping the forward proxy', async () => {
    const fwdProxy = new ForwardProxy({
      authToken: 'abc',
      logger,
    });
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
    await fwdProxy.stop();
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
  test('connect failures to the forward proxy', async () => {
    const authToken = 'sdafjs8';
    const fwdProxy = new ForwardProxy({
      authToken,
      logger,
    });
    await fwdProxy.start({
      proxyHost: '::1' as Host,
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const authTokenEncoded = Buffer.from(authToken, 'utf-8').toString('base64');
    // incorrect auth token
    await expect(
      connect(
        fwdProxy.getProxyHost(),
        fwdProxy.getProxyPort(),
        'sdfisojfo',
        `127.0.0.1:80?nodeId=${encodeURIComponent('SOMENODEID')}`,
      ),
    ).rejects.toThrow('407');
    // no node id
    await expect(
      connect(
        fwdProxy.getProxyHost(),
        fwdProxy.getProxyPort(),
        authTokenEncoded,
        '127.0.0.1:80',
      ),
    ).rejects.toThrow('400');
    // missing target
    await expect(
      connect(
        fwdProxy.getProxyHost(),
        fwdProxy.getProxyPort(),
        authTokenEncoded,
        `?nodeId=${encodeURIComponent('123')}`,
      ),
    ).rejects.toThrow('400');
    // targetting an un-used port
    await expect(
      connect(
        fwdProxy.getProxyHost(),
        fwdProxy.getProxyPort(),
        authTokenEncoded,
        `127.0.0.1:0?nodeId=${encodeURIComponent('123')}`,
      ),
    ).rejects.toThrow('400');
    await fwdProxy.stop();
  });
  test('open connection to port 0 fails', async () => {
    const authToken = 'sdafjs8';
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
    // cannot open connection to port 0
    await expect(
      fwdProxy.openConnection('abc' as NodeId, '127.0.0.1' as Host, 0 as Port),
    ).rejects.toThrow(networkErrors.ErrorConnectionStart);
    await fwdProxy.stop();
  });
  test('open connection timeout due to hanging remote', async () => {
    const authToken = 'sdafjs8';
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
    // this UTP server will just hang and not respond
    let receivedConnection = false;
    const utpSocketHang = UTP.createServer(() => {
      receivedConnection = true;
    });
    const utpSocketHangListen = promisify(utpSocketHang.listen).bind(
      utpSocketHang,
    );
    await utpSocketHangListen(0, '127.0.0.1');
    const utpSocketHangPort = utpSocketHang.address().port;
    const timer = timerStart(3000);
    await expect(
      fwdProxy.openConnection(
        'abc' as NodeId,
        '127.0.0.1' as Host,
        utpSocketHangPort as Port,
        timer,
      ),
    ).rejects.toThrow(networkErrors.ErrorConnectionStartTimeout);
    timerStop(timer);
    expect(receivedConnection).toBe(true);
    utpSocketHang.close();
    utpSocketHang.unref();
    await fwdProxy.stop();
  });
  test('open connection reset due to ending remote', async () => {
    const authToken = 'sdafjs8';
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
    // this UTP Server will immediately end and destroy
    // the connection upon receiving a connection
    let receivedConnection = false;
    const utpSocketEnd = UTP.createServer((utpConn) => {
      receivedConnection = true;
      utpConn.end();
      utpConn.destroy();
    });
    const utpSocketEndListen = promisify(utpSocketEnd.listen).bind(
      utpSocketEnd,
    );
    await utpSocketEndListen(0, '127.0.0.1');
    const utpSocketEndPort = utpSocketEnd.address().port;
    await expect(
      fwdProxy.openConnection(
        'abc' as NodeId,
        '127.0.0.1' as Host,
        utpSocketEndPort as Port,
      ),
    ).rejects.toThrow(networkErrors.ErrorConnectionStart);
    expect(receivedConnection).toBe(true);
    // the actual error is UTP_ECONNRESET to be precise
    await expect(
      fwdProxy.openConnection(
        'abc' as NodeId,
        '127.0.0.1' as Host,
        utpSocketEndPort as Port,
      ),
    ).rejects.toThrow(/UTP_ECONNRESET/);
    utpSocketEnd.close();
    utpSocketEnd.unref();
    await fwdProxy.stop();
  });
  test('open connection fails due to missing certificates', async () => {
    const authToken = 'sdafjs8';
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
    const { p: remoteClosedP, resolveP: resolveRemoteClosedP } =
      promise<void>();
    // this UTP server will hold the connection
    const utpSocket = UTP.createServer(
      async (utpConn) => {
        const tlsSocket = new tls.TLSSocket(utpConn, {
          isServer: true,
          requestCert: true,
          rejectUnauthorized: false,
        });
        tlsSocket.on('close', () => {
          resolveRemoteClosedP();
        });
        // allowHalfOpen is buggy
        // this ends the connection in case it doesn't work
        tlsSocket.on('end', () => {
          tlsSocket.end();
        });
        await send(networkUtils.pingBuffer);
        const punchInterval = setInterval(async () => {
          await send(networkUtils.pingBuffer);
        }, 1000);
        await remoteReadyP;
        clearInterval(punchInterval);
      },
      {
        allowHalfOpen: false,
      },
    );
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
    // this is an SSL handshake failure
    await expect(
      fwdProxy.openConnection(
        'somerandomnodeid' as NodeId,
        utpSocketHost as Host,
        utpSocketPort as Port,
      ),
    ).rejects.toThrow(networkErrors.ErrorConnectionStart);
    await expect(remoteClosedP).resolves.toBeUndefined();
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await fwdProxy.stop();
  });
  test('open connection fails due to invalid node id', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(4096);
    const serverKeyPairPem = keysUtils.keyPairToPem(serverKeyPair);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      86400,
    );
    const serverCertPem = keysUtils.certToPem(serverCert);
    const authToken = 'sdafjs8';
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
    const { p: remoteClosedP, resolveP: resolveRemoteClosedP } =
      promise<void>();
    // this UTP server will hold the connection
    let secured = false;
    const utpSocket = UTP.createServer(
      async (utpConn) => {
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
        tlsSocket.on('close', () => {
          resolveRemoteClosedP();
        });
        // allowHalfOpen is buggy
        // this ends the connection in case it doesn't work
        tlsSocket.on('end', () => {
          tlsSocket.end();
        });
        await send(networkUtils.pingBuffer);
        const punchInterval = setInterval(async () => {
          await send(networkUtils.pingBuffer);
        }, 1000);
        await remoteReadyP;
        clearInterval(punchInterval);
      },
      {
        allowHalfOpen: false,
      },
    );
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
    await expect(
      fwdProxy.openConnection(
        'somerandomnodeid' as NodeId,
        utpSocketHost as Host,
        utpSocketPort as Port,
      ),
    ).rejects.toThrow(networkErrors.ErrorCertChainUnclaimed);
    await expect(remoteReadyP).resolves.toBeUndefined();
    // the secure event won't be fired
    // because the connection will be ended before that happens
    expect(secured).toBe(false);
    expect(fwdProxy.getConnectionCount()).toBe(0);
    await expect(remoteClosedP).resolves.toBeUndefined();
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await fwdProxy.stop();
  });
  test('open connection success', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(4096);
    const serverKeyPairPem = keysUtils.keyPairToPem(serverKeyPair);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      86400,
    );
    const serverCertPem = keysUtils.certToPem(serverCert);
    const serverNodeId = networkUtils.certNodeId(serverCert);
    const authToken = 'sdafjs8';
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
    // this UTP server will hold the connection
    const utpSocket = UTP.createServer(
      async (utpConn) => {
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
        // allowHalfOpen is buggy
        // this ends the connection in case it doesn't work
        tlsSocket.on('end', () => {
          tlsSocket.end();
        });
        await send(networkUtils.pingBuffer);
        const punchInterval = setInterval(async () => {
          await send(networkUtils.pingBuffer);
        }, 1000);
        await remoteReadyP;
        clearInterval(punchInterval);
      },
      {
        allowHalfOpen: false,
      },
    );
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
    // opening a duplicate connection is noop
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
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await fwdProxy.stop();
  });
  test('connect success by opening connection first', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(4096);
    const serverKeyPairPem = keysUtils.keyPairToPem(serverKeyPair);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      86400,
    );
    const serverCertPem = keysUtils.certToPem(serverCert);
    const serverNodeId = networkUtils.certNodeId(serverCert);
    const authToken = 'sdafjs8';
    const fwdProxy = new ForwardProxy({
      authToken,
      logger,
    });
    await fwdProxy.start({
      proxyHost: '::1' as Host,
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
    // this UTP server will hold the connection
    const utpSocket = UTP.createServer(
      async (utpConn) => {
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
        // allowHalfOpen is buggy
        // this ends the connection in case it doesn't work
        tlsSocket.on('end', () => {
          tlsSocket.end();
        });
        await send(networkUtils.pingBuffer);
        const punchInterval = setInterval(async () => {
          await send(networkUtils.pingBuffer);
        }, 1000);
        await remoteReadyP;
        clearInterval(punchInterval);
      },
      {
        allowHalfOpen: false,
      },
    );
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
    const authTokenEncoded = Buffer.from(authToken, 'utf-8').toString('base64');
    const clientSocket = await connect(
      fwdProxy.getProxyHost(),
      fwdProxy.getProxyPort(),
      authTokenEncoded,
      `${utpSocketHost}:${utpSocketPort}?nodeId=${encodeURIComponent(
        serverNodeId,
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
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await fwdProxy.stop();
  });
  test('connect success by direct connection', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(4096);
    const serverKeyPairPem = keysUtils.keyPairToPem(serverKeyPair);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      86400,
    );
    const serverCertPem = keysUtils.certToPem(serverCert);
    const serverNodeId = networkUtils.certNodeId(serverCert);
    const authToken = 'sdafjs8';
    const fwdProxy = new ForwardProxy({
      authToken,
      logger,
    });
    await fwdProxy.start({
      proxyHost: '::1' as Host,
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
    // this UTP server will hold the connection
    const utpSocket = UTP.createServer(
      async (utpConn) => {
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
        // allowHalfOpen is buggy
        // this ends the connection in case it doesn't work
        tlsSocket.on('end', () => {
          tlsSocket.end();
        });
        await send(networkUtils.pingBuffer);
        const punchInterval = setInterval(async () => {
          await send(networkUtils.pingBuffer);
        }, 1000);
        await remoteReadyP;
        clearInterval(punchInterval);
      },
      {
        allowHalfOpen: false,
      },
    );
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
    const authTokenEncoded = Buffer.from(authToken, 'utf-8').toString('base64');
    const clientSocket = await connect(
      fwdProxy.getProxyHost(),
      fwdProxy.getProxyPort(),
      authTokenEncoded,
      `${utpSocketHost}:${utpSocketPort}?nodeId=${encodeURIComponent(
        serverNodeId,
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
    await fwdProxy.closeConnection(
      utpSocketHost as Host,
      utpSocketPort as Port,
    );
    await expect(localClosedP).resolves.toBeUndefined();
    await expect(remoteClosedP).resolves.toBeUndefined();
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await fwdProxy.stop();
  });
  test('stopping the proxy with open connections', async () => {
    const serverKeyPair = await keysUtils.generateKeyPair(4096);
    const serverKeyPairPem = keysUtils.keyPairToPem(serverKeyPair);
    const serverCert = keysUtils.generateCertificate(
      serverKeyPair.publicKey,
      serverKeyPair.privateKey,
      serverKeyPair.privateKey,
      86400,
    );
    const serverCertPem = keysUtils.certToPem(serverCert);
    const serverNodeId = networkUtils.certNodeId(serverCert);
    const authToken = 'sdafjs8';
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
    const utpSocket = UTP.createServer(
      async (utpConn) => {
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
        // allowHalfOpen is buggy
        // this ends the connection in case it doesn't work
        tlsSocket.on('end', () => {
          tlsSocket.end();
        });
        await send(networkUtils.pingBuffer);
        const punchInterval = setInterval(async () => {
          await send(networkUtils.pingBuffer);
        }, 1000);
        await remoteReadyP;
        clearInterval(punchInterval);
      },
      {
        allowHalfOpen: false,
      },
    );
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
    // first server keys
    const serverKeyPair1 = await keysUtils.generateKeyPair(4096);
    const serverKeyPairPem1 = keysUtils.keyPairToPem(serverKeyPair1);
    const serverCert1 = keysUtils.generateCertificate(
      serverKeyPair1.publicKey,
      serverKeyPair1.privateKey,
      serverKeyPair1.privateKey,
      86400,
    );
    const serverCertPem1 = keysUtils.certToPem(serverCert1);
    const serverNodeId1 = networkUtils.certNodeId(serverCert1);
    // second server keys
    const serverKeyPair2 = await keysUtils.generateKeyPair(4096);
    const serverKeyPairPem2 = keysUtils.keyPairToPem(serverKeyPair2);
    const serverCert2 = keysUtils.generateCertificate(
      serverKeyPair2.publicKey,
      serverKeyPair2.privateKey,
      serverKeyPair2.privateKey,
      86400,
    );
    const serverCertPem2 = keysUtils.certToPem(serverCert2);
    const serverNodeId2 = networkUtils.certNodeId(serverCert2);
    const authToken = 'sdafjs8';
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
    // first signals
    const { p: remoteReadyP1, resolveP: resolveRemoteReadyP1 } =
      promise<void>();
    const { p: remoteClosedP1, resolveP: resolveRemoteClosedP1 } =
      promise<void>();
    // second signals
    const { p: remoteReadyP2, resolveP: resolveRemoteReadyP2 } =
      promise<void>();
    const { p: remoteClosedP2, resolveP: resolveRemoteClosedP2 } =
      promise<void>();
    const utpSocket1 = UTP.createServer(
      async (utpConn) => {
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
        // allowHalfOpen is buggy
        // this ends the connection in case it doesn't work
        tlsSocket.on('end', () => {
          tlsSocket.end();
        });
        await send1(networkUtils.pingBuffer);
        const punchInterval = setInterval(async () => {
          await send1(networkUtils.pingBuffer);
        }, 1000);
        await remoteReadyP1;
        clearInterval(punchInterval);
      },
      {
        allowHalfOpen: false,
      },
    );
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
    const utpSocket2 = UTP.createServer(
      async (utpConn) => {
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
        // allowHalfOpen is buggy
        // this ends the connection in case it doesn't work
        tlsSocket.on('end', () => {
          tlsSocket.end();
        });
        await send2(networkUtils.pingBuffer);
        const punchInterval = setInterval(async () => {
          await send2(networkUtils.pingBuffer);
        }, 2000);
        await remoteReadyP2;
        clearInterval(punchInterval);
      },
      {
        allowHalfOpen: false,
      },
    );
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
