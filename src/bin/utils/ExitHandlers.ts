import process from 'process';
import * as binUtils from './utils';
import ErrorPolykey from '../../ErrorPolykey';

class ExitHandlers {
  /**
   * Mutate this array to control handlers
   * Handlers will be executed in reverse order
   */
  public handlers: Array<(signal?: NodeJS.Signals) => Promise<void>>;
  protected _exiting: boolean = false;
  /**
   * Handles synchronous and asynchronous exceptions
   * This prints out appropriate error message on STDERR
   * It sets the exit code according to the error
   * 255 is set for unknown errors
   */
  protected errorHandler = async (e: Error) => {
    if (this._exiting) {
      return;
    }
    this._exiting = true;
    if (e instanceof ErrorPolykey) {
      process.stderr.write(
        binUtils.outputFormatter({
          type: 'error',
          name: e.name,
          description: e.description,
          message: e.message,
        }),
      );
      process.exitCode = e.exitCode;
    } else {
      // Unknown error, this should not happen
      process.stderr.write(
        binUtils.outputFormatter({
          type: 'error',
          name: e.name,
          description: e.message,
        }),
      );
      process.exitCode = 255;
    }
    // Fail fast pattern
    process.exit();
  };
  /**
   * Handles termination signals
   * This is idempotent
   * After executing handlers, it will re-signal the process group
   * This effectively runs the default signal handler in the NodeJS VM
   */
  protected signalHandler = async (signal: NodeJS.Signals) => {
    if (this._exiting) {
      return;
    }
    this._exiting = true;
    try {
      await this.executeHandlers(signal);
    } catch (e) {
      // Due to finally clause, exceptions are caught here
      // Signal handling will use signal-based exit codes
      // https://nodejs.org/api/process.html#exit-codes
      // Therefore `process.exitCode` is not set
      if (e instanceof ErrorPolykey) {
        process.stderr.write(
          binUtils.outputFormatter({
            type: 'error',
            name: e.name,
            description: e.description,
            message: e.message,
          }),
        );
      } else {
        // Unknown error, this should not happen
        process.stderr.write(
          binUtils.outputFormatter({
            type: 'error',
            name: e.name,
            description: e.message,
          }),
        );
      }
    } finally {
      // Uninstall all handlers to prevent signal loop
      this.uninstall();
      // Propagate signal to NodeJS VM handlers
      process.kill(process.pid, signal);
    }
  };

  /**
   * Automatically installs all handlers
   */
  public constructor(
    handlers: Array<(signal?: NodeJS.Signals) => Promise<void>> = [],
  ) {
    this.handlers = handlers;
    this.install();
  }

  get exiting(): boolean {
    return this._exiting;
  }

  public install() {
    process.on('SIGINT', this.signalHandler);
    process.on('SIGTERM', this.signalHandler);
    process.on('SIGQUIT', this.signalHandler);
    process.on('SIGHUP', this.signalHandler);
    // Both synchronous and asynchronous errors are handled
    process.once('unhandledRejection', this.errorHandler);
    process.once('uncaughtException', this.errorHandler);
  }

  public uninstall() {
    process.removeListener('SIGINT', this.signalHandler);
    process.removeListener('SIGTERM', this.signalHandler);
    process.removeListener('SIGQUIT', this.signalHandler);
    process.removeListener('SIGHUP', this.signalHandler);
    process.removeListener('unhandledRejection', this.errorHandler);
    process.removeListener('uncaughtException', this.errorHandler);
  }

  /**
   * Execute handlers in reverse-order to match matroska model
   */
  protected async executeHandlers(signal?: NodeJS.Signals) {
    for (let i = this.handlers.length - 1, f = this.handlers[i]; i >= 0; i--) {
      await f(signal);
    }
  }
}

export default ExitHandlers;
