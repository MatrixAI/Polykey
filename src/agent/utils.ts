import fs from 'fs';
import path from 'path';
import { spawn } from 'cross-spawn';
import { SpawnOptions } from 'child_process';

import { Lockfile } from '../lockfile';

import * as agentUtils from '../utils';
import * as agentErrors from '../errors';

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

    if (agentUtils.pidIsRunning(lock.pid)) {
      return true;
    }
  }
  return false;
}

async function spawnBackgroundAgent( // FIXME, this is broken.
  nodePath: string,
  password: string,
): Promise<number> {
  //Checking agent running.
  if (await checkAgentRunning(nodePath)) {
    throw new agentErrors.ErrorAgentRunning(
      `Unable to spawn Agent, already running at: ${nodePath}`,
    );
  }

  const logPath = path.join(nodePath, 'agent', 'log');

  try {
    await fs.promises.mkdir(logPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    } else {
      await fs.promises.rmdir(logPath, { recursive: true });
      await fs.promises.mkdir(logPath, { recursive: true });
    }
  }

  const options: SpawnOptions = {
    detached: true,
    stdio: [
      'ignore',
      fs.openSync(path.join(logPath, 'output.log'), 'a'),
      fs.openSync(path.join(logPath, 'error.log'), 'a'),
      'ipc',
    ],
    uid: process.getuid(),
  };

  let spawnPath: string;

  const isElectron = false;

  const prefix = path.resolve(__dirname, 'backgroundAgent.');
  const suffix = fs.existsSync(prefix + 'js') ? 'js' : 'ts';

  const DAEMON_SCRIPT_PATH = prefix + suffix;

  if (isElectron) {
    options['env'] = {
      ELECTRON_RUN_AS_NODE: '1',
    };
    spawnPath = process.execPath;
  } else {
    spawnPath = DAEMON_SCRIPT_PATH.includes('.js') ? 'node' : 'ts-node';
  }

  //Spawning the process.
  const agentProcess = spawn(spawnPath, [DAEMON_SCRIPT_PATH], options);

  const startOptions = {
    nodePath: nodePath,
    password: password,
  };

  let pid;

  let externalResolve;
  let externalReject;
  const promise = new Promise((resolve, reject) => {
    externalResolve = resolve;
    externalReject = reject;
  });

  agentProcess.send(JSON.stringify(startOptions), (err: Error) => {
    if (err != null) {
      agentProcess.kill('SIGTERM');
    } else {
      pid = agentProcess.pid;
      agentProcess.on('message', (msg) => {
        agentProcess.unref();
        agentProcess.disconnect();
        if (msg !== 'started') {
          externalReject(
            'something went wrong, child process did not start polykey agent',
          );
        }
        externalResolve();
      });
    }
  });

  await promise;
  return pid;
}

export { spawnBackgroundAgent, checkAgentRunning };
