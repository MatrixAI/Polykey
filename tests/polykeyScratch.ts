/**
 * This is a testfile for running manual tests with polykey without
 * the need for the CLI. This should allow streamline testing
 * against networks
 */
import type { Hostname } from '../src/network/types';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '../src/PolykeyAgent';
import { sleep } from '../src/utils';
import { encodeNodeId } from '../src/ids';
import { resolveSeednodes } from '../src/nodes/utils';

async function main() {
  const logger = new Logger('PolykeyAgent Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'password';
  const nodePath = './tmp/testnode';
  const seedNodes = await resolveSeednodes('testnet.polykey.com' as Hostname);
  // Setting up the agent

  const pkAgent = await PolykeyAgent.createPolykeyAgent({
    password,
    options: {
      nodePath,
      seedNodes,
    },
    fresh: true,
    logger,
  });

  await sleep(1000);

  for (const connection of pkAgent.nodeConnectionManager.listConnections()) {
    logger.warn(
      `${encodeNodeId(connection.nodeId)}@${connection.address.host}-${
        connection.address.port
      }`,
    );
  }
  logger.warn('started!');
  await sleep(1000);
  logger.warn('attempting find node for self');
  const start = Date.now();
  const result = await pkAgent.nodeManager.findNode(
    pkAgent.keyRing.getNodeId(),
    2000,
  );
  logger.warn(`findNode took ${Date.now() - start}`);
  logger.warn(`result, ${JSON.stringify(result, undefined, 1)}`);

  logger.warn('idling...');
  await sleep(100000);
  logger.warn('exiting!');

  await pkAgent.stop();
}

void main().then(() => {});
