import { ErrorPolykey } from '../errors';

class ErrorGRPC extends ErrorPolykey {}

class ErrorGRPCBind extends ErrorGRPC {}

class ErrorGRPCShutdown extends ErrorGRPC {}

/**
 * Use this for connection related errors
 */
class ErrorGRPCConnection extends ErrorGRPC {}

class ErrorGRPCServerNotStarted extends ErrorGRPC {}

class ErrorGRPCConnectionTimeout extends ErrorGRPC {}

export {
  ErrorGRPC,
  ErrorGRPCBind,
  ErrorGRPCShutdown,
  ErrorGRPCConnection,
  ErrorGRPCServerNotStarted,
  ErrorGRPCConnectionTimeout,
};
