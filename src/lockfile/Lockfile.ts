import type { FileSystem, LockConfig } from '../types';
import type { NodeId } from '../nodes/types';

import path from 'path';
import Logger from '@matrixai/logger';
import lockfile from 'proper-lockfile';
import * as utils from '../utils';
import { ErrorPolykey } from '../errors';

const LOCKFILE_NAME = 'agent-lock.json';

class Lockfile {
  public readonly nodePath: string;
  public readonly lockPath: string;

  protected config: LockConfig;
  protected fs: FileSystem;
  protected logger: Logger;

  private _started: boolean;
  private release: () => Promise<void>;

  constructor({
    nodePath,
    fs,
    logger,
  }: { nodePath?: string; fs?: FileSystem; logger?: Logger } = {}) {
    this.fs = fs ?? require('fs');
    this.nodePath = nodePath ?? utils.getDefaultNodePath();
    this.lockPath = path.join(this.nodePath, LOCKFILE_NAME);
    this.logger = logger ?? new Logger('Lockfile');
  }

  /**
   * Start the lockfile, checks for any existing lockfiles, and writes
   * the lockfile.
   *
   * @throws ErrorPolykey if there is an existing lockfile with a running pid
   */
  public async start({ nodeId }: { nodeId: NodeId }) {
    const status = await Lockfile.checkLock(this.fs, this.lockPath);
    if (status === 'LOCKED') {
      const lock = await Lockfile.parseLock(this.fs, this.lockPath);
      this.logger.error(
        `Lockfile being held by pid: ${lock.pid}. Is a PolykeyAgent already running?`,
      );
      throw new ErrorPolykey(`Lockfile being held by pid: ${lock.pid}`);
    }

    this.config = {
      pid: process.pid,
      nodeId: nodeId,
    };

    await this.writeLockfile();
    this.release = await lockfile.lock(this.lockPath);
    this._started = true;
  }

  /**
   * Updates the configuation stored in the lockfile, then attempts
   * to write the configration to the lockPath
   * @param key
   * @param value
   */
  public async updateLockfile(key: string, value: any): Promise<void> {
    this.config[key] = value;
    await this.writeLockfile();
  }

  public async stop() {
    if (this._started) {
      this.logger.info(
        `Deleting lockfile from ${path.join(this.nodePath, 'agent-lock.json')}`,
      );
      await this.deleteLock();
    }
    this._started = false;
  }

  /**
   * Writes the config to the lockPath
   */
  private async writeLockfile(): Promise<void> {
    this.logger.info(`Writing lockfile to ${this.lockPath}`);
    await this.fs.promises.writeFile(
      this.lockPath,
      JSON.stringify(this.config),
    );
  }

  /**
   * Attempts to delete the lockfile. If it does not exist, do nothing.
   * @returns
   */
  private async deleteLock(): Promise<void> {
    await this.release();
    try {
      const fh = await this.fs.promises.open(this.lockPath, 'r');
      fh.close();
    } catch (err) {
      return;
    }
    await this.fs.promises.rm(this.lockPath);
  }

  /**
   * Attempts to parse the lockfile given the current nodePath/lockPath. If it exists,
   * returns the data within. Otherwise, returns false
   * @returns config or false
   */
  public static async parseLock(
    fs: FileSystem,
    lockPath: string,
  ): Promise<LockConfig> {
    const fh = await fs.promises.open(lockPath, 'r');
    const data = await fh.readFile();
    await fh.close();
    return JSON.parse(data.toString());
  }

  /**
   * Checks the status of the lockfile
   * @param fs
   * @param lockPath
   * @returns 'UNLOCKED', 'LOCKED', 'DOESNOTEXIST'
   */
  public static async checkLock(
    fs: FileSystem,
    lockPath: string,
  ): Promise<'UNLOCKED' | 'LOCKED' | 'DOESNOTEXIST'> {
    try {
      const locked = await lockfile.check(lockPath, { fs: fs });
      return locked ? 'LOCKED' : 'UNLOCKED';
    } catch (err) {
      if (err.code === 'ENOENT') {
        return 'DOESNOTEXIST';
      }
      throw err;
    }
  }
}

export { LOCKFILE_NAME };
export default Lockfile;
