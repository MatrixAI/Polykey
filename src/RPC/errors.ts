import { ErrorPolykey, sysexits } from '../errors';

class ErrorRpc<T> extends ErrorPolykey<T> {}

class ErrorRpcRunning<T> extends ErrorRpc<T> {
  static description = 'Rpc is running';
  exitCode = sysexits.USAGE;
}

class ErrorRpcDestroyed<T> extends ErrorRpc<T> {
  static description = 'Rpc is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorRpcNotRunning<T> extends ErrorRpc<T> {
  static description = 'Rpc is not running';
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

class ErrorRpcHandlerMissing<T> extends ErrorRpc<T> {
  static description = 'No handler was registered for the given method';
  exitCode = sysexits.USAGE;
}

class ErrorRpcProtocal<T> extends ErrorRpc<T> {
  static description = 'Unexpected behaviour during communication';
  exitCode = sysexits.PROTOCOL;
}

class ErrorRpcMessageLength<T> extends ErrorRpc<T> {
  static description = 'RPC Message exceeds maximum size';
  exitCode = sysexits.DATAERR;
}

class ErrorRpcRemoteError<T> extends ErrorRpc<T> {
  static description = 'RPC Message exceeds maximum size';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorRpcPlaceholderConnectionError<T> extends ErrorRpc<T> {
  static description = 'placeholder error for connection stream failure';
  exitCode = sysexits.UNAVAILABLE;
}

export {
  ErrorRpc,
  ErrorRpcRunning,
  ErrorRpcDestroyed,
  ErrorRpcNotRunning,
  ErrorRpcStopping,
  ErrorRpcParse,
  ErrorRpcHandlerMissing,
  ErrorRpcProtocal,
  ErrorRpcMessageLength,
  ErrorRpcRemoteError,
  ErrorRpcPlaceholderConnectionError,
};
