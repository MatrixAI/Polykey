import ErrorPolykey from '../../ErrorPolykey';
import sysexits from '../../utils/sysexits';

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

export {
  ErrorAgentNodeIdMissing,
  ErrorNodesConnectionSignalRequestVerificationFailed,
  ErrorNodesConnectionSignalRelayVerificationFailed,
};
