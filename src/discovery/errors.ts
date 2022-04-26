import { ErrorPolykey } from '../errors';

class ErrorDiscovery<T> extends ErrorPolykey<T> {}

class ErrorDiscoveryRunning<T> extends ErrorDiscovery<T> {}

class ErrorDiscoveryDestroyed<T> extends ErrorDiscovery<T> {}

class ErrorDiscoveryNotRunning<T> extends ErrorDiscovery<T> {}

export {
  ErrorDiscovery,
  ErrorDiscoveryDestroyed,
  ErrorDiscoveryRunning,
  ErrorDiscoveryNotRunning,
};
