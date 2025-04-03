import ErrorPolykey from '../ErrorPolykey.js';
import sysexits from '../utils/sysexits.js';

class ErrorBootstrap<T> extends ErrorPolykey<T> {}

class ErrorBootstrapExistingState<T> extends ErrorBootstrap<T> {
  static description = 'Node path is occupied with existing state';
  exitCode = sysexits.USAGE;
}

export { ErrorBootstrap, ErrorBootstrapExistingState };
