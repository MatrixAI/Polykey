import type { NodeAddress } from '@/nodes/types';
import type { StatusLive } from '@/status/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import lock from 'fd-lock';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import { Status } from '@/status';
import { utils as keysUtils } from '@/keys';
import { GRPCClientClient, utils as clientUtils } from '@/client';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import { sleep } from '@/utils';
import config from '@/config';

/**
 * Setup the global keypair
 * This is expected to be executed by multiple worker processes
 */
async function setupGlobalKeypair() {
  const globalKeyPairDir = path.join(globalThis.dataDir, 'keypair');
  const globalKeyPairLock = await fs.promises.open(
    path.join(global.dataDir, 'keypair.lock'),
    fs.constants.O_WRONLY | fs.constants.O_CREAT,
  );
  while (!lock(globalKeyPairLock.fd)) {
    await sleep(1000);
  }
  try {
    try {
      await fs.promises.mkdir(globalKeyPairDir);
    } catch (e) {
      // Return key pair if the directory exists
      if (e.code === 'EEXIST') {
        const globalKeyPairPem = {
          publicKey: fs.readFileSync(path.join(globalKeyPairDir, 'root.pub'), 'utf-8'),
          privateKey: fs.readFileSync(
            path.join(globalKeyPairDir, 'root.key'),
            'utf-8',
          ),
        };
        const globalKeyPair = keysUtils.keyPairFromPem(globalKeyPairPem);
        return globalKeyPair;
      }
    }
    const globalKeyPair = await keysUtils.generateKeyPair(4096);
    const globalKeyPairPem = keysUtils.keyPairToPem(globalKeyPair);
    await Promise.all([
      fs.promises.writeFile(
        path.join(globalKeyPairDir, 'root.pub'),
        globalKeyPairPem.publicKey,
        'utf-8',
      ),
      fs.promises.writeFile(
        path.join(globalKeyPairDir, 'root.key'),
        globalKeyPairPem.privateKey,
        'utf-8',
      ),
    ]);
    return globalKeyPair;
  } finally  {
    // Unlock when we have returned the keypair
    lock.unlock(globalKeyPairLock.fd);
    await globalKeyPairLock.close();
  }
}

/**
 * Setup the global agent
 * Use this in beforeAll, and use the closeGlobalAgent in afterAll
 * This is expected to be executed by multiple worker processes
 * Uses a references directory as a reference count
 * Uses fd-lock to serialise access
 * This means all test modules using this will be serialised
 * Any beforeAll must use global.maxTimeout
 * Tips for usage:
 *   * Do not restart this global agent
 *   * Ensure client-side side-effects are removed at the end of each test
 *   * Ensure server-side side-effects are removed at the end of each test
 */
async function setupGlobalAgent(
  logger: Logger = new Logger(setupGlobalAgent.name, LogLevel.WARN, [
    new StreamHandler(),
  ])
) {
  const globalAgentPassword = 'password';
  const globalAgentDir = path.join(globalThis.dataDir, 'agent');
  // The references directory will act like our reference count
  await fs.promises.mkdir(path.join(globalAgentDir, 'references'), {
    recursive: true,
  });
  const pid = process.pid.toString();
  // Plus 1 to the reference count
  await fs.promises.writeFile(path.join(globalAgentDir, 'references', pid), '');
  const globalAgentLock = await fs.promises.open(
    path.join(global.dataDir, 'agent.lock'),
    fs.constants.O_WRONLY | fs.constants.O_CREAT,
  );
  while (!lock(globalAgentLock.fd)) {
    await sleep(1000);
  }
  const status = new Status({
    statusPath: path.join(
      globalAgentDir,
      config.defaults.statusBase
    ),
    fs,
  });
  let statusInfo = await status.readStatus();
  if (statusInfo == null || statusInfo.status === 'DEAD')  {
    await PolykeyAgent.createPolykeyAgent({
      password: globalAgentPassword,
      nodePath: globalAgentDir,
      keysConfig: {
        rootKeyPairBits: 1024
      },
      logger,
    });
    statusInfo = await status.readStatus();
  }
  return {
    globalAgentDir,
    globalAgentPassword,
    globalAgentStatus: statusInfo as StatusLive,
    globalAgentClose: async () => {
      // Closing the global agent cannot be done in the globalTeardown
      // This is due to a sequence of reasons:
      // 1. The global agent is not started as a separate process
      // 2. Because we need to be able to mock dependencies
      // 3. This means it is part of a jest worker process
      // 4. Which will block termination of the jest worker process
      // 5. Therefore globalTeardown will never get to execute
      // 6. The global agent is not part of globalSetup
      // 7. Because not all tests need the global agent
      // 8. Therefore setupGlobalAgent is lazy and executed by jest worker processes
      try {
        await fs.promises.rm(
          path.join(globalAgentDir, 'references', pid),
        );
        // If the references directory is not empty
        // there are other processes still using the global agent
        try {
          await fs.promises.rmdir(path.join(globalAgentDir, 'references'));
        } catch (e) {
          if (e.code === 'ENOTEMPTY') {
            return;
          }
          throw e;
        }
        // Stopping may occur in a different jest worker process
        // therefore we cannot rely on pkAgent, but instead use GRPC
        const statusInfo = await status.readStatus() as StatusLive;
        const grpcClient = await GRPCClientClient.createGRPCClientClient({
          nodeId: statusInfo.data.nodeId,
          host: statusInfo.data.clientHost,
          port: statusInfo.data.clientPort,
          tlsConfig: { keyPrivatePem: undefined, certChainPem: undefined },
          logger
        });
        const emptyMessage = new utilsPB.EmptyMessage();
        const meta = clientUtils.encodeAuthFromPassword(globalAgentPassword);
        // This is asynchronous
        await grpcClient.agentStop(emptyMessage, meta);
        await grpcClient.destroy();
        await status.waitFor('DEAD');
      } finally {
        lock.unlock(globalAgentLock.fd);
        await globalAgentLock.close();
      }
    }
  };
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
    host: remoteNode.revProxy.getIngressHost(),
    port: remoteNode.revProxy.getIngressPort(),
  } as NodeAddress);
}

export {
  setupGlobalKeypair,
  setupGlobalAgent,
  makeCrypto,
  setupRemoteKeynode,
  cleanupRemoteKeynode,
  addRemoteDetails,
};
