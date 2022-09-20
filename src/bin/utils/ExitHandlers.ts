import process from 'process';
import * as binUtils from './utils';
import ErrorPolykey from '../../ErrorPolykey';
import * as binErrors from '../errors';

class ExitHandlers {
  /**
   * Mutate this array to control handlers
   * Handlers will be executed in reverse order
   */
  public handlers: Array<(signal?: NodeJS.Signals) => Promise<void>>;
  protected _exiting: boolean = false;
  protected _errFormat: 'json' | 'error';
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
            type: this._errFormat,
            data: e,
          }),
        );
      } else {
        // Unknown error, this should not happen
        process.stderr.write(
          binUtils.outputFormatter({
            type: this._errFormat,
            data: e,
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
   * Handles asynchronous exceptions
   * This prints out appropriate error message on STDERR
   * It sets the exit code to SOFTWARE
   */
  protected unhandledRejectionHandler = async (e: Error) => {
    if (this._exiting) {
      return;
    }
    this._exiting = true;
    const error = new binErrors.ErrorBinUnhandledRejection(undefined, {
      cause: e,
    });
    process.stderr.write(
      binUtils.outputFormatter({
        type: this._errFormat,
        data: e,
      }),
    );
    process.exitCode = error.exitCode;
    // Fail fast pattern
    process.exit();
  };
  /**
   * Handles synchronous exceptions
   * This prints out appropriate error message on STDERR
   * It sets the exit code to SOFTWARE
   */
  protected uncaughtExceptionHandler = async (e: Error) => {
    if (this._exiting) {
      return;
    }
    this._exiting = true;
    const error = new binErrors.ErrorBinUncaughtException(undefined, {
      cause: e,
    });
    process.stderr.write(
      binUtils.outputFormatter({
        type: this._errFormat,
        data: e,
      }),
    );
    process.exitCode = error.exitCode;
    // Fail fast pattern
    process.exit();
  };
  protected deadlockHandler = async () => {
    if (process.exitCode == null) {
      const e = new binErrors.ErrorBinAsynchronousDeadlock();
      process.stderr.write(
        binUtils.outputFormatter({
          type: this._errFormat,
          data: e,
        }),
      );
      process.exitCode = e.exitCode;
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

  set errFormat(errFormat: 'json' | 'error') {
    this._errFormat = errFormat;
  }

  public install() {
    process.on('SIGINT', this.signalHandler);
    process.on('SIGTERM', this.signalHandler);
    process.on('SIGQUIT', this.signalHandler);
    process.on('SIGHUP', this.signalHandler);
    // Both synchronous and asynchronous errors are handled
    process.once('unhandledRejection', this.unhandledRejectionHandler);
    process.once('uncaughtException', this.uncaughtExceptionHandler);
    process.once('beforeExit', this.deadlockHandler);
  }

  public uninstall() {
    process.removeListener('SIGINT', this.signalHandler);
    process.removeListener('SIGTERM', this.signalHandler);
    process.removeListener('SIGQUIT', this.signalHandler);
    process.removeListener('SIGHUP', this.signalHandler);
    process.removeListener(
      'unhandledRejection',
      this.unhandledRejectionHandler,
    );
    process.removeListener('uncaughtException', this.uncaughtExceptionHandler);
    process.removeListener('beforeExit', this.deadlockHandler);
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
