import type { StatusLive } from '@/status/types';
import type Logger from '@matrixai/logger';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import * as utils from '@/utils';
import * as validationUtils from '@/validation/utils';
import * as execUtils from './exec';

async function setupTestAgent(logger: Logger) {
  const agentDir = await fs.promises.mkdtemp(
    path.join(globalThis.tmpDir, 'polykey-test-'),
  );
  const agentPassword = 'password';
  const agentProcess = await execUtils.pkSpawn(
    [
      'agent',
      'start',
      '--node-path',
      agentDir,
      '--client-host',
      '127.0.0.1',
      '--agent-host',
      '127.0.0.1',
      '--workers',
      'none',
      '--format',
      'json',
      '--verbose',
    ],
    {
      env: {
        PK_PASSWORD: agentPassword,
        PK_PASSWORD_OPS_LIMIT: 'min',
        PK_PASSWORD_MEM_LIMIT: 'min',
      },
      cwd: agentDir,
      command: globalThis.testCmd,
    },
    logger,
  );
  const startedProm = utils.promise<any>();
  agentProcess.on('error', (d) => startedProm.rejectP(d));
  const rlOut = readline.createInterface(agentProcess.stdout!);
  rlOut.on('line', (l) => startedProm.resolveP(JSON.parse(l.toString())));
  const data = await startedProm.p;
  const agentStatus: StatusLive = {
    status: 'LIVE',
    data: { ...data, nodeId: validationUtils.parseNodeId(data.nodeId) },
  };
  try {
    return {
      agentStatus,
      agentClose: async () => {
        agentProcess.kill();
        await fs.promises.rm(agentDir, {
          recursive: true,
          force: true,
          maxRetries: 10,
        });
      },
      agentDir,
      agentPassword,
    };
  } catch (e) {
    agentProcess.kill();
    await fs.promises.rm(agentDir, {
      recursive: true,
      force: true,
      maxRetries: 10,
    });
    throw e;
  }
}

export { setupTestAgent };
