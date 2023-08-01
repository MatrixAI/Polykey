import { ErrorPolykey, sysexits } from '../errors';

class ErrorNetwork<T> extends ErrorPolykey<T> {}

/**
 * Used for certificate verification
 */
class ErrorCertChain<T> extends ErrorNetwork<T> {}

class ErrorConnectionNodesEmpty<T> extends ErrorCertChain<T> {
  static description = 'Nodes list to verify against was empty';
  exitCode = sysexits.USAGE;
}

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
  ErrorCertChain,
  ErrorConnectionNodesEmpty,
  ErrorCertChainEmpty,
  ErrorCertChainUnclaimed,
  ErrorCertChainBroken,
  ErrorCertChainDateInvalid,
  ErrorCertChainNameInvalid,
  ErrorCertChainKeyInvalid,
  ErrorCertChainSignatureInvalid,
  ErrorDNSResolver,
};
