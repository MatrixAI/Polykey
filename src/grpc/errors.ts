import { ErrorPolykey } from '../errors';

class ErrorGRPC<T> extends ErrorPolykey<T> {}

class ErrorGRPCClientTimeout<T> extends ErrorGRPC<T> {
  static description = 'Client connection timed out';
}

class ErrorGRPCClientVerification<T> extends ErrorGRPC<T> {
  static description = 'Client could not verify server certificate';
}

class ErrorGRPCClientChannelNotReady<T> extends ErrorGRPC<T> {
  static description = 'Client channel or subchannel is not ready';
}

class ErrorGRPCClientCall<T> extends ErrorGRPC<T> {
  static description = 'Generic call error';
}

class ErrorGRPCServerNotRunning<T> extends ErrorGRPC<T> {}

class ErrorGRPCServerBind<T> extends ErrorGRPC<T> {}

class ErrorGRPCServerShutdown<T> extends ErrorGRPC<T> {}

class ErrorGRPCServerNotSecured<T> extends ErrorGRPC<T> {}

class ErrorGRPCServerVerification<T> extends ErrorGRPC<T> {}

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
