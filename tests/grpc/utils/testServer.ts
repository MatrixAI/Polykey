/**
 * This is spawned as a background process for use in some NodeConnection.test.ts tests
 * This process will not preserve jest testing environment,
 * any usage of jest globals will result in an error
 * Beware of propagated usage of jest globals through the script dependencies
 * @module
 */
import * as grpc from '@grpc/grpc-js';
import * as utils from './utils';

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
  void main();
}

export default main;
