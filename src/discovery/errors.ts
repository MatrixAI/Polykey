import { ErrorPolykey } from '../errors';

class ErrorDiscovery extends ErrorPolykey {}

class ErrorDiscoveryRunning extends ErrorDiscovery {}

class ErrorDiscoveryDestroyed extends ErrorDiscovery {}

class ErrorDiscoveryNotRunning extends ErrorDiscovery {}

export {
  ErrorDiscovery,
  ErrorDiscoveryDestroyed,
  ErrorDiscoveryRunning,
  ErrorDiscoveryNotRunning,
};
