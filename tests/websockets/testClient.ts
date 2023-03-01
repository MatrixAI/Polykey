/**
 * This is spawned as a background process for use in some NodeConnection.test.ts tests
 * This process will not preserve jest testing environment,
 * any usage of jest globals will result in an error
 * Beware of propagated usage of jest globals through the script dependencies
 * @module
 */
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import WebSocketClient from '@/websockets/WebSocketClient';
import * as nodesUtils from '@/nodes/utils';

async function main() {
  const logger = new Logger('websocket test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const clientClient = await WebSocketClient.createWebSocketClient({
    expectedNodeIds: [nodesUtils.decodeNodeId(process.env.PK_TEST_NODE_ID!)!],
    host: process.env.PK_TEST_HOST ?? '127.0.0.1',
    port: parseInt(process.env.PK_TEST_PORT!),
    logger,
  });
  // Ignore streams, make connection hang
  await clientClient.startConnection();
  process.stdout.write(`ready`);
}

if (require.main === module) {
  void main();
}

export default main;
