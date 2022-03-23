import type { FileSystem } from '../types';
import type { RecoveryCode } from '../keys/types';
import path from 'path';
import Logger from '@matrixai/logger';
import { DB } from '@matrixai/db';
import * as bootstrapErrors from './errors';
import { IdentitiesManager } from '../identities';
import { SessionManager } from '../sessions';
import { Status } from '../status';
import { Schema } from '../schema';
import { KeyManager, utils as keyUtils } from '../keys';
import { Sigchain } from '../sigchain';
import { ACL } from '../acl';
import { GestaltGraph } from '../gestalts';
import Proxy from '../network/Proxy';
import { NodeConnectionManager, NodeGraph, NodeManager } from '../nodes';
import { VaultManager } from '../vaults';
import { NotificationsManager } from '../notifications';
import { mkdirExists } from '../utils';
import config from '../config';
import * as utils from '../utils';
import * as errors from '../errors';

/**
 * Bootstraps the Node Path
 */
async function bootstrapState({
  password,
  nodePath = config.defaults.nodePath,
  keysConfig = {},
  fresh = false,
  fs = require('fs'),
  logger = new Logger(bootstrapState.name),
}: {
  password: string;
  nodePath?: string;
  keysConfig?: {
    rootKeyPairBits?: number;
    rootCertDuration?: number;
    dbKeyBits?: number;
    recoveryCode?: RecoveryCode;
  };
  fresh?: boolean;
  fs?: FileSystem;
  logger?: Logger;
}): Promise<RecoveryCode> {
  const umask = 0o077;
  logger.info(`Setting umask to ${umask.toString(8).padStart(3, '0')}`);
  process.umask(umask);
  logger.info(`Setting node path to ${nodePath}`);
  if (nodePath == null) {
    throw new errors.ErrorUtilsNodePath();
  }
  const keysConfig_ = {
    ...config.defaults.keysConfig,
    ...utils.filterEmptyObject(keysConfig),
  };
  await mkdirExists(fs, nodePath);
  // Setup node path and sub paths
  const statusPath = path.join(nodePath, config.defaults.statusBase);
  const statusLockPath = path.join(nodePath, config.defaults.statusLockBase);
  const statePath = path.join(nodePath, config.defaults.stateBase);
  const dbPath = path.join(statePath, config.defaults.dbBase);
  const keysPath = path.join(statePath, config.defaults.keysBase);
  const vaultsPath = path.join(statePath, config.defaults.vaultsBase);
  const status = new Status({
    statusPath,
    statusLockPath,
    fs,
    logger,
  });
  try {
    await status.start({ pid: process.pid });
    if (!fresh) {
      // Check the if number of directory entries is greater than 1 due to status.json and status.lock
      if ((await fs.promises.readdir(nodePath)).length > 2) {
        throw new bootstrapErrors.ErrorBootstrapExistingState();
      }
    }
    // Construction occurs here, fresh is propagated
    // If any creations fail, then nodePath may be left with intermediate state
    // Therefore the fresh parameter is expected to be true under normal usage
    // Because it will work even if the node path is occupied
    const schema = await Schema.createSchema({
      statePath,
      fs,
      logger: logger.getChild(Schema.name),
      fresh,
    });
    const keyManager = await KeyManager.createKeyManager({
      ...keysConfig_,
      keysPath,
      password,
      fs,
      logger: logger.getChild(KeyManager.name),
      fresh,
    });
    const db = await DB.createDB({
      dbPath,
      fs,
      logger: logger.getChild(DB.name),
      crypto: {
        key: keyManager.dbKey,
        ops: {
          encrypt: keyUtils.encryptWithKey,
          decrypt: keyUtils.decryptWithKey,
        },
      },
      fresh,
    });
    const identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      logger: logger.getChild(IdentitiesManager.name),
      fresh,
    });
    const sigchain = await Sigchain.createSigchain({
      db,
      keyManager,
      logger: logger.getChild(Sigchain.name),
      fresh,
    });
    const acl = await ACL.createACL({
      db,
      logger: logger.getChild(ACL.name),
      fresh,
    });
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      acl,
      db,
      logger: logger.getChild(GestaltGraph.name),
      fresh,
    });
    // Proxies are constructed only, but not started
    const proxy = new Proxy({
      authToken: '',
      logger: logger.getChild(Proxy.name),
    });
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      fresh,
      keyManager,
      logger: logger.getChild(NodeGraph.name),
    });
    const nodeConnectionManager = new NodeConnectionManager({
      keyManager,
      nodeGraph,
      proxy,
      logger: logger.getChild(NodeConnectionManager.name),
    });
    const nodeManager = new NodeManager({
      db,
      keyManager,
      nodeGraph,
      nodeConnectionManager,
      sigchain,
      logger: logger.getChild(NodeManager.name),
    });
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyManager,
        logger: logger.getChild(NotificationsManager.name),
        fresh,
      });
    const vaultManager = await VaultManager.createVaultManager({
      acl,
      db,
      gestaltGraph,
      keyManager,
      nodeConnectionManager,
      vaultsPath,
      notificationsManager,
      logger: logger.getChild(VaultManager.name),
      fresh,
    });
    const sessionManager = await SessionManager.createSessionManager({
      db,
      keyManager,
      logger: logger.getChild(SessionManager.name),
      fresh,
    });
    const recoveryCodeNew = keyManager.getRecoveryCode()!;
    await status.beginStop({ pid: process.pid });
    await sessionManager.stop();
    await notificationsManager.stop();
    await vaultManager.stop();
    await gestaltGraph.stop();
    await acl.stop();
    await sigchain.stop();
    await identitiesManager.stop();
    await db.stop();
    await keyManager.stop();
    await schema.stop();
    return recoveryCodeNew;
  } finally {
    await status.stop({});
  }
}

export { bootstrapState };
