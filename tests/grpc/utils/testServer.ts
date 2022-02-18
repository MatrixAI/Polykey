/**
 * This is spawned as a background process for use in some NodeConnection.test.ts tests
 * @module
 */
import * as grpc from '@grpc/grpc-js';
import * as utils from './index';

async function main() {
  const authenticate = async (metaClient, metaServer = new grpc.Metadata()) =>
    metaServer;
  const [server, port] = await utils.openTestServer(authenticate);
  process.stdout.write(`${port}`);
  process.stdin.on('data', () => {
    server.forceShutdown();
  });
}

if (require.main === module) {
  (async () => {
    await main();
  })();
}

export default main;
