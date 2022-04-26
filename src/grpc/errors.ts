import { ErrorPolykey, sysexits } from '../errors';

class ErrorGRPC<T> extends ErrorPolykey<T> {}

class ErrorGRPCClientTimeout<T> extends ErrorGRPC<T> {
  static description = 'Client connection timed out';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorGRPCClientVerification<T> extends ErrorGRPC<T> {
  static description = 'Client could not verify server certificate';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorGRPCClientChannelNotReady<T> extends ErrorGRPC<T> {
  static description = 'Client channel or subchannel is not ready';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorGRPCClientCall<T> extends ErrorGRPC<T> {
  static description = 'Generic call error';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorGRPCServerNotRunning<T> extends ErrorGRPC<T> {
  static description = 'GRPC Server is not running';
  exitCode = sysexits.USAGE;
}

class ErrorGRPCServerBind<T> extends ErrorGRPC<T> {
  static description = 'Could not bind to server';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorGRPCServerShutdown<T> extends ErrorGRPC<T> {
  static description = 'Error during shutdown';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorGRPCServerNotSecured<T> extends ErrorGRPC<T> {
  static description = 'Server is not secured';
  exitCode = sysexits.NOPERM;
}

class ErrorGRPCServerVerification<T> extends ErrorGRPC<T> {
  static description = 'Failed to verify server certificate';
  exitCode = sysexits.UNAVAILABLE;
}

export {
  ErrorGRPC,
  ErrorGRPCClientTimeout,
  ErrorGRPCClientVerification,
  ErrorGRPCClientChannelNotReady,
  ErrorGRPCClientCall,
  ErrorGRPCServerNotRunning,
  ErrorGRPCServerBind,
  ErrorGRPCServerShutdown,
  ErrorGRPCServerNotSecured,
  ErrorGRPCServerVerification,
};
