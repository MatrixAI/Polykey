import { ErrorPolykey } from '../errors';

class ErrorGRPC extends ErrorPolykey {}

class ErrorGRPCClientTimeout extends ErrorGRPC {
  description = 'Client connection timed out';
}

class ErrorGRPCClientVerification extends ErrorGRPC {
  description = 'Client could not verify server certificate';
}

class ErrorGRPCClientChannelNotReady extends ErrorGRPC {
  description = 'Client channel or subchannel is not ready';
}

class ErrorGRPCClientCall extends ErrorGRPC {
  description = 'Generic call error';
}

class ErrorGRPCServerNotRunning extends ErrorGRPC {}

class ErrorGRPCServerBind extends ErrorGRPC {}

class ErrorGRPCServerShutdown extends ErrorGRPC {}

class ErrorGRPCServerNotSecured extends ErrorGRPC {}

class ErrorGRPCServerVerification extends ErrorGRPC {}

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
