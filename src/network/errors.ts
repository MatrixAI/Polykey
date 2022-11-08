import { ErrorPolykey, sysexits } from '../errors';

class ErrorNetwork<T> extends ErrorPolykey<T> {}

class ErrorProxy<T> extends ErrorNetwork<T> {}

class ErrorProxyNotRunning<T> extends ErrorProxy<T> {
  static description = 'Proxy is not running';
  exitCode = sysexits.USAGE;
}

class ErrorProxyConnectInvalidUrl<T> extends ErrorProxy<T> {
  static description = 'Invalid target host used for HTTP connect proxy';
  exitCode = sysexits.PROTOCOL;
}

class ErrorProxyConnectMissingNodeId<T> extends ErrorProxy<T> {
  static description =
    'Node ID query parameter is required for HTTP connect proxy';
  exitCode = sysexits.PROTOCOL;
}

class ErrorProxyConnectAuth<T> extends ErrorProxy<T> {
  static description = 'Incorrect HTTP connect proxy password';
  exitCode = sysexits.NOPERM;
}

class ErrorConnection<T> extends ErrorNetwork<T> {}

class ErrorConnectionNotRunning<T> extends ErrorConnection<T> {
  static description = 'Connection is not running';
  exitCode = sysexits.USAGE;
}

class ErrorConnectionComposed<T> extends ErrorConnection<T> {
  static description = 'Connection is composed';
  exitCode = sysexits.USAGE;
}

class ErrorConnectionNotComposed<T> extends ErrorConnection<T> {
  static description = 'Connection is not composed';
  exitCode = sysexits.USAGE;
}

class ErrorConnectionMessageParse<T> extends ErrorConnection<T> {
  static description = 'Network message received is invalid';
  exitCode = sysexits.TEMPFAIL;
}

class ErrorConnectionTimeout<T> extends ErrorConnection<T> {
  static description = 'Connection keep-alive timed out';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorConnectionEndTimeout<T> extends ErrorConnection<T> {
  static description = 'Connection end timed out';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorConnectionNodesEmpty<T> extends ErrorConnection<T> {
  static description = 'Nodes list to verify against was empty';
  exitCode = sysexits.USAGE;
}

/**
 * Used by ConnectionForward and ConnectionReverse
 */
class ErrorConnectionStart<T> extends ErrorConnection<T> {
  static description = 'Connection start failed';
  exitCode = sysexits.PROTOCOL;
}

class ErrorConnectionStartTimeout<T> extends ErrorConnectionStart<T> {
  static description = 'Connection start timed out';
  exitCode = sysexits.NOHOST;
}

class ErrorConnectionStartTimeoutMax<T> extends ErrorConnectionStart<T> {
  static description =
    'Connection start timeout exceeds max allowable of 20 seconds';
  exitCode = sysexits.USAGE;
}

/**
 * Used by ConnectionReverse
 */
class ErrorConnectionCompose<T> extends ErrorConnection<T> {
  static description = 'Connection compose failed';
  exitCode = sysexits.PROTOCOL;
}

class ErrorConnectionComposeTimeout<T> extends ErrorConnectionCompose<T> {
  static description = 'Connection compose timed out';
  exitCode = sysexits.NOHOST;
}

/**
 * Used for certificate verification
 */
class ErrorCertChain<T> extends ErrorNetwork<T> {}

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

class ErrorDNSResolver<T> extends ErrorNetwork<T> {
  static description = 'DNS resolution failed';
  exitCode = sysexits.SOFTWARE;
}

export {
  ErrorNetwork,
  ErrorProxy,
  ErrorProxyNotRunning,
  ErrorProxyConnectInvalidUrl,
  ErrorProxyConnectMissingNodeId,
  ErrorProxyConnectAuth,
  ErrorConnection,
  ErrorConnectionNotRunning,
  ErrorConnectionComposed,
  ErrorConnectionNotComposed,
  ErrorConnectionMessageParse,
  ErrorConnectionTimeout,
  ErrorConnectionEndTimeout,
  ErrorConnectionNodesEmpty,
  ErrorConnectionStart,
  ErrorConnectionStartTimeout,
  ErrorConnectionStartTimeoutMax,
  ErrorConnectionCompose,
  ErrorConnectionComposeTimeout,
  ErrorCertChain,
  ErrorCertChainEmpty,
  ErrorCertChainUnclaimed,
  ErrorCertChainBroken,
  ErrorCertChainDateInvalid,
  ErrorCertChainNameInvalid,
  ErrorCertChainKeyInvalid,
  ErrorCertChainSignatureInvalid,
  ErrorDNSResolver,
};
