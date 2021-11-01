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
 * Prompts for password
 * This masks SIGINT handling
 * When SIGINT is received this will return undefined
 */
async function promptPassword(): Promise<string | undefined> {
  const response = await prompts({
    type: 'password',
    name: 'password',
    message: 'Please enter your password',
  });
  return response.password;
}

/**
 * Processes password
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
    const status = new Status({
      statusPath,
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
      statusInfo: StatusStarting | StatusStopping | StatusDead | undefined;
      nodeId: NodeId | undefined;
      clientHost: Host | undefined;
      clientPort: Port | undefined;
    }
  | {
      statusInfo: StatusLive;
      nodeId: NodeId;
      clientHost: Host;
      clientPort: Port;
    }
> {
  const statusPath = path.join(nodePath, config.defaults.statusBase);
  const status = new Status({
    statusPath,
    fs,
    logger: logger.getChild(Status.name),
  });
  const statusInfo = await status.readStatus();
  if (statusInfo?.status === 'LIVE') {
    if (nodeId == null) nodeId = statusInfo.data.nodeId;
    if (clientHost == null) clientHost = statusInfo.data.clientHost;
    if (clientPort == null) clientPort = statusInfo.data.clientPort;
    return {
      nodeId,
      clientHost,
      clientPort,
      statusInfo,
    };
  }
  return {
    nodeId,
    clientHost,
    clientPort,
    statusInfo,
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
  processPassword,
  processRecoveryCode,
  processClientOptions,
  processClientStatus,
  processAuthentication,
};
