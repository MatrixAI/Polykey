import { ErrorPolykey, sysexits } from '../errors';

class ErrorTokens<T> extends ErrorPolykey<T> {}

class ErrorTokensDuplicateSignature<T> extends ErrorTokens<T> {
  static description = 'Token is already signed the same key';
  exitCode = sysexits.USAGE;
}

class ErrorTokensPayloadParse<T> extends ErrorTokens<T> {
  static description = 'Token payload could not be parsed';
  exitCode = sysexits.USAGE;
}

class ErrorTokensProtectedHeaderParse<T> extends ErrorTokens<T> {
  static description = 'Token protected header could not be parsed';
  exitCode = sysexits.USAGE;
}

class ErrorTokensSignatureParse<T> extends ErrorTokens<T> {
  static description = 'Token signature could not be parsed';
  exitCode = sysexits.USAGE;
}

export {
  ErrorTokens,
  ErrorTokensDuplicateSignature,
  ErrorTokensPayloadParse,
  ErrorTokensProtectedHeaderParse,
  ErrorTokensSignatureParse,
};
