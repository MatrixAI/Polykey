import sysexits from './sysexits';
import ErrorPolykey from '../ErrorPolykey';

class ErrorUtils extends ErrorPolykey {}

/**
 * This is a special error that is only used for absurd situations
 * Intended to placate typescript so that unreachable code type checks
 * If this is thrown, this means there is a bug in the code
 */
class ErrorUtilsUndefinedBehaviour extends ErrorUtils {
  description = 'You should never see this error';
  exitCode = sysexits.SOFTWARE;
}

class ErrorUtilsPollTimeout extends ErrorUtils {
  description = 'Poll timed out';
  exitCode = sysexits.TEMPFAIL;
}

class ErrorUtilsNodePath extends ErrorUtils {
  description = 'Cannot derive default node path from unknown platform';
  exitCode = sysexits.USAGE;
}

export {
  ErrorUtils,
  ErrorUtilsUndefinedBehaviour,
  ErrorUtilsPollTimeout,
  ErrorUtilsNodePath,
};
