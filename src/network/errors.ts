import { ErrorPolykey } from '../errors';

class ErrorNetwork extends ErrorPolykey {}

class ErrorProxy extends ErrorNetwork {}

class ErrorPeerConnectionExists extends ErrorNetwork {}

class ErrorPeerConnectionNotExists extends ErrorNetwork {}

class ErrorCannotConnectToPeer extends ErrorNetwork {}

class ErrorRelayConnectionExists extends ErrorNetwork {}

class ErrorRelayConnectionNotExists extends ErrorNetwork {}

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
  ErrorProxy,
  ErrorPeerConnectionExists,
  ErrorPeerConnectionNotExists,
  ErrorCannotConnectToPeer,
  ErrorRelayConnectionExists,
  ErrorRelayConnectionNotExists,
  ErrorCertChain,
  ErrorCertChainEmpty,
  ErrorCertChainUnclaimed,
  ErrorCertChainBroken,
  ErrorCertChainDateInvalid,
  ErrorCertChainNameInvalid,
  ErrorCertChainKeyInvalid,
  ErrorCertChainSignatureInvalid,
};
