import type { FileSystem, LockConfig } from '../types';
import type { LockStatus } from '../types';

import type { FileHandle } from 'fs/promises';
import path from 'path';
import Logger from '@matrixai/logger';
import lock from 'fd-lock';
import { StartStop, ready } from '@matrixai/async-init/dist/StartStop';
import * as statusErrors from './errors';

const STATUS_FILE_NAME = 'agent-status.json';

interface Status extends StartStop {}
@StartStop()
class Status {
  public readonly nodePath: string;
  public readonly lockPath: string;

  protected config: LockConfig;
  protected fs: FileSystem;
  protected logger: Logger;
  protected fh: FileHandle;

  public static async createStatus({
    nodePath,
    fs,
    logger,
  }: {
    nodePath: string;
    fs?: FileSystem;
    logger?: Logger;
  }): Promise<Status> {
    const fs_ = fs ?? require('fs');
    const nodePath_ = nodePath;
    const logger_ = logger ?? new Logger(this.name);
    const lockPath = path.join(nodePath_, STATUS_FILE_NAME);

    // Creating lock
    return new Status({
      nodePath: nodePath_,
      fs: fs_,
      logger: logger_,
      lockPath,
    });
  }

  constructor({
    nodePath,
    fs,
    logger,
    lockPath,
  }: {
    nodePath: string;
    fs: FileSystem;
    logger: Logger;
    lockPath: string;
  }) {
    this.fs = fs;
    this.nodePath = nodePath;
    this.logger = logger;
    this.lockPath = lockPath;
  }

  /**
   * Start the status, checks for any existing lock files, and writes
   * the status.
   *
   * @throws ErrorPolykey if there is an existing status with a running pid
   */
  public async start() {
    this.fh = await this.fs.promises.open(
      this.lockPath,
      this.fs.constants.O_RDWR | this.fs.constants.O_CREAT,
    );
    const stat = lock(this.fh.fd);
    if (!stat) {
      await this.fh.close();
      const lock = (await this.parseStatus())!;
      this.logger.error(
        `Lockfile being held by pid: ${lock.pid}. Is a PolykeyAgent already running?`,
      );
      throw new statusErrors.ErrorStatusLockFailed(
        `Lockfile being held by pid: ${lock.pid}`,
      );
    }

    this.config = {
      status: 'STARTING',
      pid: process.pid,
    };

    await this.writeStatus();
  }

  public async finishStart() {
    await this.updateStatus('status', 'RUNNING');
  }

  public async beginStop() {
    await this.updateStatus('status', 'STOPPING');
  }

  public async stop() {
    this.logger.info(
      `Releasing and deleting lockfile from ${path.join(
        this.nodePath,
        'agent-status.json',
      )}`,
    );
    lock.unlock(this.fh.fd);
    await this.fh.close();
    await this.fs.promises.rm(this.lockPath);
  }

  /**
   * Updates the configuration stored in the status, then attempts
   * to write the configuration to the lockPath
   * @param key
   * @param value
   */
  @ready(new statusErrors.ErrorStatusNotRunning())
  public async updateStatus(key: string, value: any): Promise<void> {
    this.config[key] = value;
    await this.writeStatus();
  }

  /**
   * Writes the config to the lockPath
   */
  private async writeStatus(): Promise<void> {
    this.logger.info(`Writing lockfile to ${this.lockPath}`);
    await this.fs.promises.writeFile(
      this.lockPath,
      JSON.stringify(this.config),
    );
  }

  /**
   * Attempts to parse the status given the current nodePath/lockPath. If it exists,
   * returns the data within. Otherwise, returns false
   * @returns config or false
   */
  public async parseStatus(): Promise<LockConfig> {
    const data = await this.fs.promises.readFile(this.lockPath);
    return JSON.parse(data.toString());
  }

  /**
   * Checks the status of the status
   * @returns
   * 'UNLOCKED' - If the file was not locked.
   * 'STARTING' - If the Agent is in the process of starting.
   * 'RUNNING' - If the Agent is running.
   * 'STOPPING' - If the Agent is in the process of stopping.
   */
  public async checkStatus(): Promise<LockStatus> {
    let fh;
    try {
      fh = await this.fs.promises.open(this.lockPath, 'r');
      if (lock(fh.fd)) {
        // Was unlocked
        lock.unlock(fh.fd);
        await fh.close();
        return 'UNLOCKED';
      } else {
        // Is locked, get status.
        await fh.close();
        return (await this.parseStatus()).status;
      }
    } catch (e) {
      if (e.code === 'ENOENT') return 'UNLOCKED';
      throw e;
    } finally {
      await fh?.close();
    }
  }
}

export { STATUS_FILE_NAME };
export default Status;
