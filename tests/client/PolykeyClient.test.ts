import type { NodeId } from '@/nodes/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import * as grpc from '@grpc/grpc-js';

import { PolykeyClient } from '@';
import { GitManager } from '@/git';
import { NodeManager } from '@/nodes';
import { VaultManager } from '@/vaults';
import { GestaltGraph } from '@/gestalts';
import { SessionManager } from '@/session';
import { IdentitiesManager } from '@/identities';
import { ACL } from '@/acl';
import { clientPB, GRPCClientClient } from '@/client';
import { KeyManager, utils as keyUtils } from '@/keys';
import { ForwardProxy, ReverseProxy, utils as networkUtils } from '@/network';
import { Lockfile } from '@/lockfile';
import { DB } from '@/db';

import * as testUtils from './utils';

describe('GRPCClientClient', () => {
  const logger = new Logger('GRPCClientClientTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let client: GRPCClientClient;
  let pkClient: PolykeyClient;
  let server: grpc.Server;
  let port: number;

  let dataDir: string;
  let keysPath: string;
  let nodesPath: string;
  let vaultsPath: string;
  let identitiesPath: string;
  let dbPath: string;

  let keyManager: KeyManager;
  let gitManager: GitManager;
  let nodeManager: NodeManager;
  let vaultManager: VaultManager;
  let gestaltGraph: GestaltGraph;
  let identitiesManager: IdentitiesManager;
  let sessionManager: SessionManager;
  let acl: ACL;
  let db: DB;

  let fwdProxy: ForwardProxy;
  let revProxy: ReverseProxy;

  let nodeId: NodeId;
  let lockfile: Lockfile;

  beforeEach(async () => {
    const keyPair = await keyUtils.generateKeyPair(4096);
    const cert = keyUtils.generateCertificate(
      keyPair.publicKey,
      keyPair.privateKey,
      keyPair.privateKey,
      86400,
    );
    nodeId = networkUtils.certNodeId(cert);

    // Managers & Services
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    keysPath = path.join(dataDir, 'keys');
    nodesPath = path.join(dataDir, 'nodes');
    vaultsPath = path.join(dataDir, 'vaults');
    identitiesPath = path.join(dataDir, 'identities');
    dbPath = path.join(dataDir, 'db');

    lockfile = new Lockfile({
      nodePath: dataDir,
      fs: fs,
      logger: logger.getChild('Lockfile'),
    });

    fwdProxy = new ForwardProxy({
      authToken: 'abc',
      logger: logger,
    });

    revProxy = new ReverseProxy({
      logger: logger,
    });

    keyManager = new KeyManager({
      keysPath,
      fs: fs,
      logger: logger,
    });

    db = new DB({
      dbPath: dbPath,
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });

    acl = new ACL({
      db: db,
      logger: logger,
    });

    gestaltGraph = new GestaltGraph({
      db: db,
      acl: acl,
      logger: logger,
    });

    vaultManager = new VaultManager({
      vaultsPath: vaultsPath,
      keyManager: keyManager,
      db: db,
      acl: acl,
      gestaltGraph: gestaltGraph,
      fs: fs,
      logger: logger,
    });

    nodeManager = new NodeManager({
      nodesPath: nodesPath,
      keyManager: keyManager,
      fwdProxy: fwdProxy,
      revProxy: revProxy,
      fs: fs,
      logger: logger,
    });

    identitiesManager = new IdentitiesManager({
      identitiesPath: identitiesPath,
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });

    gitManager = new GitManager({
      vaultManager,
      nodeManager,
    });

    sessionManager = new SessionManager({
      keyManager: keyManager,
      logger: logger,
    });

    sessionManager = new SessionManager({
      keyManager: keyManager,
      logger: logger,
    });

    await keyManager.start({ password: 'password' });
    await db.start();
    await acl.start();
    await vaultManager.start({});
    await nodeManager.start({ nodeId: nodeId });
    await identitiesManager.start();
    await gestaltGraph.start();
    await sessionManager.start({ sessionDuration: 3000 });

    [server, port] = await testUtils.openTestClientServer({
      keyManager,
      vaultManager,
      nodeManager,
      identitiesManager,
      gestaltGraph,
      gitManager,
      sessionManager,
    });

    await lockfile.start({ nodeId });
    await lockfile.updateLockfile('host', '127.0.0.1');
    await lockfile.updateLockfile('port', port);
    await lockfile.updateLockfile('fwdProxyHost', '::');
    await lockfile.updateLockfile('fwdProxyPort', 0);

    pkClient = new PolykeyClient({
      nodePath: dataDir,
      fs: fs,
      logger: logger,
    });

    await pkClient.start({});

    client = pkClient.grpcClient;
    await client.start({});
  });
  afterEach(async () => {
    await client.stop();
    await pkClient.stop();
    await testUtils.closeTestClientServer(server);

    await lockfile.stop();
    await sessionManager.stop();
    await gestaltGraph.stop();
    await identitiesManager.stop();
    await nodeManager.stop();
    await vaultManager.stop();
    await db.stop();
    await keyManager.stop();

    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('echo', async () => {
    const echoMessage = new clientPB.EchoMessage();
    echoMessage.setChallenge('yes');
    await client.echo(echoMessage);
    const response = await client.echo(echoMessage);
    expect(response.getChallenge()).toBe('yes');
  });
});
