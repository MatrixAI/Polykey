import type { NodeId } from '@/ids/types';
import type { StatusLive } from '@/status/types';
import type Logger from '@matrixai/logger';
import type * as fc from 'fast-check';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { IdInternal } from '@matrixai/id';
import * as keysUtils from '@/keys/utils';
import * as grpcErrors from '@/grpc/errors';
import * as validationUtils from '@/validation/utils';
import { promise } from '@/utils';
import * as execUtils from './exec';
import { CertId } from '@/ids/types';
import { TLSConfig } from '../../src/network/types';
import { CertificatePEMChain, KeyPair } from '../../src/keys/types';

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
      '0',
      '--format',
      'json',
      '--verbose',
    ],
    {
      env: {
        PK_PASSWORD: agentPassword,
      },
      cwd: agentDir,
      command: globalThis.testCmd,
    },
    logger,
  );
  const startedProm = promise<any>();
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

const expectRemoteError = async <T>(
  promise: Promise<T>,
  error,
): Promise<T | undefined> => {
  await expect(promise).rejects.toThrow(grpcErrors.ErrorPolykeyRemote);
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

/**
 * Used with fast-check to schedule calling of a function
 */
const scheduleCall = <T>(
  s: fc.Scheduler,
  f: () => Promise<T>,
  label: string = 'scheduled call',
) => s.schedule(Promise.resolve(label)).then(() => f());

async function createTLSConfig(keyPair: KeyPair, generateCertId?: () => CertId): Promise<TLSConfig> {
  generateCertId  = generateCertId ?? keysUtils.createCertIdGenerator();
  const certificate = await keysUtils.generateCertificate({
    certId: generateCertId(),
    duration: 31536000,
    issuerPrivateKey: keyPair.privateKey,
    subjectKeyPair: { privateKey: keyPair.privateKey, publicKey: keyPair.publicKey }
  });
  return {
    keyPrivatePem: keysUtils.privateKeyToPEM(keyPair.privateKey),
    certChainPem: keysUtils.certToPEM(certificate) as unknown as CertificatePEMChain,
  };
}

export {
  setupTestAgent,
  generateRandomNodeId,
  expectRemoteError,
  testIf,
  describeIf,
  scheduleCall,
  createTLSConfig,
};
