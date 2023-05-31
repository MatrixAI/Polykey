import type Logger from '@matrixai/logger';
import type { NodeId } from '@/ids/types';
import type { StatusLive } from '@/status/types';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { IdInternal } from '@matrixai/id';
import * as keysUtils from '@/keys/utils';
import * as grpcErrors from '@/grpc/errors';
import * as rpcErrors from '@/rpc/errors';
import * as validationUtils from '@/validation/utils';
import * as utils from '@/utils';
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
      '--proxy-host',
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

function generateRandomNodeId(): NodeId {
  const random = keysUtils.getRandomBytes(16).toString('hex');
  return IdInternal.fromString<NodeId>(random);
}

const expectRemoteErrorOLD = async <T>(
  promise: Promise<T>,
  error,
): Promise<T | undefined> => {
  await expect(promise).rejects.toThrow(grpcErrors.ErrorPolykeyRemoteOLD);
  try {
    return await promise;
  } catch (e) {
    expect(e.cause).toBeInstanceOf(error);
  }
};

const expectRemoteError = async <T>(
  promise: Promise<T>,
  error,
): Promise<T | undefined> => {
  await expect(promise).rejects.toThrow(rpcErrors.ErrorPolykeyRemote);
  try {
    return await promise;
  } catch (e) {
    expect(e.cause).toBeInstanceOf(error);
  }
};

function testIf(condition: boolean) {
  return condition ? test : test.skip;
}

function describeIf(condition: boolean) {
  return condition ? describe : describe.skip;
}

export {
  setupTestAgent,
  generateRandomNodeId,
  expectRemoteErrorOLD,
  expectRemoteError,
  testIf,
  describeIf,
};
