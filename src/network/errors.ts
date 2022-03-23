import { ErrorPolykey, sysexits } from '../errors';

class ErrorNetwork extends ErrorPolykey {}

class ErrorProxy extends ErrorNetwork {}

class ErrorProxyNotRunning extends ErrorProxy {
  description = 'Proxy is not running';
  exitCode = sysexits.USAGE;
}

class ErrorProxyConnectInvalidUrl extends ErrorProxy {
  description = 'Invalid target host used for HTTP connect proxy';
  exitCode = sysexits.PROTOCOL;
}

class ErrorProxyConnectMissingNodeId extends ErrorProxy {
  description = 'Node ID query parameter is required for HTTP connect proxy';
  exitCode = sysexits.PROTOCOL;
}

class ErrorProxyConnectAuth extends ErrorProxy {
  description = 'Incorrect HTTP connect proxy password';
  exitCode = sysexits.NOPERM;
}

class ErrorConnection extends ErrorNetwork {}

class ErrorConnectionNotRunning extends ErrorConnection {
  description = 'Connection is not running';
  exitCode = sysexits.USAGE;
}

class ErrorConnectionComposed extends ErrorConnection {
  description = 'Connection is composed';
  exitCode = sysexits.USAGE;
}

class ErrorConnectionNotComposed extends ErrorConnection {
  description = 'Connection is not composed';
  exitCode = sysexits.USAGE;
}

class ErrorConnectionMessageParse extends ErrorConnection {
  description = 'Network message received is invalid';
  exitCode = sysexits.TEMPFAIL;
}

class ErrorConnectionTimeout extends ErrorConnection {
  description = 'Connection keep-alive timed out';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorConnectionEndTimeout extends ErrorConnection {
  description = 'Connection end timed out';
  exitCode = sysexits.UNAVAILABLE;
}

/**
 * Used by ConnectionForward and ConnectionReverse
 */
class ErrorConnectionStart extends ErrorConnection {
  description = 'Connection start failed';
  exitCode = sysexits.PROTOCOL;
}

class ErrorConnectionStartTimeout extends ErrorConnectionStart {
  description = 'Connection start timed out';
  exitCode = sysexits.NOHOST;
}

/**
 * Used by ConnectionReverse
 */
class ErrorConnectionCompose extends ErrorConnection {
  description = 'Connection compose failed';
  exitCode = sysexits.PROTOCOL;
}

class ErrorConnectionComposeTimeout extends ErrorConnectionCompose {
  description = 'Connection compose timed out';
  exitCode = sysexits.NOHOST;
}

/**
 * Used for certificate verification
 */
class ErrorCertChain extends ErrorNetwork {}

class ErrorCertChainEmpty extends ErrorCertChain {
  description = 'Certificate chain is empty';
  exitCode = sysexits.PROTOCOL;
}

class ErrorCertChainUnclaimed extends ErrorCertChain {
  description = 'The target node id is not claimed by any certificate';
  exitCode = sysexits.PROTOCOL;
}

class ErrorCertChainBroken extends ErrorCertChain {
  description = 'The signature chain is broken';
  exitCode = sysexits.PROTOCOL;
}

class ErrorCertChainDateInvalid extends ErrorCertChain {
  description = 'Certificate in the chain is expired';
  exitCode = sysexits.PROTOCOL;
}

class ErrorCertChainNameInvalid extends ErrorCertChain {
  description = 'Certificate is missing the common name';
  exitCode = sysexits.PROTOCOL;
}

class ErrorCertChainKeyInvalid extends ErrorCertChain {
  description = 'Certificate public key does not generate the Node ID';
  exitCode = sysexits.PROTOCOL;
}

class ErrorCertChainSignatureInvalid extends ErrorCertChain {
  description = 'Certificate self-signed signature is invalid';
  exitCode = sysexits.PROTOCOL;
}

class ErrorHostnameResolutionFailed extends ErrorNetwork {}

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
  ErrorConnectionStart,
  ErrorConnectionStartTimeout,
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
  ErrorHostnameResolutionFailed,
};
