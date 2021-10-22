import type { NodeAddress } from '@/nodes/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger from '@matrixai/logger';
import { PolykeyAgent } from '../src';
import { sleep } from '@/utils';
import { KeyManager, utils as keyUtils } from '@/keys';

/**
 * Helper function to create a remote keynode to contact.
 * It will append a directory to options.baseDir or create it's own temp directory if not specified.
 * For multiple nodes, specify a unique number.
 */
async function setupRemoteKeynode({
  logger,
  dataDir,
}: {
  logger: Logger;
  dataDir?: string;
}): Promise<PolykeyAgent> {
  // Create and start the keynode + its temp directory
  let nodeDir: string;
  if (dataDir) {
    //Add the directory.
    nodeDir = path.join(dataDir, `remoteNode`);
    await fs.promises.mkdir(nodeDir, { recursive: true });
  } else {
    nodeDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-remote-'),
    );
  }
  const remote = await PolykeyAgent.createPolykey({
    password: 'password',
    nodePath: nodeDir,
    logger: logger,
    cores: 1,
    workerManager: null
  });
  await remote.start({});
  return remote;
}

/**
 * Helper function to stop a created remote keynode, and remove its temporary
 * directory.
 */
async function cleanupRemoteKeynode(node: PolykeyAgent): Promise<void> {
  await node.stop();
  await node.destroy();
  await fs.promises.rm(node.nodePath, {
    force: true,
    recursive: true,
  });
}

async function addRemoteDetails(
  localNode: PolykeyAgent,
  remoteNode: PolykeyAgent,
) {
  // Add remote node's details to local node
  await localNode.nodes.setNode(remoteNode.nodes.getNodeId(), {
    ip: remoteNode.revProxy.getIngressHost(),
    port: remoteNode.revProxy.getIngressPort(),
  } as NodeAddress);
}

async function poll(
  timeout: number,
  condition: () => Promise<boolean>,
  delay: number = 1000,
) {
  let timeProgress = 0;
  while (timeProgress < timeout) {
    if (await condition()) break;
    await sleep(delay);
    timeProgress += delay;
  }
  expect(await condition()).toBeTruthy();
}

function makeCrypto(keyManager: KeyManager) {
  return {
    key: keyManager.dbKey,
    ops: {
      encrypt: keyUtils.encryptWithKey,
      decrypt: keyUtils.decryptWithKey,
    },
  };
}

export {
  setupRemoteKeynode,
  cleanupRemoteKeynode,
  addRemoteDetails,
  poll,
  makeCrypto,
};
