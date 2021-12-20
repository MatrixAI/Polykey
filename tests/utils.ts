import type Logger from '@matrixai/logger';
import type { NodeAddress } from '@/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { PolykeyAgent } from '@';
import * as keysUtils from '@/keys/utils';

async function getGlobalKeyPair() {
  const [publicKeyPem, privateKeyPem] = await Promise.all([
    fs.promises.readFile(path.join(global.keyPairDir, 'root.pub'), 'utf-8'),
    fs.promises.readFile(path.join(global.keyPairDir, 'root.key'), 'utf-8'),
  ]);
  return keysUtils.keyPairFromPem({
    publicKey: publicKeyPem,
    privateKey: privateKeyPem,
  });
}

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
    // Add the directory.
    nodeDir = path.join(dataDir, `remoteNode`);
    await fs.promises.mkdir(nodeDir, { recursive: true });
  } else {
    nodeDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-remote-'),
    );
  }
  const agent = await PolykeyAgent.createPolykeyAgent({
    password: 'password',
    nodePath: nodeDir,
    logger: logger,
  });
  return agent;
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
  await localNode.nodeManager.setNode(remoteNode.nodeManager.getNodeId(), {
    host: remoteNode.revProxy.ingressHost,
    port: remoteNode.revProxy.ingressPort,
  } as NodeAddress);
}

function makeCrypto(dbKey: Buffer) {
  return {
    key: dbKey,
    ops: {
      encrypt: keysUtils.encryptWithKey,
      decrypt: keysUtils.decryptWithKey,
    },
  };
}

export {
  getGlobalKeyPair,
  setupRemoteKeynode,
  cleanupRemoteKeynode,
  addRemoteDetails,
  makeCrypto,
};
