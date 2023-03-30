import { ErrorPolykey, sysexits } from '../errors';

class ErrorWebSocket<T> extends ErrorPolykey<T> {}

class ErrorWebSocketClient<T> extends ErrorWebSocket<T> {}

class ErrorClientDestroyed<T> extends ErrorWebSocketClient<T> {
  static description = 'ClientClient has been destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorClientInvalidHost<T> extends ErrorWebSocketClient<T> {
  static description = 'Host must be a valid IPv4 or IPv6 address string';
  exitCode = sysexits.USAGE;
}

class ErrorClientConnectionFailed<T> extends ErrorWebSocketClient<T> {
  static description = 'Failed to establish connection to server';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorClientConnectionTimedOut<T> extends ErrorWebSocketClient<T> {
  static description = 'Connection timed out';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorClientConnectionEndedEarly<T> extends ErrorWebSocketClient<T> {
  static description = 'Connection ended before stream ended';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorClientStreamAborted<T> extends ErrorWebSocketClient<T> {
  static description = 'Stream was ended early with an abort signal';
  exitCode = sysexits.USAGE;
}

class ErrorClientEndingConnections<T> extends ErrorWebSocketClient<T> {
  static description = 'WebSocketClient is ending active connections';
  exitCode = sysexits.USAGE;
}

class ErrorWebSocketServer<T> extends ErrorWebSocket<T> {}

class ErrorWebSocketServerNotRunning<T> extends ErrorWebSocketServer<T> {
  static description = 'WebSocketServer is not running';
  exitCode = sysexits.USAGE;
}

class ErrorServerPortUnavailable<T> extends ErrorWebSocketServer<T> {
  static description = 'Failed to bind a free port';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorServerSendFailed<T> extends ErrorWebSocketServer<T> {
  static description = 'Failed to send message';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorServerReadableBufferLimit<T> extends ErrorWebSocketServer<T> {
  static description = 'Readable buffer is full, messages received too quickly';
  exitCode = sysexits.USAGE;
}

class ErrorServerConnectionEndedEarly<T> extends ErrorWebSocketServer<T> {
  static description = 'Connection ended before stream ended';
  exitCode = sysexits.UNAVAILABLE;
}

/**
 * Used for certificate verification
 */
class ErrorCertChain<T> extends ErrorWebSocket<T> {}

class ErrorCertChainEmpty<T> extends ErrorCertChain<T> {
  static description = 'Certificate chain is empty';
  exitCode = sysexits.PROTOCOL;
}

class ErrorCertChainUnclaimed<T> extends ErrorCertChain<T> {
  static description = 'The target node id is not claimed by any certificate';
  exitCode = sysexits.PROTOCOL;
}

class ErrorCertChainBroken<T> extends ErrorCertChain<T> {
  static description = 'The signature chain is broken';
  exitCode = sysexits.PROTOCOL;
}

class ErrorCertChainDateInvalid<T> extends ErrorCertChain<T> {
  static description = 'Certificate in the chain is expired';
  exitCode = sysexits.PROTOCOL;
}

class ErrorCertChainNameInvalid<T> extends ErrorCertChain<T> {
  static description = 'Certificate is missing the common name';
  exitCode = sysexits.PROTOCOL;
}

class ErrorCertChainKeyInvalid<T> extends ErrorCertChain<T> {
  static description = 'Certificate public key does not generate the Node ID';
  exitCode = sysexits.PROTOCOL;
}

class ErrorCertChainSignatureInvalid<T> extends ErrorCertChain<T> {
  static description = 'Certificate self-signed signature is invalid';
  exitCode = sysexits.PROTOCOL;
}

class ErrorConnectionNodesEmpty<T> extends ErrorWebSocket<T> {
  static description = 'Nodes list to verify against was empty';
  exitCode = sysexits.USAGE;
}

export {
  ErrorWebSocketClient,
  ErrorClientDestroyed,
  ErrorClientInvalidHost,
  ErrorClientConnectionFailed,
  ErrorClientConnectionTimedOut,
  ErrorClientConnectionEndedEarly,
  ErrorClientStreamAborted,
  ErrorClientEndingConnections,
  ErrorWebSocketServer,
  ErrorWebSocketServerNotRunning,
  ErrorServerPortUnavailable,
  ErrorServerSendFailed,
  ErrorServerReadableBufferLimit,
  ErrorServerConnectionEndedEarly,
  ErrorCertChainEmpty,
  ErrorCertChainUnclaimed,
  ErrorCertChainBroken,
  ErrorCertChainDateInvalid,
  ErrorCertChainNameInvalid,
  ErrorCertChainKeyInvalid,
  ErrorCertChainSignatureInvalid,
  ErrorConnectionNodesEmpty,
};
