import { ErrorPolykey, sysexits } from '../errors';

class ErrorBootstrap extends ErrorPolykey {}

class ErrorBootstrapExistingState extends ErrorBootstrap {
  description = 'Node path is occupied with existing state';
  exitCode = sysexits.USAGE;
}

export { ErrorBootstrap, ErrorBootstrapExistingState };
