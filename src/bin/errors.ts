import ErrorPolykey from '../ErrorPolykey';
import sysexits from '../utils/sysexits';

class ErrorCLI<T> extends ErrorPolykey<T> {}

class ErrorCLINodePath<T> extends ErrorCLI<T> {
  static description = 'Cannot derive default node path from unknown platform';
  exitCode = sysexits.USAGE;
}

class ErrorCLIClientOptions<T> extends ErrorCLI<T> {
  static description = 'Missing required client options';
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

class ErrorCLIPolykeyAsynchronousDeadlock<T> extends ErrorCLI<T> {
  static description =
    'PolykeyAgent process exited unexpectedly, likely due to promise deadlock';
  exitCode = sysexits.SOFTWARE;
}

class ErrorNodeFindFailed<T> extends ErrorCLI<T> {
  static description = 'Failed to find the node in the DHT';
  exitCode = 1;
}

class ErrorNodePingFailed<T> extends ErrorCLI<T> {
  static description = 'Node was not online or not found.';
  exitCode = 1;
}

export {
  ErrorCLI,
  ErrorCLINodePath,
  ErrorCLIClientOptions,
  ErrorCLIPasswordMissing,
  ErrorCLIPasswordFileRead,
  ErrorCLIRecoveryCodeFileRead,
  ErrorCLIPrivateKeyFileRead,
  ErrorCLIFileRead,
  ErrorCLIPolykeyAgentStatus,
  ErrorCLIPolykeyAgentProcess,
  ErrorCLIPolykeyAsynchronousDeadlock,
  ErrorNodeFindFailed,
  ErrorNodePingFailed,
};
