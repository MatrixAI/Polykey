/**
 * Setting the logger for grpc is independent from other utilities
 * In order to allow selective-imports that minimises loading times
 * @module
 */
import type Logger from '@matrixai/logger';
import { LogLevel } from '@matrixai/logger';
import * as grpcLogging from '@grpc/grpc-js/build/src/logging';
import * as grpcConstants from '@grpc/grpc-js/build/src/constants';

/**
 * Overrides GRPC's global logger with a `Logger` instance
 * Updates the logging verbosity
 * This should only be executed once for the entire process
 * and before GRPC is being used
 * Because this is global, the logger instance should be
 * created near the root of the program
 */
function setLogger(logger: Logger): void {
  grpcLogging.setLogger({
    error: (...data: Array<any>) =>
      logger.error(data.map((d) => d.toString()).join(' ')),
    info: (...data: Array<any>) =>
      logger.info(data.map((d) => d.toString()).join(' ')),
    debug: (...data: Array<any>) =>
      logger.debug(data.map((d) => d.toString()).join(' ')),
  });
  switch (logger.getEffectiveLevel()) {
    case LogLevel.NOTSET:
      // `LogLevel.NOTSET` for `Logger` is the default, and it means all logs
      // However `grpc.logVerbosity.NONE` means no logs
      // So we keep the grpc library default
      break;
    case LogLevel.DEBUG:
      grpcLogging.setLoggerVerbosity(grpcConstants.LogVerbosity.DEBUG);
      break;
    case LogLevel.INFO:
      grpcLogging.setLoggerVerbosity(grpcConstants.LogVerbosity.INFO);
      break;
    case LogLevel.WARN:
    case LogLevel.ERROR:
      // Production default
      grpcLogging.setLoggerVerbosity(grpcConstants.LogVerbosity.ERROR);
      break;
  }
}

export default setLogger;
