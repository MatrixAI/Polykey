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
import { poll } from '../utils';

interface Status extends StartStop {}
@StartStop()
class Status {
  public readonly statusPath: string;

  protected logger: Logger;
  protected fs: FileSystem;
  protected statusFile: FileHandle;

  public constructor({
    statusPath,
    fs = require('fs'),
    logger,
  }: {
    statusPath: string;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(this.constructor.name);
    this.statusPath = statusPath;
    this.fs = fs;
  }

  public async start(data: StatusStarting['data']): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    const statusFile = await this.fs.promises.open(
      this.statusPath,
      this.fs.constants.O_WRONLY | this.fs.constants.O_CREAT,
    );
    if (!lock(statusFile.fd)) {
      await statusFile.close();
      throw new statusErrors.ErrorStatusLocked();
    }
    this.statusFile = statusFile;
    try {
      await this.writeStatus({
        status: 'STARTING',
        data,
      });
    } catch (e) {
      lock.unlock(this.statusFile.fd);
      await this.statusFile.close();
      throw e;
    }
    this.logger.info(`${this.constructor.name} is STARTING`);
  }

  @ready(new statusErrors.ErrorStatusNotRunning())
  public async finishStart(data: StatusLive['data']): Promise<void> {
    this.logger.info(`Finish ${this.constructor.name} STARTING`);
    await this.writeStatus({
      status: 'LIVE',
      data,
    });
    this.logger.info(`${this.constructor.name} is LIVE`);
  }

  @ready(new statusErrors.ErrorStatusNotRunning())
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
    lock.unlock(this.statusFile.fd);
    await this.statusFile.close();
    this.logger.info(`${this.constructor.name} is DEAD`);
  }

  /**
   * Read the status data
   * This can be used without running Status
   */
  public async readStatus(): Promise<StatusInfo | undefined> {
    let statusData: string;
    try {
      statusData = await this.fs.promises.readFile(this.statusPath, 'utf-8');
    } catch (e) {
      if (e.code === 'ENOENT') {
        return;
      }
      throw new statusErrors.ErrorStatusRead(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
    let statusInfo;
    try {
      statusInfo = JSON.parse(statusData);
    } catch (e) {
      throw new statusErrors.ErrorStatusParse('JSON parsing failed');
    }
    if (!statusUtils.statusValidate(statusInfo)) {
      throw new statusErrors.ErrorStatusParse('StatusInfo validation failed', {
        errors: statusUtils.statusValidate.errors,
      });
    }
    return statusInfo as StatusInfo;
  }

  protected async writeStatus(statusInfo: StatusInfo): Promise<void> {
    this.logger.info(`Writing Status file to ${this.statusPath}`);
    try {
      await this.statusFile.truncate();
      await this.statusFile.write(
        JSON.stringify(statusInfo, undefined, 2) + '\n',
        0,
        'utf-8',
      );
    } catch (e) {
      throw new statusErrors.ErrorStatusWrite(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
  }

  public async waitFor(
    status: StatusInfo['status'],
    timeout?: number,
  ): Promise<StatusInfo> {
    const statusInfo = await poll<StatusInfo | undefined>(
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
      250,
      timeout,
    );
    if (statusInfo == null) {
      return {
        status: 'DEAD',
        data: {},
      };
    }
    return statusInfo;
  }
}

export default Status;
