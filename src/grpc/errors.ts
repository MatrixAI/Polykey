import { ErrorPolykey } from '../errors';

class ErrorGRPC extends ErrorPolykey {}

class ErrorGRPCClientNotStarted extends ErrorGRPC {}

class ErrorGRPCClientDestroyed extends ErrorGRPC {}

class ErrorGRPCClientNotSecured extends ErrorGRPC {}

/**
 * Client connection timed out
 */
class ErrorGRPCClientTimeout extends ErrorGRPC {}

class ErrorGRPCClientVerification extends ErrorGRPC {}

class ErrorGRPCServerBind extends ErrorGRPC {}

class ErrorGRPCServerShutdown extends ErrorGRPC {}

class ErrorGRPCServerNotStarted extends ErrorGRPC {}

class ErrorGRPCServerDestroyed extends ErrorGRPC {}

class ErrorGRPCServerNotSecured extends ErrorGRPC {}

class ErrorGRPCServerVerification extends ErrorGRPC {}

/**
 * Generic connection error
 */
class ErrorGRPCConnection extends ErrorGRPC {}

/**
 * Generic Message error
 */
class ErrorGRPCInvalidMessage extends ErrorGRPC {
  exitCode: number = 70;
}

export {
  ErrorGRPC,
  ErrorGRPCClientNotStarted,
  ErrorGRPCClientDestroyed,
  ErrorGRPCServerDestroyed,
  ErrorGRPCClientNotSecured,
  ErrorGRPCClientTimeout,
  ErrorGRPCClientVerification,
  ErrorGRPCServerBind,
  ErrorGRPCServerShutdown,
  ErrorGRPCServerNotStarted,
  ErrorGRPCServerNotSecured,
  ErrorGRPCServerVerification,
  ErrorGRPCConnection,
  ErrorGRPCInvalidMessage,
};
