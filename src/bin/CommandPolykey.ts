import type { FileSystem } from '../types';
import commander from 'commander';
import Logger, { StreamHandler } from '@matrixai/logger';
import * as binUtils from './utils';
import * as binOptions from './utils/options';
import * as binErrors from './errors';
import grpcSetLogger from '../grpc/utils/setLogger';

/**
 * Singleton logger constructed once for all commands
 */
const logger = new Logger('polykey', undefined, [new StreamHandler()]);

/**
 * Base class for all commands
 */
class CommandPolykey extends commander.Command {
  protected logger: Logger = logger;
  protected fs: FileSystem;
  protected exitHandlers: binUtils.ExitHandlers;

  public constructor({
    exitHandlers,
    fs = require('fs'),
  }: {
    exitHandlers: binUtils.ExitHandlers;
    fs?: FileSystem;
  }) {
    super();
    this.fs = fs;
    this.exitHandlers = exitHandlers;
    // All commands must not exit upon error
    this.exitOverride();
    // On usage error, show the help info
    this.showHelpAfterError();
    // On usage error, auto-suggest alternatives
    this.showSuggestionAfterError();
    // Add all default options
    // these options will be available across the command hierarchy
    // the values will be captured by the root command
    this.addOption(binOptions.nodePath);
    this.addOption(binOptions.passwordFile);
    this.addOption(binOptions.format);
    this.addOption(binOptions.verbose);
  }

  /**
   * Overrides opts to return all options set in the command hierarchy
   */
  public opts<T extends commander.OptionValues>(): T {
    const opts = super.opts<T>();
    if (this.parent != null) {
      // Override the current options with parent options
      // global option values are captured by the root command
      return Object.assign(opts, this.parent.opts<T>());
    } else {
      return opts;
    }
  }

  public action(fn: (...args: any[]) => void | Promise<void>): this {
    return super.action(async (...args: any[]) => {
      const opts = this.opts();
      // Set the logger according to the verbosity
      this.logger.setLevel(binUtils.verboseToLogLevel(opts.verbose));
      // Set the global upstream GRPC logger
      grpcSetLogger(this.logger.getChild('grpc'));
      // If the node path is undefined
      // this means there is an unknown platform
      if (opts.nodePath == null) {
        throw new binErrors.ErrorCLINodePath();
      }
      await fn(...args);
    });
  }
}

export default CommandPolykey;
