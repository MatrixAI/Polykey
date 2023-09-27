import ErrorPolykey from '../ErrorPolykey';
import sysexits from '../utils/sysexits';

class ErrorTokens<T> extends ErrorPolykey<T> {}

class ErrorTokensDuplicateSignature<T> extends ErrorTokens<T> {
  static description = 'Token is already signed the same key';
  exitCode = sysexits.USAGE;
}

class ErrorTokensSignedParse<T> extends ErrorTokens<T> {
  static description = 'Token signed could not be parsed';
  exitCode = sysexits.USAGE;
}

export { ErrorTokens, ErrorTokensDuplicateSignature, ErrorTokensSignedParse };
