import type { IdentityResponseData } from '#src/client/types.js';
import type { TLSConfig } from '#network/types.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { RPCClient } from '@matrixai/rpc';
import { WebSocketClient } from '@matrixai/ws';
import * as testsUtils from '../../utils/index.js';
import { AuthIdentityToken } from '#client/handlers/index.js';
import { authIdentityToken } from '#client/callers/index.js';
import KeyRing from '#keys/KeyRing.js';
import Token from '#tokens/Token.js';
import ClientService from '#client/ClientService.js';
import * as keysUtils from '#keys/utils/index.js';
import * as networkUtils from '#network/utils.js';
import * as nodesUtils from '#nodes/utils.js';

describe('authIdentityToken', () => {
  const logger = new Logger('authIdentityToken test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'password';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    authIdentityToken: typeof authIdentityToken;
  }>;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        authIdentityToken: new AuthIdentityToken({
          keyRing,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        authIdentityToken,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });

  afterEach(async () => {
    await keyRing.stop();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('should return a signed token', async () => {
    const identityToken = await rpcClient.methods.authIdentityToken({});
    const decodedToken = Token.fromEncoded<IdentityResponseData>(identityToken);
    const decodedPublicKey = keysUtils.publicKeyFromNodeId(keyRing.getNodeId());
    expect(decodedToken.verifyWithPublicKey(decodedPublicKey)).toBeTrue();
    const encodedNodeId = nodesUtils.encodeNodeId(keyRing.getNodeId());
    expect(decodedToken.payload.iss).toBe(encodedNodeId);
    expect(decodedToken.payload.exp).toBeDefined();
    expect(decodedToken.payload.jti).toBeDefined();
  });
});
