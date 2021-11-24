import type { KeynodeState } from './types';

import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import * as bootstrapErrors from './errors';
import PolykeyAgent from '../PolykeyAgent';

import * as errors from '../errors';
import * as utils from '../utils';
import * as agentUtils from '../agent/utils';

async function bootstrapPolykeyState(
  nodePath: string,
  password: string,
): Promise<void> {
  const logger = new Logger('AgentServerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);

  // Checks
  // Checking for running agent.
  if (await agentUtils.checkAgentRunning(nodePath)) {
    throw new errors.ErrorAgentRunning('Agent currently running.');
  }

  // Checking keynode state.
  switch (await checkKeynodeState(nodePath)) {
    default: // Shouldn't be possible.
    case 'MALFORMED_KEYNODE':
      throw new bootstrapErrors.ErrorMalformedKeynode();
    case 'KEYNODE_EXISTS':
      throw new bootstrapErrors.ErrorExistingState(
        'Polykey already exists at node path',
      );
    case 'OTHER_EXISTS':
      throw new bootstrapErrors.ErrorExistingState(
        'Files already exists at node path',
      );
    case 'EMPTY_DIRECTORY':
    case 'NO_DIRECTORY':
      // This is fine.
      break;
  }

  const polykeyAgent = await PolykeyAgent.createPolykeyAgent({
    password,
    nodePath: nodePath,
    logger: logger,
  });

  // Setting FS editing mask.
  const umaskNew = 0o077;
  process.umask(umaskNew);
  await utils.mkdirExists(fs, nodePath, { recursive: true });

  // Starting and creating state (this will need to be changed with the new db stuff)
  await polykeyAgent.nodeManager.start();

  // Stopping
  await polykeyAgent.nodeManager.stop();
  await polykeyAgent.db.stop();

  await polykeyAgent.destroy();
}

async function checkKeynodeState(nodePath: string): Promise<KeynodeState> {
  try {
    const files = await fs.promises.readdir(nodePath);
    // Checking if directory structure matches keynode structure. Possibly check the private and public key and the level db for keys)
    if (
      files.includes('keys') &&
      files.includes('db') &&
      files.includes('versionFile')
    ) {
      const keysPath = path.join(nodePath, 'keys');
      const keysFiles = await fs.promises.readdir(keysPath);
      if (
        !keysFiles.includes('db.key') ||
        !keysFiles.includes('root_certs') ||
        !keysFiles.includes('root.crt') ||
        !keysFiles.includes('root.key') ||
        !keysFiles.includes('root.pub') ||
        !keysFiles.includes('vault.key')
      ) {
        return 'MALFORMED_KEYNODE';
      }
      return 'KEYNODE_EXISTS'; // Should be a good initilized keynode.
    } else {
      if (files.length !== 0) {
        return 'OTHER_EXISTS'; // Bad structure, either malformed or not a keynode.
      } else {
        return 'EMPTY_DIRECTORY'; // Directy exists, but is empty, can make a keynode.
      }
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      return 'NO_DIRECTORY'; // The directory does not exist, we can create a bootstrap a keynode.
    } else {
      throw e;
    }
  }
}

export { bootstrapPolykeyState, KeynodeState, checkKeynodeState };
