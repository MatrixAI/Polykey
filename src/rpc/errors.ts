import { ErrorPolykey, sysexits } from '../errors';

class ErrorRpc<T> extends ErrorPolykey<T> {}

class ErrorRpcParse<T> extends ErrorRpc<T> {
  static description = 'Failed to parse Buffer stream';
  exitCode = sysexits.SOFTWARE;
}

export { ErrorRpc, ErrorRpcParse };
