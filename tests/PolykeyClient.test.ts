import type { SessionToken } from '@/sessions/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import net from 'net';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import {
  utils as webSocketUtils,
  errors as webSocketErrors,
} from '@matrixai/ws';
import { running } from '@matrixai/async-init/dist/CreateDestroyStartStop';
import PolykeyAgent from '@/PolykeyAgent';
import PolykeyClient from '@/PolykeyClient';
import Session from '@/sessions/Session';
import config from '@/config';
import * as ids from '@/ids';
import * as clientUtils from '@/client/utils';
import * as keysUtils from '@/keys/utils';
import * as errors from '@/errors';
import * as events from '@/events';
import * as utils from '@/utils';
import * as testUtils from './utils';

describe(PolykeyClient.name, () => {
  const logger = new Logger(`${PolykeyClient.name} Test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'password';
  const localHost = '127.0.0.1';
  const nodeIdGenerator = ids.createNodeIdGenerator();
  let dataDir: string;
  let nodePath: string;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'polykey');
  });
  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('connect to the nothing', async () => {
    await expect(
      PolykeyClient.createPolykeyClient({
        nodeId: nodeIdGenerator(),
        host: '127.0.0.1',
        port: 1,
        options: {
          nodePath: nodePath,
        },
        fs,
        logger: logger.getChild(PolykeyClient.name),
        fresh: true,
      }),
    ).rejects.toThrow(webSocketErrors.ErrorWebSocketConnectionLocal);
  });
  test('connect timeout', async () => {
    const sockets: Array<net.Socket> = [];
    const server = net.createServer((socket) => {
      sockets.push(socket);
    });
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        resolve();
      });
    });
    const serverPort = (server.address() as net.AddressInfo).port;
    await expect(
      PolykeyClient.createPolykeyClient(
        {
          nodeId: nodeIdGenerator(),
          host: '127.0.0.1',
          port: serverPort,
          options: {
            nodePath: nodePath,
          },
          fs,
          logger: logger.getChild(PolykeyClient.name),
          fresh: true,
        },
        { timer: 1000 },
      ),
    ).rejects.toThrow(errors.ErrorPolykeyClientCreateTimeout);
    server.close();
    for (const socket of sockets) {
      socket.destroy();
    }
  });
  describe('with polykey agent', () => {
    let pkAgent: PolykeyAgent;
    beforeEach(async () => {
      pkAgent = await PolykeyAgent.createPolykeyAgent({
        password,
        options: {
          nodePath,
          agentServiceHost: localHost,
          clientServiceHost: localHost,
          keys: {
            passwordOpsLimit: keysUtils.passwordOpsLimits.min,
            passwordMemLimit: keysUtils.passwordMemLimits.min,
            strictMemoryLock: false,
          },
        },
        logger: logger.getChild(PolykeyAgent.name),
      });
    });
    afterEach(async () => {
      await pkAgent.stop();
    });
    test('preserving and destroying session state', async () => {
      const session = await Session.createSession({
        sessionTokenPath: path.join(nodePath, config.paths.tokenBase),
        fs,
        logger,
      });
      await session.writeToken('dummy' as SessionToken);
      const pkClient = await PolykeyClient.createPolykeyClient({
        nodeId: pkAgent.keyRing.getNodeId(),
        host: pkAgent.clientServiceHost,
        port: pkAgent.clientServicePort,
        options: {
          nodePath,
        },
        fs,
        logger: logger.getChild(PolykeyClient.name),
        // Using fresh: true means that any token would be destroyed
        fresh: true,
      });
      expect(await session.readToken()).toBeUndefined();
      await session.writeToken('abc' as SessionToken);
      await pkClient.stop();
      expect(await session.readToken()).toBeDefined();
      await pkClient.destroy();
      expect(await session.readToken()).toBeUndefined();
    });
    test('connect to agent client service', async () => {
      const pkClient = await PolykeyClient.createPolykeyClient({
        nodeId: pkAgent.keyRing.getNodeId(),
        port: pkAgent.clientServicePort,
        host: pkAgent.clientServiceHost,
        options: {
          nodePath: nodePath,
        },
        fs,
        logger: logger.getChild(PolykeyClient.name),
        fresh: true,
      });
      expect(pkClient.host).toBe(pkAgent.clientServiceHost);
      expect(pkClient.port).toBe(pkAgent.clientServicePort);
      const connectionMeta = pkClient.webSocketClient.connection.meta();
      expect(connectionMeta.remoteCertsChain).toHaveLength(1);
      const remoteCert = connectionMeta.remoteCertsChain[0];
      const remoteCertPem = webSocketUtils.derToPEM(remoteCert);
      const agentCertPem = await pkAgent.certManager.getCurrentCertPEM();
      expect(remoteCertPem).toEqual(agentCertPem);
      await pkClient.stop();
    });
    test('reconnect to agent client service', async () => {
      const pkClient = await PolykeyClient.createPolykeyClient({
        nodeId: pkAgent.keyRing.getNodeId(),
        port: pkAgent.clientServicePort,
        host: pkAgent.clientServiceHost,
        options: {
          nodePath: nodePath,
        },
        fs,
        logger: logger.getChild(PolykeyClient.name),
        fresh: true,
      });
      await pkClient.stop();
      await pkClient.start({
        nodeId: pkAgent.keyRing.getNodeId(),
        port: pkAgent.clientServicePort,
        host: pkAgent.clientServiceHost,
      });
      expect(pkClient.host).toBe(pkAgent.clientServiceHost);
      expect(pkClient.port).toBe(pkAgent.clientServicePort);
      const connectionMeta = pkClient.webSocketClient.connection.meta();
      expect(connectionMeta.remoteCertsChain).toHaveLength(1);
      const remoteCert = connectionMeta.remoteCertsChain[0];
      const remoteCertPem = webSocketUtils.derToPEM(remoteCert);
      const agentCertPem = await pkAgent.certManager.getCurrentCertPEM();
      expect(remoteCertPem).toEqual(agentCertPem);
      await pkClient.stop();
    });
    test('authenticated RPC request to agent client service', async () => {
      const pkClient = await PolykeyClient.createPolykeyClient({
        nodeId: pkAgent.keyRing.getNodeId(),
        port: pkAgent.clientServicePort,
        host: pkAgent.clientServiceHost,
        options: {
          nodePath: nodePath,
        },
        fs,
        logger: logger.getChild(PolykeyClient.name),
        fresh: true,
      });
      const callP = pkClient.rpcClient.methods.agentStatus({});
      // Authentication error
      await expect(callP).rejects.toThrow(errors.ErrorPolykeyRemote);
      await testUtils.expectRemoteError(callP, errors.ErrorClientAuthMissing);
      // Correct auth runs without error
      await pkClient.rpcClient.methods.agentStatus({
        metadata: {
          authorization: clientUtils.encodeAuthFromPassword(password),
        },
      });
      await pkClient.stop();
    });
    test('WebSocketClient destruction causes PolykeyClient to stop', async () => {
      const pkClient = await PolykeyClient.createPolykeyClient({
        nodeId: pkAgent.keyRing.getNodeId(),
        port: pkAgent.clientServicePort,
        host: pkAgent.clientServiceHost,
        options: {
          nodePath: nodePath,
        },
        fs,
        logger: logger.getChild(PolykeyClient.name),
        fresh: true,
      });
      const { p: stoppedP, resolveP: resolveStoppedP } = utils.promise();
      pkClient.addEventListener(events.EventPolykeyClientStopped.name, () =>
        resolveStoppedP(),
      );
      // Promise that resolves when status changes
      await pkClient.webSocketClient.destroy({ force: true });
      await expect(stoppedP).toResolve();
      expect(pkClient[running]).toBe(false);
    });
  });
});
