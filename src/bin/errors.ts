import ErrorPolykey from '../ErrorPolykey';
import sysexits from '../utils/sysexits';

class ErrorBin<T> extends ErrorPolykey<T> {}

class ErrorBinUncaughtException<T> extends ErrorBin<T> {
  static description = '';
  exitCode = sysexits.SOFTWARE;
}

class ErrorBinUnhandledRejection<T> extends ErrorBin<T> {
  static description = '';
  exitCode = sysexits.SOFTWARE;
}

class ErrorBinAsynchronousDeadlock<T> extends ErrorBin<T> {
  static description =
    'PolykeyAgent process exited unexpectedly, likely due to promise deadlock';
  exitCode = sysexits.SOFTWARE;
}

class ErrorCLI<T> extends ErrorBin<T> {}

class ErrorCLINodePath<T> extends ErrorCLI<T> {
  static description = 'Cannot derive default node path from unknown platform';
  exitCode = sysexits.USAGE;
}

class ErrorCLIClientOptions<T> extends ErrorCLI<T> {
  static description = 'Missing required client options';
  exitCode = sysexits.USAGE;
}

class ErrorCLIPasswordWrong<T> extends ErrorCLI<T> {
  static description = 'Wrong password, please try again';
  exitCode = sysexits.USAGE;
}

class ErrorCLIPasswordMissing<T> extends ErrorCLI<T> {
  static description =
    'Password is necessary, provide it via --password-file, PK_PASSWORD or when prompted';
  exitCode = sysexits.USAGE;
}

class ErrorCLIPasswordFileRead<T> extends ErrorCLI<T> {
  static description = 'Failed to read password file';
  exitCode = sysexits.NOINPUT;
}

class ErrorCLIRecoveryCodeFileRead<T> extends ErrorCLI<T> {
  static description = 'Failed to read recovery code file';
  exitCode = sysexits.NOINPUT;
}

class ErrorCLIPrivateKeyFileRead<T> extends ErrorCLI<T> {
  static description = 'Failed to read private key Pem file';
  exitCode = sysexits.NOINPUT;
}

class ErrorCLIPublicJWKFileRead<T> extends ErrorCLI<T> {
  static description = 'Failed to read public JWK file';
  exitCode = sysexits.NOINPUT;
}

class ErrorCLIFileRead<T> extends ErrorCLI<T> {
  static description = 'Failed to read file';
  exitCode = sysexits.NOINPUT;
}

class ErrorCLIPolykeyAgentStatus<T> extends ErrorCLI<T> {
  static description = 'PolykeyAgent agent status';
  exitCode = sysexits.TEMPFAIL;
}

class ErrorCLIPolykeyAgentProcess<T> extends ErrorCLI<T> {
  static description = 'PolykeyAgent process could not be started';
  exitCode = sysexits.OSERR;
}

class ErrorCLINodeFindFailed<T> extends ErrorCLI<T> {
  static description = 'Failed to find the node in the DHT';
  exitCode = 1;
}

class ErrorCLINodePingFailed<T> extends ErrorCLI<T> {
  static description = 'Node was not online or not found.';
  exitCode = 1;
}

export {
  ErrorBin,
  ErrorBinUncaughtException,
  ErrorBinUnhandledRejection,
  ErrorBinAsynchronousDeadlock,
  ErrorCLI,
  ErrorCLINodePath,
  ErrorCLIClientOptions,
  ErrorCLIPasswordWrong,
  ErrorCLIPasswordMissing,
  ErrorCLIPasswordFileRead,
  ErrorCLIRecoveryCodeFileRead,
  ErrorCLIPrivateKeyFileRead,
  ErrorCLIPublicJWKFileRead,
  ErrorCLIFileRead,
  ErrorCLIPolykeyAgentStatus,
  ErrorCLIPolykeyAgentProcess,
  ErrorCLINodeFindFailed,
  ErrorCLINodePingFailed,
};
