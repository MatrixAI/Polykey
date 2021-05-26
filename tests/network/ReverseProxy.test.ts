import type { AddressInfo } from 'net';
import type { KeyPairPem } from '@/keys/types';
import type { Host, Port } from '@/network/types';

import net from 'net';
import tls from 'tls';
import UTP from 'utp-native';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import {
  ReverseProxy,
  utils as networkUtils,
  errors as networkErrors,
} from '@/network';
import * as keysUtils from '@/keys/utils';
import { promisify, promise, timerStart, timerStop, sleep } from '@/utils';

function server(end: boolean = false) {
  const { p: serverConnP, resolveP: resolveServerConnP } = promise<void>();
  const {
    p: serverConnClosedP,
    resolveP: resolveServerConnClosedP,
  } = promise<void>();
  const server = net.createServer((conn) => {
    resolveServerConnP();
    conn.once('close', () => {
      resolveServerConnClosedP();
    });
    if (end) {
      conn.end();
      conn.destroy();
    }
  });
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
    serverConnClosedP,
    serverHost,
    serverPort,
  };
}

describe('ReverseProxy', () => {
  const logger = new Logger('ReverseProxy Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let keyPairPem: KeyPairPem, certPem: string;
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
  test('starting and stopping the reverse proxy', async () => {
    const revProxy = new ReverseProxy({
      logger: logger,
    });
    // starting the rev proxy doesn't start a connection to the server
    await revProxy.start({
      serverHost: '::1' as Host,
      serverPort: 1 as Port,
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    expect(typeof revProxy.getIngressHost()).toBe('string');
    expect(typeof revProxy.getIngressPort()).toBe('number');
    expect(revProxy.getIngressPort()).toBeGreaterThan(0);
    expect(typeof revProxy.getServerHost()).toBe('string');
    expect(typeof revProxy.getServerPort()).toBe('number');
    expect(revProxy.getConnectionCount()).toBe(0);
    expect(revProxy.getServerHost()).toBe('::1');
    expect(revProxy.getServerPort()).toBe(1);
    await revProxy.stop();
    await revProxy.start({
      ingressHost: '127.0.0.1' as Host,
      serverHost: '::1' as Host,
      serverPort: 1 as Port,
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    expect(revProxy.getIngressHost()).toBe('127.0.0.1');
    await revProxy.stop();
  });
  test('open connection to port 0 fails', async () => {
    const revProxy = new ReverseProxy({
      logger: logger,
    });
    const {
      serverListen,
      serverClose,
      serverConnP,
      serverConnClosedP,
      serverHost,
      serverPort,
    } = server();
    await serverListen(0);
    await revProxy.start({
      ingressHost: '127.0.0.1' as Host,
      serverHost: serverHost(),
      serverPort: serverPort(),
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    await expect(
      revProxy.openConnection('127.0.0.1' as Host, 0 as Port),
    ).rejects.toThrow(networkErrors.ErrorConnectionStart);
    await expect(serverConnP).resolves.toBeUndefined();
    await expect(serverConnClosedP).resolves.toBeUndefined();
    await revProxy.stop();
    await serverClose();
  });
  test('open connection timeout due to lack of ready signal', async () => {
    const revProxy = new ReverseProxy({
      logger: logger,
    });
    const {
      serverListen,
      serverClose,
      serverConnP,
      serverConnClosedP,
      serverHost,
      serverPort,
    } = server();
    await serverListen(0);
    await revProxy.start({
      ingressHost: '127.0.0.1' as Host,
      serverHost: serverHost(),
      serverPort: serverPort(),
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    // this UTP client will just hang and not respond
    const utpSocket = UTP();
    const utpSocketBind = promisify(utpSocket.bind).bind(utpSocket);
    await utpSocketBind(0, '127.0.0.1');
    const utpSocketPort = utpSocket.address().port;
    const timer = timerStart(3000);
    await expect(
      revProxy.openConnection(
        '127.0.0.1' as Host,
        utpSocketPort as Port,
        timer,
      ),
    ).rejects.toThrow(networkErrors.ErrorConnectionStartTimeout);
    timerStop(timer);
    await expect(serverConnP).resolves.toBeUndefined();
    await expect(serverConnClosedP).resolves.toBeUndefined();
    utpSocket.close();
    utpSocket.unref();
    await revProxy.stop();
    await serverClose();
  });
  test('open connection success', async () => {
    const revProxy = new ReverseProxy({
      logger: logger,
    });
    const {
      serverListen,
      serverClose,
      serverConnP,
      serverConnClosedP,
      serverHost,
      serverPort,
    } = server();
    await serverListen(0);
    await revProxy.start({
      ingressHost: '127.0.0.1' as Host,
      serverHost: serverHost(),
      serverPort: serverPort(),
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const ingressHost = revProxy.getIngressHost();
    const ingressPort = revProxy.getIngressPort();
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
      await utpSocketSend(data, 0, data.byteLength, ingressPort, ingressHost);
    };
    const utpSocketBind = promisify(utpSocket.bind).bind(utpSocket);
    await utpSocketBind(0, '127.0.0.1');
    const utpSocketPort = utpSocket.address().port;
    await revProxy.openConnection('127.0.0.1' as Host, utpSocketPort as Port);
    expect(revProxy.getConnectionCount()).toBe(1);
    await revProxy.closeConnection('127.0.0.1' as Host, utpSocketPort as Port);
    await expect(serverConnP).resolves.toBeUndefined();
    await expect(serverConnClosedP).resolves.toBeUndefined();
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await revProxy.stop();
    await serverClose();
  });
  test('open connection to multiple clients', async () => {
    const revProxy = new ReverseProxy({
      logger: logger,
    });
    const {
      serverListen,
      serverClose,
      serverConnP,
      serverConnClosedP,
      serverHost,
      serverPort,
    } = server();
    await serverListen(0);
    await revProxy.start({
      ingressHost: '127.0.0.1' as Host,
      serverHost: serverHost(),
      serverPort: serverPort(),
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const ingressHost = revProxy.getIngressHost();
    const ingressPort = revProxy.getIngressPort();
    // first client
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
      await utpSocketSend(data, 0, data.byteLength, ingressPort, ingressHost);
    };
    const utpSocketBind1 = promisify(utpSocket1.bind).bind(utpSocket1);
    await utpSocketBind1(0, '127.0.0.1');
    const utpSocketPort1 = utpSocket1.address().port;
    // second client
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
      await utpSocketSend(data, 0, data.byteLength, ingressPort, ingressHost);
    };
    const utpSocketBind2 = promisify(utpSocket2.bind).bind(utpSocket2);
    await utpSocketBind2(0, '127.0.0.1');
    const utpSocketPort2 = utpSocket2.address().port;
    await revProxy.openConnection('127.0.0.1' as Host, utpSocketPort1 as Port);
    await revProxy.openConnection('127.0.0.1' as Host, utpSocketPort2 as Port);
    expect(revProxy.getConnectionCount()).toBe(2);
    await revProxy.closeConnection('127.0.0.1' as Host, utpSocketPort1 as Port);
    await revProxy.closeConnection('127.0.0.1' as Host, utpSocketPort2 as Port);
    expect(revProxy.getConnectionCount()).toBe(0);
    await expect(serverConnP).resolves.toBeUndefined();
    await expect(serverConnClosedP).resolves.toBeUndefined();
    utpSocket1.off('message', handleMessage1);
    utpSocket1.close();
    utpSocket1.unref();
    utpSocket2.off('message', handleMessage2);
    utpSocket2.close();
    utpSocket2.unref();
    await revProxy.stop();
    await serverClose();
  });
  test('closed connection due to ending server', async () => {
    const revProxy = new ReverseProxy({
      logger: logger,
    });
    // this server will force end
    const {
      serverListen,
      serverClose,
      serverConnP,
      serverConnClosedP,
      serverHost,
      serverPort,
    } = server(true);
    await serverListen(0);
    await revProxy.start({
      ingressHost: '127.0.0.1' as Host,
      serverHost: serverHost(),
      serverPort: serverPort(),
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const ingressHost = revProxy.getIngressHost();
    const ingressPort = revProxy.getIngressPort();
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
      await utpSocketSend(data, 0, data.byteLength, ingressPort, ingressHost);
    };
    const utpSocketBind = promisify(utpSocket.bind).bind(utpSocket);
    await utpSocketBind(0, '127.0.0.1');
    const utpSocketPort = utpSocket.address().port;
    await revProxy.openConnection('127.0.0.1' as Host, utpSocketPort as Port);
    expect(revProxy.getConnectionCount()).toBe(1);
    await expect(serverConnP).resolves.toBeUndefined();
    // the server closed the connection
    await expect(serverConnClosedP).resolves.toBeUndefined();
    // wait for the end signal to be received
    await sleep(2000);
    // the rev proxy won't have this connection
    expect(revProxy.getConnectionCount()).toBe(0);
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await revProxy.stop();
    await serverClose();
  });
  test('connect timeout due to hanging client', async () => {
    // connConnectTime will affect ErrorConnectionComposeTimeout during compose
    // connTimeoutTime will affect ErrorConnectionTimeout which is needed
    // because failing to connect to the open connection
    // doesn't automatically mean the connection is destroyed
    const revProxy = new ReverseProxy({
      connConnectTime: 3000,
      connTimeoutTime: 3000,
      logger: logger,
    });
    const {
      serverListen,
      serverClose,
      serverConnP,
      serverConnClosedP,
      serverHost,
      serverPort,
    } = server();
    await serverListen(0);
    await revProxy.start({
      ingressHost: '127.0.0.1' as Host,
      serverHost: serverHost(),
      serverPort: serverPort(),
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const ingressHost = revProxy.getIngressHost();
    const ingressPort = revProxy.getIngressPort();
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
      await utpSocketSend(data, 0, data.byteLength, ingressPort, ingressHost);
    };
    const utpSocketBind = promisify(utpSocket.bind).bind(utpSocket);
    await utpSocketBind(0, '127.0.0.1');
    const utpSocketPort = utpSocket.address().port;
    await revProxy.openConnection('127.0.0.1' as Host, utpSocketPort as Port);
    expect(revProxy.getConnectionCount()).toBe(1);
    // this retries multiple times
    const utpConn = utpSocket.connect(ingressPort, ingressHost);
    utpConn.setTimeout(2000, () => {
      utpConn.emit('error', new Error('TIMED OUT'));
    });
    const {
      p: utpConnClosedP,
      resolveP: resolveUtpConnClosedP,
    } = promise<void>();
    const { p: utpConnErrorP, rejectP: rejectUtpConnErrorP } = promise<void>();
    utpConn.on('error', (e) => {
      rejectUtpConnErrorP(e);
      utpConn.destroy();
    });
    utpConn.on('close', () => {
      resolveUtpConnClosedP();
    });
    // the client connection times out
    await expect(utpConnErrorP).rejects.toThrow(/TIMED OUT/);
    await utpConnClosedP;
    // wait for the open connection to timeout
    await sleep(3000);
    expect(revProxy.getConnectionCount()).toBe(0);
    await expect(serverConnP).resolves.toBeUndefined();
    await expect(serverConnClosedP).resolves.toBeUndefined();
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await revProxy.stop();
    await serverClose();
  });
  test('connect fails due to missing client certificates', async () => {
    // connConnectTime will affect ErrorConnectionComposeTimeout during compose
    // connTimeoutTime will affect ErrorConnectionTimeout which is needed
    // because failing to connect to the open connection
    // doesn't automatically mean the connection is destroyed
    const revProxy = new ReverseProxy({
      connConnectTime: 3000,
      connTimeoutTime: 3000,
      logger: logger,
    });
    const {
      serverListen,
      serverClose,
      serverConnP,
      serverConnClosedP,
      serverHost,
      serverPort,
    } = server();
    await serverListen(0);
    await revProxy.start({
      ingressHost: '127.0.0.1' as Host,
      serverHost: serverHost(),
      serverPort: serverPort(),
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const ingressHost = revProxy.getIngressHost();
    const ingressPort = revProxy.getIngressPort();
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
      await utpSocketSend(data, 0, data.byteLength, ingressPort, ingressHost);
    };
    const utpSocketBind = promisify(utpSocket.bind).bind(utpSocket);
    await utpSocketBind(0, '127.0.0.1');
    const utpSocketPort = utpSocket.address().port;
    await revProxy.openConnection('127.0.0.1' as Host, utpSocketPort as Port);
    expect(revProxy.getConnectionCount()).toBe(1);
    const {
      p: tlsSocketClosedP,
      resolveP: resolveTlsSocketClosedP,
    } = promise<void>();
    const utpConn = utpSocket.connect(ingressPort, ingressHost);
    // this will propagate the error to tlsSocket
    utpConn.setTimeout(2000, () => {
      utpConn.emit('error', new Error('TIMED OUT'));
    });
    // TLS socket without a certificate
    // should also cause a timeout
    // the secure event never occurs
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
      }
    });
    tlsSocket.on('close', () => {
      resolveTlsSocketClosedP();
    });
    // reverse proxy will close the connection
    await tlsSocketClosedP;
    // we won't receive an error because it will be closed
    expect(errored).toBe(false);
    expect(secureConnection).toBe(true);
    // wait for the open connection to timeout
    await sleep(3000);
    expect(revProxy.getConnectionCount()).toBe(0);
    await expect(serverConnP).resolves.toBeUndefined();
    await expect(serverConnClosedP).resolves.toBeUndefined();
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await revProxy.stop();
    await serverClose();
  });
  test('connect success', async () => {
    const clientKeyPair = await keysUtils.generateKeyPair(4096);
    const clientKeyPairPem = keysUtils.keyPairToPem(clientKeyPair);
    const clientCert = keysUtils.generateCertificate(
      clientKeyPair.publicKey,
      clientKeyPair.privateKey,
      clientKeyPair.privateKey,
      86400,
    );
    const clientCertPem = keysUtils.certToPem(clientCert);
    const {
      serverListen,
      serverClose,
      serverConnP,
      serverConnClosedP,
      serverHost,
      serverPort,
    } = server();
    await serverListen(0, '127.0.0.1');
    const revProxy = new ReverseProxy({
      logger: logger,
    });
    await revProxy.start({
      ingressHost: '127.0.0.1' as Host,
      serverHost: serverHost(),
      serverPort: serverPort(),
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const ingressHost = revProxy.getIngressHost();
    const ingressPort = revProxy.getIngressPort();
    const { p: clientReadyP, resolveP: resolveClientReadyP } = promise<void>();
    const {
      p: clientSecureConnectP,
      resolveP: resolveClientSecureConnectP,
    } = promise<void>();
    const { p: clientCloseP, resolveP: resolveClientCloseP } = promise<void>();
    const utpSocket = UTP({ allowHalfOpen: false });
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
      await utpSocketSend(data, 0, data.byteLength, ingressPort, ingressHost);
    };
    await utpSocketBind(0, '127.0.0.1');
    const utpSocketPort = utpSocket.address().port;
    await revProxy.openConnection('127.0.0.1' as Host, utpSocketPort as Port);
    const utpConn = utpSocket.connect(ingressPort, ingressHost);
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
    tlsSocket.on('end', () => {
      logger.info('GOT THE END EVENT');
      if (utpConn.destroyed) {
        tlsSocket.destroy();
      } else {
        tlsSocket.end();
      }
    });
    tlsSocket.on('close', () => {
      resolveClientCloseP();
    });
    await send(networkUtils.pingBuffer);
    expect(revProxy.getConnectionCount()).toBe(1);
    await clientReadyP;
    await clientSecureConnectP;
    await serverConnP;
    await revProxy.closeConnection('127.0.0.1' as Host, utpSocketPort as Port);
    expect(revProxy.getConnectionCount()).toBe(0);
    await clientCloseP;
    await serverConnClosedP;
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await revProxy.stop();
    await serverClose();
  });
  test('stopping the proxy with open connections', async () => {
    const revProxy = new ReverseProxy({
      logger: logger,
    });
    const {
      serverListen,
      serverClose,
      serverConnP,
      serverConnClosedP,
      serverHost,
      serverPort,
    } = server();
    await serverListen(0);
    await revProxy.start({
      ingressHost: '127.0.0.1' as Host,
      serverHost: serverHost(),
      serverPort: serverPort(),
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const ingressHost = revProxy.getIngressHost();
    const ingressPort = revProxy.getIngressPort();
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
      await utpSocketSend(data, 0, data.byteLength, ingressPort, ingressHost);
    };
    const utpSocketBind = promisify(utpSocket.bind).bind(utpSocket);
    await utpSocketBind(0, '127.0.0.1');
    const utpSocketPort = utpSocket.address().port;
    await revProxy.openConnection('127.0.0.1' as Host, utpSocketPort as Port);
    expect(revProxy.getConnectionCount()).toBe(1);
    await revProxy.stop();
    expect(revProxy.getConnectionCount()).toBe(0);
    await expect(serverConnP).resolves.toBeUndefined();
    await expect(serverConnClosedP).resolves.toBeUndefined();
    utpSocket.off('message', handleMessage);
    utpSocket.close();
    utpSocket.unref();
    await serverClose();
  });
});
