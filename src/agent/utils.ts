import fs from 'fs';
import path from 'path';
import { Lockfile } from '../lockfile';
import { pidIsRunning } from '../utils';

async function checkAgentRunning(nodePath: string): Promise<boolean> {
  if (
    (await Lockfile.checkLock(fs, path.join(nodePath, 'agent-lock.json'))) !==
    'DOESNOTEXIST'
  ) {
    // Interrogate Lock File
    const lock = await Lockfile.parseLock(
      fs,
      path.join(nodePath, 'agent-lock.json'),
    );

    if (pidIsRunning(lock.pid)) {
      return true;
    }
  }
  return false;
}

export { checkAgentRunning };
