import type { NodeId } from '@/nodes/types';
import type { ClaimData } from '@/claims/types';
import type { ProviderId, IdentityId } from '@/identities/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { KeyManager } from '@/keys';
import { NodeManager } from '@/nodes';
import { ForwardProxy, ReverseProxy, utils as networkUtils } from '@/network';
import { Sigchain } from '@/sigchain';
import * as keysUtils from '@/keys/utils';
import * as gestaltsUtils from '@/gestalts/utils';
import * as claimsUtils from '@/claims/utils';
import { DB } from '@/db';

describe('NodeManager', () => {
  const logger = new Logger('NodeManagerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;

  const fwdProxy = new ForwardProxy({
    authToken: 'abc',
    logger: logger,
  });
  const revProxy = new ReverseProxy({
    logger: logger,
  });
  let keyManager: KeyManager;
  let keyPairPem, certPem;
  let nodeId: NodeId;
  let db: DB;
  let sigchain: Sigchain;

  beforeAll(async () => {
    const keyPair = await keysUtils.generateKeyPair(4096);
    keyPairPem = keysUtils.keyPairToPem(keyPair);
    const cert = keysUtils.generateCertificate(
      keyPair.publicKey,
      keyPair.privateKey,
      keyPair.privateKey,
      86400,
    );
    certPem = keysUtils.certToPem(cert);
    nodeId = networkUtils.certNodeId(cert);
  });

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyManager = new KeyManager({ keysPath, logger });
    await keyManager.start({ password: 'password' });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem,
        certChainPem: certPem,
      },
    });
    const dbPath = `${dataDir}/db`;
    db = new DB({ dbPath, logger });
    await db.start({
      keyPair: keyManager.getRootKeyPair(),
    });
    sigchain = new Sigchain({ keyManager, db, logger });
    await sigchain.start();
  });
  afterEach(async () => {
    await db.stop();
    await keyManager.stop();
    await fwdProxy.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('placeholder', async () => {});
});
