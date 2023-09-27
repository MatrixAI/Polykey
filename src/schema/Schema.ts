import type { StateVersion } from './types';
import type { FileSystem } from '../types';
import path from 'path';
import Logger from '@matrixai/logger';
import { CreateDestroyStartStop } from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { RWLockWriter } from '@matrixai/async-locks';
import * as schemaErrors from './errors';
import * as events from './events';
import * as utils from '../utils';
import config from '../config';

interface Schema extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new schemaErrors.ErrorSchemaRunning(),
  new schemaErrors.ErrorSchemaDestroyed(),
  {
    eventStart: events.EventSchemaStart,
    eventStarted: events.EventSchemaStarted,
    eventStop: events.EventSchemaStop,
    eventStopped: events.EventSchemaStopped,
  },
)
class Schema {
  public static async createSchema({
    statePath,
    stateVersion = config.stateVersion as StateVersion,
    fs = require('fs'),
    logger = new Logger(this.name),
    fresh = false,
  }: {
    statePath: string;
    stateVersion?: StateVersion;
    fs?: FileSystem;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<Schema> {
    logger.info(`Creating ${this.name}`);
    const schema = new this({
      statePath,
      stateVersion,
      fs,
      logger,
    });
    await schema.start({ fresh });
    logger.info(`Created ${this.name}`);
    return schema;
  }

  public readonly statePath: string;
  public readonly stateVersionPath: string;
  public readonly stateVersion: StateVersion;
  protected lock: RWLockWriter = new RWLockWriter();
  protected fs: FileSystem;
  protected logger: Logger;

  public constructor({
    statePath,
    stateVersion = config.stateVersion as StateVersion,
    fs = require('fs'),
    logger,
  }: {
    statePath: string;
    stateVersion?: StateVersion;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(this.constructor.name);
    this.statePath = statePath;
    this.stateVersionPath = path.join(statePath, config.paths.stateVersionBase);
    this.stateVersion = stateVersion;
    this.fs = fs;
  }

  public async start({
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}) {
    this.logger.info(`Starting ${this.constructor.name}`);
    this.logger.info(`Setting state path to ${this.statePath}`);
    if (fresh) {
      try {
        await this.fs.promises.rm(this.statePath, {
          force: true,
          recursive: true,
        });
      } catch (e) {
        throw new schemaErrors.ErrorSchemaStateDelete(e.message, {
          data: {
            errno: e.errno,
            syscall: e.syscall,
            code: e.code,
            path: e.path,
          },
          cause: e,
        });
      }
    }
    try {
      await utils.mkdirExists(this.fs, this.statePath);
    } catch (e) {
      throw new schemaErrors.ErrorSchemaStateCreate(e.message, {
        data: {
          errno: e.errno,
          syscall: e.syscall,
          code: e.code,
          path: e.path,
        },
        cause: e,
      });
    }
    const stateVersion = await this.readVersion();
    if (stateVersion == null) {
      await this.writeVersion(this.stateVersion);
    } else {
      if (stateVersion > this.stateVersion) {
        throw new schemaErrors.ErrorSchemaVersionTooNew();
      } else if (stateVersion < this.stateVersion) {
        await this.upgradeVersion(stateVersion);
      }
    }
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop(): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy(): Promise<void> {
    this.logger.info(`Destroying ${this.constructor.name}`);
    try {
      await this.fs.promises.rm(this.statePath, {
        force: true,
        recursive: true,
      });
    } catch (e) {
      throw new schemaErrors.ErrorSchemaStateDelete(e.message, {
        data: {
          errno: e.errno,
          syscall: e.syscall,
          code: e.code,
          path: e.path,
        },
        cause: e,
      });
    }
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  public async readVersion(): Promise<StateVersion | undefined> {
    return await this.lock.withReadF(async () => {
      let stateVersionData: string;
      try {
        stateVersionData = await this.fs.promises.readFile(
          this.stateVersionPath,
          'utf-8',
        );
      } catch (e) {
        if (e.code === 'ENOENT') {
          return;
        }
        throw new schemaErrors.ErrorSchemaVersionRead(e.message, {
          data: {
            errno: e.errno,
            syscall: e.syscall,
            code: e.code,
            path: e.path,
          },
          cause: e,
        });
      }
      const stateVersion = parseInt(stateVersionData.trim());
      if (isNaN(stateVersion)) {
        throw new schemaErrors.ErrorSchemaVersionParse();
      }
      return stateVersion as StateVersion;
    });
  }

  protected async writeVersion(stateVersion: StateVersion): Promise<void> {
    return await this.lock.withWriteF(async () => {
      try {
        await this.fs.promises.writeFile(
          this.stateVersionPath,
          stateVersion + '\n',
          'utf-8',
        );
      } catch (e) {
        throw new schemaErrors.ErrorSchemaVersionWrite(e.message, {
          data: {
            errno: e.errno,
            syscall: e.syscall,
            code: e.code,
            path: e.path,
          },
          cause: e,
        });
      }
    });
  }

  /**
   * This is only called when the version is older.
   */
  protected async upgradeVersion(_stateVersion: StateVersion): Promise<void> {
    return await this.lock.withWriteF(async () => {
      // TODO: to be implemented
      throw new schemaErrors.ErrorSchemaVersionTooOld();
    });
  }
}

export default Schema;
