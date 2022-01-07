import type { FileSystem } from '../../types';
import type { RecoveryCode } from '../../keys/types';
import type { NodeId } from '../../nodes/types';
import type { Host, Port } from '../../network/types';
import type {
  StatusStarting,
  StatusLive,
  StatusStopping,
  StatusDead,
} from '../../status/types';
import type { SessionToken } from '../../sessions/types';
import path from 'path';
import prompts from 'prompts';
import * as grpc from '@grpc/grpc-js';
import Logger from '@matrixai/logger';
import * as binErrors from '../errors';
import * as clientUtils from '../../client/utils';
import { Status } from '../../status';
import config from '../../config';

/**
 * Prompts for existing password
 * This masks SIGINT handling
 * When SIGINT is received this will return undefined
 */
async function promptPassword(): Promise<string | undefined> {
  const { password } = await prompts({
    name: 'password',
    type: 'password',
    message: 'Please enter the password',
  });
  return password;
}

/**
 * Prompts for new password
 * This masks SIGINT handling
 * When SIGINT is received this will return undefined
 */
async function promptNewPassword(): Promise<string | undefined> {
  let password: string | undefined;
  while (true) {
    ({ password } = await prompts({
      name: 'password',
      type: 'password',
      message: 'Enter new password',
    }));
    // If undefined, then SIGINT was sent
    // Break the loop and return undefined password
    if (password == null) {
      break;
    }
    const { passwordConfirm } = await prompts({
      name: 'passwordConfirm',
      type: 'password',
      message: 'Confirm new password',
    });
    // If undefined, then SIGINT was sent
    // Break the loop and return undefined password
    if (passwordConfirm == null) {
      break;
    }
    if (password === passwordConfirm) {
      break;
    }
    // Interactive message
    process.stderr.write('Passwords do not match!\n');
  }
  return password;
}

/**
 * Processes existing password
 * Use this when password is necessary
 * Order of operations are:
 * 1. Reads --password-file
 * 2. Reads PK_PASSWORD
 * 3. Prompts for password
 * This may return an empty string
 */
async function processPassword(
  passwordFile?: string,
  fs: FileSystem = require('fs'),
): Promise<string> {
  let password: string | undefined;
  if (passwordFile != null) {
    try {
      password = (await fs.promises.readFile(passwordFile, 'utf-8')).trim();
    } catch (e) {
      throw new binErrors.ErrorCLIPasswordFileRead(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
  } else if (typeof process.env['PK_PASSWORD'] === 'string') {
    password = process.env['PK_PASSWORD'];
  } else {
    password = await promptPassword();
    if (password === undefined) {
      throw new binErrors.ErrorCLIPasswordMissing();
    }
  }
  return password;
}

/**
 * Processes new password
 * Use this when a new password is necessary
 * Order of operations are:
 * 1. Reads --password-new-file
 * 2. Reads PK_PASSWORD
 * 3. Prompts and confirms password
 * If processNewPassword is used when an existing password is needed
 * for authentication, then the existing boolean should be set to true
 * This ensures that this call does not read `PK_PASSWORD`
 * This may return an empty string
 */
async function processNewPassword(
  passwordNewFile?: string,
  fs: FileSystem = require('fs'),
  existing: boolean = false,
): Promise<string> {
  let passwordNew: string | undefined;
  if (passwordNewFile != null) {
    try {
      passwordNew = (
        await fs.promises.readFile(passwordNewFile, 'utf-8')
      ).trim();
    } catch (e) {
      throw new binErrors.ErrorCLIPasswordFileRead(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
  } else if (!existing && typeof process.env['PK_PASSWORD'] === 'string') {
    passwordNew = process.env['PK_PASSWORD'];
  } else {
    passwordNew = await promptNewPassword();
    if (passwordNew === undefined) {
      throw new binErrors.ErrorCLIPasswordMissing();
    }
  }
  return passwordNew;
}

/**
 * Process recovery code
 * Order of operations are:
 * 1. Reads --recovery-code-file
 * 2. Reads PK_RECOVERY_CODE
 * This may return an empty string
 */
async function processRecoveryCode(
  recoveryCodeFile?: string,
  fs: FileSystem = require('fs'),
): Promise<RecoveryCode | undefined> {
  let recoveryCode: string | undefined;
  if (recoveryCodeFile != null) {
    try {
      recoveryCode = (
        await fs.promises.readFile(recoveryCodeFile, 'utf-8')
      ).trim();
    } catch (e) {
      throw new binErrors.ErrorCLIRecoveryCodeFileRead(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
  } else if (typeof process.env['PK_RECOVERY_CODE'] === 'string') {
    recoveryCode = process.env['PK_RECOVERY_CODE'];
  }
  return recoveryCode as RecoveryCode | undefined;
}

/**
 * Process client options
 * Options are used for connecting PolykeyClient
 * Order of operations are:
 * 1. Reads --node-id, --client-host, --client-port
 * 2. Reads PK_NODE_ID, PK_CLIENT_HOST, PK_CLIENT_PORT
 * 3. Command-specific defaults
 * 4. Reads Status
 * Step 2 is done during option construction
 * Step 3 is done in CommandPolykey classes
 */
async function processClientOptions(
  nodePath: string,
  nodeId?: NodeId,
  clientHost?: Host,
  clientPort?: Port,
  fs = require('fs'),
  logger = new Logger(processClientOptions.name),
): Promise<{
  nodeId: NodeId;
  clientHost: Host;
  clientPort: Port;
}> {
  if (nodeId == null || clientHost == null || clientPort == null) {
    const statusPath = path.join(nodePath, config.defaults.statusBase);
    const statusLockPath = path.join(nodePath, config.defaults.statusLockBase);
    const status = new Status({
      statusPath,
      statusLockPath,
      fs,
      logger: logger.getChild(Status.name),
    });
    const statusInfo = await status.readStatus();
    if (statusInfo === undefined || statusInfo.status !== 'LIVE') {
      throw new binErrors.ErrorCLIStatusNotLive();
    }
    if (nodeId == null) nodeId = statusInfo.data.nodeId;
    if (clientHost == null) clientHost = statusInfo.data.clientHost;
    if (clientPort == null) clientPort = statusInfo.data.clientPort;
  }
  return {
    nodeId,
    clientHost: clientHost,
    clientPort: clientPort,
  };
}

/**
 * Process client status
 * Options are used for connecting PolykeyClient
 * Variant of processClientOptions
 * Use this when you need always need the status info
 */
async function processClientStatus(
  nodePath: string,
  nodeId?: NodeId,
  clientHost?: Host,
  clientPort?: Port,
  fs = require('fs'),
  logger = new Logger(processClientStatus.name),
): Promise<
  | {
      statusInfo: StatusStarting | StatusStopping | StatusDead;
      status: Status;
      nodeId: NodeId | undefined;
      clientHost: Host | undefined;
      clientPort: Port | undefined;
    }
  | {
      statusInfo: StatusLive;
      status: Status;
      nodeId: NodeId;
      clientHost: Host;
      clientPort: Port;
    }
  | {
      statusInfo: undefined;
      status: undefined;
      nodeId: NodeId;
      clientHost: Host;
      clientPort: Port;
    }
> {
  // If all parameters are set, no status and no statusInfo is used
  if (nodeId != null && clientHost != null && clientPort != null) {
    return {
      statusInfo: undefined,
      status: undefined,
      nodeId,
      clientHost,
      clientPort,
    };
  }
  const statusPath = path.join(nodePath, config.defaults.statusBase);
  const statusLockPath = path.join(nodePath, config.defaults.statusLockBase);
  const status = new Status({
    statusPath,
    statusLockPath,
    fs,
    logger: logger.getChild(Status.name),
  });
  const statusInfo = await status.readStatus();
  // If not all parameters are set, and that the status doesn't exist
  // Then this an exception
  if (statusInfo == null) {
    throw new binErrors.ErrorCLIStatusMissing();
  }
  if (statusInfo.status === 'LIVE') {
    if (nodeId == null) nodeId = statusInfo.data.nodeId;
    if (clientHost == null) clientHost = statusInfo.data.clientHost;
    if (clientPort == null) clientPort = statusInfo.data.clientPort;
    return {
      statusInfo,
      status,
      nodeId,
      clientHost,
      clientPort,
    };
  }
  return {
    statusInfo,
    status,
    nodeId,
    clientHost,
    clientPort,
  };
}

/**
 * Processes authentication metadata
 * Use when authentication is necessary
 * Order of operations are:
 * 1. Reads --password-file
 * 2. Reads PK_PASSWORD
 * 3. Reads PK_TOKEN
 * 4. Reads Session
 * Step 4 is expected to be done during session interception
 * This may return an empty metadata
 */
async function processAuthentication(
  passwordFile?: string,
  fs: FileSystem = require('fs'),
): Promise<grpc.Metadata> {
  let meta;
  if (passwordFile != null) {
    let password;
    try {
      password = (await fs.promises.readFile(passwordFile, 'utf-8')).trim();
    } catch (e) {
      throw new binErrors.ErrorCLIPasswordFileRead(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
    meta = clientUtils.encodeAuthFromPassword(password);
  } else if (typeof process.env['PK_PASSWORD'] === 'string') {
    meta = clientUtils.encodeAuthFromPassword(process.env['PK_PASSWORD']);
  } else if (typeof process.env['PK_TOKEN'] === 'string') {
    meta = clientUtils.encodeAuthFromSession(
      process.env['PK_TOKEN'] as SessionToken,
    );
  } else {
    meta = new grpc.Metadata();
  }
  return meta;
}

export {
  promptPassword,
  promptNewPassword,
  processPassword,
  processNewPassword,
  processRecoveryCode,
  processClientOptions,
  processClientStatus,
  processAuthentication,
};
