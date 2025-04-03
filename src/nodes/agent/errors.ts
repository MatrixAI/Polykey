import ErrorPolykey from '../../ErrorPolykey.js';
import sysexits from '../../utils/sysexits.js';

class ErrorAgent<T> extends ErrorPolykey<T> {}

class ErrorAgentNodeIdMissing<T> extends ErrorAgent<T> {
  static description = 'Unable to obtain NodeId from connection certificates';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorNodesConnectionSignalRequestVerificationFailed<
  T,
> extends ErrorAgent<T> {
  static description = 'Failed to verify request message signature';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorNodesConnectionSignalRelayVerificationFailed<
  T,
> extends ErrorAgent<T> {
  static description = 'Failed to verify relay message signature';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorNodesClaimNetworkVerificationFailed<T> extends ErrorAgent<T> {
  static description = 'Failed to verify claim network message';
  exitCode = sysexits.UNAVAILABLE;
}

export {
  ErrorAgentNodeIdMissing,
  ErrorNodesConnectionSignalRequestVerificationFailed,
  ErrorNodesConnectionSignalRelayVerificationFailed,
  ErrorNodesClaimNetworkVerificationFailed,
};
