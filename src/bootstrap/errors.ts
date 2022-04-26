import { ErrorPolykey, sysexits } from '../errors';

class ErrorBootstrap<T> extends ErrorPolykey<T> {}

class ErrorBootstrapExistingState<T> extends ErrorBootstrap<T> {
  static description = 'Node path is occupied with existing state';
  exitCode = sysexits.USAGE;
}

export { ErrorBootstrap, ErrorBootstrapExistingState };
