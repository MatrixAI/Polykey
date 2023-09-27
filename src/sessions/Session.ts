import type { SessionToken } from './types';
import type { FileSystem } from '../types';
import Logger from '@matrixai/logger';
import { CreateDestroyStartStop } from '@matrixai/async-init/dist/CreateDestroyStartStop';
import lock from 'fd-lock';
import * as sessionErrors from './errors';
import * as events from './events';
import * as utils from '../utils';

interface Session extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new sessionErrors.ErrorSessionRunning(),
  new sessionErrors.ErrorSessionDestroyed(),
  {
    eventStart: events.EventSessionStart,
    eventStarted: events.EventSessionStarted,
    eventStop: events.EventSessionStop,
    eventStopped: events.EventSessionStopped,
    eventDestroy: events.EventSessionDestroy,
    eventDestroyed: events.EventSessionDestroyed,
  },
)
class Session {
  static async createSession({
    sessionTokenPath,
    fs = require('fs'),
    logger = new Logger(this.name),
    sessionToken,
    fresh = false,
  }: {
    sessionTokenPath: string;
    fs?: FileSystem;
    logger?: Logger;
    sessionToken?: SessionToken;
    fresh?: boolean;
  }): Promise<Session> {
    logger.info(`Creating ${this.name}`);
    logger.info(`Setting session token path to ${sessionTokenPath}`);
    const session = new this({
      sessionTokenPath,
      fs,
      logger,
    });
    await session.start({
      sessionToken,
      fresh,
    });
    logger.info(`Created ${this.name}`);
    return session;
  }

  public readonly sessionTokenPath: string;
  protected fs: FileSystem;
  protected logger: Logger;

  public constructor({
    sessionTokenPath,
    fs,
    logger,
  }: {
    sessionTokenPath: string;
    fs: FileSystem;
    logger: Logger;
  }) {
    this.logger = logger;
    this.sessionTokenPath = sessionTokenPath;
    this.fs = fs;
  }

  public async start({
    sessionToken,
    fresh = false,
  }: {
    sessionToken?: SessionToken;
    fresh?: boolean;
  } = {}): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      await this.fs.promises.rm(this.sessionTokenPath, {
        force: true,
      });
    }
    if (sessionToken != null) {
      await this.writeToken(sessionToken);
    }
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop(): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy(): Promise<void> {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.fs.promises.rm(this.sessionTokenPath, {
      force: true,
    });
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  public async readToken(): Promise<SessionToken | undefined> {
    let sessionTokenFile;
    try {
      sessionTokenFile = await this.fs.promises.open(
        this.sessionTokenPath,
        'r',
      );
      while (!lock(sessionTokenFile.fd)) {
        await utils.sleep(2);
      }
      const sessionTokenData = await sessionTokenFile.readFile('utf-8');
      const sessionToken = sessionTokenData.trim();
      // `writeToken` may create an empty session token file before it completes
      if (sessionToken === '') {
        return;
      }
      return sessionToken as SessionToken;
    } catch (e) {
      if (e.code === 'ENOENT') {
        // If the file doesn't exist then no token is available
        return;
      }
      throw e;
    } finally {
      if (sessionTokenFile != null) {
        lock.unlock(sessionTokenFile.fd);
        await sessionTokenFile.close();
      }
    }
  }

  public async writeToken(sessionToken: SessionToken): Promise<void> {
    let sessionTokenFile;
    try {
      // Cannot use 'w', it truncates immediately
      // should truncate only while holding the lock
      sessionTokenFile = await this.fs.promises.open(
        this.sessionTokenPath,
        this.fs.constants.O_WRONLY | this.fs.constants.O_CREAT,
      );
      while (!lock(sessionTokenFile.fd)) {
        // Write sleep should be half of read sleep
        // this ensures write-preferring locking
        await utils.sleep(1);
      }
      await sessionTokenFile.truncate();
      // Writes from the beginning
      await sessionTokenFile.write((sessionToken as string) + '\n', 0, 'utf-8');
    } finally {
      if (sessionTokenFile != null) {
        lock.unlock(sessionTokenFile.fd);
        await sessionTokenFile.close();
      }
    }
  }
}

export default Session;
