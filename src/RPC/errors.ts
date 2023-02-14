import { ErrorPolykey, sysexits } from '../errors';

class ErrorRpc<T> extends ErrorPolykey<T> {}

class ErrorRpcDestroyed<T> extends ErrorRpc<T> {
  static description = 'Rpc is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorRpcStopping<T> extends ErrorRpc<T> {
  static description = 'Rpc is stopping';
  exitCode = sysexits.USAGE;
}

class ErrorRpcParse<T> extends ErrorRpc<T> {
  static description = 'Failed to parse Buffer stream';
  exitCode = sysexits.SOFTWARE;
}

/**
 * This is an internal error, it should not reach the top level.
 */
class ErrorRpcHandlerFailed<T> extends ErrorRpc<T> {
  static description = 'Failed to handle stream';
  exitCode = sysexits.SOFTWARE;
}

class ErrorRpcMessageLength<T> extends ErrorRpc<T> {
  static description = 'RPC Message exceeds maximum size';
  exitCode = sysexits.DATAERR;
}

class ErrorRpcRemoteError<T> extends ErrorRpc<T> {
  static description = 'RPC Message exceeds maximum size';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorRpcNoMessageError<T> extends ErrorRpc<T> {
  static description = 'For errors not to be conveyed to the client';
}

class ErrorRpcPlaceholderConnectionError<T> extends ErrorRpcNoMessageError<T> {
  static description = 'placeholder error for connection stream failure';
  exitCode = sysexits.UNAVAILABLE;
}

export {
  ErrorRpc,
  ErrorRpcDestroyed,
  ErrorRpcStopping,
  ErrorRpcParse,
  ErrorRpcHandlerFailed,
  ErrorRpcMessageLength,
  ErrorRpcRemoteError,
  ErrorRpcNoMessageError,
  ErrorRpcPlaceholderConnectionError,
};
