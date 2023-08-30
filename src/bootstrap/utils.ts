import type { DeepPartial, FileSystem } from '../types';
import type { RecoveryCode, Key, PrivateKey } from '../keys/types';
import type { PasswordMemLimit, PasswordOpsLimit } from '../keys/types';
import path from 'path';
import Logger from '@matrixai/logger';
import { DB } from '@matrixai/db';
import * as bootstrapErrors from './errors';
import TaskManager from '../tasks/TaskManager';
import { IdentitiesManager } from '../identities';
import { SessionManager } from '../sessions';
import { Status } from '../status';
import { Schema } from '../schema';
import { Sigchain } from '../sigchain';
import { ACL } from '../acl';
import { GestaltGraph } from '../gestalts';
import { KeyRing } from '../keys';
import { NodeGraph, NodeManager } from '../nodes';
import { VaultManager } from '../vaults';
import { NotificationsManager } from '../notifications';
import { mkdirExists } from '../utils';
import config from '../config';
import * as utils from '../utils';
import * as keysUtils from '../keys/utils';
import * as errors from '../errors';

type BootstrapOptions = {
  nodePath: string;
  keys: {
    recoveryCode: RecoveryCode;
    privateKey: PrivateKey;
    privateKeyPath: string;
    passwordOpsLimit: PasswordOpsLimit;
    passwordMemLimit: PasswordMemLimit;
    strictMemoryLock: boolean;
    certDuration: number;
  };
};

/**
 * Bootstraps the Node Path
 */
async function bootstrapState({
  // Required parameters
  password,
  // Optional configuration
  // nodePath = config.defaults.nodePath,
  // keyRingConfig = {},
  options = {},
  fresh = false,
  // Optional dependencies
  fs = require('fs'),
  logger = new Logger(bootstrapState.name),
}: {
  password: string;
  options?: DeepPartial<BootstrapOptions>;
  // NodePath?: string;
  // keyRingConfig?: {
  //   recoveryCode?: RecoveryCode;
  //   privateKey?: PrivateKey;
  //   privateKeyPath?: string;
  //   passwordOpsLimit?: PasswordOpsLimit;
  //   passwordMemLimit?: PasswordMemLimit;
  // };
  fresh?: boolean;
  fs?: FileSystem;
  logger?: Logger;
}): Promise<RecoveryCode | undefined> {
  const umask = 0o077;
  logger.info(`Setting umask to ${umask.toString(8).padStart(3, '0')}`);
  process.umask(umask);
  logger.info(`Setting node path to ${nodePath}`);
  if (nodePath == null) {
    throw new errors.ErrorUtilsNodePath();
  }
  await mkdirExists(fs, nodePath);
  // Setup node path and sub paths
  const statusPath = path.join(nodePath, config.paths.statusBase);
  const statusLockPath = path.join(nodePath, config.paths.statusLockBase);
  const statePath = path.join(nodePath, config.paths.stateBase);
  const dbPath = path.join(statePath, config.paths.dbBase);
  const keysPath = path.join(statePath, config.paths.keysBase);
  const vaultsPath = path.join(statePath, config.paths.vaultsBase);
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
    const keyRing = await KeyRing.createKeyRing({
      keysPath,
      password,
      fs,
      logger: logger.getChild(KeyRing.name),
      fresh,
      ...keyRingConfig,
    });
    const db = await DB.createDB({
      dbPath,
      fs,
      logger: logger.getChild(DB.name),
      crypto: {
        key: keyRing.dbKey,
        ops: {
          encrypt: async (key, plainText) => {
            return keysUtils.encryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(plainText),
            );
          },
          decrypt: async (key, cipherText) => {
            return keysUtils.decryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(cipherText),
            );
          },
        },
      },
      fresh,
    });
    const sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
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
    const identitiesManager = await IdentitiesManager.createIdentitiesManager({
      keyRing,
      db,
      sigchain,
      gestaltGraph,
      logger: logger.getChild(IdentitiesManager.name),
      fresh,
    });
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      fresh,
      keyRing,
      logger: logger.getChild(NodeGraph.name),
    });
    const taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    const nodeManager = new NodeManager({
      db,
      keyRing,
      nodeGraph,
      nodeConnectionManager: {} as any, // No connections are attempted
      sigchain,
      taskManager,
      gestaltGraph,
      logger: logger.getChild(NodeManager.name),
    });
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager: {} as any, // No connections are attempted
        nodeManager,
        keyRing,
        logger: logger.getChild(NotificationsManager.name),
        fresh,
      });
    const vaultManager = await VaultManager.createVaultManager({
      acl,
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager: {} as any, // No connections are attempted
      vaultsPath,
      notificationsManager,
      logger: logger.getChild(VaultManager.name),
      fresh,
    });
    const sessionManager = await SessionManager.createSessionManager({
      db,
      keyRing,
      logger: logger.getChild(SessionManager.name),
      fresh,
    });
    const recoveryCodeNew = keyRing.recoveryCode!;
    await status.beginStop({ pid: process.pid });
    await sessionManager.stop();
    await notificationsManager.stop();
    await vaultManager.stop();
    await identitiesManager.stop();
    await gestaltGraph.stop();
    await acl.stop();
    await sigchain.stop();
    await taskManager.stop();
    await db.stop();
    await keyRing.stop();
    await schema.stop();
    return recoveryCodeNew;
  } finally {
    await status.stop({});
  }
}

export { bootstrapState };

export type { BootstrapOptions };
