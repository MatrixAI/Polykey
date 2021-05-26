import { ErrorPolykey } from '../errors';

class ErrorGRPC extends ErrorPolykey {}

class ErrorGRPCClientNotStarted extends ErrorGRPC {}

class ErrorGRPCClientNotSecured extends ErrorGRPC {}

/**
 * Client connection timed out
 */
class ErrorGRPCClientTimeout extends ErrorGRPC {}

class ErrorGRPCClientVerification extends ErrorGRPC {}

class ErrorGRPCServerBind extends ErrorGRPC {}

class ErrorGRPCServerShutdown extends ErrorGRPC {}

class ErrorGRPCServerNotStarted extends ErrorGRPC {}

class ErrorGRPCServerNotSecured extends ErrorGRPC {}

class ErrorGRPCServerVerification extends ErrorGRPC {}

/**
 * Generic connection error
 */
class ErrorGRPCConnection extends ErrorGRPC {}

export {
  ErrorGRPC,
  ErrorGRPCClientNotStarted,
  ErrorGRPCClientNotSecured,
  ErrorGRPCClientTimeout,
  ErrorGRPCClientVerification,
  ErrorGRPCServerBind,
  ErrorGRPCServerShutdown,
  ErrorGRPCServerNotStarted,
  ErrorGRPCServerNotSecured,
  ErrorGRPCServerVerification,
  ErrorGRPCConnection,
};
