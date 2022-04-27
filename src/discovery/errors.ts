import { ErrorPolykey, sysexits } from '../errors';

class ErrorDiscovery<T> extends ErrorPolykey<T> {}

class ErrorDiscoveryRunning<T> extends ErrorDiscovery<T> {
  static description = 'Discovery is running';
  exitCode = sysexits.USAGE;
}

class ErrorDiscoveryDestroyed<T> extends ErrorDiscovery<T> {
  static description = 'Discovery is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorDiscoveryNotRunning<T> extends ErrorDiscovery<T> {
  static description = 'Discovery is not running';
  exitCode = sysexits.USAGE;
}

export {
  ErrorDiscovery,
  ErrorDiscoveryDestroyed,
  ErrorDiscoveryRunning,
  ErrorDiscoveryNotRunning,
};
