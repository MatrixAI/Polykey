import { ErrorPolykey } from '../errors';

class ErrorGRPC extends ErrorPolykey {}

class ErrorGRPCClientNotStarted extends ErrorGRPC {}

/**
 * Client connection timed out
 */
class ErrorGRPCClientTimeout extends ErrorGRPC {}

class ErrorGRPCClientVerification extends ErrorGRPC {}

class ErrorGRPCServerBind extends ErrorGRPC {}

class ErrorGRPCServerShutdown extends ErrorGRPC {}

class ErrorGRPCServerNotStarted extends ErrorGRPC {}

class ErrorGRPCServerVerification extends ErrorGRPC {}

/**
 * Generic connection error
 */
class ErrorGRPCConnection extends ErrorGRPC {}

export {
  ErrorGRPC,
  ErrorGRPCClientNotStarted,
  ErrorGRPCClientTimeout,
  ErrorGRPCClientVerification,
  ErrorGRPCServerBind,
  ErrorGRPCServerShutdown,
  ErrorGRPCServerNotStarted,
  ErrorGRPCServerVerification,
  ErrorGRPCConnection,
};
