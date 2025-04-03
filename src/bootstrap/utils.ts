import type { FileSystem } from '../types.js';
import type {
  RecoveryCode,
  PrivateKey,
  PasswordOpsLimit,
  PasswordMemLimit,
} from '../keys/types.js';
import path from 'node:path';
import Logger from '@matrixai/logger';
import { DB } from '@matrixai/db';
import * as bootstrapErrors from './errors.js';
import TaskManager from '../tasks/TaskManager.js';
import IdentitiesManager from '../identities/IdentitiesManager.js';
import SessionManager from '../sessions/SessionManager.js';
import Status from '../status/Status.js';
import Schema from '../schema/Schema.js';
import Sigchain from '../sigchain/Sigchain.js';
import ACL from '../acl/ACL.js';
import GestaltGraph from '../gestalts/GestaltGraph.js';
import KeyRing from '../keys/KeyRing.js';
import CertManager from '../keys/CertManager.js';
import NodeGraph from '../nodes/NodeGraph.js';
import NodeManager from '../nodes/NodeManager.js';
import VaultManager from '../vaults/VaultManager.js';
import NotificationsManager from '../notifications/NotificationsManager.js';
import { polykeyWorkerManifest } from '../workers/index.js';
import config from '../config.js';
import * as utils from '../utils/index.js';
import * as errors from '../errors.js';

/**
 * Bootstraps the Node Path`
 */
async function bootstrapState({
  // Required parameters
  password,
  nodePath = config.defaultsUser.nodePath,
  recoveryCode,
  privateKey,
  privateKeyPath,
  passwordOpsLimit,
  passwordMemLimit,
  strictMemoryLock = false,
  certDuration = config.defaultsUser.certDuration,
  fresh = false,
  // Optional dependencies
  fs,
  logger = new Logger(bootstrapState.name),
}: {
  password: string;
  nodePath?: string;
  recoveryCode?: RecoveryCode;
  privateKey?: PrivateKey;
  privateKeyPath?: string;
  passwordOpsLimit?: PasswordOpsLimit;
  passwordMemLimit?: PasswordMemLimit;
  strictMemoryLock?: boolean;
  certDuration?: number;
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
  fs = await utils.importFS(fs);
  await utils.mkdirExists(fs, nodePath);
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
      recoveryCode,
      privateKey,
      privateKeyPath,
      passwordOpsLimit,
      passwordMemLimit,
      strictMemoryLock,
      fs,
      logger: logger.getChild(KeyRing.name),
      fresh,
    });
    const db = await DB.createDB({
      dbPath,
      fs,
      logger: logger.getChild(DB.name),
      crypto: {
        key: keyRing.dbKey,
        ops: polykeyWorkerManifest,
      },
      fresh,
    });
    const taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    const certManager = await CertManager.createCertManager({
      keyRing,
      db,
      taskManager,
      certDuration,
      fresh,
      logger,
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
        nodeManager,
        taskManager,
        keyRing,
        logger: logger.getChild(NotificationsManager.name),
        fresh,
      });
    const vaultManager = await VaultManager.createVaultManager({
      acl,
      db,
      gestaltGraph,
      keyRing,
      nodeManager: {} as any, // No connections are attempted
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
    await certManager.stop();
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
