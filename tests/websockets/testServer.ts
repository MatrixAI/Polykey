/**
 * This is spawned as a background process for use in some NodeConnection.test.ts tests
 * This process will not preserve jest testing environment,
 * any usage of jest globals will result in an error
 * Beware of propagated usage of jest globals through the script dependencies
 * @module
 */
import type { CertificatePEMChain, PrivateKeyPEM } from '@/keys/types';
import type { TLSConfig } from '@/network/types';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import WebSocketServer from '@/websockets/WebSocketServer';

async function main() {
  const logger = new Logger('websocket test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const tlsConfig: TLSConfig = {
    keyPrivatePem: process.env.PK_TEST_KEY_PRIVATE_PEM as PrivateKeyPEM,
    certChainPem: process.env.PK_TEST_CERT_CHAIN_PEM as CertificatePEMChain,
  };
  const clientServer = await WebSocketServer.createWebSocketServer({
    connectionCallback: (_) => {
      // Ignore streams and hang connections
    },
    host: process.env.PK_TEST_HOST ?? '127.0.0.1',
    tlsConfig,
    logger,
  });
  process.stdout.write(`${clientServer.getPort()}`);
}

if (require.main === module) {
  void main();
}

export default main;
