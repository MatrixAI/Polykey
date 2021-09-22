import { ErrorPolykey } from '../errors';

class ErrorNetwork extends ErrorPolykey {}

class ErrorForwardProxyNotStarted extends ErrorNetwork {}

class ErrorForwardProxyInvalidUrl extends ErrorNetwork {}

class ErrorForwardProxyMissingNodeId extends ErrorNetwork {}

class ErrorForwardProxyAuth extends ErrorNetwork {}

class ErrorReverseProxyNotStarted extends ErrorNetwork {}

class ErrorConnection extends ErrorNetwork {}

class ErrorConnectionMessageParse extends ErrorConnection {}

class ErrorConnectionNotStarted extends ErrorConnection {}

// During start error
class ErrorConnectionStart extends ErrorConnection {}

// Start timeout error
class ErrorConnectionStartTimeout extends ErrorConnectionStart {}

// During compose error
class ErrorConnectionCompose extends ErrorConnection {}

// Compose timeout error
class ErrorConnectionComposeTimeout extends ErrorConnectionCompose {}

// Connection is already composed
class ErrorConnectionComposed extends ErrorConnection {}

// Not yet composed, cannot answer certain things
class ErrorConnectionNotComposed extends ErrorConnection {}

// Was not able to keep alive
class ErrorConnectionTimeout extends ErrorConnection {}

/**
 * Certificate verification errors
 */
class ErrorCertChain extends ErrorNetwork {}

/**
 * When the certificate chain is empty
 */
class ErrorCertChainEmpty extends ErrorCertChain {}

/**
 * The target node id is not claimed by any certificate
 */
class ErrorCertChainUnclaimed extends ErrorCertChain {}

/**
 * If the signature chain is broken
 */
class ErrorCertChainBroken extends ErrorCertChain {}

/**
 * Certificate in the chain was expired
 */
class ErrorCertChainDateInvalid extends ErrorCertChain {}

/**
 * Certificate is missing the common name
 */
class ErrorCertChainNameInvalid extends ErrorCertChain {}

/**
 * Certificate public key doesn't generate the node id
 */
class ErrorCertChainKeyInvalid extends ErrorCertChain {}

/**
 * Certificate self-signed signature is invalid
 */
class ErrorCertChainSignatureInvalid extends ErrorCertChain {}

export {
  ErrorNetwork,
  ErrorForwardProxyNotStarted,
  ErrorForwardProxyInvalidUrl,
  ErrorForwardProxyMissingNodeId,
  ErrorForwardProxyAuth,
  ErrorReverseProxyNotStarted,
  ErrorConnection,
  ErrorConnectionMessageParse,
  ErrorConnectionNotStarted,
  ErrorConnectionStart,
  ErrorConnectionStartTimeout,
  ErrorConnectionCompose,
  ErrorConnectionComposeTimeout,
  ErrorConnectionComposed,
  ErrorConnectionNotComposed,
  ErrorConnectionTimeout,
  ErrorCertChain,
  ErrorCertChainEmpty,
  ErrorCertChainUnclaimed,
  ErrorCertChainBroken,
  ErrorCertChainDateInvalid,
  ErrorCertChainNameInvalid,
  ErrorCertChainKeyInvalid,
  ErrorCertChainSignatureInvalid,
};
