import ErrorPolykey from '../../ErrorPolykey';
import sysexits from '../../utils/sysexits';

class ErrorAgent<T> extends ErrorPolykey<T> {}

class ErrorAgentNodeIdMissing<T> extends ErrorAgent<T> {
  static description = 'Unable to obtain NodeId from connection certificates';
  exitCode = sysexits.UNAVAILABLE;
}

export { ErrorAgentNodeIdMissing };
