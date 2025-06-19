import type {
  IdentityRequestData,
  IdentityResponseData,
} from '#src/client/types.js';
import type { TLSConfig } from '#network/types.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { RPCClient } from '@matrixai/rpc';
import { WebSocketClient } from '@matrixai/ws';
import * as testsUtils from '../../utils/index.js';
import { AuthSignToken } from '#client/handlers/index.js';
import { authSignToken } from '#client/callers/index.js';
import KeyRing from '#keys/KeyRing.js';
import Token from '#tokens/Token.js';
import ClientService from '#client/ClientService.js';
import * as keysUtils from '#keys/utils/index.js';
import * as networkUtils from '#network/utils.js';
import * as clientErrors from '#client/errors.js';

describe('authSignToken', () => {
  const logger = new Logger('authSignToken test', LogLevel.WARN, [
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
    authSignToken: typeof authSignToken;
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
        authSignToken: new AuthSignToken({
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
        authSignToken,
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

  test('should sign a valid token', async () => {
    // Create token with separate key pair
    const keyPair = keysUtils.generateKeyPair();
    const token = Token.fromPayload<IdentityRequestData>({
      publicKey: keyPair.publicKey.toString('base64url'),
      returnURL: 'test',
    });
    token.signWithPrivateKey(keyPair);

    // Get the node to sign the token as well
    const encodedToken = token.toEncoded();
    const identityToken = await rpcClient.methods.authSignToken(encodedToken);

    // Check the signature of both the incoming token and the original sent token
    const decodedToken = Token.fromEncoded<IdentityResponseData>(identityToken);
    const decodedPublicKey = keysUtils.publicKeyFromNodeId(keyRing.getNodeId());
    expect(decodedToken.verifyWithPublicKey(decodedPublicKey)).toBeTrue();
    const requestToken = Token.fromEncoded<IdentityRequestData>(
      decodedToken.payload.requestToken,
    );
    expect(requestToken.verifyWithPublicKey(keyPair.publicKey)).toBeTrue();
  });

  test('should fail if public key does not match signature', async () => {
    // Create token with a key pair and sign it with another
    const keyPair1 = keysUtils.generateKeyPair();
    const keyPair2 = keysUtils.generateKeyPair();
    const token = Token.fromPayload<IdentityRequestData>({
      publicKey: keyPair1.publicKey.toString('base64url'),
      returnURL: 'test',
    });
    token.signWithPrivateKey(keyPair2);

    // The token should fail validation
    const encodedToken = token.toEncoded();
    await testsUtils.expectRemoteError(
      rpcClient.methods.authSignToken(encodedToken),
      clientErrors.ErrorClientAuthenticationInvalidToken,
    );
  });
});
