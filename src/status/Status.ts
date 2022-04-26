import type {
  StatusInfo,
  StatusStarting,
  StatusLive,
  StatusStopping,
  StatusDead,
} from './types';
import type { FileSystem, FileHandle } from '../types';
import Logger from '@matrixai/logger';
import lock from 'fd-lock';
import { StartStop, ready } from '@matrixai/async-init/dist/StartStop';
import * as statusErrors from './errors';
import * as statusUtils from './utils';
import { sleep, poll } from '../utils';
import * as errors from '../errors';
import { utils as nodesUtils } from '../nodes';

interface Status extends StartStop {}
@StartStop()
class Status {
  public readonly statusPath: string;
  public readonly statusLockPath: string;

  protected logger: Logger;
  protected fs: FileSystem;
  protected statusLockFile: FileHandle;

  public constructor({
    statusPath,
    statusLockPath,
    fs = require('fs'),
    logger,
  }: {
    statusPath: string;
    statusLockPath: string;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(this.constructor.name);
    this.statusPath = statusPath;
    this.statusLockPath = statusLockPath;
    this.fs = fs;
  }

  public async start(data: StatusStarting['data']): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    const statusLockFile = await this.fs.promises.open(
      this.statusLockPath,
      this.fs.constants.O_WRONLY | this.fs.constants.O_CREAT,
    );
    if (!lock(statusLockFile.fd)) {
      await statusLockFile.close();
      throw new statusErrors.ErrorStatusLocked();
    }
    this.statusLockFile = statusLockFile;
    try {
      await this.writeStatus({
        status: 'STARTING',
        data,
      });
    } catch (e) {
      lock.unlock(this.statusLockFile.fd);
      await this.statusLockFile.close();
      throw e;
    }
    this.logger.info(`${this.constructor.name} is STARTING`);
  }

  @ready(new statusErrors.ErrorStatusNotRunning(), true)
  public async finishStart(data: StatusLive['data']): Promise<void> {
    this.logger.info(`Finish ${this.constructor.name} STARTING`);
    await this.writeStatus({
      status: 'LIVE',
      data,
    });
    this.logger.info(`${this.constructor.name} is LIVE`);
  }

  @ready(new statusErrors.ErrorStatusNotRunning(), true)
  public async beginStop(data: StatusStopping['data']): Promise<void> {
    this.logger.info(`Begin ${this.constructor.name} STOPPING`);
    await this.writeStatus({
      status: 'STOPPING',
      data,
    });
    this.logger.info(`${this.constructor.name} is STOPPING`);
  }

  public async stop(data: StatusDead['data']): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    await this.writeStatus({
      status: 'DEAD',
      data,
    });
    lock.unlock(this.statusLockFile.fd);
    await this.statusLockFile.close();
    await this.fs.promises.rm(this.statusLockPath, { force: true });
    this.logger.info(`${this.constructor.name} is DEAD`);
  }

  /**
   * Read the status data
   * This can be used without running Status
   */
  public async readStatus(): Promise<StatusInfo | undefined> {
    let statusFile;
    try {
      try {
        statusFile = await this.fs.promises.open(this.statusPath, 'r');
      } catch (e) {
        if (e.code === 'ENOENT') {
          return;
        }
        throw new statusErrors.ErrorStatusRead(e.message, {
          data: {
            errno: e.errno,
            syscall: e.syscall,
            code: e.code,
            path: e.path,
          },
        });
      }
      while (!lock(statusFile.fd)) {
        await sleep(2);
      }
      let statusData;
      try {
        statusData = (await statusFile.readFile('utf-8')).trim();
      } catch (e) {
        throw new statusErrors.ErrorStatusRead(e.message, {
          data: {
            errno: e.errno,
            syscall: e.syscall,
            code: e.code,
            path: e.path,
          },
        });
      }
      if (statusData === '') {
        return;
      }
      let statusInfo;
      try {
        statusInfo = JSON.parse(statusData, this.statusReviver);
      } catch (e) {
        throw new statusErrors.ErrorStatusParse('JSON parsing failed');
      }
      if (!statusUtils.statusValidate(statusInfo)) {
        throw new statusErrors.ErrorStatusParse(
          'StatusInfo validation failed',
          {
            data: { errors: statusUtils.statusValidate.errors },
          },
        );
      }
      return statusInfo as StatusInfo;
    } finally {
      if (statusFile != null) {
        lock.unlock(statusFile.fd);
        await statusFile.close();
      }
    }
  }

  protected async writeStatus(statusInfo: StatusInfo): Promise<void> {
    this.logger.info(`Writing ${this.constructor.name} to ${this.statusPath}`);
    let statusFile;
    try {
      // Cannot use 'w', it truncates immediately
      // should truncate only while holding the lock
      statusFile = await this.fs.promises.open(
        this.statusPath,
        this.fs.constants.O_WRONLY | this.fs.constants.O_CREAT,
      );
      while (!lock(statusFile.fd)) {
        // Write sleep should be half of read sleep
        // this ensures write-preferring locking
        await sleep(1);
      }
      try {
        await statusFile.truncate();
        await statusFile.write(
          JSON.stringify(statusInfo, this.statusReplacer, 2) + '\n',
          0,
          'utf-8',
        );
      } catch (e) {
        throw new statusErrors.ErrorStatusWrite(e.message, {
          data: {
            errno: e.errno,
            syscall: e.syscall,
            code: e.code,
            path: e.path,
          },
        });
      }
    } finally {
      if (statusFile != null) {
        lock.unlock(statusFile.fd);
        await statusFile.close();
      }
    }
  }

  @ready(new statusErrors.ErrorStatusNotRunning())
  public async updateStatusLive(
    data: Partial<StatusLive['data']>,
  ): Promise<StatusInfo> {
    this.logger.info(`Updating ${this.constructor.name} LIVE`);
    let statusFile;
    try {
      try {
        statusFile = await this.fs.promises.open(this.statusPath, 'r+');
      } catch (e) {
        throw new statusErrors.ErrorStatusRead(e.message, {
          data: {
            errno: e.errno,
            syscall: e.syscall,
            code: e.code,
            path: e.path,
          },
        });
      }
      while (!lock(statusFile.fd)) {
        await sleep(2);
      }
      let statusData;
      try {
        statusData = (await statusFile.readFile('utf-8')).trim();
      } catch (e) {
        throw new statusErrors.ErrorStatusRead(e.message, {
          data: {
            errno: e.errno,
            syscall: e.syscall,
            code: e.code,
            path: e.path,
          },
        });
      }
      let statusInfo;
      try {
        statusInfo = JSON.parse(statusData, this.statusReviver);
      } catch (e) {
        throw new statusErrors.ErrorStatusParse('JSON parsing failed');
      }
      if (!statusUtils.statusValidate(statusInfo)) {
        throw new statusErrors.ErrorStatusParse(
          'StatusInfo validation failed',
          {
            data: { errors: statusUtils.statusValidate.errors },
          },
        );
      }
      if (statusInfo.status !== 'LIVE') {
        throw new statusErrors.ErrorStatusLiveUpdate(
          `${this.constructor.name} is not LIVE`,
        );
      }
      Object.assign(statusInfo.data, data);
      try {
        await statusFile.truncate();
        await statusFile.write(
          JSON.stringify(statusInfo, this.statusReplacer, 2) + '\n',
          0,
          'utf-8',
        );
      } catch (e) {
        throw new statusErrors.ErrorStatusWrite(e.message, {
          data: {
            errno: e.errno,
            syscall: e.syscall,
            code: e.code,
            path: e.path,
          },
        });
      }
      return statusInfo;
    } finally {
      if (statusFile != null) {
        lock.unlock(statusFile.fd);
        await statusFile.close();
      }
    }
  }

  public async waitFor(
    status: StatusInfo['status'],
    timeout?: number,
  ): Promise<StatusInfo> {
    let statusInfo;
    try {
      statusInfo = await poll<StatusInfo | undefined>(
        async () => {
          return await this.readStatus();
        },
        (e, statusInfo) => {
          if (e != null) return true;
          // DEAD status is a special case
          // it is acceptable for the status file to not exist
          if (
            status === 'DEAD' &&
            (statusInfo == null || statusInfo.status === 'DEAD')
          ) {
            return true;
          }
          if (statusInfo?.status === status) return true;
          return false;
        },
        50,
        timeout,
      );
    } catch (e) {
      if (e instanceof errors.ErrorUtilsPollTimeout) {
        throw new errors.ErrorStatusTimeout();
      }
      throw e;
    }
    if (statusInfo == null) {
      return {
        status: 'DEAD',
        data: {},
      };
    }
    return statusInfo;
  }

  /**
   * Replacer used during encoding to JSON
   * This is a function expression and not an arrow function expression
   * because it needs to access the `this` inside the JSON.stringify
   * in order to encode the `NodeId` before the `toJSON` of IdInternal is called
   */
  protected statusReplacer = function (key: string, value: any): any {
    if (key === 'nodeId') {
      return nodesUtils.encodeNodeId(this[key]);
    }
    return value;
  };

  /**
   * Reviver used during decoding from JSON
   */
  protected statusReviver = function (key: string, value: any): any {
    if (key === 'nodeId') {
      value = nodesUtils.decodeNodeId(value);
      if (value == null) {
        throw new statusErrors.ErrorStatusParse('Invalid nodeId');
      }
    }
    return value;
  };
}

export default Status;
